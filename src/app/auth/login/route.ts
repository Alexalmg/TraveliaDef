import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  const requestUrl = new URL(request.url);
  const formData = await request.formData();
  const email = String(formData.get('email'));
  const password = String(formData.get('password'));
  
  // Obtener la función cookies
  const cookieStore = cookies();

  // Inicializar Supabase usando la función cookies obtenida
  const supabase = createRouteHandlerClient({ cookies: () => cookieStore });

  console.log('Intentando iniciar sesión para:', email);

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    console.error('Login API Error:', error);
    // En caso de error de Supabase (ej: credenciales inválidas), devolver JSON
    return NextResponse.json({ error: error.message }, { status: 401 }); // Usar 401 para credenciales inválidas
  }

  console.log('Login exitoso en API route:', data);
  
  // Redirigir al dashboard después del login exitoso usando 302 Found
  return NextResponse.redirect(`${requestUrl.origin}/dashboard`, {
    status: 302,
  });
} 