// Public view of a site's home page. Unknown slug -> polite note.
// Other pages are served by app/[slug]/[...path]/page.tsx.

// Always render fresh from the database so every existing site picks up
// content edits and redeployed code with no re-ingest. (Low-traffic agency
// CMS — correctness over caching.)
export const dynamic = "force-dynamic";

import type { Metadata } from "next";
import { PublicSitePage, publicMetadata } from "@/components/pages/PublicSitePage";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  return publicMetadata(slug, "");
}

export default async function PublicHomePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  return <PublicSitePage slug={slug} path="" />;
}
