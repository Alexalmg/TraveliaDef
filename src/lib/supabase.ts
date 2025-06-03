import { createClient } from '@supabase/supabase-js';

if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
  throw new Error('Falta la variable de entorno NEXT_PUBLIC_SUPABASE_URL');
}

if (!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
  throw new Error('Falta la variable de entorno NEXT_PUBLIC_SUPABASE_ANON_KEY');
}

console.log('Inicializando cliente de Supabase con URL:', process.env.NEXT_PUBLIC_SUPABASE_URL);

// Función para verificar si estamos en el navegador (cliente)
const isBrowser = () => typeof window !== 'undefined';

// Implementación de almacenamiento seguro para SSR
const storage = {
  getItem: (key: string): string | null => {
    if (!isBrowser()) { // Verificar si estamos en el navegador
      console.log('getItem: No en el navegador, retornando null');
      return null;
    }
    try {
      console.log('getItem: Obteniendo de localStorage:', key);
      const value = localStorage.getItem(key);
      console.log('getItem: Valor obtenido:', value);
      return value;
    } catch (error) {
      console.error('getItem: Error al obtener del localStorage:', error);
      return null;
    }
  },
  setItem: (key: string, value: string): void => {
    if (!isBrowser()) { // Verificar si estamos en el navegador
      console.log('setItem: No en el navegador, no se guarda');
      return;
    }
    try {
      console.log('setItem: Guardando en localStorage:', key, value);
      localStorage.setItem(key, value);
    } catch (error) {
      console.error('setItem: Error al guardar en localStorage:', error);
    }
  },
  removeItem: (key: string): void => {
    if (!isBrowser()) { // Verificar si estamos en el navegador
      console.log('removeItem: No en el navegador, no se elimina');
      return;
    }
    try {
      console.log('removeItem: Eliminando de localStorage:', key);
      localStorage.removeItem(key);
    } catch (error) {
      console.error('removeItem: Error al eliminar de localStorage:', error);
    }
  },
};

// Inicialización del cliente de Supabase con la configuración de almacenamiento
export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      storageKey: 'travelia-auth-token',
      storage, // Usar nuestra implementación de almacenamiento
    },
    global: {
      headers: {
        'x-application-name': 'travelia',
      },
    },
  }
); 