"use client";

// One submission in the admin inbox, with a delete action.

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { Submission } from "@/lib/model/types";

export function SubmissionRow({ submission }: { submission: Submission }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function onDelete() {
    if (!confirm("Delete this submission?")) return;
    setBusy(true);
    await fetch(`/api/admin/${submission.siteSlug}/submissions`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ id: submission.id }),
    });
    setBusy(false);
    router.refresh();
  }

  return (
    <li className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-2 flex items-center justify-between">
        <time className="text-xs text-slate-400">
          {new Date(submission.createdAt).toLocaleString()}
        </time>
        <button
          type="button"
          disabled={busy}
          onClick={onDelete}
          className="text-xs text-slate-400 underline hover:text-red-600 disabled:opacity-50"
        >
          delete
        </button>
      </div>
      <dl className="space-y-1">
        {Object.entries(submission.fields).map(([k, v]) => (
          <div key={k} className="grid grid-cols-[8rem_1fr] gap-2 text-sm">
            <dt className="truncate font-medium text-slate-500">{k}</dt>
            {/* min-w-0 lets this grid item shrink so long unbroken strings wrap
                instead of forcing the page to scroll sideways; the max height
                keeps one huge message from swamping the whole inbox. */}
            <dd className="max-h-40 min-w-0 overflow-y-auto whitespace-pre-wrap break-all text-slate-800">
              {v}
            </dd>
          </div>
        ))}
      </dl>
    </li>
  );
}
