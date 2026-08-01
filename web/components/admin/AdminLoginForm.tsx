"use client";

// Gate in front of every /admin/* surface. Distinct from the client
// LoginForm (components/editor/LoginForm.tsx) — this is one password for the
// owner, not a per-site client password.

import { useRouter } from "next/navigation";
import { useState } from "react";

export function AdminLoginForm() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const res = await fetch("/api/admin/login", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ password }),
    });
    setBusy(false);
    if (res.ok) {
      router.refresh();
    } else {
      const data = (await res.json().catch(() => ({}))) as { reason?: string };
      setError(data.reason ?? "Login failed.");
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-100 p-6">
      <div className="w-full max-w-md">
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 bg-slate-900 px-7 py-6 text-center">
            <p className="text-xs font-medium uppercase tracking-widest text-slate-400">
              Castor
            </p>
            <h1 className="mt-1 text-2xl font-semibold text-white">Owner admin</h1>
          </div>

          <form onSubmit={onSubmit} className="px-7 py-6">
            <p className="text-sm leading-relaxed text-slate-600">
              This is the local admin — dashboard, master editor, and form inbox. Sign in with
              the admin password.
            </p>

            <label htmlFor="admin-password" className="mt-5 block text-sm font-medium text-slate-700">
              Admin password
            </label>
            <input
              id="admin-password"
              type="password"
              autoFocus
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
            />
            {error && (
              <p className="mt-2 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
            )}

            <button
              type="submit"
              disabled={busy || password === ""}
              className="mt-5 w-full rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-slate-700 disabled:opacity-50"
            >
              {busy ? "Checking…" : "Unlock admin"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
