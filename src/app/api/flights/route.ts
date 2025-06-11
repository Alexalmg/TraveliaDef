import { NextResponse } from 'next/server';

// Credenciales de Amadeus
const AMADEUS_API_KEY = '2Uy8C6rExMz4Z7E7dtOkpmK8wzmd6Azo';
const AMADEUS_API_SECRET = 'mwpaMbv42dGUHkn7';
const AMADEUS_TOKEN_URL = 'https://test.api.amadeus.com/v1/security/oauth2/token';
const AMADEUS_FLIGHT_SEARCH_URL = 'https://test.api.amadeus.com/v2/shopping/flight-offers';

// Credenciales de Google Maps
const GOOGLE_MAPS_API_KEY = 'AIzaSyDDqrXEaLlMs09tFHEO89omXJlEHezUYsk';

// Variables globales para Amadeus
let amadeusAccessToken: string | null = null;
let tokenExpiryTime: number = 0;

// Mapa de códigos IATA con variantes de nombres
const destinationIataMap: { [key: string]: string } = {
    // España
    'Madrid': 'MAD',
    'Barcelona': 'BCN',
    'Palma de Mallorca': 'PMI',
    'Palma': 'PMI',
    'Málaga': 'AGP',
    'Malaga': 'AGP',

    // Reino Unido
    'Londres': 'LHR',
    'London': 'LHR',
    'Edimburgo': 'EDI',
    'Edinburgh': 'EDI',
    'Manchester': 'MAN',
    'Birmingham': 'BHX',
    'Glasgow': 'GLA',
    'Bristol': 'BRS',
    'Liverpool': 'LPL',
    'Newcastle': 'NCL',
    'Leeds': 'LBA',
    'Cardiff': 'CWL',
    'Belfast': 'BFS',
    'Aberdeen': 'ABZ',
    'Inverness': 'INV',
    'Jersey': 'JER',
    'Guernsey': 'GCI',
    'Isla de Man': 'IOM',
    'Isle of Man': 'IOM',

    // Francia
    'París': 'CDG',
    'Paris': 'CDG',

    // Italia
    'Roma': 'FCO',
    'Rome': 'FCO',
    'Milán': 'MXP',
    'Milan': 'MXP',
    'Venecia': 'VCE',
    'Venice': 'VCE',
    'Florencia': 'FLR',
    'Florence': 'FLR',
    'Nápoles': 'NAP',
    'Naples': 'NAP',

    // Alemania
    'Berlín': 'BER',
    'Berlin': 'BER',
    'Múnich': 'MUC',
    'Munich': 'MUC',

    // Países Bajos
    'Ámsterdam': 'AMS',
    'Amsterdam': 'AMS',

    // Portugal
    'Lisboa': 'LIS',
    'Lisbon': 'LIS',

    // Grecia
    'Atenas': 'ATH',
    'Athens': 'ATH',

    // República Checa
    'Praga': 'PRG',
    'Prague': 'PRG',

    // Hungría
    'Budapest': 'BUD',

    // Polonia
    'Varsovia': 'WAW',
    'Warsaw': 'WAW',

    // Países Nórdicos
    'Copenhague': 'CPH',
    'Copenhagen': 'CPH',
    'Estocolmo': 'ARN',
    'Stockholm': 'ARN',
    'Oslo': 'OSL',
    'Helsinki': 'HEL',

    // Irlanda
    'Dublín': 'DUB',
    'Dublin': 'DUB',

    // Turquía
    'Estambul': 'IST',
    'Istanbul': 'IST',

    // Estados Unidos
    'San Francisco': 'SFO',
    'Nueva York': 'JFK',
    'New York': 'JFK',
    'NYC': 'JFK',

    // Perú
    'Lima': 'LIM',

    // Japón
    'Tokio': 'HND',
    'Tokyo': 'HND',

    // Emiratos Árabes Unidos
    'Dubái': 'DXB',
    'Dubai': 'DXB',

    // Singapur
    'Singapur': 'SIN',
    'Singapore': 'SIN',

    // Hong Kong
    'Hong Kong': 'HKG',

    // Corea del Sur
    'Seúl': 'ICN',
    'Seoul': 'ICN',

    // Austria
    'Viena': 'VIE',
    'Vienna': 'VIE',
    'Wien': 'VIE'
};

// Función para obtener token de Amadeus
async function getAmadeusToken(): Promise<string> {
    if (amadeusAccessToken && Date.now() < tokenExpiryTime) {
        console.log('Usando token de Amadeus cacheado.');
        return amadeusAccessToken;
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
        tokenExpiryTime = Date.now() + (data.expires_in * 1000);
        console.log('Nuevo token de Amadeus obtenido. Expira en', data.expires_in, 'segundos.');
        return amadeusAccessToken as string;
    } catch (error) {
        console.error('Error inesperado al obtener token de Amadeus:', error);
        throw new Error('Fallo al obtener token de Amadeus.');
    }
}

