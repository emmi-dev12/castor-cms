// LOCAL-only: clone a URL into a new site via Playwright. Disabled in production.

import { requireAdminApi } from "@/lib/auth/adminSession";
import { createSiteFromClone } from "@/lib/sites/service";

export async function POST(request: Request) {
  const denied = await requireAdminApi();
  if (denied) return denied;

  const body = (await request.json().catch(() => ({}))) as {
    url?: string;
    slug?: string;
    name?: string;
    password?: string;
    tier?: "locked" | "moderate" | "free";
  };

  if (!body.url || !body.slug || !body.password) {
    return Response.json(
      { ok: false, reason: "url, slug, and password are required." },
      { status: 400 },
    );
  }

  const result = await createSiteFromClone({
    url: body.url,
    slug: body.slug,
    name: body.name,
    password: body.password,
  });
  return Response.json(result, { status: result.ok ? 200 : 400 });
}
