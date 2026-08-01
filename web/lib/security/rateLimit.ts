// Rate limiting for the two endpoints anyone on the internet can hit:
// the client login (brute-force protection — the password is the ONLY thing
// guarding a client's live site) and the public form submit (spam).
//
// Fixed-window counters stored via the Repository, because production runs on
// serverless instances that don't share memory.

import { getRepository } from "../storage/repository";

export interface RateVerdict {
  allowed: boolean;
  /** How many seconds until the caller may retry (0 when allowed). */
  retryAfterSec: number;
}

export const LIMITS = {
  /** Failed logins per site+IP. Generous enough for fat fingers, far too
   *  small for a dictionary attack. */
  login: { max: 8, windowMs: 15 * 60_000 },
  /**
   * Failed logins per SITE across all IPs — defence in depth against a
   * distributed attacker who simply uses more addresses to get 8 tries each.
   *
   * Tradeoff, stated plainly: this can be abused to lock a real client out of
   * their own editor. That's why it's set far above anything legitimate use
   * would reach and why the window is short and self-healing — a bounded
   * annoyance beats unbounded guessing. The durable defence is password
   * entropy (lib/security/passwords.ts), not this.
   */
  loginGlobal: { max: 60, windowMs: 15 * 60_000 },
  /** Form submissions per IP per site. */
  submit: { max: 15, windowMs: 60 * 60_000 },
  /** Failed local-admin logins per IP. Admin is local-only, but this guards
   *  against a dictionary attack if the dev server is ever reachable by
   *  anyone besides the owner (e.g. shared network, tunnel). */
  adminLogin: { max: 8, windowMs: 15 * 60_000 },
} as const;

/**
 * Best-effort client IP. Vercel sets x-forwarded-for at the edge; the leftmost
 * entry is the original client. A caller could spoof this header when the app
 * isn't behind a trusted proxy, so this is defence-in-depth, not an identity —
 * that's why the login limiter also keys on the slug.
 */
export function clientIp(request: Request): string {
  const fwd = request.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0]!.trim();
  return request.headers.get("x-real-ip")?.trim() || "unknown";
}

/** Record a hit and say whether the caller is over the limit. */
export async function hit(
  key: string,
  { max, windowMs }: { max: number; windowMs: number },
): Promise<RateVerdict> {
  const repo = await getRepository();
  const count = await repo.bumpRate(key, windowMs);
  return count > max
    ? { allowed: false, retryAfterSec: Math.ceil(windowMs / 1000) }
    : { allowed: true, retryAfterSec: 0 };
}

export async function reset(key: string): Promise<void> {
  await (await getRepository()).clearRate(key);
}

/** 429 with a Retry-After header — the conventional signal for "slow down". */
export function tooManyRequests(reason: string, retryAfterSec: number): Response {
  return Response.json(
    { ok: false, reason },
    { status: 429, headers: { "retry-after": String(retryAfterSec) } },
  );
}
