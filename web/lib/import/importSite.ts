// Import a ZIP of a built website as a Castor site.
//
// Local admin only: unpacking and hashing a 50 MB archive is not something to
// do inside a serverless request, and the admin surface is disabled in
// production anyway.
//
// Each HTML file becomes one Page holding a single `imported` section — the
// whole document, with editable text and images tagged as slots. Assets are
// stored by content hash, so the same logo across ten pages costs one copy.

import { newId } from "../model/content";
import type { Page, Permissions, Section, SiteContent } from "../model/types";
import { createSite, publish } from "../sites/service";
import { getRepository } from "../storage/repository";
import {
  contentTypeFor,
  isHtml,
  pagePathFor,
  prepareHtml,
  rewriteCssUrls,
  sha256,
  type RewriteContext,
} from "./prepare";
import { DEFAULT_LIMITS, unpack, type UnpackLimits } from "./unpack";

export interface ImportResult {
  slug: string;
  pages: { path: string; title: string; slots: number }[];
  assetCount: number;
  totalBytes: number;
}

export interface ImportInput {
  slug: string;
  name: string;
  password: string;
  zip: Uint8Array;
  permissions?: Permissions;
  limits?: UnpackLimits;
}

export async function importZip(input: ImportInput): Promise<ImportResult> {
  const files = unpack(input.zip, input.limits ?? DEFAULT_LIMITS);
  const repo = await getRepository();

  const htmlFiles = files.filter((f) => isHtml(f.path));
  const assetFiles = files.filter((f) => !isHtml(f.path));

  // Page paths have to be known before any HTML is rewritten, so internal
  // links can be resolved in one pass.
  const pages = new Map<string, string>();
  for (const f of htmlFiles) pages.set(f.path, pagePathFor(f.path));

  const assets = new Map<string, string>();
  let totalBytes = 0;

  const store = async (path: string, bytes: Uint8Array) => {
    const sha = sha256(bytes);
    await repo.putAsset({
      sha,
      siteSlug: input.slug,
      contentType: contentTypeFor(path),
      size: bytes.length,
      bytes,
    });
    assets.set(path, sha);
    totalBytes += bytes.length;
  };

  // Binary assets first: stylesheets reference them, and a stylesheet's own
  // hash depends on the rewritten URLs, so it can only be stored afterwards.
  for (const f of assetFiles) {
    if (!/\.css$/i.test(f.path)) await store(f.path, f.bytes);
  }
  for (const f of assetFiles) {
    if (!/\.css$/i.test(f.path)) continue;
    const ctx: RewriteContext = { fromFile: f.path, assets, pages, slug: input.slug };
    const css = rewriteCssUrls(new TextDecoder().decode(f.bytes), ctx);
    await store(f.path, new TextEncoder().encode(css));
  }

  const content: SiteContent = { pages: [] };
  for (const f of htmlFiles) {
    const ctx: RewriteContext = { fromFile: f.path, assets, pages, slug: input.slug };
    const prepared = prepareHtml(new TextDecoder().decode(f.bytes), ctx);

    const section: Section = {
      id: newId("sec"),
      type: "imported",
      slots: prepared.slots,
      template: prepared.body,
      head: prepared.head,
    };
    const page: Page = {
      id: newId("pg"),
      path: pages.get(f.path)!,
      title: prepared.title,
      sections: [section],
    };
    content.pages.push(page);
  }

  // Home first, then alphabetical — matches how the page switcher reads.
  content.pages.sort((a, b) => (a.path === "" ? -1 : b.path === "" ? 1 : a.path.localeCompare(b.path)));

  await createSite({
    slug: input.slug,
    name: input.name,
    password: input.password,
    permissions: input.permissions,
    draft: content,
  });
  await publish(input.slug, "imported");

  return {
    slug: input.slug,
    pages: content.pages.map((p) => ({
      path: p.path,
      title: p.title,
      slots: p.sections[0]?.slots.length ?? 0,
    })),
    assetCount: assets.size,
    totalBytes,
  };
}
