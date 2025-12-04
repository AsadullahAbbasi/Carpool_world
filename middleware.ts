import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const token = request.cookies.get('token')?.value;
  const { pathname } = request.nextUrl;

  // Auth routes that should redirect logged-in users
  const authRoutes = ['/auth'];
  const isAuthRoute = authRoutes.some(route => pathname === route || pathname.startsWith(route + '/'));

  // If user has a token cookie and tries to access auth routes, redirect to dashboard
  // Note: Token validation will be done client-side, this is just a basic check
  if (token && isAuthRoute && pathname !== '/auth/reset-password') {
    // Don't redirect reset-password as it might have a token in URL
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files (public folder)
     */
    '/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};

