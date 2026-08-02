// Tests for the ZIP import pipeline. The unpack cases are the important ones:
// the archive is untrusted, so path traversal and size limits are the security
// boundary, not a nicety.
//
// Run: npm test

import assert from "node:assert/strict";
import { test } from "node:test";
import { zipSync } from "fflate";
import { TOKEN_DELIM } from "../ingest/tokens";
import {
  contentTypeFor,
  isExternalRef,
  pagePathFor,
  prepareHtml,
  resolveRef,
  rewriteCssUrls,
  rewriteRef,
  type RewriteContext,
} from "./prepare";
import { DEFAULT_LIMITS, UnpackError, safeEntryPath, stripCommonRoot, unpack } from "./unpack";

// ── Archive safety ───────────────────────────────────────────────────────────

test("traversal, absolute and drive-letter entries are refused", () => {
  assert.equal(safeEntryPath("../../etc/passwd"), null);
  assert.equal(safeEntryPath("a/../../b.html"), null);
  assert.equal(safeEntryPath("/etc/passwd"), null);
  assert.equal(safeEntryPath("C:/Windows/System32/x.dll"), null);
  assert.equal(safeEntryPath("assets/../../../x"), null);
});

test("ordinary entries pass, and Windows separators are normalised", () => {
  assert.equal(safeEntryPath("index.html"), "index.html");
  assert.equal(safeEntryPath("assets\\img\\logo.png"), "assets/img/logo.png");
});

test("editor and OS droppings are skipped", () => {
  assert.equal(safeEntryPath("__MACOSX/._index.html"), null);
  assert.equal(safeEntryPath("site/.DS_Store"), null);
  assert.equal(safeEntryPath(".git/config"), null);
  assert.equal(safeEntryPath("dist/"), null); // directory entry
});

test("a wrapper folder is stripped, but only when it wraps everything", () => {
  const wrapped = [
    { path: "dist/index.html", bytes: new Uint8Array() },
    { path: "dist/style.css", bytes: new Uint8Array() },
  ];
  assert.deepEqual(
    stripCommonRoot(wrapped).map((f) => f.path),
    ["index.html", "style.css"],
  );

  // A file at the root means "dist" is a real folder, not a wrapper.
  const notWrapped = [
    { path: "index.html", bytes: new Uint8Array() },
    { path: "dist/app.js", bytes: new Uint8Array() },
  ];
  assert.deepEqual(
    stripCommonRoot(notWrapped).map((f) => f.path),
    ["index.html", "dist/app.js"],
  );
});

test("a real archive unpacks, dropping unsafe entries", () => {
  const zip = zipSync({
    "index.html": new TextEncoder().encode("<html><body>hi</body></html>"),
    "assets/logo.png": new Uint8Array([1, 2, 3]),
    "__MACOSX/._junk": new Uint8Array([0]),
  });
  const files = unpack(zip);
  assert.deepEqual(files.map((f) => f.path).sort(), ["assets/logo.png", "index.html"]);
});

test("an archive with no HTML is refused with a useful message", () => {
  const zip = zipSync({ "notes.txt": new TextEncoder().encode("nothing here") });
  assert.throws(() => unpack(zip), (e: Error) => e instanceof UnpackError && /No HTML file/.test(e.message));
});

test("garbage input is refused rather than throwing something opaque", () => {
  assert.throws(
    () => unpack(new Uint8Array([1, 2, 3, 4])),
    (e: Error) => e instanceof UnpackError && /valid ZIP/.test(e.message),
  );
});

test("an oversized file is refused", () => {
  const big = new Uint8Array(DEFAULT_LIMITS.maxFileBytes + 1);
  const zip = zipSync({ "index.html": new TextEncoder().encode("<html></html>"), "big.bin": big });
  assert.throws(() => unpack(zip), (e: Error) => e instanceof UnpackError && /limit for one file/.test(e.message));
});

// ── Path mapping ─────────────────────────────────────────────────────────────

test("file paths map to page paths", () => {
  assert.equal(pagePathFor("index.html"), "");
  assert.equal(pagePathFor("about.html"), "about");
  assert.equal(pagePathFor("about/index.html"), "about");
  assert.equal(pagePathFor("work/case-study.htm"), "work/case-study");
});

