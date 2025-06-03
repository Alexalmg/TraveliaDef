import { NextResponse } from 'next/server';

const GOOGLE_PLACES_API_KEY = 'AIzaSyBn_IoraUBufBwDWlugUlNxbi62zbjeWWE';

export async function POST(request: Request) {
  try {
    const { locationName } = await request.json();

    // Primero, buscamos el lugar para obtener su place_id
    const searchUrl = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(locationName)}&key=${GOOGLE_PLACES_API_KEY}`;
    
    const searchResponse = await fetch(searchUrl);
    
    console.log('Google Places Search API Status:', searchResponse.status);
    if (!searchResponse.ok) {
      const errorBody = await searchResponse.text();
      console.error('Google Places Search API Error Body:', errorBody);
      throw new Error(`Google Places Search API returned status ${searchResponse.status}`);
    }
    const searchData = await searchResponse.json();
    console.log('Google Places Search API Response Data:', searchData);

    if (!searchData.results || searchData.results.length === 0) {
      return NextResponse.json({ error: 'No se encontró el lugar' }, { status: 404 });
    }

    const placeId = searchData.results[0].place_id;

    // Ahora, buscamos los lugares destacados cerca de ese lugar
    const nearbyUrl = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${searchData.results[0].geometry.location.lat},${searchData.results[0].geometry.location.lng}&radius=5000&type=tourist_attraction&key=${GOOGLE_PLACES_API_KEY}`;
    
    const nearbyResponse = await fetch(nearbyUrl);

    console.log('Google Places Nearby API Status:', nearbyResponse.status);
    if (!nearbyResponse.ok) {
      const errorBody = await nearbyResponse.text();
      console.error('Google Places Nearby API Error Body:', errorBody);
      throw new Error(`Google Places Nearby API returned status ${nearbyResponse.status}`);
    }
    const nearbyData = await nearbyResponse.json();
    console.log('Google Places Nearby API Response Data:', nearbyData);

    // Para cada lugar, obtenemos más detalles incluyendo fotos
    const placesWithDetails = await Promise.all(
      nearbyData.results.slice(0, 5).map(async (place: any) => {
        const detailsUrl = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${place.place_id}&fields=name,rating,formatted_address,photos,reviews&key=${GOOGLE_PLACES_API_KEY}`;
        const detailsResponse = await fetch(detailsUrl);
        const detailsData = await detailsResponse.json();

        let photoUrl = null;
        if (detailsData.result.photos && detailsData.result.photos.length > 0) {
          photoUrl = `https://maps.googleapis.com/maps/api/place/photo?maxwidth=400&photoreference=${detailsData.result.photos[0].photo_reference}&key=${GOOGLE_PLACES_API_KEY}`;
        }

        return {
          name: place.name,
          rating: place.rating,
          address: detailsData.result.formatted_address,
          photoUrl,
          reviews: detailsData.result.reviews?.slice(0, 2) || []
        };
      })
    );

    return NextResponse.json({ places: placesWithDetails });
  } catch (error) {
    console.error('Error fetching places:', error);
    return NextResponse.json({ error: 'Error al buscar lugares' }, { status: 500 });
  }
} 