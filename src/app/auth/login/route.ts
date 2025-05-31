import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  const requestUrl = new URL(request.url);
  const formData = await request.formData();
  const email = String(formData.get('email'));
  const password = String(formData.get('password'));
  const supabase = createRouteHandlerClient({ cookies });

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    console.error('Login API Error:', error);
    // Redirigir de vuelta al login con un mensaje de error
    return NextResponse.redirect(`${requestUrl.origin}/login?error=${encodeURIComponent(error.message)}`, {
      status: 301,
    });
  }

  // Redirigir al dashboard después de un login exitoso
  return NextResponse.redirect(`${requestUrl.origin}/dashboard`, {
    status: 301,
  });
} 