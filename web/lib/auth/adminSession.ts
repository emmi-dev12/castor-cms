// Locks the local owner admin (dashboard, master editor, submissions inbox)
// behind a single password, so it's not wide open to anyone who can reach the
// dev server (shared network, tunnel, etc.) — it's local-only, not "only you"
// by itself. Mirrors the client session pattern in lib/auth/session.ts, but
// there's exactly one admin session, not one per site.

import { createHmac, timingSafeEqual } from "node:crypto";
import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import { getRepository } from "../storage/repository";
import { assessPassword } from "../security/passwords";
import { isAdminEnabled } from "./admin";

/** The admin guards every site at once, so hold it to the same bar. */
export const MIN_ADMIN_PASSWORD_LENGTH = 12;

/** Where a changed admin password is stored, once it differs from the env var. */
const PASSWORD_SETTING = "adminPasswordHash";

const COOKIE_NAME = "cms_admin_session";

// Resolve lazily (at request time, not import time — the latter would throw
// during `next build`).
function getSecret(): string {
  const secret = process.env.CMS_SESSION_SECRET;
  if (process.env.NODE_ENV === "production" && !secret) {
    throw new Error("CMS_SESSION_SECRET must be set in production.");
  }
  return secret || "dev-insecure-secret-change-me";
}

function sign(): string {
  return createHmac("sha256", getSecret()).update("admin").digest("hex");
}

function timingSafeStringEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  return bufA.length === bufB.length && timingSafeEqual(bufA, bufB);
}

/**
 * True once a password exists at all — either bootstrapped from ADMIN_PASSWORD
 * or set from the dashboard. Without one, admin login is refused entirely
 * rather than falling back to some default password.
 */
export async function isAdminPasswordConfigured(): Promise<boolean> {
  if (process.env.ADMIN_PASSWORD) return true;
  return Boolean(await (await getRepository()).getSetting(PASSWORD_SETTING));
}

/**
 * A password set from the dashboard wins over ADMIN_PASSWORD, so changing it
 * takes effect immediately and the old env value stops working. That ordering
 * matters: the reverse would make a change silently useless while the env var
 * was still set.
 */
export async function verifyAdminPassword(password: string): Promise<boolean> {
  const stored = await (await getRepository()).getSetting(PASSWORD_SETTING);
  if (stored) return bcrypt.compare(password, stored);
  const expected = process.env.ADMIN_PASSWORD;
  if (!expected) return false;
  return timingSafeStringEqual(password, expected);
}

/** Change the admin password. Requires the current one, so an unattended
 *  logged-in browser can't be used to lock the owner out. */
export async function changeAdminPassword(
  currentPassword: string,
  newPassword: string,
): Promise<{ ok: true } | { ok: false; reason: string }> {
  if (!(await verifyAdminPassword(currentPassword))) {
    return { ok: false, reason: "Current password is incorrect." };
  }
  const strength = assessPassword(newPassword, MIN_ADMIN_PASSWORD_LENGTH);
  if (!strength.ok) return { ok: false, reason: strength.reason! };
  if (await verifyAdminPassword(newPassword)) {
    return { ok: false, reason: "That's already your password — pick a new one." };
  }
  const hash = await bcrypt.hash(newPassword, 10);
  await (await getRepository()).setSetting(PASSWORD_SETTING, hash);
  return { ok: true };
}

export async function grantAdminSession(): Promise<void> {
  const store = await cookies();
  store.set(COOKIE_NAME, sign(), {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 24 * 7,
  });
}

export async function hasAdminSession(): Promise<boolean> {
  const store = await cookies();
  const value = store.get(COOKIE_NAME)?.value;
  if (!value) return false;
  return timingSafeStringEqual(value, sign());
}

export type AdminGate =
  | { state: "disabled" }
  | { state: "not-configured" }
  | { state: "locked" }
  | { state: "ok" };

/** Page-level check: what should an /admin/* page show right now? */
export async function checkAdminGate(): Promise<AdminGate> {
  if (!isAdminEnabled()) return { state: "disabled" };
  if (!(await isAdminPasswordConfigured())) return { state: "not-configured" };
  if (!(await hasAdminSession())) return { state: "locked" };
  return { state: "ok" };
}

/** API-route check: returns a Response to return immediately if access
 *  should be refused, or null if the request may proceed. */
export async function requireAdminApi(): Promise<Response | null> {
  if (!isAdminEnabled()) {
    return Response.json({ ok: false, reason: "Admin is disabled here." }, { status: 403 });
  }
  if (!(await isAdminPasswordConfigured())) {
    return Response.json(
      { ok: false, reason: "Admin password isn't configured." },
      { status: 403 },
    );
  }
  if (!(await hasAdminSession())) {
    return Response.json({ ok: false, reason: "Not signed in." }, { status: 401 });
  }
  return null;
}
