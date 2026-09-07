import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    return response;
  }

  const supabase = createServerClient(
    supabaseUrl,
    supabaseKey,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  let user = null;
  try {
    const { data } = await supabase.auth.getUser();
    user = data?.user || null;
  } catch (err) {
    console.warn('[Middleware] Auth check error:', err);
  }

  const pathname = request.nextUrl.pathname;
  const isPublicRoute = [
    '/welcome',
    '/auth',
    '/auth/preferences',
    '/auth/forgot-password',
    '/privacy',
    '/terms',
    '/about',
    '/help'
  ].some(route => pathname === route || pathname.startsWith(`${route}/`));

  const isApiRoute = pathname.startsWith('/api');
  const isStatic = pathname.startsWith('/_next') || pathname.includes('.') || pathname === '/favicon.ico';

  if (isStatic || isApiRoute) {
    return response;
  }

  // If user is not logged in and requesting a protected route, redirect to /welcome
  if (!user && !isPublicRoute && pathname !== '/') {
    return NextResponse.redirect(new URL('/welcome', request.url));
  }

  // If user is logged in and visits /auth or /welcome, redirect to /home or /
  if (user && (pathname === '/auth' || pathname === '/welcome')) {
    return NextResponse.redirect(new URL('/', request.url));
  }

  return response;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
