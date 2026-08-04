// Set or clear a section's background image (client editor). Gated by the site
// session and, inside setSectionBackground, by the `sectionColors` permission.

import { hasSession } from "@/lib/auth/session";
import { CONFLICT, setSectionBackground } from "@/lib/sites/service";

export async function POST(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  if (!(await hasSession(slug))) {
    return Response.json({ ok: false, reason: "Not authorized." }, { status: 401 });
  }

  const body = (await request.json().catch(() => ({}))) as {
    sectionId?: string;
    /** An image URL, or null to remove the background. */
    src?: string | null;
  };
  if (!body.sectionId) {
    return Response.json({ ok: false, reason: "Missing sectionId." }, { status: 400 });
  }

  const result = await setSectionBackground(slug, body.sectionId, body.src ?? null);
  if (!result.ok && result.reason === CONFLICT) {
    return Response.json({ ...result, conflict: true }, { status: 409 });
  }
  return Response.json(result, { status: result.ok ? 200 : 422 });
}
