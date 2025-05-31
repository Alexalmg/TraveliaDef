import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const latitude = requestUrl.searchParams.get('lat');
  const longitude = requestUrl.searchParams.get('lon');

  // Verificar si se proporcionaron las coordenadas
  if (!latitude || !longitude) {
    return NextResponse.json({ error: 'Faltan los parámetros de latitud o longitud' }, { status: 400 });
  }

  const supabase = createRouteHandlerClient({ cookies });

  try {
    // Convertir las coordenadas a números
    const userLat = parseFloat(latitude);
    const userLon = parseFloat(longitude);

    // Llamar a la función de base de datos para obtener ubicaciones por cercanía
    const { data, error } = await supabase.rpc('get_locations_nearby', {
      user_lat: userLat, // Pasar latitud como parámetro
      user_lon: userLon  // Pasar longitud como parámetro
    });

    if (error) {
      console.error('Error consultando Supabase desde API route:', error);
      return NextResponse.json({ error: 'Error al cargar ubicaciones' }, { status: 500 });
    }

    // Devolver los datos obtenidos
    return NextResponse.json(data);

  } catch (error) {
    console.error('Error en la API route de ubicaciones:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
} 