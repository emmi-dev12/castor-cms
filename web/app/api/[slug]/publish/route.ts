import { hasSession } from "@/lib/auth/session";
import { publish } from "@/lib/sites/service";
import { getRepository } from "@/lib/storage/repository";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  if (!(await hasSession(slug))) {
    return Response.json({ ok: false, reason: "Not authorized." }, { status: 401 });
  }
  const body = (await request.json().catch(() => ({}))) as { label?: string };
  const ok = await publish(slug, body.label);
  if (ok) return Response.json({ ok: true });
  // Distinguish "no such site" from "someone else changed it while we worked" —
  // reporting a concurrency conflict as 404 would be misleading.
  const exists = Boolean(await (await getRepository()).getSite(slug));
  return exists
    ? Response.json(
        { ok: false, conflict: true, reason: "This site changed while you were editing — reload and publish again." },
        { status: 409 },
      )
    : Response.json({ ok: false, reason: "Site not found." }, { status: 404 });
}
