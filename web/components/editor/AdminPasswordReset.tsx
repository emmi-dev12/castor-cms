"use client";

// Owner-side password reset. Replaces the old window.prompt: it defaults to a
// generated high-entropy password (the actual defence against distributed
// guessing) and shows the value so it can be copied to the client — a prompt
// couldn't do either.

import { useState } from "react";
import { generateSitePassword } from "@/lib/security/passwords";

export function AdminPasswordReset({ slug }: { slug: string }) {
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState("");
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);

  function start() {
    setValue(generateSitePassword());
    setMsg("");
    setOpen(true);
  }

  async function save() {
    setBusy(true);
    const res = await fetch(`/api/admin/${slug}/manage`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ op: "set-password", password: value }),
    });
    const data = (await res.json()) as { ok: boolean; reason?: string };
    setBusy(false);
    setMsg(data.ok ? "Saved ✓ — send this password to the client." : `Failed: ${data.reason ?? ""}`);
    if (data.ok) setOpen(false);
  }

  if (!open) {
    return (
      <>
        <button
          type="button"
          onClick={start}
          className="block text-sm text-slate-600 underline hover:text-slate-900"
        >
          Reset client password
        </button>
        {msg && <p className="mt-1 text-xs text-slate-600">{msg}</p>}
      </>
    );
  }

  return (
    <div>
      <label className="block text-xs font-medium text-slate-600">New client password</label>
      <input
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        className="mt-1 w-full rounded-md border border-slate-300 px-2 py-1.5 font-mono text-xs outline-none focus:border-slate-500"
      />
      <div className="mt-1 flex gap-2">
        <button
          type="button"
          onClick={() => setValue(generateSitePassword())}
          className="text-xs text-slate-500 underline hover:text-slate-800"
        >
          Regenerate
        </button>
        <button
          type="button"
          onClick={() => navigator.clipboard?.writeText(value)}
          className="text-xs text-slate-500 underline hover:text-slate-800"
        >
          Copy
        </button>
      </div>
      <div className="mt-3 flex gap-2">
        <button
          type="button"
          disabled={busy || !value}
          onClick={save}
          className="rounded-md bg-slate-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-slate-700 disabled:opacity-50"
        >
          {busy ? "Saving…" : "Save"}
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="rounded-md border border-slate-300 px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-50"
        >
          Cancel
        </button>
      </div>
      {msg && <p className="mt-2 text-xs text-slate-600">{msg}</p>}
    </div>
  );
}
