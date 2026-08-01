// Local-only: change the admin dashboard password.
//
// Requires the current password even though the caller already holds an admin
// session — otherwise anyone who walked up to an unattended logged-in browser
// could lock the owner out of every site at once.

import { changeAdminPassword } from "@/lib/auth/adminSession";
import { requireAdminApi } from "@/lib/auth/adminSession";
import { LIMITS, clientIp, hit, tooManyRequests } from "@/lib/security/rateLimit";

export async function POST(request: Request) {
  const denied = await requireAdminApi();
  if (denied) return denied;

  // Throttled like the login: this endpoint also verifies a password, so it
  // would otherwise be an unmetered oracle for guessing the current one.
  const key = `admin-password:${clientIp(request)}`;
  const verdict = await hit(key, LIMITS.adminLogin);
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

  const result = await changeAdminPassword(
    String(body.currentPassword ?? ""),
    String(body.newPassword ?? ""),
  );
  return Response.json(result, { status: result.ok ? 200 : 400 });
}
