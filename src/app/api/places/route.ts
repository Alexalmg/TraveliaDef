import { NextResponse } from 'next/server';

const GOOGLE_MAPS_API_KEY = 'AIzaSyDDqrXEaLlMs09tFHEO89omXJlEHezUYsk';
const PLACES_API_URL = 'https://places.googleapis.com/v1/places:searchNearby';

export async function POST(request: Request) {
    try {
        const { latitude, longitude, locationName } = await request.json();

        // Crear el cuerpo de la solicitud para la API de Places
        const requestBody = {
            locationRestriction: {
                circle: {
                    center: {
                        latitude: latitude,
                        longitude: longitude
                    },
                    radius: 5000.0 // 5km de radio
                }
            },
            includedTypes: ["tourist_attraction"],
            maxResultCount: 10,
            languageCode: "es"
        };

        console.log('Enviando solicitud a Google Places:', JSON.stringify(requestBody, null, 2));

        const response = await fetch(PLACES_API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Goog-Api-Key': GOOGLE_MAPS_API_KEY,
                'X-Goog-FieldMask': 'places.displayName,places.formattedAddress,places.rating,places.userRatingCount,places.photos.name,places.photos.widthPx,places.photos.heightPx'
            },
            body: JSON.stringify(requestBody)
        });

        if (!response.ok) {
            const errorBody = await response.text();
            console.error('Respuesta de error de Google Places:', errorBody);
            throw new Error(`Error de Google Places: ${response.status} - ${errorBody}`);
        }

        const data = await response.json();
        console.log('Respuesta exitosa de Google Places:', JSON.stringify(data, null, 2));
        return NextResponse.json(data);

    } catch (error) {
        console.error('Error en la ruta API de Places:', error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Internal Server Error' },
            { status: 500 }
        );
    }
} 