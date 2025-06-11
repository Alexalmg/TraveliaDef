import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
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
      selectedPlaces
    } = body;

    const plan = `
      <div class="space-y-6">
        <div class="text-center mb-8">
          <h1 class="text-3xl font-bold text-gray-900 dark:text-white mb-2">Plan de Viaje a ${destination}</h1>
          <p class="text-gray-600 dark:text-gray-400">Del ${startDate} al ${endDate} - ${travelers} ${travelers === 1 ? 'persona' : 'personas'}</p>
        </div>

        <div class="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
          <h2 class="text-2xl font-semibold text-gray-900 dark:text-white mb-4">Detalles del Viaje</h2>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div class="space-y-2">
              <h3 class="font-medium text-gray-900 dark:text-white">Transporte</h3>
              <p class="text-gray-600 dark:text-gray-400">
                ${transportType === 'plane' ? '✈️ Avión' : 
                  transportType === 'train' ? '🚂 Tren' : 
                  transportType === 'car' ? '🚗 Coche' : 
                  transportType === 'bus' ? '🚌 Autobús' : 'Transporte'}
              </p>
              ${selectedFlight ? `
                <div class="mt-2 p-3 bg-blue-50 dark:bg-blue-900/30 rounded-md">
                  <p class="font-medium">Vuelo Seleccionado:</p>
                  <p class="text-lg font-bold">${selectedFlight.price} ${selectedFlight.currency}</p>
                  <p class="text-sm">Ruta: ${selectedFlight.itineraries.join(' → ')}</p>
                </div>
              ` : ''}
              ${carRoute ? `
                <div class="mt-2 p-3 bg-green-50 dark:bg-green-900/30 rounded-md">
                  <p class="font-medium">Ruta en Coche:</p>
                  <p>Distancia: ${carRoute.distance}</p>
                  <p>Duración: ${carRoute.duration}</p>
                </div>
              ` : ''}
            </div>
            <div class="space-y-2">
              <h3 class="font-medium text-gray-900 dark:text-white">Servicios Adicionales</h3>
              <ul class="list-disc list-inside text-gray-600 dark:text-gray-400">
                ${searchHotel ? '<li>🏨 Alojamiento incluido</li>' : ''}
                ${rentCar ? '<li>🚗 Alquiler de coche</li>' : ''}
              </ul>
            </div>
          </div>
        </div>

        <div class="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
          <h2 class="text-2xl font-semibold text-gray-900 dark:text-white mb-4">Lugares Seleccionados</h2>
          ${selectedPlaces && selectedPlaces.length > 0 ? `
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              ${selectedPlaces.map((place: string) => `
                <div class="p-3 bg-gray-50 dark:bg-gray-700/30 rounded-md">
                  <p class="font-medium">${place}</p>
                </div>
              `).join('')}
            </div>
          ` : `
            <p class="text-gray-600 dark:text-gray-400">No se han seleccionado lugares específicos.</p>
          `}
        </div>

        <div class="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
          <h2 class="text-2xl font-semibold text-gray-900 dark:text-white mb-4">Itinerario Sugerido</h2>
          <div class="space-y-6">
            <div class="space-y-4">
              <div class="flex items-start space-x-4">
                <div class="flex-shrink-0 w-24">
                  <span class="inline-block px-3 py-1 text-sm font-semibold text-blue-600 bg-blue-100 rounded-full">Día 1</span>
                </div>
                <div>
                  <h3 class="font-medium text-gray-900 dark:text-white">Llegada y Exploración Inicial</h3>
                  <p class="text-gray-600 dark:text-gray-400">Llegada a ${destination} y check-in en el alojamiento. Tiempo libre para explorar los alrededores y adaptarse al nuevo entorno.</p>
                </div>
              </div>
            </div>

            <div class="space-y-4">
              <div class="flex items-start space-x-4">
                <div class="flex-shrink-0 w-24">
                  <span class="inline-block px-3 py-1 text-sm font-semibold text-green-600 bg-green-100 rounded-full">Día 2</span>
                </div>
                <div>
                  <h3 class="font-medium text-gray-900 dark:text-white">Visita a los Lugares Principales</h3>
                  <p class="text-gray-600 dark:text-gray-400">Visita a los lugares más destacados de ${destination}, incluyendo los lugares seleccionados en tu planificación.</p>
                </div>
              </div>
            </div>

            <div class="space-y-4">
              <div class="flex items-start space-x-4">
                <div class="flex-shrink-0 w-24">
                  <span class="inline-block px-3 py-1 text-sm font-semibold text-orange-600 bg-orange-100 rounded-full">Día 3</span>
                </div>
                <div>
                  <h3 class="font-medium text-gray-900 dark:text-white">Actividades Locales</h3>
                  <p class="text-gray-600 dark:text-gray-400">Experiencias locales y actividades culturales en ${destination}.</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
          <h2 class="text-2xl font-semibold text-gray-900 dark:text-white mb-4">Consejos Prácticos</h2>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div class="space-y-2">
              <h3 class="font-medium text-gray-900 dark:text-white">Transporte</h3>
              <ul class="list-disc list-inside text-gray-600 dark:text-gray-400">
                <li>Investiga las opciones de transporte público</li>
                <li>Considera comprar pases de transporte</li>
                <li>Descarga mapas offline</li>
              </ul>
            </div>
            <div class="space-y-2">
              <h3 class="font-medium text-gray-900 dark:text-white">Gastronomía</h3>
              <ul class="list-disc list-inside text-gray-600 dark:text-gray-400">
                <li>Prueba la comida local</li>
                <li>Investiga los restaurantes populares</li>
                <li>Reserva con antelación si es necesario</li>
              </ul>
            </div>
          </div>
        </div>

        <div class="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
          <h2 class="text-2xl font-semibold text-gray-900 dark:text-white mb-4">Presupuesto Estimado (por persona)</h2>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div class="space-y-2">
              <h3 class="font-medium text-gray-900 dark:text-white">Alojamiento y Transporte</h3>
              <ul class="list-disc list-inside text-gray-600 dark:text-gray-400">
                ${searchHotel ? '<li>Hotel: 60-80€ por noche</li>' : ''}
                <li>Transporte local: 15-20€ por día</li>
                <li>Entradas a monumentos: 30-40€</li>
              </ul>
            </div>
            <div class="space-y-2">
              <h3 class="font-medium text-gray-900 dark:text-white">Comidas y Actividades</h3>
              <ul class="list-disc list-inside text-gray-600 dark:text-gray-400">
                <li>Comidas: 30-40€ por día</li>
                <li>Actividades y tours: 20-30€</li>
                <li>Total aproximado: 400-500€</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    `;

    return NextResponse.json({ plan });
  } catch (error) {
    console.error('Error al procesar la solicitud:', error);
    return NextResponse.json(
      { error: 'Error al procesar la solicitud: ' + (error instanceof Error ? error.message : 'Error desconocido') },
      { status: 500 }
    );
  }
} 