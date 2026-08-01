import { hasSession } from "@/lib/auth/session";
import { rollback } from "@/lib/sites/service";
import { getRepository } from "@/lib/storage/repository";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  if (!(await hasSession(slug))) {
    return Response.json({ ok: false, reason: "Not authorized." }, { status: 401 });
  }
  const body = (await request.json().catch(() => ({}))) as { versionId?: string };
  if (!body.versionId) {
    return Response.json({ ok: false, reason: "Missing versionId." }, { status: 400 });
  }
  const ok = await rollback(slug, body.versionId);
  if (ok) return Response.json({ ok: true });
  const exists = Boolean(await (await getRepository()).getSite(slug));
  return exists
    ? Response.json(
        { ok: false, conflict: true, reason: "This site changed while you were editing — reload and try again." },
        { status: 409 },
      )
    : Response.json({ ok: false, reason: "Site or version not found." }, { status: 404 });
}
