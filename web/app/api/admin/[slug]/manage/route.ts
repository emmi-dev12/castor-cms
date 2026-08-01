// LOCAL-only site management: reset the client password, or delete the site
// entirely. Disabled in production.

import { requireAdminApi } from "@/lib/auth/adminSession";
import { deleteSite, setPassword } from "@/lib/sites/adminOps";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const denied = await requireAdminApi();
  if (denied) return denied;
  const { slug } = await params;
  const b = (await request.json().catch(() => ({}))) as { op?: string; password?: string };

  const result =
    b.op === "set-password"
      ? await setPassword(slug, b.password ?? "")
      : b.op === "delete-site"
        ? await deleteSite(slug)
        : { ok: false as const, reason: `Unknown op "${b.op}".` };

  return Response.json(result, { status: result.ok ? 200 : 422 });
}
