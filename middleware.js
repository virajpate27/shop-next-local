// src/middleware.js
import { NextResponse } from 'next/server';

export function middleware(req) {
  const token = req.cookies.get('firebase-auth-token');
  const { pathname } = req.nextUrl;

  const protectedRoutes = ['/checkout', '/orders', '/profile', '/wishlist'];
  const adminRoutes = ['/admin'];
  const authRoutes = ['/login', '/register'];

  const isProtected = protectedRoutes.some((r) => pathname.startsWith(r));
  const isAdmin = adminRoutes.some((r) => pathname.startsWith(r));
  const isAuthRoute = authRoutes.some((r) => pathname.startsWith(r));

  // if ((isProtected || isAdmin) && !token) {
  //   const loginUrl = new URL('/login', req.url);
  //   loginUrl.searchParams.set('redirect', pathname);
  //   return NextResponse.redirect(loginUrl);
  // }

  if (isAuthRoute && token) {
    return NextResponse.redirect(new URL('/', req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/checkout/:path*',
    '/orders/:path*',
    '/profile/:path*',
    '/wishlist/:path*',
    '/admin/:path*',
    '/login',
    '/register',
  ],
};
