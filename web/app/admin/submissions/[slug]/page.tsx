// LOCAL-only inbox: form submissions for one site, newest first.

import Link from "next/link";
import { AdminLoginForm } from "@/components/admin/AdminLoginForm";
import { SubmissionRow } from "@/components/admin/SubmissionRow";
import { Notice } from "@/components/ui/Notice";
import { checkAdminGate } from "@/lib/auth/adminSession";
import { listSubmissions } from "@/lib/sites/service";
import { getRepository } from "@/lib/storage/repository";

export default async function SubmissionsPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const gate = await checkAdminGate();
  if (gate.state === "disabled") {
    return (
      <Notice title="Submissions are local-only">
        Form submissions are readable only from the owner&apos;s computer.
      </Notice>
    );
  }
  if (gate.state === "not-configured") {
    return (
      <Notice title="Admin password not set">
        Set <code className="rounded bg-slate-200 px-1">ADMIN_PASSWORD</code> in{" "}
        <code className="rounded bg-slate-200 px-1">.env.local</code> and restart the dev server
        to enable the inbox.
      </Notice>
    );
  }
  if (gate.state === "locked") {
    return <AdminLoginForm />;
  }

  const site = await (await getRepository()).getSite(slug);
  if (!site) {
    return (
      <Notice title="Site not found">
        <Link href="/" className="underline">
          Back to dashboard
        </Link>
      </Notice>
    );
  }

  const submissions = await listSubmissions(slug);

  return (
    <div className="min-h-screen bg-slate-100 p-8">
      <div className="mx-auto max-w-2xl">
        <Link href="/" className="text-sm text-slate-500 underline">
          ← Dashboard
        </Link>
        <h1 className="mt-2 text-2xl font-semibold text-slate-900">
          {site.name} — submissions
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          {submissions.length === 0
            ? "No submissions yet."
            : `${submissions.length} submission${submissions.length === 1 ? "" : "s"}, newest first.`}
        </p>

        {submissions.length === 0 ? (
          <p className="mt-6 rounded-lg border border-dashed border-slate-300 p-6 text-sm text-slate-500">
            Add a <strong>Contact form</strong> section to this site in the admin editor, publish
            it, and submissions will appear here.
          </p>
        ) : (
          <ul className="mt-6 space-y-3">
            {submissions.map((s) => (
              <SubmissionRow key={s.id} submission={s} />
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
