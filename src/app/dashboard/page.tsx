'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../providers/AuthProvider';
import { supabase } from '@/lib/supabase'; // Importar el cliente de Supabase
import Image from 'next/image'; // Importar el componente Image de Next.js

// Interfaz para los datos de ubicación que obtendremos de la API (ahora incluye distance)
interface LocationData {
  id: string;
  name: string;
  description: string | null;
  latitude: number;
  longitude: number;
  image_url?: string;
  distance: number; // La API ahora devuelve la distancia calculada
}

export default function Dashboard() {
  const { user, loading: authLoading, signOut } = useAuth();
  const router = useRouter();
  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [locations, setLocations] = useState<LocationData[]>([]);
  const [loadingLocations, setLoadingLocations] = useState(true);
  const [locationError, setLocationError] = useState<string | null>(null);

  // Redirigir si no está autenticado
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  // Obtener ubicación del usuario
  useEffect(() => {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          console.log('Ubicación obtenida:', position.coords);
          setUserLocation({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          });
        },
        (error) => {
          console.error('Error obteniendo la ubicación:', error);
          setLocationError('No se pudo obtener tu ubicación.');
          setLoadingLocations(false); // Dejar de cargar si falla la ubicación
        }
      );
    } else {
      console.log('Geolocalización no soportada.');
      setLocationError('Geolocalización no soportada en este navegador.');
      setLoadingLocations(false); // Dejar de cargar si no hay soporte
    }
  }, []);

  // Cargar ubicaciones cercanas una vez que tengamos la ubicación del usuario
  useEffect(() => {
    const fetchLocations = async () => {
      if (!userLocation) {
        console.log('Esperando ubicación del usuario...');
        return; // No buscar si no tenemos la ubicación del usuario
      }

      setLoadingLocations(true);
      setLocationError(null);
      console.log('Obteniendo ubicaciones de la API para la ubicación:', userLocation);

      try {
        // Llamar a la nueva API route para obtener ubicaciones por cercanía
        const response = await fetch(`/api/locations?lat=${userLocation.latitude}&lon=${userLocation.longitude}`);
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Error desconocido al obtener ubicaciones');
        }

        const data: LocationData[] = await response.json();

        if (data) {
          console.log('Datos de ubicaciones obtenidos de la API (' + data.length + '):', data);

          // Los datos ya vienen ordenados por cercanía y con la distancia calculada
          setLocations(data);
        } else {
            console.log('No se obtuvieron datos de ubicaciones de la API.');
            setLocations([]);
        }
      } catch (err: unknown) { // Usar unknown en lugar de any
        console.error('Error cargando ubicaciones:', err);
        setLocationError('Error al cargar ubicaciones: ' + (err instanceof Error ? err.message : String(err)));
        setLocations([]);
      } finally {
        setLoadingLocations(false);
      }
    };

    fetchLocations();
  }, [userLocation]); // Este efecto se ejecuta cuando userLocation cambia

  // Función simple para calcular la distancia entre dos puntos (Haversine formula)
  // Ya no es necesaria si la BD calcula, podemos eliminarla si queremos simplificar.
  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371; // Radio de la Tierra en kilómetros
    const dLat = (lat2 - lat1) * Math.PI / R;
    const dLon = (lon2 - lon1) * Math.PI / R;
    const a = 
      0.5 - Math.cos(dLat)/2 + 
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      (1 - Math.cos(dLon)) / 2;

    return R * 2 * Math.asin(Math.sqrt(a)); // Distancia en kilómetros
  };

  // Mostrar carga o error mientras se obtiene el usuario o las ubicaciones
  if (authLoading || loadingLocations) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
        <p className="ml-4 text-gray-700">{authLoading ? 'Verificando sesión...' : locationError ? locationError : 'Cargando ubicaciones...'}</p>
      </div>
    );
  }

  // Si no hay usuario (redirección ya manejada por el effect)
  if (!user) {
      return null; // Debería redirigir antes de llegar aquí si authLoading es false
  }

  // Mostrar el dashboard con las ubicaciones
  return (
    <div className="min-h-screen bg-gray-100">
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-semibold">Travelia Dashboard</h1>
            </div>
            <div className="flex items-center">
              <span className="text-gray-600 text-sm mr-4">Hola, {user.email}</span>
              <button
                onClick={signOut}
                className="px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
              >
                Cerrar Sesión
              </button>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="bg-white shadow overflow-hidden sm:rounded-lg p-6">
            <h2 className="text-2xl font-bold mb-4">Lugares Cercanos</h2>

            {locationError && (
                <div className="text-red-500 text-center mb-4">{locationError}</div>
            )}

            {!userLocation && !locationError && !loadingLocations && (
                 <div className="text-gray-600 text-center mb-4">Esperando ubicación... Por favor, permite la geolocalización en tu navegador.</div>
            )}

            {userLocation && locations.length > 0 ? (
              <ul className="divide-y divide-gray-200">
                {locations.map((location) => (
                  <li key={location.id} className="py-4 flex flex-col sm:flex-row items-center sm:items-start">
                    {location.image_url && (
                      <Image src={location.image_url} alt={location.name} className="w-24 h-24 object-cover rounded-md mr-4 mb-4 sm:mb-0" width={96} height={96} />
                    )}
                    <div className="flex flex-col flex-grow">
                      <p className="text-lg font-semibold text-gray-900">{location.name}</p>
                      {location.description && <p className="mt-1 text-sm text-gray-600">{location.description}</p>}
                      {/* Mostrar distancia que ahora viene de la API */}
                      <p className="mt-1 text-sm text-gray-500">{location.distance.toFixed(2)} km de distancia</p>
                    </div>
                  </li>
                ))}
              </ul>
            ) : userLocation && !loadingLocations && !locationError && (
              <div className="text-gray-600 text-center">No se encontraron lugares cercanos.</div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
} 