// Editor for a site's home page, at /edit/[slug].
// The editor lives under its own top-level /edit/* prefix (not /[slug]/edit) so
// a content page path — including one literally named "edit" — can never
// collide with it. Sub-pages are served by app/edit/[slug]/[...path]/page.tsx.

// Always render fresh from the database so every existing site picks up
// content edits and redeployed code with no re-ingest. (Low-traffic agency
// CMS — correctness over caching.)
export const dynamic = "force-dynamic";

import { EditSitePage } from "@/components/pages/EditSitePage";

export default async function EditHomePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  return <EditSitePage slug={slug} path="" />;
}
