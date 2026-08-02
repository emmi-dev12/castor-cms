// Turn unpacked files into Castor pages: work out which files are pages, point
// every asset reference at the content-addressed store, and tag editable text
// and images so the imported site is a CMS site rather than a screenshot.
//
// Tagging deliberately mirrors lib/ingest/snapshot.ts — same token format, same
// `data-slot-id` attributes — so `applySlots` renders these sections with no
// changes and the two ingest paths can't drift.

import { createHash } from "node:crypto";
import { parse } from "node-html-parser";
import { TOKEN_DELIM } from "../ingest/tokens";
import type { Slot } from "../model/types";

export const sha256 = (bytes: Uint8Array): string =>
  createHash("sha256").update(bytes).digest("hex");

const tok = (key: string) => `${TOKEN_DELIM}${key}${TOKEN_DELIM}`;

const TYPES: Record<string, string> = {
  html: "text/html",
  htm: "text/html",
  css: "text/css",
  js: "text/javascript",
  mjs: "text/javascript",
  json: "application/json",
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  gif: "image/gif",
  webp: "image/webp",
  avif: "image/avif",
  svg: "image/svg+xml",
  ico: "image/x-icon",
  woff: "font/woff",
  woff2: "font/woff2",
  ttf: "font/ttf",
  otf: "font/otf",
  eot: "application/vnd.ms-fontobject",
  mp4: "video/mp4",
  webm: "video/webm",
  mp3: "audio/mpeg",
  txt: "text/plain",
  xml: "application/xml",
  pdf: "application/pdf",
};

export function contentTypeFor(path: string): string {
  const ext = path.split(".").pop()?.toLowerCase() ?? "";
  return TYPES[ext] ?? "application/octet-stream";
}

export function isHtml(path: string): boolean {
  return /\.html?$/i.test(path);
}

/**
 * File path -> Castor page path.
 *   index.html        -> ""        (home)
 *   about.html        -> "about"
 *   about/index.html  -> "about"
 */
export function pagePathFor(filePath: string): string {
  let p = filePath.replace(/\.html?$/i, "");
  p = p.replace(/(^|\/)index$/i, "");
  return p.replace(/^\/+|\/+$/g, "");
}

