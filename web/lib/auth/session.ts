// Minimal site-scoped session: an HMAC-signed cookie proving the client unlocked
// a given slug. Server-only. No external JWT dependency for M1.

import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

// Resolve the signing secret lazily (at request time, not import time — the
// latter would throw during `next build`). Refuse the insecure default in
// production, since a predictable secret would let anyone forge a session.
function getSecret(): string {
  const secret = process.env.CMS_SESSION_SECRET;
  if (process.env.NODE_ENV === "production" && !secret) {
    throw new Error("CMS_SESSION_SECRET must be set in production.");
  }
  return secret || "dev-insecure-secret-change-me";
}

function cookieName(slug: string): string {
  return `cms_session_${slug}`;
}

function sign(slug: string): string {
  return createHmac("sha256", getSecret()).update(slug).digest("hex");
}

/** Called after a successful password check. Sets the session cookie. */
export async function grantSession(slug: string): Promise<void> {
  const store = await cookies();
  store.set(cookieName(slug), sign(slug), {
    httpOnly: true,
    sameSite: "lax",
    // Scope to "/" so the cookie is sent to /api/[slug]/* too. The cookie name
    // already encodes the slug, so this stays site-specific.
    path: "/",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 24 * 7,
  });
}

export async function clearSession(slug: string): Promise<void> {
  const store = await cookies();
  store.set(cookieName(slug), "", { path: "/", maxAge: 0 });
}

/** True if the current request holds a valid session for this slug. */
export async function hasSession(slug: string): Promise<boolean> {
  const store = await cookies();
  const value = store.get(cookieName(slug))?.value;
  if (!value) return false;
  const expected = sign(slug);
  const a = Buffer.from(value);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}
