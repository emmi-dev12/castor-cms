// Client login. This password is the ONLY thing protecting a client's live
// site — the editor URL is guessable from the public one — so failed attempts
// are rate limited to stop dictionary attacks.

import { grantSession } from "@/lib/auth/session";
import { LIMITS, clientIp, hit, reset, tooManyRequests } from "@/lib/security/rateLimit";
import { verifyPassword } from "@/lib/sites/service";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  // Key on site + IP so one attacker can't lock a real client out of their own
  // site from a different address.
  const key = `login:${slug}:${clientIp(request)}`;

  const verdict = await hit(key, LIMITS.login);
  if (!verdict.allowed) {
    return tooManyRequests(
      "Too many failed attempts. Please wait a few minutes and try again.",
      verdict.retryAfterSec,
    );
  }

  // Per-IP alone is bypassed by an attacker with many addresses, so also cap
  // failures for the site as a whole.
  const globalKey = `login-global:${slug}`;
  const globalVerdict = await hit(globalKey, LIMITS.loginGlobal);
  if (!globalVerdict.allowed) {
    return tooManyRequests(
      "This site has had too many failed sign-ins recently. Please try again shortly.",
      globalVerdict.retryAfterSec,
    );
  }

  const body = (await request.json().catch(() => ({}))) as { password?: string };
  const ok = await verifyPassword(slug, String(body.password ?? ""));
  if (!ok) {
    return Response.json({ ok: false, reason: "Wrong password." }, { status: 401 });
  }

  // Successful login clears the counter so normal use never accumulates toward
  // a lockout.
  await reset(key);
  await reset(globalKey); // a real sign-in clears the site-wide counter too
  await grantSession(slug);
  return Response.json({ ok: true });
}
