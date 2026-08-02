// Root of the hosted app. Publicly it's the Castor landing page.
// When running locally (admin enabled), it's the owner's site index instead —
// add ?preview=landing to see the public page without deploying.

import Link from "next/link";
import { AdminLoginForm } from "@/components/admin/AdminLoginForm";
import { AdminPasswordChange } from "@/components/admin/AdminPasswordChange";
import { ImportForm } from "@/components/admin/ImportForm";
import { PermissionsPanel } from "@/components/admin/PermissionsPanel";
import { LandingPage } from "@/components/marketing/LandingPage";
import { Notice } from "@/components/ui/Notice";
import { checkAdminGate } from "@/lib/auth/adminSession";
import { resolvePermissions } from "@/lib/guardian/policy";
import { getRepository } from "@/lib/storage/repository";

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ preview?: string }>;
}) {
  const gate = await checkAdminGate();
  if ((await searchParams).preview === "landing") return <LandingPage />;
  if (gate.state === "disabled") return <LandingPage />;
  if (gate.state === "not-configured") {
    return (
      <Notice title="Admin password not set">
        Set <code className="rounded bg-slate-200 px-1">ADMIN_PASSWORD</code> in{" "}
        <code className="rounded bg-slate-200 px-1">.env.local</code> and restart the dev server
        to enable the admin dashboard.
      </Notice>
    );
  }
  if (gate.state === "locked") {
    return <AdminLoginForm />;
  }

  const sites = await (await getRepository()).listSites();

  return (
    <div className="min-h-screen bg-slate-100 p-8">
      <div className="mx-auto max-w-2xl">
        <h1 className="text-2xl font-semibold text-slate-900">Castor · Admin</h1>
        <p className="mt-1 text-sm text-slate-500">
          Sites in local storage. (This dashboard is disabled when deployed.)
        </p>
        {sites.length === 0 ? (
          <p className="mt-6 rounded-lg border border-dashed border-slate-300 p-6 text-sm text-slate-500">
            No sites yet. Run <code className="rounded bg-slate-200 px-1">npm run seed</code> to
            create a sample.
          </p>
        ) : (
          <ul className="mt-6 space-y-3">
            {sites.map((s) => (
              <li
                key={s.slug}
                className="flex items-center justify-between rounded-lg border border-slate-200 bg-white p-4 shadow-sm"
              >
                <div>
                  <div className="font-medium text-slate-900">{s.name}</div>
                  <div className="text-xs text-slate-400">
                    /{s.slug} · {s.publishedVersionId ? "published" : "not published"}
                  </div>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <PermissionsPanel slug={s.slug} permissions={resolvePermissions(s.permissions)} />
                  <Link
                    href={`/admin/submissions/${s.slug}`}
                    className="text-slate-600 underline"
                  >
                    submissions
                  </Link>
                  <Link href={`/${s.slug}`} className="text-slate-600 underline">
                    view
                  </Link>
                  <Link href={`/edit/${s.slug}`} className="text-slate-600 underline">
                    client editor
                  </Link>
                  <Link
                    href={`/admin/edit/${s.slug}`}
                    className="font-medium text-purple-700 underline"
                  >
                    admin edit
                  </Link>
                </div>
              </li>
            ))}
          </ul>
        )}

        {/* Site creation is deliberately not a form here: ingestion is
            AI-driven (the castor-ingest skill), not a Playwright snapshot. */}
        <p className="mt-6 text-xs text-slate-400">
          New sites are ingested with Claude — see the{" "}
          <code className="rounded bg-slate-200 px-1">castor-ingest</code> skill.
        </p>

        <ImportForm />

        <AdminPasswordChange />
      </div>
    </div>
  );
}
