import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { verifyToken } from '@/lib/auth';

const PROTECTED_ROUTES = ['/api/history', '/admin'];

export default async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Check if route is protected
  const isProtected = PROTECTED_ROUTES.some(route => pathname.startsWith(route));

  if (isProtected) {
    const token = req.cookies.get('auth_token')?.value;
    if (!token) {
      return NextResponse.redirect(new URL('/login', req.url));
    }

    const user = await verifyToken(token);
    if (!user) {
      return NextResponse.redirect(new URL('/login', req.url));
    }

    // Admin check
    if (pathname.startsWith('/admin') && !user.isAdmin) {
      return NextResponse.redirect(new URL('/dashboard', req.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!.*\\..*|_next).*)", "/", "/(api|trpc)(.*)"],
};