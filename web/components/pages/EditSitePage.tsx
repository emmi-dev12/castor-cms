// Shared logic for the client editor view of a site page. Used by both
// app/[slug]/edit/page.tsx (home, path="") and app/[slug]/edit/[...path]/page.tsx
// (any other page), so both routes stay thin and share one set of notices.

import { EditorApp } from "@/components/editor/EditorApp";
import { resolvePermissions } from "@/lib/guardian/policy";
import { LoginForm } from "@/components/editor/LoginForm";
import { Notice } from "@/components/ui/Notice";
import { hasSession } from "@/lib/auth/session";
import { getPage } from "@/lib/model/content";
import { getRepository } from "@/lib/storage/repository";

export async function EditSitePage({ slug, path }: { slug: string; path: string }) {
  const site = await (await getRepository()).getSite(slug);

  if (!site) {
    return (
      <Notice title="This site isn’t here">
        There’s no site at this address to edit. Please use the exact link you were given.
      </Notice>
    );
  }

  if (!(await hasSession(slug))) {
    return <LoginForm slug={slug} siteName={site.name} />;
  }

  const page = getPage(site.draft, path);
  if (!page) {
    return (
      <Notice title="Page not found">
        {site.name} doesn’t have a page at this address in the draft.
      </Notice>
    );
  }

  const versions = site.versions.map((v) => ({
    id: v.id,
    createdAt: v.createdAt,
    label: v.label,
  }));
  const allPages = site.draft.pages.map((p) => ({ path: p.path, title: p.title }));

  return (
    <EditorApp
      slug={slug}
      siteName={site.name}
      page={page}
      allPages={allPages}
      permissions={resolvePermissions(site.permissions, page.permissions)}
      versions={versions}
      publishedVersionId={site.publishedVersionId}
    />
  );
}
