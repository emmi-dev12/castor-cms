import type { MetadataRoute } from "next";
import { publishedContent } from "@/lib/model/content";
import { getRepository } from "@/lib/storage/repository";

const BASE = process.env.SITE_URL ?? "https://castorcms.vercel.app";

// Read from the DB per request (published content changes without a redeploy).
export const dynamic = "force-dynamic";

// Every published page of every site. Note: because all sites share one domain,
// this enumerates the client list — fine for a single-owner setup, but drop this
// file if you'd rather clients not be discoverable together.
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const sites = await (await getRepository()).listSites();
  const entries: MetadataRoute.Sitemap = [];

  for (const site of sites) {
    const content = publishedContent(site);
    if (!content) continue; // unpublished sites aren't public
    for (const page of content.pages) {
      const path = page.path ? `/${site.slug}/${page.path}` : `/${site.slug}`;
      entries.push({
        url: `${BASE}${path}`,
        lastModified: site.updatedAt ? new Date(site.updatedAt) : undefined,
      });
    }
  }
  return entries;
}
