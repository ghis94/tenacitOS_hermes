import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const PUBLIC_ROUTES = new Set(['/login']);
const PUBLIC_API_PREFIXES = ['/api/auth/', '/api/health'];

function isAuthenticated(request: NextRequest): boolean {
  const authCookie = request.cookies.get('mc_auth');
  return !!(authCookie && authCookie.value === process.env.AUTH_SECRET);
}

function hasHermesIngestToken(request: NextRequest): boolean {
  const expected = process.env.HERMES_INGEST_TOKEN;
  if (!expected) return false;

  const header =
    request.headers.get('x-hermes-ingest-token') ||
    request.headers.get('authorization');

  if (!header) return false;
  if (header === expected) return true;
  if (header.startsWith('Bearer ')) return header.slice(7) === expected;
  return false;
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (PUBLIC_ROUTES.has(pathname)) {
    return NextResponse.next();
  }

  if (PUBLIC_API_PREFIXES.some((prefix) => pathname.startsWith(prefix))) {
    return NextResponse.next();
  }

  if (
    pathname === '/api/activities' &&
    request.method === 'POST' &&
    hasHermesIngestToken(request)
  ) {
    return NextResponse.next();
  }

  if (!isAuthenticated(request)) {
    if (pathname.startsWith('/api/')) {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'Authentication required' },
        { status: 401 },
      );
    }

    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('from', pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)'],
};
