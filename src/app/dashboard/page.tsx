'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, ArrowRight, CalendarIcon } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

// Importar componentes del Dialog
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

interface Location {
  id: string;
  created_at: string;
  name: string;
  description: string;
  latitude: number;
  longitude: number;
  image_url: string | null;
  location: any;
  distance_meters: number;
}

export default function Dashboard() {
  const router = useRouter();
  const supabase = createClientComponentClient();
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Estado para controlar el diálogo
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState<Location | null>(null);
  const [showTravelDetails, setShowTravelDetails] = useState(false);
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [travelers, setTravelers] = useState("1");
  const [transportType, setTransportType] = useState("");
  // Nuevos estados para los selectores de Hotel y Coche
  const [searchHotel, setSearchHotel] = useState("No"); // Estado inicial 'No'
  const [rentCar, setRentCar] = useState("No");     // Estado inicial 'No'
  // Nuevos estados para la búsqueda de vuelos
  const [flightResults, setFlightResults] = useState<any>(null);
  const [isSearchingFlights, setIsSearchingFlights] = useState(false);
  // Nuevo estado para los lugares destacados
  const [highlightedPlaces, setHighlightedPlaces] = useState<any[]>([]);
  const [isLoadingPlaces, setIsLoadingPlaces] = useState(false);

  // Función auxiliar para obtener la fecha actual en formato YYYY-MM-DD (necesario para input type="date" min)
  const getTodayString = () => {
    const today = new Date();
    const year = today.getFullYear();
    const month = (today.getMonth() + 1).toString().padStart(2, '0'); // Los meses son de 0 a 11
    const day = today.getDate().toString().padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const todayString = getTodayString();

  useEffect(() => {
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push('/login');
        return;
      }
      // Usar coordenadas fijas de Madrid
      const madridCoords = {
        latitude: 40.4168,
        longitude: -3.7038
      };
      fetchLocations(madridCoords);
    };

    checkUser();
  }, [router, supabase]);

  const fetchLocations = async (coords: { latitude: number; longitude: number }) => {
    try {
      const response = await fetch(
        `/api/locations?latitude=${coords.latitude}&longitude=${coords.longitude}`
      );
      
      if (!response.ok) {
        throw new Error('Error al obtener ubicaciones');
      }

      const data = await response.json();
      console.log('Datos recibidos:', data);
      
      if (Array.isArray(data)) {
        const formattedLocations: Location[] = data.map(item => ({
          id: item.id,
          created_at: item.created_at,
          name: item.name,
          description: item.description,
          latitude: item.latitude,
          longitude: item.longitude,
          image_url: item.image_url,
          location: item.location,
          distance_meters: item.distance_meters,
        }));
        setLocations(formattedLocations);
      } else {
        console.error('Formato de datos inesperado:', data);
        setError('Formato de datos inesperado');
      }
    } catch (err) {
      console.error('Error:', err);
      setError(err instanceof Error ? err.message : 'Error al cargar ubicaciones');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  // Función para cargar los lugares destacados
  const loadHighlightedPlaces = async (locationName: string) => {
    setIsLoadingPlaces(true);
    try {
      const response = await fetch('/api/places', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ locationName }),
      });

      if (!response.ok) {
        // Es útil loguear el cuerpo del error para depurar si la API de Places falla
        const errorBody = await response.text();
        console.error('Error response body from /api/places:', errorBody);
        throw new Error('Error al cargar lugares destacados');
      }

      const data = await response.json();
      setHighlightedPlaces(data.places);
    } catch (error) {
      console.error('Error loading highlighted places:', error);
    } finally {
      setIsLoadingPlaces(false);
    }
  };

  // Función para abrir el diálogo con una ubicación específica
  const openDialog = (location: Location) => {
    setSelectedLocation(location);
    setIsDialogOpen(true);
    // Reiniciar estados del diálogo al abrir para una nueva ubicación
    setShowTravelDetails(false);
    setFlightResults(null);
    setIsSearchingFlights(false);
    // Cargar lugares destacados al abrir el diálogo
    loadHighlightedPlaces(location.name);
  };

  // Función para cerrar el diálogo y resetear estados
  const closeDialog = () => {
    setSelectedLocation(null);
    setIsDialogOpen(false);
    // Reiniciar estados del formulario y resultados al cerrar
    setShowTravelDetails(false);
    setStartDate('');
    setEndDate('');
    setTravelers('1');
    setTransportType('');
    setSearchHotel('No');
    setRentCar('No');
    setFlightResults(null);
    setIsSearchingFlights(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <p className="text-red-500 mb-4">{error}</p>
        <Button onClick={() => fetchLocations({ latitude: 40.4168, longitude: -3.7038 })}>Reintentar</Button>
      </div>
    );
  }

  return (
    <div className="bg-white min-h-screen flex flex-col">
      {/* Encabezado Fijo */}
      <header className="fixed top-0 left-0 right-0 bg-white z-10 shadow-sm p-4">
        <div className="container mx-auto flex justify-between items-center">
          {/* Logo y Título */}
          <div className="flex items-center">
            {/* Placeholder Logo (negro y vacío por ahora) */}
            {/* <div className="w-8 h-8 bg-black mr-2 flex items-center justify-center font-bold text-white text-xs">T</div> */}
            {/* Usaremos un placeholder de imagen de perfil en su lugar para el menú */}
            <h1 className="text-2xl font-bold text-black">Travelia</h1> {/* Texto Travelia en negro */}
          </div>
          {/* Menú Desplegable de Perfil */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              {/* Placeholder de Imagen de Perfil (circular) */}
              {/* Podemos poner la inicial del usuario si está disponible, o un ícono genérico */}
              <div className="w-10 h-10 bg-gray-300 rounded-full flex items-center justify-center cursor-pointer text-gray-700 font-bold">
                 {/* Podríamos mostrar la inicial del usuario aquí, ej: user?.email?.[0].toUpperCase() */}
                 U {/* Placeholder con letra U */}
              </div>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={handleLogout} className="cursor-pointer">
                Cerrar Sesión
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      {/* Contenido Principal con Padding para no ocultarse bajo el encabezado fijo */}
      <main className="container mx-auto p-4 mt-20 flex-grow">
        {/* Sección de Destinos Cercanos */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold mb-4">Destinos Cercanos</h2>
          <div className="relative">
            <div className="overflow-x-auto pb-4">
              <div className="flex space-x-4" style={{ minWidth: 'max-content' }}>
                {locations.slice(0, 15).map((location) => (
                  <Card key={location.id} className="w-72 flex-shrink-0 overflow-hidden flex flex-col cursor-pointer" onClick={() => openDialog(location)}>
                    {/* Parte Superior: Foto con Título Superpuesto */}
                    <div className="relative w-full h-40">
                      {location.image_url && (
                        <img 
                          src={location.image_url} 
                          alt={location.name}
                          className="w-full h-full object-cover"
                        />
                      )}
                      {/* Overlay y Título */}
                      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-3 text-white">
                        <CardTitle className="text-lg font-bold leading-tight">{location.name}</CardTitle>
                      </div>
                    </div>

                    {/* Parte Inferior: Descripción y Botón */}
                    <CardContent className="p-4 flex flex-col justify-between flex-grow">
                      <p className="text-gray-600 text-sm line-clamp-3 mb-4">{location.description}</p>
                      <Button variant="outline" className="w-full pointer-events-none">
                        Ver más <ArrowRight className="ml-2 h-4 w-4" />
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
            {/* Indicador de scroll */}
            <div className="absolute right-0 top-1/2 transform -translate-y-1/2 bg-gradient-to-l from-white to-transparent w-8 h-full pointer-events-none"></div>
          </div>
        </div>

        {/* Sección de Destinos Originales */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold mb-4">Destinos Originales</h2>
          <div className="relative">
            <div className="overflow-x-auto pb-4">
              <div className="flex space-x-4" style={{ minWidth: 'max-content' }}>
                {locations.slice(15, 30).map((location) => (
                  <Card key={location.id} className="w-72 flex-shrink-0 overflow-hidden flex flex-col cursor-pointer" onClick={() => openDialog(location)}>
                    {/* Parte Superior: Foto con Título Superpuesto */}
                    <div className="relative w-full h-40">
                      {location.image_url && (
                        <img 
                          src={location.image_url} 
                          alt={location.name}
                          className="w-full h-full object-cover"
                        />
                      )}
                      {/* Overlay y Título */}
                      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-3 text-white">
                        <CardTitle className="text-lg font-bold leading-tight">{location.name}</CardTitle>
                      </div>
                    </div>

                    {/* Parte Inferior: Descripción y Botón */}
                    <CardContent className="p-4 flex flex-col justify-between flex-grow">
                      <p className="text-gray-600 text-sm line-clamp-3 mb-4">{location.description}</p>
                      <Button variant="outline" className="w-full pointer-events-none">
                        Ver más <ArrowRight className="ml-2 h-4 w-4" />
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
            {/* Indicador de scroll */}
            <div className="absolute right-0 top-1/2 transform -translate-y-1/2 bg-gradient-to-l from-white to-transparent w-8 h-full pointer-events-none"></div>
          </div>
        </div>

        {/* Espacio para la tercera sección */}
        <div className="grid grid-cols-1">
          <div className="bg-white p-4 rounded-lg shadow-sm">
            <h2 className="text-xl font-semibold mb-4">Sección 3</h2>
            <p className="text-gray-500">Contenido pendiente...</p>
          </div>
        </div>

        {locations.length === 0 && !loading && (
          <div className="text-center mt-8">
            <p className="text-gray-500">No se encontraron ubicaciones</p>
          </div>
        )}
      </main>

      {/* Dialog para mostrar detalles de la ubicación */}
      <Dialog open={isDialogOpen} onOpenChange={(open) => {
        if (!open) { // Si el diálogo se está cerrando
           closeDialog(); // Usar la función de cerrar que ya resetea los estados
        } else {
           setIsDialogOpen(open); // Si se está abriendo, simplemente actualizar el estado
        }
      }}>
        <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl">{selectedLocation?.name}</DialogTitle>
            {selectedLocation?.image_url && (
              <img 
                src={selectedLocation.image_url}
                alt={selectedLocation.name}
                className="w-full h-64 object-cover rounded-md mt-2 mb-4"
              />
            )}
            {!isSearchingFlights && !flightResults && (
              <DialogDescription className="text-base">
                {selectedLocation?.description}
              </DialogDescription>
            )}
          </DialogHeader>

          {isSearchingFlights ? (
            <div className="flex justify-center items-center py-8">
              <Loader2 className="h-8 w-8 animate-spin mr-2" />
              <span>Buscando vuelos...</span>
            </div>
          ) : flightResults ? (
            <div className="space-y-4 mt-4">
              <h3 className="text-xl font-semibold">Opciones de Vuelo:</h3>
              {/* Renderizar resultados de vuelos */}
              {Array.isArray(flightResults.data) && flightResults.data.length > 0 ? (
                flightResults.data.map((offer: any, index: number) => (
                  <Card key={index} className="p-4 border">
                    <CardTitle className="text-lg mb-2">Opción de Vuelo {index + 1}</CardTitle>
                    <CardContent className="p-0 space-y-3">
                      <p className="text-xl font-bold text-green-600">Precio Total: {offer.price.total} {offer.price.currency}</p>

                      {offer.itineraries.map((itinerary: any, itinIndex: number) => (
                        <div key={itinIndex} className="border-t pt-3 mt-3">
                          <p className="font-semibold mb-2">{itinerary.segments.length > 1 ? 'Vuelo con escalas' : 'Vuelo directo'} ({itinIndex === 0 ? 'Ida' : 'Vuelta'}) - Duración: {itinerary.duration}</p>
                          {itinerary.segments.map((segment: any, segIndex: number) => (
                            <div key={segIndex} className="text-sm text-gray-700 mb-2">
                              <p>De: {segment.departure.iataCode} ({segment.departure.at})</p>
                              <p>A: {segment.arrival.iataCode} ({segment.arrival.at})</p>
                              <p>Aerolínea: {segment.carrierCode} (Número de vuelo: {segment.number})</p>
                            </div>
                          ))}
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                ))
              ) : (
                <p>No se encontraron ofertas de vuelo para las fechas y criterios seleccionados.</p>
              )}
            </div>
          ) : !showTravelDetails ? (
            <div className="space-y-4 mt-4">
              {selectedLocation?.description && (
                 <DialogDescription className="text-base mb-4">
                   {selectedLocation.description}
                 </DialogDescription>
               )}
              {/* Sección de Lugares Destacados (Scroll Horizontal) */}
              {isLoadingPlaces ? (
                <div className="flex justify-center items-center py-4">
                  <Loader2 className="h-6 w-6 animate-spin mr-2" />
                  <span>Cargando lugares destacados...</span>
                </div>
              ) : highlightedPlaces.length > 0 ? (
                <div className="space-y-4">
                  <h3 className="text-xl font-semibold">Lugares Destacados</h3>
                  <div className="relative">
                    <div className="overflow-x-auto pb-4">
                      <div className="flex space-x-4" style={{ minWidth: 'max-content' }}>
                        {highlightedPlaces.map((place, index) => (
                          <Card key={index} className="w-72 flex-shrink-0 overflow-hidden flex flex-col">
                            {/* Estructura flex para foto y detalles */}
                            <div className="flex flex-grow">
                              {place.photoUrl && (
                                <div className="w-1/3 flex-shrink-0">
                                  <img
                                    src={place.photoUrl}
                                    alt={place.name}
                                    className="w-full h-full object-cover"
                                  />
                                </div>
                              )}

                              {/* Parte Derecha: Detalles */}
                              <div className="p-4 flex-1 flex flex-col justify-between">
                                <h4 className="font-semibold text-lg line-clamp-1">{place.name}</h4>
                                <p className="text-sm text-gray-600 line-clamp-2">{place.address}</p>
                                {place.rating && (
                                  <div className="flex items-center mt-2">
                                    <span className="text-yellow-500">★</span>
                                    <span className="ml-1 text-sm">{place.rating}</span>
                                  </div>
                                )}
                                {place.reviews && place.reviews.length > 0 && (
                                  <p className="text-sm text-gray-500 mt-2 line-clamp-3">
                                    "{place.reviews[0].text}"
                                  </p>
                                )}
                              </div>
                            </div>
                          </Card>
                        ))}
                      </div>
                    </div>
                    {/* Indicador de scroll */}
                    <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-white to-transparent pointer-events-none"></div>
                  </div>
                </div>
              ) : null}
              <DialogFooter className="mt-4">
                <Button
                  className="w-full text-lg py-6"
                  onClick={() => setShowTravelDetails(true)}
                >
                  ¿Viajamos?
                </Button>
              </DialogFooter>
            </div>
          ) : (
            /* Formulario de detalles del viaje */
            <div className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Fecha de inicio</label>
                  <Input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full"
                    min={todayString}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Fecha de fin</label>
                  <Input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full"
                    min={startDate || todayString}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Número de viajeros</label>
                  <Select value={travelers} onValueChange={setTravelers}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecciona número de viajeros" />
                    </SelectTrigger>
                    <SelectContent>
                      {[1,2,3,4,5,6,7,8].map((num) => (
                        <SelectItem key={num} value={num.toString()}>
                          {num} {num === 1 ? 'persona' : 'personas'}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Medio de transporte</label>
                  <Select value={transportType} onValueChange={setTransportType}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecciona transporte" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="plane">✈️ Avión</SelectItem>
                      <SelectItem value="train">🚂 Tren</SelectItem>
                      <SelectItem value="car">🚗 Coche</SelectItem>
                      <SelectItem value="bus">🚌 Autobús</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 w-full mt-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">🏨 Buscar Hotel?</label>
                  <ToggleGroup
                    type="single"
                    value={searchHotel}
                    onValueChange={(value) => setSearchHotel(value || "No")}
                    className="grid grid-cols-2 gap-2"
                  >
                    <ToggleGroupItem value="Si">Sí</ToggleGroupItem>
                    <ToggleGroupItem value="No">No</ToggleGroupItem>
                  </ToggleGroup>
                </div>

                <div className="space-y-2">
                   <label className="text-sm font-medium">🚗 Alquilar Coche?</label>
                   <ToggleGroup
                     type="single"
                     value={rentCar}
                     onValueChange={(value) => setRentCar(value || "No")}
                     className="grid grid-cols-2 gap-2"
                   >
                     <ToggleGroupItem value="Si">Sí</ToggleGroupItem>
                     <ToggleGroupItem value="No">No</ToggleGroupItem>
                   </ToggleGroup>
                </div>
              </div>

              <DialogFooter className="mt-6">
                {!isSearchingFlights && !flightResults && (
                  <Button
                    className="w-full text-lg py-6"
                    onClick={async () => {
                      console.log({
                        location: selectedLocation?.name,
                        startDate,
                        endDate,
                        travelers,
                        transportType,
                        searchHotel: searchHotel === 'Si',
                        rentCar: rentCar === 'Si',
                      });

                      if (transportType === 'plane') {
                        console.log('Iniciando búsqueda de vuelos...');
                        setIsSearchingFlights(true);
                        setFlightResults(null);

                        try {
                          if (!selectedLocation || !startDate || !endDate) {
                              console.error('Faltan datos para buscar vuelos');
                              setIsSearchingFlights(false);
                              return;
                          }

                          const flightSearchResponse = await fetch('/api/flights', {
                              method: 'POST',
                              headers: {
                                  'Content-Type': 'application/json',
                              },
                              body: JSON.stringify({
                                  originLocationCode: 'MAD',
                                  destinationLocationCode: selectedLocation.name,
                                  departureDate: startDate,
                                  returnDate: endDate,
                                  adults: parseInt(travelers, 10),
                                  selectedLocationData: selectedLocation
                              })
                          });

                          if (!flightSearchResponse.ok) {
                            const errorBody = await flightSearchResponse.text();
                            throw new Error(`Error al buscar vuelos: ${flightSearchResponse.status} - ${errorBody}`);
                          }

                          const flightData = await flightSearchResponse.json();
                          console.log('Resultados de la búsqueda de vuelos:', flightData);
                          setFlightResults(flightData);

                        } catch (apiError) {
                           console.error('Error en la llamada a la API de vuelos:', apiError);
                           setError(apiError instanceof Error ? apiError.message : 'Error al buscar vuelos');

                        } finally {
                           setIsSearchingFlights(false);
                        }

                      } else {
                        console.log('Procesando viaje con otro medio de transporte...');
                        closeDialog();
                      }
                    }}
                    disabled={!startDate || !endDate || !travelers || !transportType}
                  >
                    Confirmar Viaje
                  </Button>
                )}
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

    </div>
  );
} 