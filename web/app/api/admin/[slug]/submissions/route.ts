// LOCAL-only: delete a submission from a site's inbox. Reading is done by the
// server component; this handles removal. Disabled in production.

import { requireAdminApi } from "@/lib/auth/adminSession";
import { deleteSubmission } from "@/lib/sites/service";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const denied = await requireAdminApi();
  if (denied) return denied;
  const { slug } = await params;
  const body = (await request.json().catch(() => ({}))) as { id?: string };
  if (!body.id) {
    return Response.json({ ok: false, reason: "Missing id." }, { status: 400 });
  }
  await deleteSubmission(slug, body.id);
  return Response.json({ ok: true });
}
