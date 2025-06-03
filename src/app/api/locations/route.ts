import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

// Función auxiliar para calcular la distancia esférica entre dos puntos (lat1, lon1) y (lat2, lon2) en metros
// Usando la fórmula Haversine o una aproximación esférica simple
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371e3; // radio de la Tierra en metros
  const φ1 = lat1 * Math.PI / 180; // φ, λ in radians
  const φ2 = lat2 * Math.PI / 180;
  const Δφ = (lat2 - lat1) * Math.PI / 180;
  const Δλ = (lon2 - lon1) * Math.PI / 180;

  const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  const distance = R * c; // en metros
  return distance;
}

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const { searchParams } = requestUrl;
  const latitude = searchParams.get('latitude');
  const longitude = searchParams.get('longitude');

  if (!latitude || !longitude) {
    // Considerar si quieres que esto sea opcional si solo buscas todas las ubicaciones
    // Por ahora, lo mantenemos como estaba en la versión anterior simplificada
    return NextResponse.json({ error: 'Latitude and longitude are required' }, { status: 400 });
  }

  const cookieStore = cookies();
  const supabase = createRouteHandlerClient({ cookies: () => cookieStore });

  try {
    // Obtener todas las ubicaciones sin filtrar ni ordenar por distancia
    const { data: locations, error } = await supabase
      .from('locations')
      .select('*');

    if (error) {
      console.error('Error fetching locations:', error.message);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Devolver todas las ubicaciones directamente
    return NextResponse.json(locations || []);

  } catch (error) {
    console.error('Unexpected error fetching locations:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
} 