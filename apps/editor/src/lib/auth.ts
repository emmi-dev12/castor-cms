import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import type { JwtPayload } from '@castor/types';

const COOKIE = 'cms_token';

export function decodeToken(token: string): JwtPayload | null {
  try {
    const [, payload] = token.split('.');
    if (!payload) return null;
    return JSON.parse(Buffer.from(payload, 'base64url').toString()) as JwtPayload;
  } catch {
    return null;
  }
}

export async function getSession(): Promise<{ token: string; payload: JwtPayload } | null> {
  const store = await cookies();
  const token = store.get(COOKIE)?.value;
  if (!token) return null;
  const payload = decodeToken(token);
  if (!payload) return null;
  // Check expiry
  if (payload.exp < Math.floor(Date.now() / 1000)) return null;
  return { token, payload };
}

export async function setSession(token: string): Promise<void> {
  const store = await cookies();
  const payload = decodeToken(token);
  const maxAge = payload ? payload.exp - Math.floor(Date.now() / 1000) : 3600;
  store.set(COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge,
    secure: process.env['NODE_ENV'] === 'production',
  });
}

export async function clearSession(): Promise<void> {
  const store = await cookies();
  store.delete(COOKIE);
}

export async function requireOwnerSession(): Promise<{ token: string; payload: JwtPayload }> {
  const session = await getSession();
  if (!session || session.payload.role !== 'owner') redirect('/login');
  return session;
}

export async function requireAnySession(): Promise<{ token: string; payload: JwtPayload }> {
  const session = await getSession();
  if (!session) redirect('/login');
  return session;
}
