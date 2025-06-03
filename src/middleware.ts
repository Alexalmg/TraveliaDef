import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function middleware(req: NextRequest) {
  try {
    const res = NextResponse.next();
    const supabase = createMiddlewareClient({ req, res });

    // Refrescar la sesión si es necesario
    const { data: { session }, error } = await supabase.auth.getSession();

    if (error) {
      console.error('Error en middleware:', error);
    }

    // Si el usuario no está autenticado y trata de acceder a una ruta protegida
    if (!session && req.nextUrl.pathname.startsWith('/dashboard')) {
      console.log('Middleware: Usuario no autenticado, redirigiendo a login');
      const redirectUrl = new URL('/login', req.url);
      redirectUrl.searchParams.set('redirectedFrom', req.nextUrl.pathname);
      return NextResponse.redirect(redirectUrl);
    }

    // Si el usuario está autenticado y trata de acceder a login/register
    if (session && (req.nextUrl.pathname.startsWith('/login') || req.nextUrl.pathname.startsWith('/register'))) {
      console.log('Middleware: Usuario autenticado, redirigiendo a dashboard');
      return NextResponse.redirect(new URL('/dashboard', req.url));
    }

    return res;
  } catch (error) {
    console.error('Error en middleware:', error);
    return NextResponse.next();
  }
}

export const config = {
  matcher: ['/dashboard/:path*', '/login', '/register'],
}; 