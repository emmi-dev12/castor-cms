// Derives per-page SEO metadata from a site's published content. Runs for every
// public page so each one gets its own <title>, description, and social-share
// tags instead of the generic app-level defaults — with no editor work and no
// re-ingest (it reads whatever content is live).

import type { Metadata } from "next";
import type { ImageValue, Page, Site } from "./types";

/** First non-empty text/richtext slot value matching one of the given labels. */
function textByLabels(page: Page, labels: string[]): string | undefined {
  for (const section of page.sections) {
    for (const slot of section.slots) {
      if (
        (slot.type === "text" || slot.type === "richtext") &&
        slot.label &&
        labels.includes(slot.label) &&
        slot.value.trim()
      ) {
        return slot.value.trim();
      }
    }
  }
  return undefined;
}

/** First image slot with an absolute http(s) src — usable as an og:image. */
function firstAbsoluteImage(page: Page): string | undefined {
  for (const section of page.sections) {
    for (const slot of section.slots) {
      if (slot.type === "image") {
        const src = (slot.value as ImageValue).src?.trim();
        if (src && /^https?:\/\//i.test(src)) return src;
      }
    }
  }
  return undefined;
}

function clip(text: string, max = 160): string {
  const t = text.replace(/\s+/g, " ").trim();
  return t.length <= max ? t : `${t.slice(0, max - 1).trimEnd()}…`;
}

/** Build Next.js Metadata for one published page of a site. */
export function pageMetadata(site: Site, page: Page, slug: string, path: string): Metadata {
  const brand = (site.name || slug).trim();
  const pageTitle = (page.title || "").trim();
  // Home page → the brand alone; sub-pages → "Section · Brand". A generic
  // stored title like "Home" would be poor SEO, so fold it into the brand.
  const isHome = path === "" || /^home$/i.test(pageTitle);
  const title = isHome || !pageTitle ? brand : `${pageTitle} · ${brand}`;

  // A meta description search engines will show: prefer an explicit subhead/
  // intro, then a heading+body, else the site name.
  const description = clip(
    textByLabels(page, ["subhead", "intro", "body"]) ??
      textByLabels(page, ["headline", "heading"]) ??
      site.name ??
      title,
  );

  const url = path ? `/${slug}/${path}` : `/${slug}`;
  const image = firstAbsoluteImage(page);

  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      title,
      description,
      url,
      siteName: site.name,
      type: "website",
      images: image ? [image] : undefined,
    },
    twitter: {
      card: image ? "summary_large_image" : "summary",
      title,
      description,
      images: image ? [image] : undefined,
    },
  };
}
