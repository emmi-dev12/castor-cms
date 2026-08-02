// The document rendered inside an imported page's sandboxed <iframe>.
//
// Served as its own response rather than srcdoc so relative URLs, caching and
// normal browser loading all work. The frame is embedded with
// sandbox="allow-scripts" and WITHOUT allow-same-origin, so this document runs
// in an opaque origin: its scripts execute (menus, sliders, analytics) but
// cannot read cookies or reach another client's site.
//
// ?edit=1 serves the *draft* with the editor bridge injected, and is gated:
// the draft is not public.

import { editorBridgeScript, heightReporterScript } from "@/lib/import/bridge";
import { assembleDocument } from "@/lib/import/prepare";
import { hasSession } from "@/lib/auth/session";
import { checkAdminGate } from "@/lib/auth/adminSession";
import { applySlots } from "@/lib/ingest/tokens";
import { getPage, publishedContent } from "@/lib/model/content";
import { getSiteCached } from "@/lib/sites/read";

export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string; path?: string[] }> },
) {
  const { slug, path } = await params;
  const wantsDraft = new URL(request.url).searchParams.get("edit") === "1";

  const site = await getSiteCached(slug);
  if (!site) return new Response("Not found", { status: 404 });

  if (wantsDraft) {
    // Either the client holds a session for this site, or the owner is signed
    // into the local admin. Otherwise the draft stays private.
    const gate = await checkAdminGate();
    if (!(await hasSession(slug)) && gate.state !== "ok") {
      return new Response("Not authorized", { status: 401 });
    }
  }

  const content = wantsDraft ? site.draft : publishedContent(site);
  const page = content ? getPage(content, (path ?? []).join("/")) : null;
  const section = page?.sections.find((s) => s.type === "imported");
  if (!section) return new Response("Not found", { status: 404 });

  const body = applySlots(section.template ?? "", section.slots);
  const head = applySlots(section.head ?? "", section.slots);
  // Both modes report their height so the frame can be sized to the content;
  // only the editor gets the editing affordances.
  const injected = wantsDraft ? editorBridgeScript() : heightReporterScript();
  const document = assembleDocument(head, `${body}<script>${injected}</script>`);

  return new Response(document, {
    headers: {
      "content-type": "text/html; charset=utf-8",
      // Never cached: the draft changes as the client edits.
      "cache-control": "no-store",
      // Only this app may frame it; nobody else gets to embed a client's site.
      "content-security-policy": "frame-ancestors 'self'",
    },
  });
}
