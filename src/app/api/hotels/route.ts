import { NextResponse } from 'next/server';

// Clave de RapidAPI
const RAPIDAPI_KEY = '6590af07f3msh0beebf3ae11d737p135b14jsn24f9074fd31d';
const RAPIDAPI_HOST = 'booking-com15.p.rapidapi.com';

// Función para esperar un tiempo determinado
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Función para realizar reintentos
async function fetchWithRetry(url: string, options: any, maxRetries = 3, delay = 1000) {
    let lastError;
    
    for (let i = 0; i < maxRetries; i++) {
        try {
            const response = await fetch(url, options);
            if (response.ok) {
                return response;
            }
            
            // Si el error es 429 (Too Many Requests), esperamos más tiempo
            if (response.status === 429) {
                const retryAfter = response.headers.get('Retry-After');
                const waitTime = retryAfter ? parseInt(retryAfter) * 1000 : delay * (i + 1);
                await sleep(waitTime);
                continue;
            }
            
            // Si el error es 500, esperamos un tiempo antes de reintentar
            if (response.status === 500) {
                await sleep(delay * (i + 1));
                continue;
            }
            
            // Para otros errores, lanzamos el error
            throw new Error(`HTTP error! status: ${response.status}`);
        } catch (error) {
            lastError = error;
            console.log(`Intento ${i + 1} fallido:`, error);
            if (i < maxRetries - 1) {
                await sleep(delay * (i + 1));
            }
        }
    }
    
    throw lastError;
}

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const destination = searchParams.get('destination');
        const arrival_date = searchParams.get('arrival_date');
        const departure_date = searchParams.get('departure_date');
        const adults = searchParams.get('adults');
        const children = searchParams.get('children') || '0';
        const room_qty = searchParams.get('room_qty') || '1';

        if (!destination || !arrival_date || !departure_date || !adults) {
            return NextResponse.json(
                { error: 'Faltan parámetros requeridos para la búsqueda de hoteles (destination, arrival_date, departure_date, adults)' },
                { status: 400 }
            );
        }

        console.log('Buscando hoteles con parámetros (GET):', {
            destination,
            arrival_date,
            departure_date,
            adults,
            children,
            room_qty
        });

        // Primero obtenemos el destino para obtener el dest_id
        const destinationResponse = await fetchWithRetry(
            `https://${RAPIDAPI_HOST}/api/v1/hotels/searchDestination?query=${encodeURIComponent(destination)}`,
            {
                method: 'GET',
                headers: {
                    'X-RapidAPI-Key': RAPIDAPI_KEY,
                    'X-RapidAPI-Host': RAPIDAPI_HOST
                }
            }
        );

        const destinationData = await destinationResponse.json();
        console.log('Respuesta de búsqueda de destino:', destinationData);

        if (!destinationData.data || !Array.isArray(destinationData.data) || destinationData.data.length === 0) {
             return NextResponse.json(
                 { error: `No se encontraron resultados de destino para: ${destination}` },
                 { status: 404 }
             );
         }

        const destinationId = destinationData.data[0]?.dest_id;
        console.log('ID del destino encontrado para hoteles:', destinationId);

        if (!destinationId) {
            return NextResponse.json(
                { error: `No se encontró el ID del destino para hoteles para: ${destination}` },
                { status: 404 }
            );
        }

        // Buscamos los hoteles con reintentos
        const response = await fetchWithRetry(
            `https://${RAPIDAPI_HOST}/api/v1/hotels/searchHotels?dest_id=${destinationId}&search_type=CITY&arrival_date=${arrival_date}&departure_date=${departure_date}&adults=${adults}&children_age=${Array(parseInt(children)).fill('0,17').join(',')}&room_qty=${room_qty}&page_number=1&units=metric&temperature_unit=c&languagecode=es&currency_code=EUR`,
            {
                method: 'GET',
                headers: {
                    'X-RapidAPI-Key': RAPIDAPI_KEY,
                    'X-RapidAPI-Host': RAPIDAPI_HOST
                }
            }
        );

        const data = await response.json();
        console.log('Respuesta de búsqueda de hoteles:', data);

        if (data && data.status === false) {
            console.error('API externa de hoteles reportó un fallo:', data.message);
            const statusCode = response.status >= 400 && response.status < 500 ? response.status : 500;
            return NextResponse.json(
                 { error: `La API de hoteles reportó un error: ${JSON.stringify(data.message || data)}` },
                 { status: statusCode }
             );
        }

        return NextResponse.json(data);
    } catch (error) {
        console.error('Error en la búsqueda de hoteles:', error);
        return NextResponse.json(
            { 
                error: error instanceof Error ? error.message : 'Error al procesar la solicitud de hoteles',
                details: 'Por favor, intente nuevamente en unos minutos. Si el problema persiste, contacte con soporte.'
            },
            { status: 500 }
        );
    }
} 