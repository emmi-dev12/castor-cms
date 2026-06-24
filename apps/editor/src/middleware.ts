import { NextRequest, NextResponse } from 'next/server';

const COOKIE = 'cms_token';

function decodeExp(token: string): number | null {
  try {
    const [, payload] = token.split('.');
    if (!payload) return null;
    const decoded = JSON.parse(Buffer.from(payload, 'base64url').toString()) as { exp: number };
    return decoded.exp;
  } catch {
    return null;
  }
}

function isLocalRequest(req: NextRequest): boolean {
  const host = req.headers.get('host') ?? '';
  const forwarded = req.headers.get('x-forwarded-for') ?? '';
  const realIp = req.headers.get('x-real-ip') ?? '';
  const hostname = host.split(':')[0];
  if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1') return true;
  // Private network ranges (LAN access)
  if (/^(10\.|172\.(1[6-9]|2\d|3[01])\.|192\.168\.)/.test(forwarded.split(',')[0]?.trim() ?? '')) return true;
  if (/^(10\.|172\.(1[6-9]|2\d|3[01])\.|192\.168\.)/.test(realIp)) return true;
  return false;
}

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Admin is local-only — block if accessed from a remote host
  if (pathname.startsWith('/admin') && !isLocalRequest(req)) {
    return NextResponse.rewrite(new URL('/admin-local-only', req.url));
  }

  const isProtected = pathname.startsWith('/admin') || pathname.startsWith('/editor');
  if (!isProtected) return NextResponse.next();

  const token = req.cookies.get(COOKIE)?.value;

  if (!token) {
    const loginUrl = req.nextUrl.clone();
    loginUrl.pathname = '/login';
    loginUrl.searchParams.set('from', pathname);
    return NextResponse.redirect(loginUrl);
  }

  const exp = decodeExp(token);
  if (!exp || exp < Math.floor(Date.now() / 1000)) {
    const loginUrl = req.nextUrl.clone();
    loginUrl.pathname = '/login';
    loginUrl.searchParams.set('expired', '1');
    return NextResponse.redirect(loginUrl);
  }

  // Admin routes require owner role
  if (pathname.startsWith('/admin')) {
    try {
      const [, payload] = token.split('.');
      const decoded = JSON.parse(Buffer.from(payload!, 'base64url').toString()) as { role: string };
      if (decoded.role !== 'owner') {
        return NextResponse.redirect(new URL('/login', req.url));
      }
    } catch {
      return NextResponse.redirect(new URL('/login', req.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*', '/editor/:path*', '/admin-local-only'],
};
