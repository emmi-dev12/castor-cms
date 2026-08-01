"use client";

// Lets a client change their own password from inside the editor. Inline form
// rather than window.prompt: prompts can't validate, can't mask input, and
// can't show a useful error.

import { useState } from "react";
import { generateSitePassword } from "@/lib/security/passwords";

export function PasswordChange({ slug }: { slug: string }) {
  const [open, setOpen] = useState(false);
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMsg("");
    try {
      const res = await fetch(`/api/${slug}/password`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ currentPassword: current, newPassword: next }),
      });
      const data = (await res.json()) as { ok: boolean; reason?: string };
      if (data.ok) {
        setMsg("Password updated ✓");
        setCurrent("");
        setNext("");
        setOpen(false);
      } else {
        setMsg(data.reason ?? "Could not change password.");
      }
    } catch {
      setMsg("Network error.");
    } finally {
      setBusy(false);
    }
  }

  const field =
    "mt-1 w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm outline-none focus:border-slate-500";

  return (
    <section>
      <h2 className="mb-2 text-sm font-semibold text-slate-700">Your account</h2>
      <div className="rounded-lg border border-slate-200 bg-white p-3">
        {!open ? (
          <button
            type="button"
            onClick={() => {
              setOpen(true);
              setMsg("");
            }}
            className="text-sm text-slate-600 underline hover:text-slate-900"
          >
            Change password
          </button>
        ) : (
          <form onSubmit={onSubmit}>
            <label className="block text-xs font-medium text-slate-600">Current password</label>
            <input
              type="password"
              autoComplete="current-password"
              value={current}
              onChange={(e) => setCurrent(e.target.value)}
              className={field}
            />
            <div className="mt-2 flex items-baseline justify-between">
              <label className="block text-xs font-medium text-slate-600">New password</label>
              <button
                type="button"
                onClick={() => {
                  const p = generateSitePassword();
                  setNext(p);
                  setMsg(`Suggested: ${p} — save it somewhere safe.`);
                }}
                className="text-xs text-slate-500 underline hover:text-slate-800"
              >
                Suggest a strong one
              </button>
            </div>
            <input
              type="text"
              autoComplete="new-password"
              value={next}
              onChange={(e) => setNext(e.target.value)}
              placeholder="At least 8 characters"
              className={field}
            />
            <div className="mt-3 flex gap-2">
              <button
                type="submit"
                disabled={busy || !current || !next}
                className="rounded-md bg-slate-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-slate-700 disabled:opacity-50"
              >
                {busy ? "Saving…" : "Save"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setOpen(false);
                  setMsg("");
                }}
                className="rounded-md border border-slate-300 px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-50"
              >
                Cancel
              </button>
            </div>
          </form>
        )}
        {msg && <p className="mt-2 text-xs text-slate-600">{msg}</p>}
      </div>
    </section>
  );
}
