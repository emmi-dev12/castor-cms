import { requireAdminApi } from "@/lib/auth/adminSession";
import { resolvePermissions } from "@/lib/guardian/policy";
import type { Permissions } from "@/lib/model/types";
import { setPermissions } from "@/lib/sites/service";

/** Owner-only: set exactly what this site's client may change. */
export async function POST(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const denied = await requireAdminApi();
  if (denied) return denied;

  const { slug } = await params;
  const body = (await request.json().catch(() => ({}))) as {
    permissions?: Partial<Permissions>;
  };
  if (!body.permissions || typeof body.permissions !== "object") {
    return Response.json({ ok: false, reason: "Missing permissions." }, { status: 400 });
  }

  // Normalise before storing: unknown keys are dropped and missing switches
  // default to off, so a malformed payload can't widen what a client may do.
  const perms = resolvePermissions({
    text: Boolean(body.permissions.text),
    images: Boolean(body.permissions.images),
    links: Boolean(body.permissions.links),
    textColor: Boolean(body.permissions.textColor),
    sectionColors: Boolean(body.permissions.sectionColors),
    spacing: Boolean(body.permissions.spacing),
    colorRange: body.permissions.colorRange === "any" ? "any" : "palette",
    spacingRange: body.permissions.spacingRange === "any" ? "any" : "scale",
  });

  const ok = await setPermissions(slug, perms);
  return Response.json({ ok, permissions: perms }, { status: ok ? 200 : 404 });
}
