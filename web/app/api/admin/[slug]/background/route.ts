// Owner endpoint: set or clear a section's background image, unrestricted by
// the client's permissions. Local admin only.

import { requireAdminApi } from "@/lib/auth/adminSession";
import { CONFLICT, setSectionBackground } from "@/lib/sites/service";

export async function POST(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const denied = await requireAdminApi();
  if (denied) return denied;
  const { slug } = await params;
  const body = (await request.json().catch(() => ({}))) as {
    sectionId?: string;
    src?: string | null;
  };
  if (!body.sectionId) {
    return Response.json({ ok: false, reason: "Missing sectionId." }, { status: 400 });
  }
  const result = await setSectionBackground(slug, body.sectionId, body.src ?? null, {
    unrestricted: true,
  });
  if (!result.ok && result.reason === CONFLICT) {
    return Response.json({ ...result, conflict: true }, { status: 409 });
  }
  return Response.json(result, { status: result.ok ? 200 : 422 });
}