test("content types cover the common web assets", () => {
  assert.equal(contentTypeFor("a/b/logo.PNG"), "image/png");
  assert.equal(contentTypeFor("style.css"), "text/css");
  assert.equal(contentTypeFor("app.js"), "text/javascript");
  assert.equal(contentTypeFor("font.woff2"), "font/woff2");
  assert.equal(contentTypeFor("weird.xyz"), "application/octet-stream");
});

test("relative references resolve against the file that holds them", () => {
  assert.equal(resolveRef("about/index.html", "../img/a.png"), "img/a.png");
  assert.equal(resolveRef("index.html", "./css/site.css"), "css/site.css");
  assert.equal(resolveRef("a/b/c.html", "/root.png"), "root.png");
});

test("external references are left alone", () => {
  for (const ref of ["https://x.com/a.png", "//cdn/a.png", "mailto:a@b.c", "#top", "data:image/png;base64,AA"]) {
    assert.equal(isExternalRef(ref), true, ref);
  }
  assert.equal(isExternalRef("img/a.png"), false);
});

// ── Rewriting ────────────────────────────────────────────────────────────────

function ctx(overrides: Partial<RewriteContext> = {}): RewriteContext {
  return {
    fromFile: "index.html",
    slug: "client",
    assets: new Map([["img/a.png", "abc123"]]),
    pages: new Map([
      ["index.html", ""],
      ["about.html", "about"],
    ]),
    ...overrides,
  };
}

test("asset references point at the content-addressed store", () => {
  assert.equal(rewriteRef("img/a.png", ctx()), "/assets/abc123");
  assert.equal(rewriteRef("img/a.png?v=2", ctx()), "/assets/abc123?v=2");
});

test("internal page links point at the Castor route", () => {
  assert.equal(rewriteRef("about.html", ctx()), "/client/about");
  assert.equal(rewriteRef("index.html", ctx()), "/client");
  assert.equal(rewriteRef("about.html#team", ctx()), "/client/about#team");
});

test("unknown and external targets are left untouched", () => {
  assert.equal(rewriteRef("missing.png", ctx()), "missing.png");
  assert.equal(rewriteRef("https://cdn.com/a.png", ctx()), "https://cdn.com/a.png");
});

test("css url() references are rewritten, quoted or not", () => {
  const css = `a{background:url(img/a.png)}b{background:url('img/a.png')}c{background:url("https://x/a.png")}`;
  const out = rewriteCssUrls(css, ctx());
  assert.equal(out.includes("url(/assets/abc123)"), true);
  assert.equal(out.includes("url('/assets/abc123')"), true);
  assert.equal(out.includes('url("https://x/a.png")'), true); // external untouched
});

// ── Tagging ──────────────────────────────────────────────────────────────────

test("text leaves and images become slots with tokens in the markup", () => {
  const html = `<html><head><title>Hi</title></head><body>
    <h1>Welcome home</h1><p>Some copy.</p><img src="img/a.png" alt="Logo">
  </body></html>`;
  const out = prepareHtml(html, ctx());

  assert.equal(out.title, "Hi");
  const text = out.slots.filter((s) => s.type === "text");
  const images = out.slots.filter((s) => s.type === "image");
  assert.deepEqual(text.map((s) => s.value), ["Welcome home", "Some copy."]);
  assert.deepEqual(images.map((s) => (s.value as { src: string }).src), ["/assets/abc123"]);

  // The markup holds tokens, not the literal text, so applySlots can swap them.
  assert.equal(out.body.includes(TOKEN_DELIM), true);
  assert.equal(out.body.includes("Welcome home"), false);
  assert.equal(out.body.includes("data-slot-id"), true);
});

test("scripts are preserved — isolation is the sandboxed frame's job", () => {
  const html = `<html><body><p>x</p><script>window.x=1</script></body></html>`;
  const out = prepareHtml(html, ctx());
  assert.equal(out.body.includes("window.x=1"), true);
});

test("script and style contents are never turned into editable text", () => {
  const html = `<html><body><style>.a{color:red}</style><script>var a=1</script><p>real</p></body></html>`;
  const out = prepareHtml(html, ctx());
  assert.deepEqual(
    out.slots.filter((s) => s.type === "text").map((s) => s.value),
    ["real"],
  );
});

test("slot count is bounded on a huge page", () => {
  const html = `<html><body>${"<p>x</p>".repeat(50)}</body></html>`;
  const out = prepareHtml(html, ctx(), 10);
  assert.equal(out.slots.length <= 10, true);
});
