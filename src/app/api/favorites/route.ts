import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const cookieStore = cookies();
    const supabase = createRouteHandlerClient({ 
      cookies: () => cookieStore 
    });

    // Verificar la sesión del usuario
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError) {
      console.error('Error al verificar la sesión:', sessionError);
      return NextResponse.json({ error: 'Error de autenticación' }, { status: 401 });
    }

    if (!session) {
      return NextResponse.json({ error: 'No autorizado - Sesión no encontrada' }, { status: 401 });
    }

    const body = await request.json();
    const {
      destination,
      startDate,
      endDate,
      travelers,
      transportType,
      selectedFlight,
      carRoute,
      searchHotel,
      rentCar,
      selectedPlaces,
      plan
    } = body;

    if (!destination || !startDate || !endDate || !travelers || !transportType || !plan) {
      return NextResponse.json({ error: 'Faltan datos requeridos' }, { status: 400 });
    }

    // Guardar el plan en la tabla de favoritos
    const { data, error } = await supabase
      .from('favorite_plans')
      .insert([
        {
          user_id: session.user.id,
          destination,
          start_date: startDate,
          end_date: endDate,
          travelers,
          transport_type: transportType,
          flight_details: selectedFlight,
          car_route: carRoute,
          hotel_included: searchHotel,
          car_rental: rentCar,
          selected_places: selectedPlaces,
          plan_html: plan,
          created_at: new Date().toISOString()
        }
      ])
      .select();

    if (error) {
      console.error('Error al guardar el plan:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('Error al procesar la solicitud:', error);
    return NextResponse.json(
      { error: 'Error al procesar la solicitud: ' + (error instanceof Error ? error.message : 'Error desconocido') },
      { status: 500 }
    );
  }
}

export async function GET(request: Request) {
  try {
    const cookieStore = cookies();
    const supabase = createRouteHandlerClient({ 
      cookies: () => cookieStore 
    });

    // Verificar la sesión del usuario
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError) {
      console.error('Error al verificar la sesión:', sessionError);
      return NextResponse.json({ error: 'Error de autenticación' }, { status: 401 });
    }

    if (!session) {
      return NextResponse.json({ error: 'No autorizado - Sesión no encontrada' }, { status: 401 });
    }

    // Obtener los planes favoritos del usuario
    const { data, error } = await supabase
      .from('favorite_plans')
      .select('*')
      .eq('user_id', session.user.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error al obtener los planes:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ plans: data });
  } catch (error) {
    console.error('Error al procesar la solicitud:', error);
    return NextResponse.json(
      { error: 'Error al procesar la solicitud: ' + (error instanceof Error ? error.message : 'Error desconocido') },
      { status: 500 }
    );
  }
} 