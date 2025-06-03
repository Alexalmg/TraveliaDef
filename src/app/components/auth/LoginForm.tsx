'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
// import { supabase } from '@/lib/supabase'; // Ya no necesitamos el cliente aquí para el login
import Link from 'next/link';
// import { useAuth } from '../../providers/AuthProvider'; // Ya no necesitamos el estado de auth aquí para la redirección inmediata

export default function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  // const { user, loading: authLoading } = useAuth(); // Eliminado

  // Eliminado: Ya no necesitamos este useEffect porque la Route Handler redirige
  // useEffect(() => {
  //   console.log('Estado de autenticación:', { user, authLoading });
  //   if (!authLoading && user) {
  //     console.log('Usuario autenticado, redirigiendo a dashboard...');
  //     router.push('/dashboard');
  //   }
  // }, [user, authLoading, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      console.log('Enviando credenciales a /auth/login con fetch:', email);

      // Usar fetch para enviar los datos a la Route Handler API
      const response = await fetch('/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({ email, password }).toString(),
        // No es necesario manejar la redirección aquí, 
        // la Route Handler emitirá la respuesta con las cookies
        // y luego usaremos router.push en el cliente
      });

      console.log('Respuesta de /auth/login (fetch):', response.status);

      // Si la respuesta indica éxito (ej: 302 Found de la redirección), redirigir en el cliente
      // La Route Handler ya estableció las cookies
      if (response.ok || response.redirected) { // response.ok es true para 2xx, response.redirected para redirecciones
         console.log('Fetch exitoso o redirigido, navegando a /dashboard');
         router.push('/dashboard');
      } else {
        // Si la Route Handler devuelve un error (ej: 401 por credenciales inválidas)
        const errorData = await response.json(); // Asumimos que devuelve JSON en caso de error
        console.error('Error en respuesta de /auth/login:', errorData);
        setError(errorData.error || 'Credenciales inválidas');
      }
      
    } catch (err) {
      console.error('Error al enviar datos de login (fetch):', err);
      setError('Error de red o del servidor al intentar iniciar sesión.');
    } finally {
      // Si no hubo redirección exitosa (ej: hubo un error manejado o de red)
       setLoading(false);
    }
  };

  // Eliminado: Ya no necesitamos este estado de carga inicial del AuthProvider
  // if (authLoading) {
  //   return (
  //     <div className="min-h-screen flex items-center justify-center">
  //       <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
  //       <p className="ml-4 text-gray-700">Verificando sesión...</p>
  //     </div>
  //   );
  // }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Iniciar Sesión en Travelia
          </h2>
          {/* Mostrar error local o error de la URL si viene de una redirección con error */}
          {error && (
            <div className="text-red-500 text-sm text-center mt-2">{error}</div>
          )}
          {searchParams.get('error') && (
            <div className="text-red-500 text-sm text-center mt-2">{searchParams.get('error')}</div>
          )}
        </div>
        {/* Cambiamos a onSubmit y eliminamos action/method */}
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="rounded-md shadow-sm -space-y-px">
            <div>
              <label htmlFor="email" className="sr-only">
                Email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-t-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading} // Deshabilitar si loading es true
              />
            </div>
            <div>
              <label htmlFor="password" className="sr-only">
                Contraseña
              </label>
              <input
                id="password"
                name="password"
                type="password"
                required
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-b-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                placeholder="Contraseña"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading} // Deshabilitar si loading es true
              />
            </div>
          </div>

          <div>
            <button
              type="submit"
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
              disabled={loading} // Deshabilitar si loading es true
            >
              {loading ? 'Iniciando sesión...' : 'Iniciar Sesión'}
            </button>
          </div>

          <div className="text-sm text-center">
            <Link href="/register" className="font-medium text-indigo-600 hover:text-indigo-500">
              ¿No tienes una cuenta? Regístrate
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
} 