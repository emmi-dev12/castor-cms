// PUBLIC endpoint: "Request access" on the marketing landing page.
// Same threat model as the site form submit route (anonymous internet callers),
// so it borrows the same defences: honeypot, length caps, plain-text storage,
// per-IP rate limit.
//
// Requests are stored as submissions under a fixed pseudo-slug so the existing
// local inbox at /admin/submissions/__access reads them with no new UI.

import { newId } from "@/lib/model/content";
import { LIMITS, clientIp, hit, tooManyRequests } from "@/lib/security/rateLimit";
import type { Submission } from "@/lib/model/types";
import { getRepository } from "@/lib/storage/repository";

/** Not a real site — it can't be, since a slug starting with "_" is never
 *  issued to a client. Keeps access requests in the same store as form
 *  submissions without inventing a second collection. */
export const ACCESS_SLUG = "__access";

const MAX_VALUE = 2000;

/** Strip tags/control chars and cap length — stored as plain text only. */
function clean(input: unknown, max: number): string {
  return String(input ?? "")
    .replace(/<[^>]*>/g, "")
    // Normalise control characters (incl. newlines/tabs) to spaces.
    .replace(/\p{Cc}/gu, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, max);
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;

  // Honeypot: hidden field only a bot fills. Report success so it learns nothing.
  if (clean(body.trap, 50) !== "") return Response.json({ ok: true });

  const verdict = await hit(`access:${clientIp(request)}`, LIMITS.submit);
  if (!verdict.allowed) {
    return tooManyRequests(
      "Too many requests from this address. Please try again later.",
      verdict.retryAfterSec,
    );
  }

  const name = clean(body.name, 200);
  const email = clean(body.email, 200);
  const about = clean(body.about, MAX_VALUE);

  // Deliberately loose: enough to catch a typo, not a strict RFC check that
  // would reject valid addresses and lose a lead.
  if (!name || !email.includes("@") || email.length < 5) {
    return Response.json(
      { ok: false, reason: "Add your name and a valid email address." },
      { status: 400 },
    );
  }

  const submission: Submission = {
    id: newId("sub"),
    siteSlug: ACCESS_SLUG,
    sectionId: "access-request",
    createdAt: new Date().toISOString(),
    fields: { Name: name, Email: email, ...(about ? { About: about } : {}) },
  };
  await (await getRepository()).addSubmission(submission);

  return Response.json({ ok: true });
}
