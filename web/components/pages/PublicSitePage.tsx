// Shared logic for the public (published) view of a site page. Used by both
// app/[slug]/page.tsx (home, path="") and app/[slug]/[...path]/page.tsx
// (any other page), so both routes stay thin and share one set of notices.

import type { Metadata } from "next";
import Link from "next/link";
import { PublicNav } from "@/components/pages/PublicNav";
import { SiteView } from "@/components/sections/SiteView";
import { Notice } from "@/components/ui/Notice";
import { getPage, publishedContent } from "@/lib/model/content";
import { pageMetadata } from "@/lib/model/seo";
import { getSiteCached } from "@/lib/sites/read";

/**
 * Per-page SEO for a public route. Shared by both public routes' generateMetadata
 * so each published page gets its own title/description/social tags. Unpublished
 * or unknown pages fall back to a minimal, non-indexed-friendly title.
 */
export async function publicMetadata(slug: string, path: string): Promise<Metadata> {
  const site = await getSiteCached(slug);
  if (!site) return { title: "Site not found" };
  const content = publishedContent(site);
  const page = content ? getPage(content, path) : null;
  if (!content || !page) return { title: site.name };
  return pageMetadata(site, page, slug, path);
}

export async function PublicSitePage({ slug, path }: { slug: string; path: string }) {
  const site = await getSiteCached(slug);

  if (!site) {
    return (
      <Notice title="This site isn’t here">
        We couldn’t find a site at this address. If you were given an editing link, please head back
        to your own link — you can only reach the site that was shared with you.
      </Notice>
    );
  }

  const content = publishedContent(site);
  if (!content) {
    return (
      <Notice title={`${site.name} isn’t live yet`}>
        This site hasn’t been published.{" "}
        <Link href={`/edit/${slug}`} className="underline">
          Open the editor
        </Link>{" "}
        and hit Publish to make it public.
      </Notice>
    );
  }

  const page = getPage(content, path);
  if (!page) {
    return (
      <Notice title="Page not found">
        {site.name} doesn’t have a page at this address.{" "}
        <Link href={`/${slug}`} className="underline">
          Go to the homepage
        </Link>
        .
      </Notice>
    );
  }

  return (
    <>
      {content.pages.length > 1 && (
        <PublicNav slug={slug} pages={content.pages} currentPath={page.path} />
      )}
      <SiteView page={page} editable={false} siteSlug={slug} />
    </>
  );
}
