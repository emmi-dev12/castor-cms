"use client";

// Change the admin dashboard password from the dashboard itself.
//
// Collapsed by default — it's a rare action, and the dashboard's job is the
// list of sites. Mirrors the client-side PasswordChange: current password
// required, strength enforced server-side, plain reason shown on refusal.

import { useState } from "react";

export function AdminPasswordChange() {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const data = new FormData(form);
    const newPassword = String(data.get("newPassword") ?? "");

    if (newPassword !== String(data.get("confirmPassword") ?? "")) {
      setMessage({ ok: false, text: "The two new passwords don't match." });
      return;
    }

    setBusy(true);
    setMessage(null);
    const res = await fetch("/api/admin/password", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        currentPassword: String(data.get("currentPassword") ?? ""),
        newPassword,
      }),
    }).catch(() => null);

    const body = (await res?.json().catch(() => null)) as
      | { ok?: boolean; reason?: string }
      | null;
    setBusy(false);

    if (!res || !body?.ok) {
      setMessage({ ok: false, text: body?.reason ?? "Couldn't change the password." });
      return;
    }
    form.reset();
    setMessage({
      ok: true,
      text: "Password changed. Use the new one next time you sign in.",
    });
  }

  return (
    <section className="mt-6 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between text-left"
      >
        <span>
          <span className="font-medium text-slate-900">Admin password</span>
          <span className="ml-2 text-xs text-slate-400">
            unlocks this dashboard and every site&rsquo;s master editor
          </span>
        </span>
        <span className="text-sm text-slate-500">{open ? "Close" : "Change"}</span>
      </button>

      {open ? (
        <form onSubmit={onSubmit} className="mt-4 space-y-3">
          <div className="grid gap-3 sm:grid-cols-3">
            <label className="block">
              <span className="mb-1 block text-xs text-slate-500">Current password</span>
              <input
                name="currentPassword"
                type="password"
                required
                autoComplete="current-password"
                className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm"
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs text-slate-500">New password</span>
              <input
                name="newPassword"
                type="password"
                required
                autoComplete="new-password"
                className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm"
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs text-slate-500">Confirm new password</span>
              <input
                name="confirmPassword"
                type="password"
                required
                autoComplete="new-password"
                className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm"
              />
            </label>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="submit"
              disabled={busy}
              className="rounded-md bg-slate-900 px-3 py-1.5 text-sm font-medium text-white disabled:opacity-60"
            >
              {busy ? "Saving…" : "Change password"}
            </button>
            {message ? (
              <p
                role="status"
                className={`text-sm ${message.ok ? "text-emerald-700" : "text-red-600"}`}
              >
                {message.text}
              </p>
            ) : (
              <p className="text-xs text-slate-400">
                Stored hashed. Once changed, ADMIN_PASSWORD in .env.local no longer signs you in.
              </p>
            )}
          </div>
        </form>
      ) : null}
    </section>
  );
}