/** Human title for a page path, used when the document has no <title>. */
export function titleFor(pagePath: string): string {
  if (!pagePath) return "Home";
  const last = pagePath.split("/").pop() ?? pagePath;
  return last.replace(/[-_]+/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

/** Resolve a relative reference against the directory of the file holding it. */
export function resolveRef(fromFile: string, ref: string): string {
  if (ref.startsWith("/")) return ref.replace(/^\/+/, "");
  const dir = fromFile.includes("/") ? fromFile.slice(0, fromFile.lastIndexOf("/")) : "";
  const parts = (dir ? `${dir}/${ref}` : ref).split("/");
  const out: string[] = [];
  for (const part of parts) {
    if (part === "" || part === ".") continue;
    if (part === "..") out.pop();
    else out.push(part);
  }
  return out.join("/");
}

/** References we never rewrite: they don't point inside the archive. */
export function isExternalRef(ref: string): boolean {
  return (
    ref === "" ||
    /^[a-z][a-z0-9+.-]*:/i.test(ref) || // http:, https:, mailto:, tel:, data:
    ref.startsWith("//") ||
    ref.startsWith("#")
  );
}

/** Split a URL into its path and whatever query/hash trails it. */
function splitRef(ref: string): { path: string; suffix: string } {
  const m = /^([^?#]*)([?#].*)?$/.exec(ref)!;
  return { path: m[1] ?? "", suffix: m[2] ?? "" };
}

export interface RewriteContext {
  /** The file this markup or CSS came from, for resolving relative refs. */
  fromFile: string;
  /** Archive path -> stored asset sha. */
  assets: Map<string, string>;
  /** Archive path -> Castor page path, for internal links. */
  pages: Map<string, string>;
  /** The site being imported, so links can point at /<slug>/<page>. */
  slug: string;
}

/** Point one reference at the asset store, another page, or leave it alone. */
export function rewriteRef(ref: string, ctx: RewriteContext): string {
  if (isExternalRef(ref)) return ref;
  const { path, suffix } = splitRef(ref);
  if (!path) return ref;
  const resolved = resolveRef(ctx.fromFile, path);

  const sha = ctx.assets.get(resolved);
  if (sha) return `/assets/${sha}${suffix}`;

  const pagePath = ctx.pages.get(resolved);
  if (pagePath !== undefined) {
    return `/${ctx.slug}${pagePath ? `/${pagePath}` : ""}${suffix}`;
  }
  return ref; // unknown target: leave it rather than break it
}

/** Rewrite url(...) inside a stylesheet or a style attribute. */
export function rewriteCssUrls(css: string, ctx: RewriteContext): string {
  return css.replace(/url\(\s*(['"]?)([^'")]+)\1\s*\)/gi, (whole, quote: string, ref: string) => {
    const next = rewriteRef(ref.trim(), ctx);
    return next === ref.trim() ? whole : `url(${quote}${next}${quote})`;
  });
}

/** A `srcset` is a comma-separated list of "url descriptor" pairs. */
function rewriteSrcset(value: string, ctx: RewriteContext): string {
  return value
    .split(",")
    .map((part) => {
      const trimmed = part.trim();
      if (!trimmed) return trimmed;
      const [url, ...rest] = trimmed.split(/\s+/);
      return [rewriteRef(url!, ctx), ...rest].join(" ");
    })
    .join(", ");
}

export interface PreparedPage {
  title: string;
  head: string;
  body: string;
  slots: Slot[];
}

const URL_ATTRS = ["src", "href", "poster", "data-src"];
const SKIP_TAGS = new Set(["SCRIPT", "STYLE", "IMG", "SVG", "PATH", "NOSCRIPT", "TEMPLATE"]);

/**
 * Rewrite every reference in a document and tag its editable leaves.
 * `maxSlots` bounds how much of a huge page becomes editable.
 */
export function prepareHtml(html: string, ctx: RewriteContext, maxSlots = 400): PreparedPage {
  const root = parse(html, { comment: true });
  const slots: Slot[] = [];
  let i = 0;

  // 1. Asset and page references.
  for (const el of root.querySelectorAll("*")) {
    for (const attr of URL_ATTRS) {
      const value = el.getAttribute(attr);
      if (value) el.setAttribute(attr, rewriteRef(value, ctx));
    }
    const srcset = el.getAttribute("srcset");
    if (srcset) el.setAttribute("srcset", rewriteSrcset(srcset, ctx));
    const style = el.getAttribute("style");
    if (style) el.setAttribute("style", rewriteCssUrls(style, ctx));
  }
  for (const styleEl of root.querySelectorAll("style")) {
    styleEl.set_content(rewriteCssUrls(styleEl.innerHTML, ctx));
  }

  // 2. Images become editable slots.
  for (const img of root.querySelectorAll("img")) {
    if (slots.length >= maxSlots) break;
    const id = `s${i++}`;
    const src = img.getAttribute("src") ?? "";
    const alt = img.getAttribute("alt") ?? "";
    img.setAttribute("data-slot-id", id);
    img.setAttribute("src", tok(`${id}#src`));
    img.setAttribute("alt", tok(`${id}#alt`));
    slots.push({ id, type: "image", label: "image", value: { src, alt } });
  }

  // 3. Text leaves — elements whose content is text only.
  const body = root.querySelector("body") ?? root;
  for (const el of body.querySelectorAll("*")) {
    if (slots.length >= maxSlots) break;
    if (SKIP_TAGS.has(el.tagName?.toUpperCase() ?? "")) continue;
    if (el.querySelectorAll("*").length > 0) continue; // not a leaf
    const text = el.text.trim();
    if (!text) continue;
    const id = `s${i++}`;
    el.setAttribute("data-slot-id", id);
    el.set_content(tok(id));
    slots.push({ id, type: "text", label: text.slice(0, 24), value: text });
  }

  const headEl = root.querySelector("head");
  const titleText = root.querySelector("title")?.text?.trim();

  return {
    title: titleText || titleFor(pagePathFor(ctx.fromFile)),
    head: headEl ? headEl.innerHTML : "",
    body: (root.querySelector("body") ?? root).innerHTML,
    slots,
  };
}

/** Assemble a full document for the sandboxed frame. */
export function assembleDocument(head: string, body: string, lang = "en"): string {
  return `<!doctype html><html lang="${lang}"><head>${head}</head><body>${body}</body></html>`;
}
