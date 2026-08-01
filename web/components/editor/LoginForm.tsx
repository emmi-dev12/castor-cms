"use client";

// The first thing a client ever sees, so it leads with their business name and
// a plain-English explanation rather than a bare password box. Showing the site
// name here leaks nothing extra: the public site at /[slug] already reveals that
// the slug exists.

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function LoginForm({ slug, siteName }: { slug: string; siteName: string }) {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const res = await fetch(`/api/${slug}/login`, {
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
          {/* Branded header so the client immediately recognises their own site */}
          <div className="border-b border-slate-100 bg-slate-900 px-7 py-6 text-center">
            <p className="text-xs font-medium uppercase tracking-widest text-slate-400">
              Website editor
            </p>
            <h1 className="mt-1 text-2xl font-semibold text-white">{siteName}</h1>
          </div>

          <form onSubmit={onSubmit} className="px-7 py-6">
            <h2 className="text-lg font-semibold text-slate-900">Welcome back 👋</h2>
            <p className="mt-1.5 text-sm leading-relaxed text-slate-600">
              Sign in to update your website&apos;s text and images. Nothing goes live until you
              press <strong className="font-medium text-slate-800">Publish</strong> — and you can
              undo any change afterwards.
            </p>

            <label htmlFor="password" className="mt-5 block text-sm font-medium text-slate-700">
              Your password
            </label>
            <input
              id="password"
              type="password"
              autoFocus
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter the password you were given"
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
              {busy ? "Checking…" : "Unlock editor"}
            </button>

            <p className="mt-5 border-t border-slate-100 pt-4 text-center text-xs text-slate-500">
              Lost your password? Ask whoever set up your site.{" "}
              <Link href={`/${slug}`} className="underline hover:text-slate-800">
                View your live site
              </Link>
            </p>
          </form>
        </div>

        <p className="mt-4 text-center text-xs text-slate-400">Powered by Castor</p>
      </div>
    </div>
  );
}
