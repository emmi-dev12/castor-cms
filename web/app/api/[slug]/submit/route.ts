// PUBLIC endpoint: accept a form submission from a published site.
// Deliberately unauthenticated (anonymous visitors submit contact forms), so it
// is defensive: the site must exist and be published, the honeypot must be
// empty, field count/length are capped, and values are stored as plain text.
//
// Rate limited per IP+site (see lib/security/rateLimit.ts) on top of the caps
// and honeypot.

import { newId } from "@/lib/model/content";
import { LIMITS, clientIp, hit, tooManyRequests } from "@/lib/security/rateLimit";
import type { Submission } from "@/lib/model/types";
import { getRepository } from "@/lib/storage/repository";

const MAX_FIELDS = 12;
const MAX_KEY = 100;
const MAX_VALUE = 5000;

/** Strip tags/control chars and cap length — submissions are plain text only. */
function clean(input: unknown, max: number): string {
  return String(input ?? "")
    .replace(/<[^>]*>/g, "")
    // Normalise control characters (incl. newlines/tabs) to spaces.
    .replace(/[\u0000-\u001F\u007F]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, max);
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const body = (await request.json().catch(() => ({}))) as {
    sectionId?: string;
    trap?: string;
    fields?: Record<string, unknown>;
  };

  // Honeypot: a hidden field only a bot would fill. Pretend success so bots
  // don't learn they were caught.
  if (clean(body.trap, 50) !== "") {
    return Response.json({ ok: true });
  }

  // Throttle per IP+site so nobody can flood a client's inbox.
  const verdict = await hit(`submit:${slug}:${clientIp(request)}`, LIMITS.submit);
  if (!verdict.allowed) {
    return tooManyRequests(
      "Too many submissions from this address. Please try again later.",
      verdict.retryAfterSec,
    );
  }

  const repo = await getRepository();
  const site = await repo.getSite(slug);
  if (!site) {
    return Response.json({ ok: false, reason: "Site not found." }, { status: 404 });
  }
  if (!site.publishedVersionId) {
    return Response.json({ ok: false, reason: "This site isn’t live yet." }, { status: 400 });
  }

  const entries = Object.entries(body.fields ?? {}).slice(0, MAX_FIELDS);
  const fields: Record<string, string> = {};
  for (const [k, v] of entries) {
    const key = clean(k, MAX_KEY);
    if (key) fields[key] = clean(v, MAX_VALUE);
  }
  if (Object.keys(fields).length === 0) {
    return Response.json({ ok: false, reason: "Nothing to submit." }, { status: 400 });
  }

  const submission: Submission = {
    id: newId("sub"),
    siteSlug: slug,
    sectionId: clean(body.sectionId, MAX_KEY) || "unknown",
    createdAt: new Date().toISOString(),
    fields,
  };
  await repo.addSubmission(submission);

  return Response.json({ ok: true });
}
