import { NextResponse } from 'next/server';
import { withAuth } from 'next-auth/middleware';

export default withAuth(
  function middleware(req) {
    const isLoginPath = req.nextUrl.pathname === '/login';
    const host = req.headers.get('host');

    // Only redirect if we're not already on kellogg.noyesai.com
    if (isLoginPath && host !== 'kellogg.noyesai.com') {
      return NextResponse.redirect('https://kellogg.noyesai.com');
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
