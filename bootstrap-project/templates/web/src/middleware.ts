import { NextResponse } from 'next/server';

import { auth } from '@/auth';

/**
 * Auth gate for the web app.
 *
 * Unauthenticated visitors hitting any protected route (e.g. `/dashboard/*`)
 * are redirected to /login with a `next` query param so we can bounce them
 * back after sign-in. Public routes (`/`, `/login`, `/api/auth`, Next.js
 * internals) pass through untouched.
 *
 * The Next.js app never verifies JWT signatures locally — backend services
 * (user-service as issuer, core as validator) own that.
 */

const PUBLIC_PATH_PREFIXES = ['/login', '/api/auth', '/_next', '/favicon.ico'];

function isPublicPath(pathname: string): boolean {
  // Public landing page — exact match only so `/dashboard` etc. still gates.
  if (pathname === '/') {
    return true;
  }
  return PUBLIC_PATH_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

export default auth((req) => {
  const { pathname } = req.nextUrl;

  if (isPublicPath(pathname)) {
    return NextResponse.next();
  }

  if (req.auth) {
    return NextResponse.next();
  }

  const loginUrl = new URL('/login', req.nextUrl.origin);
  loginUrl.searchParams.set('next', pathname);
  return NextResponse.redirect(loginUrl);
});

export const config = {
  // Match everything except Next.js internals and static assets. Public paths
  // are still checked inside the handler so that auth-aware logic stays in one
  // place.
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
