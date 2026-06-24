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

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // /editor/[siteId] is a public landing page — only /editor/[siteId]/[pageId] requires auth
  const editorLanding = /^\/editor\/[^/]+\/?$/.test(pathname);
  const isProtected = pathname.startsWith('/admin') || (pathname.startsWith('/editor') && !editorLanding);
  if (!isProtected) return NextResponse.next();

  const token = req.cookies.get(COOKIE)?.value;

  // For editor pages, redirect to the site landing page; for admin, to /login
  const editorMatch = pathname.match(/^\/editor\/([^/]+)/);
  const unauthDest = editorMatch
    ? new URL(`/editor/${editorMatch[1]}`, req.url)
    : new URL('/login', req.url);

  if (!token) return NextResponse.redirect(unauthDest);

  const exp = decodeExp(token);
  if (!exp || exp < Math.floor(Date.now() / 1000)) {
    unauthDest.searchParams.set('expired', '1');
    return NextResponse.redirect(unauthDest);
  }

  if (pathname.startsWith('/admin')) {
    try {
      const [, payload] = token.split('.');
      const decoded = JSON.parse(Buffer.from(payload!, 'base64url').toString()) as { role: string };
      if (decoded.role !== 'owner') return NextResponse.redirect(new URL('/login', req.url));
    } catch {
      return NextResponse.redirect(new URL('/login', req.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*', '/editor/:path*'],
};
