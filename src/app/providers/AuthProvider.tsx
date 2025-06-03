'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { useRouter, usePathname } from 'next/navigation';

type AuthContextType = {
  user: User | null;
  loading: boolean;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  signOut: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    // Verificar sesión actual
    const checkUser = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        console.log('Usuario actual:', user);
        setUser(user);

        // Redirigir si es necesario
        if (!user && pathname.startsWith('/dashboard')) {
          console.log('No hay usuario, redirigiendo a login...');
          router.push('/login');
        } else if (user && (pathname === '/login' || pathname === '/register')) {
          console.log('Usuario autenticado, redirigiendo a dashboard...');
          router.push('/dashboard');
        }
      } catch (error) {
        console.error('Error al verificar la sesión:', error);
      } finally {
        setLoading(false);
      }
    };

    checkUser();

    // Suscribirse a cambios en la autenticación
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('Cambio en el estado de autenticación:', event, session?.user);
      setUser(session?.user ?? null);
      setLoading(false);

      // Manejar redirecciones basadas en el evento de autenticación
      if (event === 'SIGNED_IN') {
        router.push('/dashboard');
      } else if (event === 'SIGNED_OUT') {
        router.push('/login');
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [router, pathname]);

  const signOut = async () => {
    try {
      await supabase.auth.signOut();
      setUser(null);
      router.push('/login');
    } catch (error) {
      console.error('Error al cerrar sesión:', error);
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth debe ser usado dentro de un AuthProvider');
  }
  return context;
}; 