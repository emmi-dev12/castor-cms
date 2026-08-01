// Playwright snapshot + tagger (LOCAL admin only). Loads a URL, freezes the
// rendered DOM, strips scripts, rewrites URLs to absolute (so CSS/images
// hotlink from the source), and tags text/image leaves as editable slots.
// Server-only, dynamic import so the bundler never traces Playwright.
//
// Slot content is replaced with a token DELIM+key+DELIM so current values can be
// substituted into the HTML string server-side (see lib/ingest/tokens.ts) —
// correct without JS. DELIM is U+E000 (a private-use code point).

import { TOKEN_DELIM } from "./tokens";
import type { Slot } from "../model/types";

export interface Snapshot {
  title: string;
  head: string;
  body: string;
  slots: Slot[];
}

/** Runs inside the page (browser context). Returns a serializable Snapshot. */
function tagInPage(args: { maxSlots: number; delimCode: number }): Snapshot {
  const { maxSlots, delimCode } = args;
  const D = String.fromCharCode(delimCode);
  const tok = (t: string) => `${D}${t}${D}`;

  const abs = (u: string | null): string => {
    if (!u) return "";
    try {
      return new URL(u, location.href).href;
    } catch {
      return u;
    }
  };

  // 1. Strip anything executable or embedded.
  document
    .querySelectorAll("script, noscript, iframe, object, embed")
    .forEach((el) => el.remove());
  // 2. Rewrite URLs to absolute so styles/images load from the origin.
  document.querySelectorAll("[href]").forEach((el) => {
    el.setAttribute("href", abs(el.getAttribute("href")));
  });
  document.querySelectorAll("[src]").forEach((el) => {
    el.setAttribute("src", abs(el.getAttribute("src")));
  });
  // 3. Remove inline event handlers.
  document.querySelectorAll("*").forEach((el) => {
    for (const attr of Array.from(el.attributes)) {
      if (attr.name.startsWith("on")) el.removeAttribute(attr.name);
    }
  });
  // 3b. Rewrite relative url(...) refs inside <style> text and inline style=""
  // attributes to absolute — the href/src pass above only touches attributes,
  // so CSS-embedded urls (background images, @font-face src) would otherwise
  // resolve against the deployed site's origin instead of the source site's.
  const rewriteCssUrls = (css: string): string =>
    css.replace(/url\(\s*(['"]?)(.*?)\1\s*\)/g, (match, quote: string, u: string) => {
      if (!u || u.startsWith("data:")) return match;
      return `url(${quote}${abs(u)}${quote})`;
    });
  document.querySelectorAll("style").forEach((el) => {
    if (el.textContent) el.textContent = rewriteCssUrls(el.textContent);
  });
  document.querySelectorAll("[style]").forEach((el) => {
    const style = el.getAttribute("style");
    if (style) el.setAttribute("style", rewriteCssUrls(style));
  });

  const slots: Slot[] = [];
  let i = 0;

  // 4. Tag images. src/alt become tokens; originals stored on the slot.
  document.querySelectorAll("img").forEach((img) => {
    if (slots.length >= maxSlots) return;
    const id = `s${i++}`;
    const src = img.getAttribute("src") ?? "";
    const alt = img.getAttribute("alt") ?? "";
    img.setAttribute("data-slot-id", id);
    img.setAttribute("src", tok(`${id}#src`));
    img.setAttribute("alt", tok(`${id}#alt`));
    slots.push({ id, type: "image", label: "image", value: { src, alt } });
  });

  // 5. Tag text leaves — elements whose children are all text (no element kids).
  const SKIP = new Set(["SCRIPT", "STYLE", "IMG", "SVG", "PATH"]);
  document.querySelectorAll("body *").forEach((el) => {
    if (slots.length >= maxSlots) return;
    if (SKIP.has(el.tagName)) return;
    if (el.children.length > 0) return; // not a leaf
    const text = (el.textContent ?? "").trim();
    if (!text) return;
    const id = `s${i++}`;
    el.setAttribute("data-slot-id", id);
    el.textContent = tok(id);
    slots.push({ id, type: "text", label: text.slice(0, 24), value: text });
  });

  return {
    title: document.title,
    head: document.head.innerHTML,
    body: document.body.innerHTML,
    slots,
  };
}

/** Load a URL and return a tagged snapshot. Local admin only. */
export async function snapshot(url: string, maxSlots = 400): Promise<Snapshot> {
  const { chromium } = await import("playwright");
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
    await page.goto(url, { waitUntil: "networkidle", timeout: 45000 });
    // Nudge lazy-loaded content in.
    await page.evaluate(async () => {
      for (let y = 0; y < document.body.scrollHeight; y += 600) {
        window.scrollTo(0, y);
        await new Promise((r) => setTimeout(r, 100));
      }
      window.scrollTo(0, 0);
    });
    return await page.evaluate(tagInPage, {
      maxSlots,
      delimCode: TOKEN_DELIM.charCodeAt(0),
    });
  } finally {
    await browser.close();
  }
}
