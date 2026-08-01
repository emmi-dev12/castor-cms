"use client";

// A contact form section. On a published site it POSTs to /api/[slug]/submit
// and stores a submission. In the editor it renders identically but never
// submits — the owner/client is editing labels, not sending mail.
//
// Field labels are ordinary text slots, so they're editable (and
// Guardian-validated) like any other content.

import { useState } from "react";
import type { Section, Slot } from "@/lib/model/types";

function labelOf(section: Section, slotLabel: string, fallback: string): string {
  const s = section.slots.find((x: Slot) => x.label === slotLabel);
  return s && (s.type === "text" || s.type === "richtext") ? s.value : fallback;
}

export function FormSection({
  section,
  siteSlug,
  editable,
  accent,
  children,
}: {
  section: Section;
  siteSlug?: string;
  editable: boolean;
  accent: string;
  /** The editable heading/intro nodes, rendered by SectionView. */
  children?: React.ReactNode;
}) {
  const [state, setState] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [error, setError] = useState("");

  const nameLabel = labelOf(section, "field-name-label", "Name");
  const emailLabel = labelOf(section, "field-email-label", "Email");
  const messageLabel = labelOf(section, "field-message-label", "Message");
  const submitLabel = labelOf(section, "submit-label", "Send");
  const successMsg = labelOf(section, "success", "Thanks — we’ll be in touch.");

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (editable || !siteSlug) return; // editor preview never sends
    const form = e.currentTarget;
    const data = new FormData(form);
    setState("sending");
    try {
      const res = await fetch(`/api/${siteSlug}/submit`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          sectionId: section.id,
          // Honeypot: real users never fill this hidden field; bots do.
          trap: String(data.get("company") ?? ""),
          fields: {
            [nameLabel]: String(data.get("name") ?? ""),
            [emailLabel]: String(data.get("email") ?? ""),
            [messageLabel]: String(data.get("message") ?? ""),
          },
        }),
      });
      const json = (await res.json()) as { ok: boolean; reason?: string };
      if (json.ok) {
        setState("sent");
        form.reset();
      } else {
        setState("error");
        setError(json.reason ?? "Something went wrong.");
      }
    } catch {
      setState("error");
      setError("Network error — please try again.");
    }
  }

  const field = "mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm";

  return (
    <section className="mx-auto max-w-2xl px-6 py-16">
      {children}
      {state === "sent" ? (
        <p className="mt-6 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
          {successMsg}
        </p>
      ) : (
        <form onSubmit={onSubmit} className="mt-6 space-y-4">
          <div>
            <label className="text-sm font-medium text-slate-700">{nameLabel}</label>
            <input name="name" required maxLength={200} className={field} />
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700">{emailLabel}</label>
            <input name="email" type="email" required maxLength={200} className={field} />
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700">{messageLabel}</label>
            <textarea name="message" required rows={5} maxLength={5000} className={field} />
          </div>
          {/* Honeypot — visually hidden, not display:none, so bots still fill it. */}
          <input
            name="company"
            tabIndex={-1}
            autoComplete="off"
            aria-hidden="true"
            className="absolute left-[-9999px] h-0 w-0 opacity-0"
          />
          <button
            type="submit"
            disabled={state === "sending" || editable}
            title={editable ? "Submitting is disabled while editing" : undefined}
            style={{ backgroundColor: accent }}
            className="rounded-full px-6 py-3 text-sm font-medium text-white hover:opacity-90 disabled:opacity-60"
          >
            {state === "sending" ? "Sending…" : submitLabel}
          </button>
          {state === "error" && <p className="text-sm text-red-600">{error}</p>}
          {editable && (
            <p className="text-xs text-slate-400">
              Preview only — submissions are disabled while editing.
            </p>
          )}
        </form>
      )}
    </section>
  );
}
