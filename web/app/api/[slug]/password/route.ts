// Client self-service password change. Session-gated AND requires the current
// password, so a hijacked/unattended session can't lock the real client out.
// Rate limited because it verifies a password — otherwise it'd be an oracle
// that sidesteps the login limiter.

import { hasSession } from "@/lib/auth/session";
import { LIMITS, clientIp, hit, reset, tooManyRequests } from "@/lib/security/rateLimit";
import { CONFLICT, changePassword } from "@/lib/sites/service";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  if (!(await hasSession(slug))) {
    return Response.json({ ok: false, reason: "Not authorized." }, { status: 401 });
  }

  const key = `password:${slug}:${clientIp(request)}`;
  const verdict = await hit(key, LIMITS.login);
  if (!verdict.allowed) {
    return tooManyRequests(
      "Too many attempts. Please wait a few minutes and try again.",
      verdict.retryAfterSec,
    );
  }

  const body = (await request.json().catch(() => ({}))) as {
    currentPassword?: string;
    newPassword?: string;
  };

  const result = await changePassword(
    slug,
    String(body.currentPassword ?? ""),
    String(body.newPassword ?? ""),
  );

  if (result.ok) {
    await reset(key); // a correct change shouldn't count toward a lockout
    return Response.json({ ok: true });
  }
  return Response.json(result, { status: result.reason === CONFLICT ? 409 : 422 });
}
