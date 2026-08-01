// Editor for any non-home page of a site, at /edit/[slug]/[...path]
// e.g. /edit/acme/about.

// Always render fresh from the database so every existing site picks up
// content edits and redeployed code with no re-ingest. (Low-traffic agency
// CMS — correctness over caching.)
export const dynamic = "force-dynamic";

import { EditSitePage } from "@/components/pages/EditSitePage";

export default async function EditSubPage({
  params,
}: {
  params: Promise<{ slug: string; path: string[] }>;
}) {
  const { slug, path } = await params;
  return <EditSitePage slug={slug} path={path.join("/")} />;
}
