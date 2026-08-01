// Public view of any non-home page of a site, e.g. /acme/about.
// Sibling to app/[slug]/page.tsx (home) — this route only matches when at
// least one extra path segment is present, so the two never collide.
// Note: a page whose path is literally "edit" is unreachable here because it
// collides with app/[slug]/edit/*; avoid that path when authoring content.

// Always render fresh from the database so every existing site picks up
// content edits and redeployed code with no re-ingest. (Low-traffic agency
// CMS — correctness over caching.)
export const dynamic = "force-dynamic";

import type { Metadata } from "next";
import { PublicSitePage, publicMetadata } from "@/components/pages/PublicSitePage";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string; path: string[] }>;
}): Promise<Metadata> {
  const { slug, path } = await params;
  return publicMetadata(slug, path.join("/"));
}

export default async function PublicSubPage({
  params,
}: {
  params: Promise<{ slug: string; path: string[] }>;
}) {
  const { slug, path } = await params;
  return <PublicSitePage slug={slug} path={path.join("/")} />;
}
