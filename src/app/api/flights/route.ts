import { NextResponse } from 'next/server';

// Tus credenciales de Amadeus (¡NO COMPARTIR EN PRODUCCIÓN!)
// Considera usar variables de entorno para esto.
const AMADEUS_API_KEY = '2Uy8C6rExMz4Z7E7dtOkpmK8wzmd6Azo'; // <- REEMPLAZA CON TU API KEY
const AMADEUS_API_SECRET = 'mwpaMbv42dGUHkn7'; // <- REEMPLAZA CON TU API SECRET
const AMADEUS_TOKEN_URL = 'https://test.api.amadeus.com/v1/security/oauth2/token';
const AMADEUS_FLIGHT_SEARCH_URL = 'https://test.api.amadeus.com/v2/shopping/flight-offers';

// Variable global simple para almacenar el token y su expiración (en un entorno real, usarías una caché más robusta)
let amadeusAccessToken: string | null = null;
let tokenExpiryTime: number = 0;

// Mapa simple para convertir nombres de destino a códigos IATA (para propósitos de prueba)
// En un entorno real, obtendrías esto de tu base de datos o de una API de Amadeus Location Search.
const destinationIataMap: { [key: string]: string } = {
    'Viena': 'VIE',
    'San Francisco': 'SFO',
    'París': 'PAR',
    'Londres': 'LON', // Nota: LON es un código metropolitano, la API puede preferir códigos de aeropuerto específicos como LHR, LGW, etc.
    'Nueva York': 'NYC', // Nota: NYC es un código metropolitano, la API puede preferir JFK, LGA, EWR, etc.
    'Tokio': 'TYO', // Nota: TYO es un código metropolitano, la API puede preferir NRT, HND.
    'Roma': 'ROM', // Nota: ROM es un código metropolitano, la API puede preferir FCO, CIA.
    'Madrid': 'MAD', // Aunque es origen, lo incluimos por si acaso
    'Berlín': 'BER', // Nuevo código unificado para aeropuertos de Berlín
    'Lisboa': 'LIS',
    'Lima': 'LIM',
    // Añade más destinos de tu base de datos aquí con sus códigos IATA correspondientes
};

// Función para obtener un token de acceso de Amadeus
async function getAmadeusToken(): Promise<string> {
  // Si tenemos un token y no ha expirado, lo usamos
  if (amadeusAccessToken && Date.now() < tokenExpiryTime) {
    console.log('Usando token de Amadeus cacheado.');
    return amadeusAccessToken; // No necesitamos aserción de tipo aquí si la lógica es correcta
  }

  console.log('Obteniendo nuevo token de Amadeus...');
  try {
    const response = await fetch(AMADEUS_TOKEN_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: `grant_type=client_credentials&client_id=${AMADEUS_API_KEY}&client_secret=${AMADEUS_API_SECRET}`,
    });

    if (!response.ok) {
        const errorBody = await response.text();
        console.error('Error al obtener token de Amadeus:', response.status, errorBody);
        throw new Error(`Error al obtener token de Amadeus: ${response.status} - ${errorBody}`);
    }

    const data = await response.json();
    amadeusAccessToken = data.access_token;
    // Calcular tiempo de expiración (ahora + expires_in segundos * 1000 ms/s)
    tokenExpiryTime = Date.now() + (data.expires_in * 1000);
    console.log('Nuevo token de Amadeus obtenido. Expira en', data.expires_in, 'segundos.');
    // La función garantiza que amadeusAccessToken será string aquí antes de retornar
    return amadeusAccessToken as string; // Añadimos aserción de tipo para satisfacer a TypeScript si es necesario

  } catch (error) {
    console.error('Error inesperado al obtener token de Amadeus:', error);
    throw new Error('Fallo al obtener token de Amadeus.');
  }
}

