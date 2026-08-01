// Owner master editor — full control, no password, LOCAL ONLY. Renders the
// same EditorApp as the client editor but in `admin` mode (free-tier edits +
// structural controls). Disabled in production via isAdminEnabled().

import Link from "next/link";
import { ALL_PERMISSIONS } from "@/lib/guardian/policy";
import { AdminLoginForm } from "@/components/admin/AdminLoginForm";
import { EditorApp } from "@/components/editor/EditorApp";
import { Notice } from "@/components/ui/Notice";
import { checkAdminGate } from "@/lib/auth/adminSession";
import { getPage } from "@/lib/model/content";
import { getRepository } from "@/lib/storage/repository";

export async function AdminEditSitePage({ slug, path }: { slug: string; path: string }) {
  const gate = await checkAdminGate();
  if (gate.state === "disabled") {
    return (
      <Notice title="Admin editor is local-only">
        The owner editor runs only on the owner&apos;s computer. Clients use their own
        password-gated editor link.
      </Notice>
    );
  }
  if (gate.state === "not-configured") {
    return (
      <Notice title="Admin password not set">
        Set <code className="rounded bg-slate-200 px-1">ADMIN_PASSWORD</code> in{" "}
        <code className="rounded bg-slate-200 px-1">.env.local</code> and restart the dev server
        to enable the admin editor.
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
        There’s no site with that slug.{" "}
        <Link href="/" className="underline">
          Back to dashboard
        </Link>
        .
      </Notice>
    );
  }

  const page = getPage(site.draft, path);
  if (!page) {
    return (
      <Notice title="Page not found">
        {site.name} has no page at this address.{" "}
        <Link href={`/admin/edit/${slug}`} className="underline">
          Go to its home page
        </Link>
        .
      </Notice>
    );
  }

  const versions = site.versions.map((v) => ({ id: v.id, createdAt: v.createdAt, label: v.label }));
  const allPages = site.draft.pages.map((p) => ({ path: p.path, title: p.title }));

  return (
    <EditorApp
      slug={slug}
      siteName={site.name}
      page={page}
      allPages={allPages}
      permissions={ALL_PERMISSIONS}
      versions={versions}
      publishedVersionId={site.publishedVersionId}
      admin
    />
  );
}
