import { hasSession } from "@/lib/auth/session";
import { CONFLICT, applyEdit } from "@/lib/sites/service";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  if (!(await hasSession(slug))) {
    return Response.json({ ok: false, reason: "Not authorized." }, { status: 401 });
  }

  const body = (await request.json().catch(() => ({}))) as {
    slotId?: string;
    value?: unknown;
    /** Optional text colour; null clears it back to inherited. */
    color?: string | null;
  };
  if (!body.slotId) {
    return Response.json({ ok: false, reason: "Missing slotId." }, { status: 400 });
  }

  const result = await applyEdit(slug, body.slotId, body.value, body.color);
  if (!result.ok && result.reason === CONFLICT) {
    return Response.json({ ...result, conflict: true }, { status: 409 });
  }
  return Response.json(result, { status: result.ok ? 200 : 422 });
}
