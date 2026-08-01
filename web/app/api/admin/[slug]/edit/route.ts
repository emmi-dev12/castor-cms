// LOCAL-only owner edit: apply a slot change with every permission granted
// (bypasses whatever the client is allowed to change). Disabled in production.

import { requireAdminApi } from "@/lib/auth/adminSession";
import { adminApplyEdit } from "@/lib/sites/adminOps";
import { CONFLICT } from "@/lib/sites/service";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const denied = await requireAdminApi();
  if (denied) return denied;
  const { slug } = await params;
  const body = (await request.json().catch(() => ({}))) as {
    slotId?: string;
    value?: unknown;
    /** Optional text colour; null clears it back to inherited. */
    color?: string | null;
  };
  if (!body.slotId) {
    return Response.json({ ok: false, reason: "Missing slotId." }, { status: 400 });
  }
  const result = await adminApplyEdit(slug, body.slotId, body.value, body.color);
  if (!result.ok && result.reason === CONFLICT) {
    return Response.json({ ...result, conflict: true }, { status: 409 });
  }
  return Response.json(result, { status: result.ok ? 200 : 422 });
}
