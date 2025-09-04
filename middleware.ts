// middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';

// Define roles
type Role = 'CLIENT' | 'LAWYER' | 'ADMIN';

// Protect paths with role-based access
const roleProtectedPaths: Record<string, Role[]> = {
  '/client': ['CLIENT'],
  '/dashboard': ['LAWYER', 'ADMIN'],
  '/dashboard/documents': ['LAWYER', 'ADMIN'],
  '/admin': ['ADMIN'],
};

// Public paths that don't require authentication
const publicPaths = ['/auth/signin', '/auth/signup', '/api/auth'];

// Secret for JWT from .env
const SECRET = process.env.NEXTAUTH_SECRET;

// Debug log function
const debug = (...args: any[]) => {
  if (process.env.NODE_ENV === 'development') {
    console.log('[Middleware]', ...args);
  }
};

export async function middleware(req: NextRequest) {
  const url = req.nextUrl.clone();
  const { pathname } = req.nextUrl;

  // Skip static files, public folder, and public paths
  if (
    pathname.startsWith('/_next') || 
    pathname.startsWith('/public') ||
    publicPaths.some(publicPath => pathname.startsWith(publicPath))
  ) {
    debug('Skipping middleware for path:', pathname);
    return NextResponse.next();
  }

  debug('Checking access for path:', pathname);

  // Get session token
  const token = await getToken({ req, secret: SECRET });
  debug('Token data:', { hasToken: !!token, tokenRole: token?.role });

  if (!token) {
    debug('No token found, redirecting to signin');
    url.pathname = '/auth/signin';
    url.searchParams.set('callbackUrl', pathname);
    return NextResponse.redirect(url);
  }

  const userRole = (token.role || 'CLIENT').toUpperCase() as Role;
  debug('User role:', userRole);

  // Redirect to appropriate dashboard based on role
  if (pathname === '/') {
    const roleBasedPath = userRole === 'CLIENT' ? '/client' : '/dashboard/clients';
    debug(`Redirecting to role-based path: ${roleBasedPath}`);
    url.pathname = roleBasedPath;
    return NextResponse.redirect(url);
  }
  
  // Redirect /dashboard to /dashboard/clients for lawyers
  if (pathname === '/dashboard' && (userRole === 'LAWYER' || userRole === 'ADMIN')) {
    debug('Redirecting lawyer from /dashboard to /dashboard/clients');
    url.pathname = '/dashboard/clients';
    return NextResponse.redirect(url);
  }

  // Check role-based access for protected paths
  for (const path in roleProtectedPaths) {
    if (pathname.startsWith(path)) {
      const allowedRoles = roleProtectedPaths[path];
      const hasAccess = allowedRoles.some(role => 
        role.toUpperCase() === userRole.toUpperCase()
      );
      
      if (!hasAccess) {
        console.warn(`Access denied: User role ${userRole} not in [${allowedRoles.join(', ')}] for path ${path}`);
        // Redirect to home page instead of unauthorized page
        url.pathname = '/';
        return NextResponse.redirect(url);
      }
    }
  }

  return NextResponse.next();
}

// Apply middleware to all routes except API
export const config = {
  matcher: [
    '/',
    '/client/:path*',
    '/dashboard/:path*',
    '/admin/:path*',
  ],
};
