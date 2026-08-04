"use client";

// The client editor: renders the draft with inline editing, saves each change
// through the Guardian, and exposes Draft -> Publish + version rollback.
// Content is held in local state so design-token (color) edits reflect live;
// text nodes are uncontrolled, so this never disturbs the caret.

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ImageEditorModal } from "@/components/editor/ImageEditorModal";
import { AdminPasswordReset } from "@/components/editor/AdminPasswordReset";
import { PasswordChange } from "@/components/editor/PasswordChange";
import {
  Walkthrough,
  shouldAutoOpenTour,
  type TourStep,
} from "@/components/editor/Walkthrough";
import { SiteView } from "@/components/sections/SiteView";
import { clone, findSlot } from "@/lib/model/content";
import { CAPABILITY_LABELS } from "@/lib/guardian/policy";
import type { ImageValue, Page, Permissions, Slot } from "@/lib/model/types";
import { Inspector, type Selection } from "@/components/editor/Inspector";
import { useEditHistory, type SlotSnapshot } from "@/components/editor/useEditHistory";

interface VersionMeta {
  id: string;
  createdAt: string;
  label?: string;
}

// Written for a non-technical client: what they can do, and the reassurance
// that nothing they do is permanent or breakable.
const TOUR_STEPS: TourStep[] = [
  {
    title: "Welcome to your website editor 👋",
    body: "A quick 30-second tour so you know your way around. You can reopen this anytime with the Help button.",
  },
  {
    target: "preview",
    title: "Edit straight on the page",
    body: "This is your live page. Click any highlighted text to type over it, or click a picture to swap it out. You can't break the layout — only the content changes.",
  },
  {
    target: "pages",
    title: "Your pages",
    body: "Switch between the pages of your site here. Each one edits the same way.",
  },
  {
    target: "design",
    title: "Colours and spacing",
    body: "Adjust your colours and spacing here. The options are limited to ones that keep your site looking right.",
  },
  {
    target: "publish",
    title: "Nothing is live until you publish",
    body: "Your edits are saved as a private draft as you go. When you're happy, press Publish to put them on your real website.",
  },
  {
    target: "versions",
    title: "Every version is saved",
    body: "Each time you publish, we keep a copy. Changed your mind? Roll back to any earlier version in one click.",
  },
  {
    target: "account",
    title: "Your password",
    body: "You can change your password here whenever you like.",
  },
  {
    title: "That's it — you're ready ✨",
    body: "Have a click around; nothing goes live until you press Publish, and you can always undo. Press Help in the top bar to see this tour again.",
  },
];

/** One-line summary of what this client may change, for the header chip. */
function permissionSummary(p: Permissions): string {
  const on = CAPABILITY_LABELS.filter((c) => p[c.id]).map((c) =>
    c.label.toLowerCase(),
  );
  if (on.length === 0) return "view only";
  if (on.length === CAPABILITY_LABELS.length) return "everything";
  return on.join(", ");
}

