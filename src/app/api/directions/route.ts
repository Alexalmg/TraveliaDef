import { NextResponse } from 'next/server';

const GOOGLE_PLACES_API_KEY = 'AIzaSyBn_IoraUBufBwDWlugUlNxbi62zbjeWWE'; // Usamos la misma API Key

export async function POST(request: Request) {
  try {
    const { origin, destination } = await request.json();

    // Construir la URL para la API de Google Directions
    const directionsUrl = `https://maps.googleapis.com/maps/api/directions/json?origin=${origin.latitude},${origin.longitude}&destination=${destination.latitude},${destination.longitude}&key=${GOOGLE_PLACES_API_KEY}`;

    const directionsResponse = await fetch(directionsUrl);
    const directionsData = await directionsResponse.json();

    // Verificar el estado de la respuesta de la API de Google
    if (directionsData.status !== 'OK') {
      console.error('Google Directions API Error Status:', directionsData.status);
      console.error('Google Directions API Error Message:', directionsData.error_message);

      let httpStatus = 500; // Valor por defecto para errores internos

      // Intentar usar el código HTTP de la respuesta original de Google si está disponible
      if (directionsResponse.status) {
         httpStatus = directionsResponse.status;
      }

      // Sobrescribir el código HTTP para casos específicos basados en el estado de Google
      if (directionsData.status === 'REQUEST_DENIED') {
          httpStatus = 401; // o 403, dependiendo de tu política de errores de autenticación
      } else if (directionsData.status === 'ZERO_RESULTS' || directionsData.status === 'NOT_FOUND' || directionsData.status === 'INVALID_REQUEST') {
          httpStatus = 400;
      }
      // Puedes añadir más casos para otros estados de Google si es necesario

      return NextResponse.json(
        { error: directionsData.error_message || `Google Directions API Error: ${directionsData.status}` }, 
        { status: httpStatus }
      );
    }

    // Si el estado es 'OK', devolver la respuesta de Google
    return NextResponse.json(directionsData);

  } catch (error) {
    console.error('Error fetching directions:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor al buscar ruta' }, 
      { status: 500 }
    );
  }
}