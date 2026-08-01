// Local-only admin login. Unlocks the owner dashboard/master editor/inbox for
// this browser. Rate limited in case the dev server is ever reachable by
// anyone besides the owner.

import { isAdminEnabled } from "@/lib/auth/admin";
import {
  grantAdminSession,
  isAdminPasswordConfigured,
  verifyAdminPassword,
} from "@/lib/auth/adminSession";
import { LIMITS, clientIp, hit, reset, tooManyRequests } from "@/lib/security/rateLimit";

export async function POST(request: Request) {
  if (!isAdminEnabled()) {
    return Response.json({ ok: false, reason: "Admin is disabled here." }, { status: 403 });
  }
  if (!(await isAdminPasswordConfigured())) {
    return Response.json(
      { ok: false, reason: "Admin password isn't configured." },
      { status: 403 },
    );
  }

  const key = `admin-login:${clientIp(request)}`;
  const verdict = await hit(key, LIMITS.adminLogin);
  if (!verdict.allowed) {
    return tooManyRequests(
      "Too many failed attempts. Please wait a few minutes and try again.",
      verdict.retryAfterSec,
    );
  }

  const body = (await request.json().catch(() => ({}))) as { password?: string };
  if (!(await verifyAdminPassword(String(body.password ?? "")))) {
    return Response.json({ ok: false, reason: "Wrong password." }, { status: 401 });
  }

  await reset(key);
  await grantAdminSession();
  return Response.json({ ok: true });
}