export function EditorApp({
  slug,
  siteName,
  page,
  allPages,
  permissions,
  versions,
  publishedVersionId,
  admin = false,
}: {
  slug: string;
  siteName: string;
  page: Page;
  allPages: { path: string; title: string }[];
  permissions: Permissions;
  versions: VersionMeta[];
  publishedVersionId: string | null;
  admin?: boolean;
}) {
  const router = useRouter();
  const history = useEditHistory();
  const [content, setContent] = useState<Page>(page);
  const [syncedPage, setSyncedPage] = useState<Page>(page);
  const [status, setStatus] = useState<string>("");
  const [busy, setBusy] = useState(false);
  const [imageEditing, setImageEditing] = useState<{
    slotId: string;
    value: ImageValue;
  } | null>(null);
  const [selection, setSelection] = useState<Selection | null>(null);
  const [tourOpen, setTourOpen] = useState(false);
  const [tourRun, setTourRun] = useState(0); // bumped per run to remount the tour

  // Clients get the tour automatically the first time; the owner already knows
  // the app, so it never auto-opens for them. This has to run in an effect
  // rather than during render because it reads localStorage, which doesn't
  // exist during server rendering — reading it inline would break hydration.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- see above
    if (!admin && shouldAutoOpenTour(slug)) setTourOpen(true);
  }, [admin, slug]);

  // Re-sync when the server sends a fresh draft (after refresh/publish/rollback).
  // Done during render (React's recommended prop→state sync) rather than in an
  // effect, so there's no extra commit and no cascading-render lint warning.
  if (page !== syncedPage) {
    setSyncedPage(page);
    setContent(page);
    // The stack refers to slots on the previous page — replaying them after a
    // page switch would edit something the user can no longer see.
    history.reset();
  }

  // Owner edits hit the admin endpoint (unrestricted by client permissions).
  const editApi = admin ? `/api/admin/${slug}/edit` : `/api/${slug}/edit`;

  // Structural ops (admin only). Refresh to re-pull the mutated draft.
  async function structure(payload: Record<string, unknown>) {
    setStatus("Updating…");
    const res = await fetch(`/api/admin/${slug}/structure`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = (await res.json()) as { ok: boolean; reason?: string };
    setStatus(data.ok ? "Updated ✓ (draft)" : `Rejected: ${data.reason ?? ""}`);
    router.refresh();
  }

  const adminControls = admin
    ? {
        onMove: (sectionId: string, dir: "up" | "down") =>
          structure({ op: "move-section", sectionId, dir }),
        onDuplicate: (sectionId: string) =>
          structure({ op: "duplicate-section", sectionId }),
        onDelete: (sectionId: string) => {
          if (confirm("Delete this section?"))
            structure({ op: "delete-section", sectionId });
        },
        onAddAfter: (afterSectionId: string | undefined, type: string) =>
          structure({
            op: "add-section",
            pagePath: page.path,
            type,
            afterSectionId,
          }),
      }
    : undefined;

  async function onAddPage() {
    const path = prompt("New page path (e.g. about) — no leading slash:");
    if (!path) return;
    const title = prompt("Page title:", path) || path;
    await structure({ op: "add-page", path, title });
  }

  async function onDeletePage(p: string) {
    if (!confirm(`Delete the page "${p}" and all its content?`)) return;
    await fetch(`/api/admin/${slug}/structure`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ op: "delete-page", path: p }),
    });
    if (p === page.path) router.push(`/admin/edit/${slug}`);
    else router.refresh();
  }

  async function onDeleteSite() {
    if (
      !confirm(
        `Permanently delete the ENTIRE site "${siteName}"? This cannot be undone.`,
      )
    )
      return;
    await fetch(`/api/admin/${slug}/manage`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ op: "delete-site" }),
    });
    router.push("/");
  }

  /** Read a slot's current value and colour, for the undo stack. */
  function snapshotOf(slotId: string): SlotSnapshot | null {
    const found = findSlot({ pages: [content] }, slotId);
    if (!found) return null;
    const slot = found.slot as Slot;
    const color = slot.type === "text" || slot.type === "richtext" ? slot.color : undefined;
    return { value: slot.value, color };
  }

  /**
   * The single write path: update local state optimistically, then persist.
   * Ordinary edits, undo and redo all go through here, so they can never drift
   * apart in what they send or how they handle refusal.
   */
  async function persist(slotId: string, snap: SlotSnapshot, withColor: boolean) {
    const next = clone(content);
    const found = findSlot({ pages: [next] }, slotId);
    if (!found) return;
    const slot = found.slot as Slot;
    slot.value = snap.value as never;
    if (withColor && (slot.type === "text" || slot.type === "richtext")) {
      if (snap.color === undefined) delete slot.color;
      else slot.color = snap.color;
    }
    setContent(next);

    setStatus("Saving…");
    try {
      const res = await fetch(editApi, {
        method: "POST",
        headers: { "content-type": "application/json" },
        // Only send `color` when the change is actually about colour: it's a
        // separate permission, so an unnecessary colour field would get a
        // text-only client's edit refused.
        body: JSON.stringify(
          withColor
            ? { slotId, value: snap.value, color: snap.color ?? null }
            : { slotId, value: snap.value },
        ),
      });
      const data = (await res.json()) as {
        ok: boolean;
        reason?: string;
        conflict?: boolean;
      };
      if (!data.ok) {
        // A conflict isn't the client's fault — say so plainly and pull the
        // latest draft rather than leaving stale content on screen.
        setStatus(
          data.conflict
            ? (data.reason ?? "Reloading…")
            : `Rejected: ${data.reason ?? "not allowed"}`,
        );
        router.refresh(); // revert to the canonical draft
        return;
      }
      setStatus("Saved ✓ (draft)");
    } catch {
      setStatus("Network error");
    }
  }

  async function onEdit(slotId: string, value: Slot["value"]) {
    const before = snapshotOf(slotId);
    if (before) {
      history.record({
        slotId,
        before,
        after: { value, color: before.color },
        touchesColor: false,
      });
    }
    await persist(slotId, { value, color: before?.color }, false);
  }

  /** Save a text slot's own colour. Sends the current text too, because the
   *  edit endpoint validates value and colour together. */
  async function onEditColor(slotId: string, color: string | null) {
    const before = snapshotOf(slotId);
    if (!before) return;
    const after: SlotSnapshot = { value: before.value, color: color ?? undefined };
    history.record({ slotId, before, after, touchesColor: true });
    await persist(slotId, after, true);
  }

  async function onUndo() {
    const entry = history.undo();
    if (!entry) return;
    await persist(entry.slotId, entry.before, entry.touchesColor);
    setStatus("Undone");
  }

  async function onRedo() {
    const entry = history.redo();
    if (!entry) return;
    await persist(entry.slotId, entry.after, entry.touchesColor);
    setStatus("Redone");
  }

  async function onPublish() {
    setBusy(true);
    setStatus("Publishing…");
    await fetch(`/api/${slug}/publish`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({}),
    });
    setBusy(false);
    setStatus("Published ✓ — live now");
    router.refresh();
  }

  async function onRollback(versionId: string) {
    if (!confirm("Roll the live site back to this version?")) return;
    setBusy(true);
    await fetch(`/api/${slug}/rollback`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ versionId }),
    });
    setBusy(false);
    setStatus("Rolled back ✓");
    router.refresh();
  }

  // Cmd+Z / Ctrl+Z, and Cmd+Shift+Z / Ctrl+Y to redo.
  //
  // Deliberately NOT intercepted while the caret is in a text field: there the
  // browser's own undo fixes a typo mid-sentence, which is what someone
  // actually wants. Our stack takes over once the edit has been committed on
  // blur. Registered on the window so it works wherever focus happens to be.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey;
      if (!mod || e.key.toLowerCase() !== "z") {
        // Ctrl+Y is the other common redo binding.
        if (mod && e.key.toLowerCase() === "y") {
          e.preventDefault();
          void onRedo();
        }
        return;
      }
      const el = e.target as HTMLElement | null;
      const typing =
        !!el &&
        (el.isContentEditable ||
          el.tagName === "INPUT" ||
          el.tagName === "TEXTAREA");
      if (typing) return; // let the browser undo the typing itself

      e.preventDefault();
      if (e.shiftKey) void onRedo();
      else void onUndo();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  // The owner is never limited by the client's permissions.
  const effectivePerms = admin ? { ...permissions, textColor: true, sectionColors: true, spacing: true, colorRange: "any" as const, spacingRange: "any" as const } : permissions;

  return (
    <div className="min-h-screen bg-slate-100">
        <header className="sticky top-0 z-10 flex flex-wrap items-center gap-3 border-b border-slate-200 bg-white px-4 py-3 shadow-sm">
          <div className="font-semibold text-slate-900">{siteName}</div>
          <span className="rounded-full bg-yellow-100 px-2 py-0.5 text-xs font-medium text-yellow-800">
            editing draft
          </span>
          {admin ? (
            <span className="rounded-full bg-purple-100 px-2 py-0.5 text-xs font-medium text-purple-800">
              ADMIN · full control
            </span>
          ) : (
            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
              can edit: {permissionSummary(permissions)}
            </span>
          )}
          <div className="text-sm text-slate-500">{status}</div>
          <div className="ml-auto flex items-center gap-2">
            <a
              href={`/${slug}`}
              target="_blank"
              rel="noreferrer"
              className="rounded-md border border-slate-300 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50"
            >
              View live ↗
            </a>
            {!admin && (
              <button
                type="button"
                onClick={() => {
                  setTourRun((r) => r + 1);
                  setTourOpen(true);
                }}
                title="Show me around"
                className="rounded-md border border-slate-300 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50"
              >
                ? Help
              </button>
            )}
            {/* Shown as well as bound to the shortcut: a client is not going
                to guess Cmd+Z exists, and the disabled state tells them
                whether there is anything to undo. */}
            <div className="flex items-center" data-tour="undo">
              <button
                type="button"
                onClick={() => void onUndo()}
                disabled={!history.canUndo || busy}
                title="Undo (⌘Z)"
                aria-label="Undo"
                className="rounded-l-md border border-slate-300 px-2.5 py-1.5 text-sm text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:hover:bg-transparent"
              >
                ↶
              </button>
              <button
                type="button"
                onClick={() => void onRedo()}
                disabled={!history.canRedo || busy}
                title="Redo (⇧⌘Z)"
                aria-label="Redo"
                className="-ml-px rounded-r-md border border-slate-300 px-2.5 py-1.5 text-sm text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:hover:bg-transparent"
              >
                ↷
              </button>
            </div>
            <button
              type="button"
              data-tour="publish"
              disabled={busy}
              onClick={onPublish}
              className="rounded-md bg-slate-900 px-4 py-1.5 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-50"
            >
              Publish
            </button>
          </div>
        </header>

        <div className="mx-auto flex max-w-6xl gap-6 p-6">
          <main
            data-tour="preview"
            className="flex-1 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm"
          >
            <p className="border-b border-slate-100 bg-slate-50 px-4 py-2 text-xs text-slate-500">
              Click any highlighted text to edit. Click an image to replace it.
              Changes are saved to your draft; hit Publish to go live.
            </p>
            <SiteView
              page={content}
              siteSlug={slug}
              editable
              selection={selection}
              onSelect={setSelection}
              onEdit={onEdit}
              onEditImage={(slotId, value) =>
                setImageEditing({ slotId, value })
              }
              admin={adminControls}
            />
          </main>

          <aside className="w-64 shrink-0 space-y-6">
            {(allPages.length > 1 || admin) && (
              <section data-tour="pages">
                <div className="mb-2 flex items-center justify-between">
                  <h2 className="text-sm font-semibold text-slate-700">
                    Pages
                  </h2>
                  {admin && (
                    <button
                      type="button"
                      onClick={onAddPage}
                      className="text-xs font-medium text-slate-500 hover:text-slate-900"
                    >
                      + Add
                    </button>
                  )}
                </div>
                <ul className="space-y-1">
                  {allPages.map((p) => {
                    const isCurrent = p.path === page.path;
                    const base = admin
                      ? `/admin/edit/${slug}`
                      : `/edit/${slug}`;
                    const href = p.path === "" ? base : `${base}/${p.path}`;
                    return (
                      <li
                        key={p.path || "home"}
                        className="flex items-center gap-1"
                      >
                        <a
                          href={href}
                          className={`block flex-1 truncate rounded-md px-2 py-1.5 text-sm ${
                            isCurrent
                              ? "bg-slate-900 font-medium text-white"
                              : "text-slate-600 hover:bg-slate-200"
                          }`}
                        >
                          {p.title || (p.path === "" ? "Home" : p.path)}
                        </a>
                        {admin && p.path !== "" && (
                          <button
                            type="button"
                            title="Delete page"
                            onClick={() => onDeletePage(p.path)}
                            className="shrink-0 rounded px-1.5 text-sm text-slate-400 hover:text-red-600"
                          >
                            ✕
                          </button>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </section>
            )}

            <section data-tour="design">
              <h2 className="mb-2 text-sm font-semibold text-slate-700">Edit</h2>
              <Inspector
                selection={selection}
                page={content}
                permissions={effectivePerms}
                onEdit={onEdit}
                onEditColor={onEditColor}
              />
            </section>

            {!admin && (
              <div data-tour="account">
                <PasswordChange slug={slug} />
              </div>
            )}

            <section data-tour="versions">
              <h2 className="mb-2 text-sm font-semibold text-slate-700">
                Published versions
              </h2>
              {versions.length === 0 ? (
                <p className="text-sm text-slate-400">Nothing published yet.</p>
              ) : (
                <ul className="space-y-2">
                  {[...versions].reverse().map((v) => (
                    <li
                      key={v.id}
                      className="rounded-lg border border-slate-200 bg-white p-3 text-sm shadow-sm"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-slate-800">
                          {v.label || "version"}
                        </span>
                        {v.id === publishedVersionId && (
                          <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs text-green-700">
                            live
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-slate-400">
                        {new Date(v.createdAt).toLocaleString()}
                      </div>
                      {v.id !== publishedVersionId && (
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => onRollback(v.id)}
                          className="mt-2 text-xs font-medium text-slate-600 underline hover:text-slate-900"
                        >
                          Roll back to this
                        </button>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </section>

            {admin && (
              <section>
                <h2 className="mb-2 text-sm font-semibold text-slate-700">
                  Site settings
                </h2>
                <div className="space-y-2 rounded-lg border border-slate-200 bg-white p-3">
                  <Link
                    href="/"
                    className="block text-sm text-slate-600 underline hover:text-slate-900"
                  >
                    ← Back to dashboard
                  </Link>
                  <AdminPasswordReset slug={slug} />
                  <button
                    type="button"
                    onClick={onDeleteSite}
                    className="block text-sm font-medium text-red-600 underline hover:text-red-800"
                  >
                    Delete this site
                  </button>
                </div>
              </section>
            )}
          </aside>
        </div>

        {!admin && (
          <Walkthrough
            key={tourRun}
            slug={slug}
            steps={TOUR_STEPS}
            open={tourOpen}
            onClose={() => setTourOpen(false)}
          />
        )}

        {imageEditing && (
          <ImageEditorModal
            slotId={imageEditing.slotId}
            value={imageEditing.value}
            onClose={() => setImageEditing(null)}
            onSave={(slotId, value) => {
              onEdit(slotId, value);
              setImageEditing(null);
            }}
          />
        )}
    </div>
  );
}