// Función para buscar vuelos
async function searchFlights(params: any) {
    const { originLocationCode, destinationName, departureDate, returnDate, adults } = params;
    const token = await getAmadeusToken();
    
    // Obtener el código IATA del destino, ignorando mayúsculas/minúsculas
    const destinationIataCode = destinationIataMap[destinationName] || 
                               Object.entries(destinationIataMap)
                                     .find(([key]) => key.toLowerCase() === destinationName.toLowerCase())?.[1];

    if (!destinationIataCode) {
        console.error('Destino no encontrado:', destinationName);
        console.log('Destinos disponibles:', Object.keys(destinationIataMap));
        throw new Error(`No se encontró el código IATA para el destino: ${destinationName}`);
    }

    console.log('Buscando vuelos:', {
        origen: originLocationCode,
        destino: destinationIataCode,
        nombreDestino: destinationName,
        fechaIda: departureDate,
        fechaVuelta: returnDate,
        pasajeros: adults
    });

    const searchUrl = new URL(AMADEUS_FLIGHT_SEARCH_URL);
    searchUrl.searchParams.append('originLocationCode', originLocationCode);
    searchUrl.searchParams.append('destinationLocationCode', destinationIataCode);
    searchUrl.searchParams.append('departureDate', departureDate);
    searchUrl.searchParams.append('adults', adults.toString());
    if (returnDate) searchUrl.searchParams.append('returnDate', returnDate);
    searchUrl.searchParams.append('currencyCode', 'EUR');

    const response = await fetch(searchUrl.toString(), {
        method: 'GET',
        headers: { 'Authorization': `Bearer ${token}` },
    });

    if (!response.ok) {
        const errorBody = await response.text();
        throw new Error(`Error de Amadeus: ${response.status} - ${errorBody}`);
    }

    return response.json();
}

// Función para buscar ruta en coche
// Función para buscar ruta en coche
async function searchCarRoute(origin: any, destination: any) {
  const directionsUrl = `https://maps.googleapis.com/maps/api/directions/json?origin=${origin.latitude},${origin.longitude}&destination=${destination.latitude},${destination.longitude}&mode=driving&language=es&key=${GOOGLE_MAPS_API_KEY}`;

  const response = await fetch(directionsUrl);
  const data = await response.json();

  if (data.status !== 'OK') {
      throw new Error(`Error de Google Directions: ${data.status} - ${data.error_message}`);
  }

  // Constantes para el cálculo
  const CONSUMO_CARRETERA = 6.5; // L/100km en carretera
  const CONSUMO_CIUDAD = 8.5;    // L/100km en ciudad
  const CONSUMO_AUTOPISTA = 7.0; // L/100km en autopista
  const PRECIO_GASOLINA = 1.65;  // €/L (precio actualizado)
  const PRECIO_DIESEL = 1.55;    // €/L (precio actualizado)
  const PRECIO_HIBRIDO = 1.60;   // €/L (precio actualizado)

  // Transformar la respuesta para incluir información adicional
  return {
      ...data,
      routes: data.routes.map((route: any) => ({
          ...route,
          legs: route.legs.map((leg: any) => {
              // Analizar los pasos para determinar el tipo de vía
              const steps = leg.steps;
              let distanciaCarretera = 0;
              let distanciaCiudad = 0;
              let distanciaAutopista = 0;

              steps.forEach((step: any) => {
                  const distancia = step.distance.value / 1000; // Convertir a km
                  if (step.html_instructions.includes('autopista') || step.html_instructions.includes('autovía')) {
                      distanciaAutopista += distancia;
                  } else if (step.html_instructions.includes('carretera')) {
                      distanciaCarretera += distancia;
                  } else {
                      distanciaCiudad += distancia;
                  }
              });

              // Calcular consumo total
              const consumoTotal = (
                  (distanciaAutopista * CONSUMO_AUTOPISTA) +
                  (distanciaCarretera * CONSUMO_CARRETERA) +
                  (distanciaCiudad * CONSUMO_CIUDAD)
              ) / 100;

              // Calcular costes para diferentes tipos de vehículos
              const costes = {
                  gasolina: (consumoTotal * PRECIO_GASOLINA).toFixed(2),
                  diesel: (consumoTotal * PRECIO_DIESEL).toFixed(2),
                  hibrido: (consumoTotal * PRECIO_HIBRIDO).toFixed(2)
              };

              return {
                  ...leg,
                  costEstimate: {
                      distanciaTotal: leg.distance.value / 1000, // en km
                      consumoTotal: consumoTotal.toFixed(1), // en litros
                      costes,
                      desglose: {
                          autopista: {
                              distancia: distanciaAutopista.toFixed(1),
                              consumo: ((distanciaAutopista * CONSUMO_AUTOPISTA) / 100).toFixed(1)
                          },
                          carretera: {
                              distancia: distanciaCarretera.toFixed(1),
                              consumo: ((distanciaCarretera * CONSUMO_CARRETERA) / 100).toFixed(1)
                          },
                          ciudad: {
                              distancia: distanciaCiudad.toFixed(1),
                              consumo: ((distanciaCiudad * CONSUMO_CIUDAD) / 100).toFixed(1)
                          }
                      }
                  },
                  tolls: leg.steps.some((step: any) => 
                      step.html_instructions.includes('peaje') || 
                      step.html_instructions.includes('autopista de peaje')
                  ) ? 'Sí' : 'No',
                  highways: leg.steps.some((step: any) => 
                      step.html_instructions.includes('autopista') || 
                      step.html_instructions.includes('autovía')
                  ) ? 'Sí' : 'No'
              };
          })
      }))
  };
}

