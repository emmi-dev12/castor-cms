import type { MetadataRoute } from "next";

const BASE = process.env.SITE_URL ?? "https://castorcms.vercel.app";

// Let crawlers index the public client sites, but keep them out of the editor,
// the (prod-disabled) admin surface, and the API.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/", disallow: ["/edit/", "/admin/", "/api/"] },
    sitemap: `${BASE}/sitemap.xml`,
  };
}
