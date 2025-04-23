import { NextResponse } from 'next/server';
import { withAuth } from 'next-auth/middleware';

export default withAuth(
  function middleware(req) {
    // If someone tries to access /login, redirect them to the homepage
    if (req.nextUrl.pathname === '/login') {
      return NextResponse.redirect(new URL('/', req.url));
    }
    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token }) => true, // Allow all routes by default
    },
  }
);

// Specify which routes to protect
export const config = {
  matcher: ['/login', '/demo/:path*', '/cases/:path*', '/admin/:path*'],
};