// Route Handler para manejar solicitudes de búsqueda de vuelos
export async function POST(request: Request) {
  try {
    const requestBody = await request.json();
    // Recibir parámetros del frontend, incluyendo el nombre del destino y datos completos
    const { originLocationCode, destinationLocationCode: destinationName, departureDate, returnDate, adults, selectedLocationData } = requestBody;

    // Validar parámetros básicos (puedes añadir más validación)
    if (!originLocationCode || !destinationName || !departureDate || !adults) {
        return NextResponse.json({ error: 'Missing required flight search parameters' }, { status: 400 });
    }

    console.log(`Buscando vuelos de ${originLocationCode} a ${destinationName}`);

    // Obtener token de Amadeus
    const token = await getAmadeusToken();

    // --- Lógica para obtener el código IATA del destino --- START
    // Intentar obtener el código IATA del mapa
    const actualDestinationIataCode = destinationIataMap[destinationName];

    if (!actualDestinationIataCode) {
        console.warn(`Código IATA no encontrado en el mapa para el destino: ${destinationName}. Usando VIE (Viena) como destino por defecto.`);
        // Si el destino no está en el mapa, puedes lanzar un error o usar un destino por defecto.
        // Por ahora, usaremos VIE como destino fijo para evitar errores en la API de Amadeus si el código IATA es nulo/indefinido.
        // En una implementación real, esto DEBERÍA lanzar un error o usar la API de Amadeus Location Search.
         // return NextResponse.json({ error: `Código IATA no encontrado para el destino ${destinationName}` }, { status: 400 });
        const fallbackDestinationIataCode = 'VIE'; // Destino de fallback si no se encuentra en el mapa
         console.warn(`Usando destino de fallback: ${fallbackDestinationIataCode}`);
         // Usar el código IATA de fallback para la llamada a Amadeus
        const searchUrl = new URL(AMADEUS_FLIGHT_SEARCH_URL);
        searchUrl.searchParams.append('originLocationCode', originLocationCode);
        searchUrl.searchParams.append('destinationLocationCode', fallbackDestinationIataCode); // Usar el código IATA de fallback
        searchUrl.searchParams.append('departureDate', departureDate);
        searchUrl.searchParams.append('adults', adults.toString());

        if (returnDate) {
            searchUrl.searchParams.append('returnDate', returnDate);
        }

        searchUrl.searchParams.append('currencyCode', 'EUR'); // Moneda

        console.log('Llamando a la API de búsqueda de vuelos de Amadeus con URL:', searchUrl.toString());

        // Hacer la solicitud a la API de Amadeus Flight Offers Search
        const amadeusResponse = await fetch(searchUrl.toString(), {
          method: 'GET', // La API de búsqueda de vuelos es GET
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });

         // ... manejar la respuesta y devolverla (código duplicado, refactorizar si se expande) ...
          if (!amadeusResponse.ok) {
              const errorBody = await amadeusResponse.text();
              console.error('Error de la API de Amadeus Flight Search (fallback):', amadeusResponse.status, errorBody);
              try {
                   const errorJson = JSON.parse(errorBody);
                   return NextResponse.json({ error: 'Amadeus API error', details: errorJson }, { status: amadeusResponse.status });
              } catch (parseError) {
                   return NextResponse.json({ error: 'Amadeus API error', details: errorBody }, { status: amadeusResponse.status });
              }
          }

          const data = await amadeusResponse.json();
          console.log('Respuesta de Amadeus (fallback):', data);
          return NextResponse.json(data);

    } else {
        // Si se encontró el código IATA en el mapa, usarlo
        console.log(`Código IATA encontrado para \${destinationName}: \${actualDestinationIataCode}`);
        
        // Construir URL de búsqueda de vuelos (usando el código IATA encontrado)
        const searchUrl = new URL(AMADEUS_FLIGHT_SEARCH_URL);
        searchUrl.searchParams.append('originLocationCode', originLocationCode);
        searchUrl.searchParams.append('destinationLocationCode', actualDestinationIataCode); // <--- Usar el código IATA real
        searchUrl.searchParams.append('departureDate', departureDate);
        searchUrl.searchParams.append('adults', adults.toString());

        if (returnDate) {
            searchUrl.searchParams.append('returnDate', returnDate);
        }

        searchUrl.searchParams.append('currencyCode', 'EUR'); // Moneda
        
        console.log('Llamando a la API de búsqueda de vuelos de Amadeus con URL:', searchUrl.toString());

        // Hacer la solicitud a la API de Amadeus Flight Offers Search
        const amadeusResponse = await fetch(searchUrl.toString(), {
          method: 'GET', // La API de búsqueda de vuelos es GET
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });

         // ... manejar la respuesta y devolverla (código duplicado, refactorizar si se expande) ...
          if (!amadeusResponse.ok) {
              const errorBody = await amadeusResponse.text();
              console.error('Error de la API de Amadeus Flight Search:', amadeusResponse.status, errorBody);
              try {
                   const errorJson = JSON.parse(errorBody);
                   return NextResponse.json({ error: 'Amadeus API error', details: errorJson }, { status: amadeusResponse.status });
              } catch (parseError) {
                   return NextResponse.json({ error: 'Amadeus API error', details: errorBody }, { status: amadeusResponse.status });
              }
          }

          const data = await amadeusResponse.json();
          console.log('Respuesta de Amadeus:', data);
          return NextResponse.json(data);
    }
    // --- Lógica para obtener el código IATA del destino --- END

  } catch (error) {
    console.error('Error en la ruta API /api/flights:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
} 