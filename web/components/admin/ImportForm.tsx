"use client";

// Drag a ZIP of a built site onto the dashboard and it becomes an editable
// Castor site. Local admin only.

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { PRESETS } from "@/lib/guardian/policy";
import { generateSitePassword } from "@/lib/security/passwords";

interface Result {
  slug: string;
  pages: { path: string; title: string; slots: number }[];
  assetCount: number;
  totalBytes: number;
}

export function ImportForm() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [dragging, setDragging] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<Result | null>(null);
  // Generated up front so it's shown even if the client never asks for it.
  const [password, setPassword] = useState(() => generateSitePassword());

  function take(f: File | undefined) {
    if (!f) return;
    if (!/\.zip$/i.test(f.name)) {
      setError("That isn't a .zip file.");
      return;
    }
    setError("");
    setFile(f);
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!file) {
      setError("Choose a ZIP first.");
      return;
    }
    const form = new FormData(e.currentTarget);
    form.set("file", file);
    form.set("password", password);

    setBusy(true);
    setError("");
    const res = await fetch("/api/admin/import", { method: "POST", body: form }).catch(() => null);
    const data = (await res?.json().catch(() => null)) as
      | ({ ok: true } & Result)
      | { ok: false; reason?: string }
      | null;
    setBusy(false);

    if (!data?.ok) {
      setError(data?.reason ?? "Import failed.");
      return;
    }
    setResult(data);
    router.refresh();
  }

  if (result) {
    return (
      <section className="mt-6 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="text-sm font-semibold text-slate-800">
          Imported {result.pages.length} page{result.pages.length === 1 ? "" : "s"}
        </h2>
        <p className="mt-1 text-xs text-slate-500">
          {result.assetCount} asset{result.assetCount === 1 ? "" : "s"} ·{" "}
          {(result.totalBytes / (1024 * 1024)).toFixed(1)} MB
        </p>
        <ul className="mt-3 space-y-1 text-sm text-slate-600">
          {result.pages.map((p) => (
            <li key={p.path}>
              /{result.slug}
              {p.path ? `/${p.path}` : ""} — {p.title}{" "}
              <span className="text-slate-400">({p.slots} editable)</span>
            </li>
          ))}
        </ul>
        <p className="mt-3 rounded-md bg-slate-50 p-2 text-xs text-slate-600">
          Client password (shown once):{" "}
          <code className="font-mono text-slate-900">{password}</code>
        </p>
        <button
          type="button"
          onClick={() => {
            setResult(null);
            setFile(null);
            setPassword(generateSitePassword());
          }}
          className="mt-3 text-sm text-slate-600 underline"
        >
          Import another
        </button>
      </section>
    );
  }

  return (
    <section className="mt-6 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <h2 className="text-sm font-semibold text-slate-800">Import a site</h2>
      <p className="mt-1 text-xs text-slate-500">
        A ZIP of a <strong>built</strong> site — HTML, CSS, images. Export it from your framework
        first; source projects can&rsquo;t be built here.
      </p>

      <form onSubmit={onSubmit} className="mt-3 space-y-3">
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragging(false);
            take(e.dataTransfer.files[0]);
          }}
          onClick={() => inputRef.current?.click()}
          className={`cursor-pointer rounded-lg border-2 border-dashed p-6 text-center text-sm transition ${
            dragging ? "border-slate-900 bg-slate-50" : "border-slate-300 text-slate-500"
          }`}
        >
          {file ? (
            <span className="text-slate-800">
              {file.name}{" "}
              <span className="text-slate-400">({(file.size / (1024 * 1024)).toFixed(1)} MB)</span>
            </span>
          ) : (
            <span>Drop a .zip here, or click to choose</span>
          )}
          <input
            ref={inputRef}
            type="file"
            accept=".zip,application/zip"
            className="hidden"
            onChange={(e) => take(e.target.files?.[0])}
          />
        </div>

        <div className="grid gap-2 sm:grid-cols-3">
          <input
            name="slug"
            required
            placeholder="slug (e.g. client-a)"
            pattern="[a-z0-9][a-z0-9-]*"
            title="Lowercase letters, numbers and dashes"
            className="rounded-md border border-slate-300 px-2 py-1.5 text-sm"
          />
          <input
            name="name"
            placeholder="Business name"
            className="rounded-md border border-slate-300 px-2 py-1.5 text-sm"
          />
          <select
            name="preset"
            defaultValue="content"
            className="rounded-md border border-slate-300 px-2 py-1.5 text-sm"
            title="What the client may change"
          >
            {PRESETS.map((p) => (
              <option key={p.id} value={p.id}>
                {p.label}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={busy}
            className="rounded-md bg-slate-900 px-3 py-1.5 text-sm font-medium text-white disabled:opacity-60"
          >
            {busy ? "Importing…" : "Import"}
          </button>
          {error ? (
            <p role="alert" className="text-sm text-red-600">
              {error}
            </p>
          ) : (
            <p className="text-xs text-slate-400">Scripts are kept and run isolated in a sandbox.</p>
          )}
        </div>
      </form>
    </section>
  );
}