async function getAirportCode(cityName: string): Promise<string> {
  try {
    const token = await getAmadeusToken();
    const response = await fetch(
      `https://test.api.amadeus.com/v1/reference-data/locations?subType=CITY&keyword=${encodeURIComponent(cityName)}`,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      }
    );

    if (!response.ok) {
      throw new Error(`Error al buscar código IATA: ${response.status}`);
    }

    const data = await response.json();
    if (data.data && data.data.length > 0) {
      // Tomamos el primer resultado que coincida con la ciudad
      const city = data.data.find((location: any) => 
        location.name.toLowerCase() === cityName.toLowerCase() ||
        location.address.cityName.toLowerCase() === cityName.toLowerCase()
      );
      
      if (city) {
        return city.iataCode;
      }
    }
    
    throw new Error(`No se encontró el código IATA para: ${cityName}`);
  } catch (error) {
    console.error('Error al obtener código IATA:', error);
    throw error;
  }
}

// Route Handler principal
export async function POST(request: Request) {
    try {
        const body = await request.json();
        const {
            originLocationCode,
            destinationName,
            departureDate,
            returnDate,
            adults,
            selectedLocationData,
            type
        } = body;

        // Obtener el código IATA del destino usando el mapa
        const destinationLocationCode = destinationIataMap[destinationName] || 
            Object.entries(destinationIataMap)
                .find(([key]) => key.toLowerCase() === destinationName.toLowerCase())?.[1];

        if (!destinationLocationCode) {
            console.error('Destino no encontrado:', destinationName);
            const availableDestinations = Object.keys(destinationIataMap).sort();
            return new Response(
                JSON.stringify({ 
                    error: `No se encontró el código IATA para el destino: ${destinationName}. Destinos disponibles: ${availableDestinations.join(', ')}` 
                }),
                { status: 400 }
            );
        }

        // Validar fechas
        const today = new Date();
        const departureDateObj = new Date(departureDate);
        const returnDateObj = returnDate ? new Date(returnDate) : null;

        if (departureDateObj < today) {
            return new Response(
                JSON.stringify({ 
                    error: 'La fecha de salida no puede ser en el pasado' 
                }),
                { status: 400 }
            );
        }

        if (returnDateObj && returnDateObj < departureDateObj) {
            return new Response(
                JSON.stringify({ 
                    error: 'La fecha de regreso no puede ser anterior a la fecha de salida' 
                }),
                { status: 400 }
            );
        }

        // Obtener token de Amadeus
        const token = await getAmadeusToken();

        // Construir la URL de búsqueda de vuelos
        const searchUrl = new URL('https://test.api.amadeus.com/v2/shopping/flight-offers');
        searchUrl.searchParams.append('originLocationCode', originLocationCode);
        searchUrl.searchParams.append('destinationLocationCode', destinationLocationCode);
        searchUrl.searchParams.append('departureDate', departureDate);
        if (returnDate) searchUrl.searchParams.append('returnDate', returnDate);
        searchUrl.searchParams.append('adults', adults.toString());
        searchUrl.searchParams.append('max', '20');
        searchUrl.searchParams.append('currencyCode', 'EUR');

        // Realizar la búsqueda de vuelos
        const response = await fetch(searchUrl.toString(), {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            const errorData = await response.json();
            console.error('Error en la respuesta de Amadeus:', errorData);
            return new Response(
                JSON.stringify({ 
                    error: `Error al buscar vuelos: ${errorData.errors?.[0]?.detail || 'Error desconocido'}` 
                }),
                { status: response.status }
            );
        }

        const data = await response.json();
        return new Response(JSON.stringify(data));
    } catch (error) {
        console.error('Error en la búsqueda de vuelos:', error);
        return new Response(
            JSON.stringify({ 
                error: error instanceof Error ? error.message : 'Error al procesar la solicitud' 
            }),
            { status: 500 }
        );
    }
}