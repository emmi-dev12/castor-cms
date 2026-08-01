"use client";

// Per-site permission switches for the admin dashboard. The owner ticks exactly
// what a client may change — there are no tiers, so any combination is valid.
// The presets are shortcuts that set the switches, nothing more.

import { useRouter } from "next/navigation";
import { useState } from "react";
import { CAPABILITY_LABELS, PRESETS } from "@/lib/guardian/policy";
import type { Permissions } from "@/lib/model/types";

export function PermissionsPanel({
  slug,
  permissions,
}: {
  slug: string;
  permissions: Permissions;
}) {
  const router = useRouter();
  const [perms, setPerms] = useState<Permissions>(permissions);
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState(false);

  async function save(next: Permissions) {
    setPerms(next); // optimistic: the switches respond immediately
    setBusy(true);
    await fetch(`/api/admin/${slug}/permissions`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ permissions: next }),
    });
    setBusy(false);
    router.refresh();
  }

  const allowed = CAPABILITY_LABELS.filter((c) => perms[c.id]);
  const summary =
    allowed.length === 0
      ? "view only"
      : allowed.length === CAPABILITY_LABELS.length
        ? "everything"
        : `${allowed.length} of ${CAPABILITY_LABELS.length}`;

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="rounded-md border border-slate-300 px-2 py-1 text-xs text-slate-700 hover:bg-slate-50"
        title="What this client may change"
      >
        can edit: {summary}
      </button>

      {open ? (
        <div className="absolute right-0 z-20 mt-1 w-72 rounded-lg border border-slate-300 bg-white p-3 text-left shadow-lg">
          <div className="mb-2 flex flex-wrap gap-1">
            {PRESETS.map((p) => (
              <button
                key={p.id}
                type="button"
                title={p.hint}
                onClick={() => save(p.permissions)}
                className="rounded border border-slate-300 px-2 py-1 text-[11px] text-slate-600 hover:bg-slate-50"
              >
                {p.label}
              </button>
            ))}
          </div>

          <div className="space-y-1.5 border-t border-slate-100 pt-2">
            {CAPABILITY_LABELS.map((c) => (
              <label key={c.id} className="flex items-start gap-2 text-xs text-slate-700">
                <input
                  type="checkbox"
                  checked={perms[c.id]}
                  disabled={busy}
                  onChange={(e) => save({ ...perms, [c.id]: e.target.checked })}
                  className="mt-0.5"
                />
                <span>
                  <span className="font-medium">{c.label}</span>
                  <span className="block text-[11px] text-slate-400">{c.hint}</span>
                </span>
              </label>
            ))}
          </div>

          {/* Range controls only matter when the thing they limit is allowed. */}
          {perms.textColor || perms.sectionColors ? (
            <label className="mt-2 flex items-center justify-between border-t border-slate-100 pt-2 text-xs text-slate-700">
              <span>Colours</span>
              <select
                value={perms.colorRange}
                disabled={busy}
                onChange={(e) =>
                  save({ ...perms, colorRange: e.target.value === "any" ? "any" : "palette" })
                }
                className="rounded border border-slate-300 px-1 py-0.5 text-xs"
              >
                <option value="palette">palette only</option>
                <option value="any">any colour</option>
              </select>
            </label>
          ) : null}

          {perms.spacing ? (
            <label className="mt-1.5 flex items-center justify-between text-xs text-slate-700">
              <span>Spacing</span>
              <select
                value={perms.spacingRange}
                disabled={busy}
                onChange={(e) =>
                  save({ ...perms, spacingRange: e.target.value === "any" ? "any" : "scale" })
                }
                className="rounded border border-slate-300 px-1 py-0.5 text-xs"
              >
                <option value="scale">preset scale</option>
                <option value="any">any size</option>
              </select>
            </label>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
