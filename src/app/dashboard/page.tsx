'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, ArrowRight, CalendarIcon, Sun, Moon } from "lucide-react";
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
import { useTheme } from "next-themes";
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from "@/components/ui/accordion";

// Constante para la API de Google Maps
const GOOGLE_MAPS_API_KEY = 'AIzaSyDDqrXEaLlMs09tFHEO89omXJlEHezUYsk';

// Declarar el tipo google globalmente para TypeScript si no estás usando @types/googlemaps correctamente
// Aunque recomendamos usar @types/googlemaps para una tipificación adecuada
declare global {
  interface Window {
    google: any;
    initMapForDashboard: () => void; // Declarar la función callback global
  }
}


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

interface Place {
  displayName: {
    text: string;
  };
  formattedAddress: string;
  rating: number;
  userRatingCount: number;
  photos: Array<{
    name: string;
    widthPx: number;
    heightPx: number;
  }>;
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
  // Nuevo estado para el vuelo (oferta completa) seleccionado
  const [selectedFlight, setSelectedFlight] = useState<any>(null);
  // Nuevo estado para controlar la visibilidad de la lista de vuelos
  const [showFlightOffersList, setShowFlightOffersList] = useState(false);
  // Nuevo estado para la ruta en coche
  const [carRoute, setCarRoute] = useState<any>(null);
  const [isLoadingRoute, setIsLoadingRoute] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [places, setPlaces] = useState<Place[]>([]);
  const [loadingPlaces, setLoadingPlaces] = useState(false);
  const [placesError, setPlacesError] = useState<string | null>(null);
  // Nuevo estado para los lugares seleccionados
  const [selectedPlaces, setSelectedPlaces] = useState<Place[]>([]);
  // Nuevo estado para controlar la visibilidad del formulario de planificación de viaje
  const [showPlanningInputForm, setShowPlanningInputForm] = useState(false);
  // Nuevo estado para la visibilidad del botón "Planificamos el viaje?"
  const [showGeneratePlanButton, setShowGeneratePlanButton] = useState(false);
  // Nuevo estado para el plan de viaje generado por IA
  const [generatedTravelPlan, setGeneratedTravelPlan] = useState<string | null>(null);
  const [isGeneratingPlan, setIsGeneratingPlan] = useState(false);
  // Añadir nuevo estado para el botón de favoritos
  const [isSavingFavorite, setIsSavingFavorite] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  // Añadir nuevo estado para los viajes guardados
  const [savedPlans, setSavedPlans] = useState<any[]>([]);
  const [showSavedPlans, setShowSavedPlans] = useState(false);
  // Añadir nuevo estado para el buscador
  const [searchQuery, setSearchQuery] = useState('');

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
      // Guardar el email del usuario
      setUserEmail(session.user.email || null);
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

  // Función para cargar lugares destacados
  const loadPlaces = async (location: Location) => {
    setLoadingPlaces(true);
    setPlacesError(null);
    try {
      const response = await fetch('/api/places', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          latitude: location.latitude,
          longitude: location.longitude,
          locationName: location.name
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Error al cargar lugares destacados');
      }

      const data = await response.json();
      if (!data.places || data.places.length === 0) {
        setPlacesError('No se encontraron lugares destacados en esta ubicación');
      } else {
        setPlaces(data.places);
      }
    } catch (error) {
      console.error('Error:', error);
      setPlacesError(error instanceof Error ? error.message : 'Error al cargar lugares destacados');
    } finally {
      setLoadingPlaces(false);
    }
  };

  // Función para abrir el diálogo con una ubicación específica
  const openDialog = (location: Location) => {
    // Primero reiniciar todos los estados
    setShowTravelDetails(false);
    setFlightResults(null);
    setIsSearchingFlights(false);
    setSelectedFlight(null);
    setShowFlightOffersList(false);
    setCarRoute(null);
    setIsLoadingRoute(false);
    setPlaces([]);
    setPlacesError(null);
    setStartDate('');
    setEndDate('');
    setTravelers('1');
    setTransportType('');
    setSearchHotel('No');
    setRentCar('No');
    
    // Luego establecer la nueva ubicación y abrir el diálogo
    setSelectedLocation(location);
    setIsDialogOpen(true);
    setShowTravelDetails(false); // Inicialmente no mostrar los detalles del viaje
    setShowPlanningInputForm(false); // Inicialmente no mostrar el formulario de entrada
    setShowGeneratePlanButton(false); // Reiniciar la visibilidad del botón de generar plan
    setGeneratedTravelPlan(null); // Limpiar el plan generado
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
    setSelectedFlight(null);
    setShowFlightOffersList(false);
    setCarRoute(null);
    setIsLoadingRoute(false);
    setPlaces([]); // Limpiar lugares destacados
    setPlacesError(null); // Limpiar errores de lugares
    setShowPlanningInputForm(false); // Reiniciar el estado del formulario de entrada
    setShowGeneratePlanButton(false); // Reiniciar la visibilidad del botón de generar plan
    setGeneratedTravelPlan(null); // Limpiar el plan generado
  };

  // Función para enviar las direcciones por correo
  const sendDirectionsByEmail = async () => {
    if (!carRoute || !userEmail) return;

    setIsSendingEmail(true);
    try {
      const response = await fetch('/api/send-directions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: userEmail,
          route: carRoute,
          destination: selectedLocation?.name,
          origin: 'Madrid'
        }),
      });

      if (!response.ok) {
        throw new Error('Error al enviar el correo');
      }

      // Mostrar mensaje de éxito
      alert('Las direcciones han sido enviadas a tu correo electrónico');
    } catch (error) {
      console.error('Error al enviar el correo:', error);
      alert('Error al enviar las direcciones por correo');
    } finally {
      setIsSendingEmail(false);
    }
  };

  const handleFlightSelect = (offer: any) => {
    setSelectedFlight(offer);
    setShowFlightOffersList(false);
  };

  // Función para generar el plan de viaje con IA
  const generateTravelPlan = async () => {
    setIsGeneratingPlan(true);
    setGeneratedTravelPlan(null);

    try {
      const planDetails = {
        destination: selectedLocation?.name,
        startDate,
        endDate,
        travelers: parseInt(travelers, 10),
        transportType,
        selectedFlight: selectedFlight ? { 
          price: selectedFlight.price.total, 
          currency: selectedFlight.price.currency, 
          itineraries: selectedFlight.itineraries.map((itin: any) => 
            itin.segments.map((seg: any) => `${seg.departure.iataCode}-${seg.arrival.iataCode}`)
          ) 
        } : null,
        carRoute: carRoute ? { 
          distance: carRoute.routes[0].legs[0].distance.text, 
          duration: carRoute.routes[0].legs[0].duration.text 
        } : null,
        searchHotel: searchHotel === 'Si',
        rentCar: rentCar === 'Si',
        selectedPlaces: selectedPlaces.map(place => place.displayName.text)
      };

      console.log('Datos enviados a la IA:', planDetails);

      const response = await fetch('/api/generate-plan', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(planDetails),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Error ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      
      if (!data.plan) {
        throw new Error('No se recibió un plan válido');
      }

      setGeneratedTravelPlan(data.plan);

    } catch (error) {
      console.error('Error al generar el plan de viaje:', error);
      alert(`Error al generar el plan: ${error instanceof Error ? error.message : 'Error desconocido'}`);
    } finally {
      setIsGeneratingPlan(false);
    }
  };

  // Función para buscar ruta en coche
  const searchCarRoute = async (origin: { latitude: number; longitude: number }, destination: { latitude: number; longitude: number }) => {
    setIsLoadingRoute(true);
    try {
      const response = await fetch('/api/directions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          origin,
          destination,
        }),
      });

      if (!response.ok) {
        throw new Error('Error al obtener la ruta');
      }

      const data = await response.json();
      setCarRoute(data);
      return data;
    } catch (error) {
      console.error('Error al buscar ruta en coche:', error);
      setError(error instanceof Error ? error.message : 'Error al buscar ruta en coche');
      return null;
    } finally {
      setIsLoadingRoute(false);
    }
  };

  // Añadir función para guardar en favoritos
  const saveToFavorites = async () => {
    if (!generatedTravelPlan) return;
    
    setIsSavingFavorite(true);
    try {
      const planDetails = {
        id: Date.now(), // Usar timestamp como ID único
        destination: selectedLocation?.name,
        startDate,
        endDate,
        travelers: parseInt(travelers, 10),
        transportType,
        selectedFlight: selectedFlight ? { 
          price: selectedFlight.price.total, 
          currency: selectedFlight.price.currency, 
          itineraries: selectedFlight.itineraries.map((itin: any) => 
            itin.segments.map((seg: any) => `${seg.departure.iataCode}-${seg.arrival.iataCode}`)
          ) 
        } : null,
        carRoute: carRoute ? { 
          distance: carRoute.routes[0].legs[0].distance.text, 
          duration: carRoute.routes[0].legs[0].duration.text 
        } : null,
        searchHotel: searchHotel === 'Si',
        rentCar: rentCar === 'Si',
        selectedPlaces: selectedPlaces.map(place => place.displayName.text),
        plan: generatedTravelPlan,
        savedAt: new Date().toISOString()
      };

      // Guardar en el estado local
      setSavedPlans(prev => [...prev, planDetails]);
      setIsSaved(true);
      setTimeout(() => setIsSaved(false), 3000);
    } catch (error) {
      console.error('Error al guardar en favoritos:', error);
      alert('Error al guardar en favoritos: ' + (error instanceof Error ? error.message : 'Error desconocido'));
    } finally {
      setIsSavingFavorite(false);
    }
  };

  // Función para filtrar las ubicaciones
  const filteredLocations = locations.filter(location => 
    location.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    location.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

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
          {/* Contenedor para el selector de tema y el menú de perfil */}
          <div className="flex items-center space-x-4">
             {/* Botón para cambiar tema */}
             <ModeToggle />
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
                 <DropdownMenuItem 
                   onClick={() => setShowSavedPlans(true)}
                   className="cursor-pointer"
                 >
                   Viajes Guardados
                 </DropdownMenuItem>
                 <DropdownMenuItem onClick={handleLogout} className="cursor-pointer">
                   Cerrar Sesión
                 </DropdownMenuItem>
               </DropdownMenuContent>
             </DropdownMenu>
          </div>
        </div>
      </header>

      {/* Contenido Principal con Padding para no ocultarse bajo el encabezado fijo */}
      <main className="container mx-auto p-4 mt-20 flex-grow">
        {/* Rediseño del buscador */}
        <div className="mb-12">
          <div className="max-w-2xl mx-auto">
            <div className="relative group">
              <Input
                type="text"
                placeholder="¿A dónde quieres viajar?"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-12 pr-4 py-6 text-lg border-2 rounded-full bg-white/50 backdrop-blur-sm transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 shadow-sm group-hover:shadow-md"
              />
              <svg
                className="absolute left-4 top-1/2 transform -translate-y-1/2 h-6 w-6 text-gray-400 transition-colors duration-300 group-hover:text-blue-500"
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
          </div>
        </div>

        {/* Rediseño de las secciones de destinos */}
        <div className="space-y-16">
          {/* Sección de Destinos Cercanos */}
          <div>
            <h2 className="text-2xl font-light mb-8 text-gray-800">Destinos Cercanos</h2>
            <div className="relative">
              <div className="overflow-x-auto pb-4 scrollbar-hide">
                <div className="flex space-x-6" style={{ minWidth: 'max-content' }}>
                  {filteredLocations.slice(0, 15).map((location) => (
                    <Card 
                      key={location.id} 
                      className="w-80 flex-shrink-0 overflow-hidden flex flex-col cursor-pointer transition-all duration-300 hover:shadow-lg hover:scale-[1.02] bg-white/50 backdrop-blur-sm border-0" 
                      onClick={() => openDialog(location)}
                    >
                      <div className="relative w-full h-48">
                        {location.image_url && (
                          <img
                            src={location.image_url}
                            alt={location.name}
                            className="w-full h-full object-cover transition-transform duration-300 hover:scale-105"
                          />
                        )}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
                        <div className="absolute bottom-0 left-0 right-0 p-4">
                          <CardTitle className="text-xl font-medium text-white">{location.name}</CardTitle>
                        </div>
                      </div>
                      <CardContent className="p-4 flex flex-col justify-between flex-grow">
                        <p className="text-gray-600 text-sm line-clamp-2 mb-4">{location.description}</p>
                        <Button variant="ghost" className="w-full text-blue-600 hover:text-blue-700 hover:bg-blue-50">
                          Explorar <ArrowRight className="ml-2 h-4 w-4" />
                        </Button>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
              <div className="absolute right-0 top-1/2 transform -translate-y-1/2 bg-gradient-to-l from-white to-transparent w-16 h-full pointer-events-none"></div>
            </div>
          </div>

          {/* Sección de Destinos Originales */}
          <div>
            <h2 className="text-2xl font-light mb-8 text-gray-800">Destinos Originales</h2>
            <div className="relative">
              <div className="overflow-x-auto pb-4 scrollbar-hide">
                <div className="flex space-x-6" style={{ minWidth: 'max-content' }}>
                  {filteredLocations.slice(15, 30).map((location) => (
                    <Card 
                      key={location.id} 
                      className="w-80 flex-shrink-0 overflow-hidden flex flex-col cursor-pointer transition-all duration-300 hover:shadow-lg hover:scale-[1.02] bg-white/50 backdrop-blur-sm border-0" 
                      onClick={() => openDialog(location)}
                    >
                      <div className="relative w-full h-48">
                        {location.image_url && (
                          <img
                            src={location.image_url}
                            alt={location.name}
                            className="w-full h-full object-cover transition-transform duration-300 hover:scale-105"
                          />
                        )}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
                        <div className="absolute bottom-0 left-0 right-0 p-4">
                          <CardTitle className="text-xl font-medium text-white">{location.name}</CardTitle>
                        </div>
                      </div>
                      <CardContent className="p-4 flex flex-col justify-between flex-grow">
                        <p className="text-gray-600 text-sm line-clamp-2 mb-4">{location.description}</p>
                        <Button variant="ghost" className="w-full text-blue-600 hover:text-blue-700 hover:bg-blue-50">
                          Explorar <ArrowRight className="ml-2 h-4 w-4" />
                        </Button>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
              <div className="absolute right-0 top-1/2 transform -translate-y-1/2 bg-gradient-to-l from-white to-transparent w-16 h-full pointer-events-none"></div>
            </div>
          </div>

          {/* Mensaje cuando no hay resultados */}
          {filteredLocations.length === 0 && !loading && (
            <div className="text-center py-16">
              <p className="text-gray-500 mb-6 text-lg">No se encontraron destinos que coincidan con tu búsqueda</p>
              <Button 
                variant="outline" 
                onClick={() => setSearchQuery('')}
                className="px-8 py-2 rounded-full hover:bg-gray-50 transition-colors duration-300"
              >
                Limpiar búsqueda
              </Button>
            </div>
          )}
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
            {/* Show description only when not searching flights and not showing flight results */}
            {!isSearchingFlights && !flightResults && (
              <DialogDescription className="text-base">
                {selectedLocation?.description}
              </DialogDescription>
            )}
          </DialogHeader>

          {/* Contenido del diálogo (Formulario de Viaje y Resultados) */}
          {isSearchingFlights ? (
            <div className="flex justify-center items-center py-8">
              <Loader2 className="h-8 w-8 animate-spin mr-2" />
              <span>Buscando vuelos...</span>
            </div>
          ) : isLoadingRoute ? (
            <div className="flex justify-center items-center py-8">
              <Loader2 className="h-8 w-8 animate-spin mr-2" />
              <span>Calculando ruta en coche...</span>
            </div>
          ) : (
            <>
              {/* Si showTravelDetails es falso, mostramos solo el botón "¿Viajamos?" */}
              {!showTravelDetails ? (
                <div className="space-y-4 mt-4">
                  {selectedLocation?.description && (
                    <DialogDescription className="text-base">
                      {selectedLocation.description}
                    </DialogDescription>
                  )}
                  <DialogFooter className="mt-4">
                    <Button
                      className="w-full text-lg py-6"
                      onClick={() => {
                        setShowTravelDetails(true);
                        setShowPlanningInputForm(true); // Mostrar el formulario al hacer clic en "¿Viajamos?"
                      }}
                    >
                      ¿Viajamos?
                    </Button>
                  </DialogFooter>
                </div>
              ) : (
                // Si showTravelDetails es true, mostramos el formulario o los resultados
                <>
                  {/* Formulario de planificación de viaje (condicional) */}
                  {showPlanningInputForm && (
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
                        {/* El botón Confirmar Viaje siempre se muestra con el formulario */}
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
                              setSelectedFlight(null);
                              setShowFlightOffersList(false);

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
                                        destinationName: selectedLocation.name,
                                        departureDate: startDate,
                                        returnDate: endDate,
                                        adults: parseInt(travelers, 10),
                                        selectedLocationData: selectedLocation,
                                        type: 'flight'
                                    })
                                });

                                if (!flightSearchResponse.ok) {
                                  const errorBody = await flightSearchResponse.text();
                                  console.error('Flight Search API Error:', errorBody);
                                  throw new Error(`Error al buscar vuelos: ${flightSearchResponse.status} - ${errorBody}`);
                                }

                                const flightData = await flightSearchResponse.json();
                                console.log('Resultados de la búsqueda de vuelos:', flightData);
                                console.log('DEBUG: flightResults se estableció a:', flightData);
                                setFlightResults(flightData);
                                
                                // Si se ha seleccionado buscar hotel, realizar la búsqueda
                                if (searchHotel === 'Si') {
                                  // searchHotels();
                                }
                                
                                // Cargar lugares destacados después de obtener los resultados de vuelos
                                if (selectedLocation) {
                                  loadPlaces(selectedLocation);
                                }

                              } catch (apiError) {
                                 console.error('Error en la llamada a la API de vuelos:', apiError);
                                 setError(apiError instanceof Error ? apiError.message : 'Error al buscar vuelos');

                              } finally {
                                 setIsSearchingFlights(false);
                                 setShowPlanningInputForm(false); // Ocultar el formulario después de la búsqueda
                                 setShowGeneratePlanButton(true); // Mostrar el botón de generar plan
                              }

                            } else if (transportType === 'car' && selectedLocation) {
                              console.log('Iniciando búsqueda de ruta en coche...');
                              setIsLoadingRoute(true);
                              // Coordenadas de Madrid como origen fijo
                              const originCoords = { latitude: 40.4168, longitude: -3.7038 };
                              // Coordenadas del destino seleccionado
                              const destinationCoords = { latitude: selectedLocation.latitude, longitude: selectedLocation.longitude };

                              try {
                                const routeData = await searchCarRoute(originCoords, destinationCoords);
                                if (routeData) {
                                  setCarRoute(routeData);
                                  
                                  // Si se ha seleccionado buscar hotel, realizar la búsqueda
                                  if (searchHotel === 'Si') {
                                    // searchHotels();
                                  }
                                  
                                  // Cargar lugares destacados después de obtener la ruta en coche
                                  loadPlaces(selectedLocation);
                                }
                              } catch (apiError) {
                                console.error('Error en la llamada a la API de rutas:', apiError);
                                setError(apiError instanceof Error ? apiError.message : 'Error al buscar ruta en coche');
                              } finally {
                                setIsLoadingRoute(false);
                                setShowPlanningInputForm(false); // Ocultar el formulario después de la búsqueda
                                setShowGeneratePlanButton(true); // Mostrar el botón de generar plan
                              }
                            } else { // Caso donde el transporte no es avión ni coche
                              console.log('Procesando viaje con otro medio de transporte...');
                              // Si se ha seleccionado buscar hotel, realizar la búsqueda
                              if (searchHotel === 'Si') {
                                // searchHotels();
                              }
                              // Cargar lugares destacados también en este caso
                              if (selectedLocation) {
                                loadPlaces(selectedLocation);
                              }
                              setShowPlanningInputForm(false); // Ocultar el formulario
                              setShowGeneratePlanButton(true); // Mostrar el botón de generar plan
                            }
                          }}
                          disabled={!startDate || !endDate || !travelers || !transportType}
                        >
                          Confirmar Viaje
                        </Button>
                      </DialogFooter>
                    </div>
                  )}

                  {/* Sección de resultados de vuelo */}
                  {flightResults && (
                    <div className="space-y-4 mt-8 border-t pt-8">
                      <h3 className="text-xl font-semibold">Opciones de Vuelo:</h3>
                      {Array.isArray(flightResults.data) && flightResults.data.length > 0 ? (
                        selectedFlight ? (
                          <div className="border rounded-md p-4 bg-green-50 dark:bg-green-900/30 mb-4 space-y-4">
                            <h4 className="text-lg font-semibold text-green-700 dark:text-green-300">Vuelo Seleccionado:</h4>
                            <div className="text-center mb-4">
                              <p className="text-3xl font-bold text-green-700 dark:text-green-400">{selectedFlight.price.total} {selectedFlight.price.currency}</p>
                              <p className="text-sm text-gray-600 dark:text-gray-400">Precio total por persona</p>
                            </div>
                            {selectedFlight.itineraries.map((itinerary: any, itinIndex: number) => {
                                const firstSegment = itinerary.segments[0];
                                const lastSegment = itinerary.segments[itinerary.segments.length - 1];
                                const totalStops = itinerary.segments.length > 1 ? itinerary.segments.length - 1 : 0;
                                const stopsText = totalStops === 0 ? 'Directo' : `${totalStops} ${totalStops === 1 ? 'escala' : 'escalas'}`;
                                const duration = itinerary.duration.replace('PT', '').replace('H', 'h ').replace('M', 'm');
                                const itineraryType = itinIndex === 0 ? 'Ida' : 'Vuelta';
                                const airlineCode = selectedFlight.validatingAirlineCodes?.[0] || itinerary.segments[0].carrierCode;

                                return (
                                    <div key={itinIndex} className="text-sm text-gray-700 dark:text-gray-300">
                                        <p className="font-semibold mb-1">{itineraryType}:</p>
                                        <p className="ml-4">
                                            {firstSegment.departure.iataCode} {format(new Date(firstSegment.departure.at), 'HH:mm', { locale: es })}
                                            {' → '}
                                            {lastSegment.arrival.iataCode} {format(new Date(lastSegment.arrival.at), 'HH:mm', { locale: es })}
                                            {' | '}{duration}
                                            {' | '}{stopsText}
                                            {' | '}{airlineCode}
                                        </p>
                                    </div>
                                );
                            })}
                            <div className="mt-4 pt-4 border-t border-gray-100">
                                <Button variant="outline" className="w-full" onClick={() => setSelectedFlight(null)}>Cambiar Selección</Button>
                            </div>
                          </div>
                        ) : showFlightOffersList ? (
                          <Accordion type="single" collapsible className="w-full">
                            {flightResults.data.slice(0, 15).map((offer: any, index: number) => {
                                const outboundItinerary = offer.itineraries[0];
                                const outboundFlightFirstSegment = outboundItinerary.segments[0];
                                const outboundFlightLastSegment = outboundItinerary.segments[outboundItinerary.segments.length - 1];
                                const price = offer.price.total;
                                const currency = offer.price.currency;
                                const totalDuration = outboundItinerary.duration;
                                let totalStops = 0;
                                offer.itineraries.forEach((itinerary: any) => {
                                    if (itinerary.segments.length > 1) {
                                        totalStops += itinerary.segments.length - 1;
                                    }
                                });
                                const stopsText = totalStops === 0 ? 'Directo' : `${totalStops} ${totalStops === 1 ? 'escala' : 'escalas'}`;

                                return (
                                    <AccordionItem key={offer.id || index} value={`item-${index}`}>
                                      <AccordionTrigger>
                                        <div className="flex items-center justify-between w-full pr-4">
                                            <div className="text-center">
                                                <p className="text-sm text-gray-500">Salida</p>
                                                <p className="font-semibold">{format(new Date(outboundFlightFirstSegment.departure.at), 'HH:mm', { locale: es })}</p>
                                                <p className="text-xs text-gray-500">{outboundFlightFirstSegment.departure.iataCode}</p>
                                            </div>
                                            <div className="text-center text-xs text-gray-500 mx-4 flex-1">
                                                <p>{totalDuration.replace('PT', '').replace('H', 'h ').replace('M', 'm')}</p>
                                                <p>{stopsText}</p>
                                                {offer.itineraries.length > 1 && (
                                                    <p className="font-semibold mt-1">Ida y Vuelta</p>
                                                )}
                                            </div>
                                            <div className="text-center">
                                                <p className="text-sm text-gray-500">Llegada</p>
                                                <p className="font-semibold">{format(new Date(outboundFlightLastSegment.arrival.at), 'HH:mm', { locale: es })}</p>
                                                <p className="text-xs text-gray-500">{outboundFlightLastSegment.arrival.iataCode}</p>
                                            </div>
                                            <span className="text-lg font-bold text-blue-600 ml-4">
                                                {price} {currency}
                                            </span>
                                        </div>
                                      </AccordionTrigger>
                                      <AccordionContent className="space-y-4 p-4 border-t border-gray-100">
                                        {offer.itineraries.map((itinerary: any, itinIndex: number) => (
                                          <div key={itinIndex} className="space-y-2 pb-4 last:pb-0 border-b last:border-b-0">
                                            <p className="font-semibold">{itinIndex === 0 ? 'Vuelo de Ida' : 'Vuelo de Vuelta'} - Duración: {itinerary.duration.replace('PT', '').replace('H', 'h ').replace('M', 'm')}</p>
                                            {itinerary.segments.map((segment: any, segIndex: number) => (
                                              <div key={segIndex} className="text-sm text-gray-700 ml-4">
                                                <div className="flex items-center space-x-4">
                                                  <div className="text-center">
                                                    <p className="text-sm text-gray-500">Salida</p>
                                                    <p className="font-semibold">{format(new Date(segment.departure.at), 'HH:mm', { locale: es })}</p>
                                                    <p className="text-xs text-gray-500">{segment.departure.iataCode}</p>
                                                  </div>
                                                  <div className="flex-1">
                                                    <div className="flex items-center">
                                                      <div className="flex-1 h-0.5 bg-gray-300"></div>
                                                      <div className="mx-2 text-xs text-gray-500">
                                                        {segment.duration.replace('PT', '').replace('H', 'h ').replace('M', 'm')}
                                                      </div>
                                                      <div className="flex-1 h-0.5 bg-gray-300"></div>
                                                    </div>
                                                    {segIndex < itinerary.segments.length - 1 && (
                                                      <p className="text-xs text-center text-gray-500 mt-1">Conexión en {segment.arrival.iataCode}</p>
                                                    )}
                                                  </div>
                                                  <div className="text-center">
                                                    <p className="text-sm text-gray-500">Llegada</p>
                                                    <p className="font-semibold">{format(new Date(segment.arrival.at), 'HH:mm', { locale: es })}</p>
                                                    <p className="text-xs text-gray-500">{segment.arrival.iataCode}</p>
                                                  </div>
                                                </div>
                                                <div className="text-sm text-gray-700 mt-2 ml-4">
                                                  <p>Aerolínea: {offer.validatingAirlineCodes?.[0] || segment.carrierCode} (Número de vuelo: {segment.number})</p>
                                                </div>
                                              </div>
                                            ))}
                                            <div className="mt-4 pt-4 border-t border-gray-100">
                                              <Button className="w-full" onClick={() => handleFlightSelect(offer)}>
                                                Seleccionar este vuelo
                                              </Button>
                                            </div>
                                          </div>
                                        ))}
                                      </AccordionContent>
                                    </AccordionItem>
                                );
                            })}
                          </Accordion>
                        ) : (
                          <Button className="w-full text-lg py-6 mt-4" onClick={() => {
                            setShowFlightOffersList(true);
                          }}>
                            Ver Vuelos Disponibles
                          </Button>
                        )
                      ) : (
                        <p>No se encontraron ofertas de vuelo para las fechas y criterios seleccionados.</p>
                      )}
                    </div>
                  )}

                  {/* Sección de resultados de ruta en coche */}
                  {carRoute && (
                    <div className="space-y-4 mt-8 border-t pt-8">
                      <h3 className="text-xl font-semibold">Ruta en Coche:</h3>
                      <div className="border rounded-lg p-4 bg-blue-50 dark:bg-blue-900/30">
                        <div className="grid grid-cols-2 gap-4 mb-4">
                          <div>
                            <h4 className="font-semibold text-blue-700 dark:text-blue-300">Distancia Total</h4>
                            <p className="text-lg">{carRoute.routes[0].legs[0].distance.text}</p>
                          </div>
                          <div>
                            <h4 className="font-semibold text-blue-700 dark:text-blue-300">Tiempo Estimado</h4>
                            <p className="text-lg">{carRoute.routes[0].legs[0].duration.text}</p>
                          </div>
                        </div>

                        <div className="mb-4">
                          <h4 className="font-semibold text-blue-700 dark:text-blue-300 mb-2">Estimación de Costes</h4>
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <p className="text-sm text-gray-600 dark:text-gray-400">Consumo estimado (7L/100km)</p>
                              <p className="font-medium">{(carRoute.routes[0].legs[0].distance.value / 100 * 7).toFixed(1)}L</p>
                            </div>
                            <div>
                              <p className="text-sm text-gray-600 dark:text-gray-400">Coste estimado (1.5€/L)</p>
                              <p className="font-medium">{((carRoute.routes[0].legs[0].distance.value / 100 * 7) * 1.5).toFixed(2)}€</p>
                            </div>
                          </div>
                        </div>

                        <div>
                          <h4 className="font-semibold text-blue-700 dark:text-blue-300 mb-2">Instrucciones de la Ruta</h4>
                          <div className="max-h-60 overflow-y-auto space-y-2">
                            {carRoute.routes[0].legs[0].steps.map((step: any, index: number) => (
                              <div key={index} className="text-sm border-b pb-2 last:border-b-0">
                                <p className="font-medium">{step.distance.text} - {step.duration.text}</p>
                                <p className="text-gray-600 dark:text-gray-400" dangerouslySetInnerHTML={{ __html: step.html_instructions }} />
                              </div>
                            ))}
                          </div>
                        </div>

                        <div className="flex gap-4 mt-4">
                          <Button variant="outline" onClick={() => setCarRoute(null)}>
                            Cambiar Selección
                          </Button>
                          <Button
                            onClick={sendDirectionsByEmail}
                            disabled={isSendingEmail}
                            className="flex items-center gap-2"
                          >
                            {isSendingEmail ? (
                              <>
                                <Loader2 className="h-4 w-4 animate-spin" />
                                Enviando...
                              </>
                            ) : (
                              <>
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                  <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" />
                                  <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" />
                                </svg>
                                Enviar a mi correo
                              </>
                            )}
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Sección de Lugares Destacados, Hoteles y Coches de Alquiler - Ahora siempre debajo del formulario */}
                  {selectedLocation && showTravelDetails && (
                    <div className="mt-8 border-t pt-8">
                      {searchHotel === 'Si' && (
                        <div className="mb-8">
                          <h3 className="text-xl font-semibold mb-4">Opciones de Hoteles Sugeridos</h3>
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            <Card className="overflow-hidden">
                              <div className="relative h-40">
                                <img
                                  src="https://images.unsplash.com/photo-1570535300645-a7b69c4f4b9f?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1920&q=80"
                                  alt="Hotel Central Madrid"
                                  className="w-full h-full object-cover"
                                />
                              </div>
                              <CardContent className="p-4">
                                <h4 className="font-semibold text-lg mb-1">Hotel Central Madrid</h4>
                                <p className="text-sm text-gray-600 mb-2">Gran Vía, 10, Madrid</p>
                                <div className="flex items-center gap-2 mb-2">
                                  <span className="text-yellow-500">★</span>
                                  <span>9.2/10</span>
                                </div>
                                <div className="space-y-2">
                                  <p className="text-lg font-bold text-green-600">Desde 120€</p>
                                  <p className="text-sm text-gray-600">Habitación Doble Estándar</p>
                                </div>
                                <div className="mt-4">
                                  <Button variant="outline" className="w-full">
                                    Ver Detalles
                                  </Button>
                                </div>
                              </CardContent>
                            </Card>

                            <Card className="overflow-hidden">
                              <div className="relative h-40">
                                <img
                                  src="https://images.unsplash.com/photo-1540541338287-43a9b2b2b1b3?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1920&q=80"
                                  alt="Hostal Sol y Luna"
                                  className="w-full h-full object-cover"
                                />
                              </div>
                              <CardContent className="p-4">
                                <h4 className="font-semibold text-lg mb-1">Hostal Sol y Luna</h4>
                                <p className="text-sm text-gray-600 mb-2">Plaza Mayor, 5, Madrid</p>
                                <div className="flex items-center gap-2 mb-2">
                                  <span className="text-yellow-500">★</span>
                                  <span>8.5/10</span>
                                </div>
                                <div className="space-y-2">
                                  <p className="text-lg font-bold text-green-600">Desde 60€</p>
                                  <p className="text-sm text-gray-600">Habitación Individual</p>
                                </div>
                                <div className="mt-4">
                                  <Button variant="outline" className="w-full">
                                    Ver Detalles
                                  </Button>
                                </div>
                              </CardContent>
                            </Card>

                            <Card className="overflow-hidden">
                              <div className="relative h-40">
                                <img
                                  src="https://images.unsplash.com/photo-1582236528701-d4564c7811e5?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1920&q=80"
                                  alt="Apartamentos Urbanos"
                                  className="w-full h-full object-cover"
                                />
                              </div>
                              <CardContent className="p-4">
                                <h4 className="font-semibold text-lg mb-1">Apartamentos Urbanos</h4>
                                <p className="text-sm text-gray-600 mb-2">Calle de la Paz, 1, Madrid</p>
                                <div className="flex items-center gap-2 mb-2">
                                  <span className="text-yellow-500">★</span>
                                  <span>9.0/10</span>
                                </div>
                                <div className="space-y-2">
                                  <p className="text-lg font-bold text-green-600">Desde 180€</p>
                                  <p className="text-sm text-gray-600">Apartamento con 2 Dormitorios</p>
                                </div>
                                <div className="mt-4">
                                  <Button variant="outline" className="w-full">
                                    Ver Detalles
                                  </Button>
                                </div>
                              </CardContent>
                            </Card>
                          </div>
                        </div>
                      )}

                      {rentCar === 'Si' && (
                        <div className="mb-8">
                          <h3 className="text-xl font-semibold mb-4">Opciones de Alquiler de Coches</h3>
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            <Card className="overflow-hidden">
                              <div className="relative h-40">
                                <img
                                  src="https://via.placeholder.com/400x200?text=Coche+Ejemplo+1"
                                  alt="Coche Ejemplo 1"
                                  className="w-full h-full object-cover"
                                />
                              </div>
                              <CardContent className="p-4">
                                <h4 className="font-semibold text-lg mb-1">Volkswagen Golf</h4>
                                <p className="text-sm text-gray-600 mb-2">Económico y eficiente</p>
                                <div className="flex justify-between text-sm text-gray-700 mb-2">
                                  <span>5 puertas</span>
                                  <span>5 plazas</span>
                                  <span>Manual</span>
                                </div>
                                <p className="text-lg font-bold text-green-600">35€/día</p>
                                <Button variant="outline" className="w-full mt-3">Reservar Ahora</Button>
                              </CardContent>
                            </Card>

                            <Card className="overflow-hidden">
                              <div className="relative h-40">
                                <img
                                  src="https://via.placeholder.com/400x200?text=Coche+Ejemplo+2"
                                  alt="Coche Ejemplo 2"
                                  className="w-full h-full object-cover"
                                />
                              </div>
                              <CardContent className="p-4">
                                <h4 className="font-semibold text-lg mb-1">BMW Serie 3</h4>
                                <p className="text-sm text-gray-600 mb-2">Confort y elegancia</p>
                                <div className="flex justify-between text-sm text-gray-700 mb-2">
                                  <span>4 puertas</span>
                                  <span>5 plazas</span>
                                  <span>Automático</span>
                                </div>
                                <p className="text-lg font-bold text-green-600">65€/día</p>
                                <Button variant="outline" className="w-full mt-3">Reservar Ahora</Button>
                              </CardContent>
                            </Card>

                            <Card className="overflow-hidden">
                              <div className="relative h-40">
                                <img
                                  src="https://via.placeholder.com/400x200?text=Coche+Ejemplo+3"
                                  alt="Coche Ejemplo 3"
                                  className="w-full h-full object-cover"
                                />
                              </div>
                              <CardContent className="p-4">
                                <h4 className="font-semibold text-lg mb-1">Renault Captur</h4>
                                <p className="text-sm text-gray-600 mb-2">SUV compacto</p>
                                <div className="flex justify-between text-sm text-gray-700 mb-2">
                                  <span>5 puertas</span>
                                  <span>5 plazas</span>
                                  <span>Manual</span>
                                </div>
                                <p className="text-lg font-bold text-green-600">45€/día</p>
                                <Button variant="outline" className="w-full mt-3">Reservar Ahora</Button>
                              </CardContent>
                            </Card>
                          </div>
                        </div>
                      )}
                      
                      <h3 className="text-xl font-semibold mb-4">Lugares Destacados en {selectedLocation.name}</h3>
                      
                      {loadingPlaces ? (
                        <div className="flex justify-center items-center py-8">
                          <Loader2 className="h-8 w-8 animate-spin mr-2" />
                          <span>Cargando lugares destacados...</span>
                        </div>
                      ) : placesError ? (
                        <div className="text-center py-8">
                          <p className="text-gray-500 mb-4">{placesError}</p>
                          <Button 
                            variant="outline" 
                            onClick={() => selectedLocation && loadPlaces(selectedLocation)}
                          >
                            Reintentar
                          </Button>
                        </div>
                      ) : places.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {places.map((place, index) => {
                            const isSelected = selectedPlaces.some(p => p.displayName.text === place.displayName.text);
                            return (
                              <Card key={index} className={`overflow-hidden ${isSelected ? 'ring-2 ring-blue-500' : ''}`}>
                                {place.photos && place.photos[0] && (
                                  <div className="relative h-48">
                                    <img
                                      src={`https://places.googleapis.com/v1/${place.photos[0].name}/media?key=${GOOGLE_MAPS_API_KEY}&maxWidthPx=400`}
                                      alt={place.displayName.text}
                                      className="w-full h-full object-cover"
                                      onError={(e) => {
                                        const target = e.target as HTMLImageElement;
                                        target.parentElement?.classList.add('hidden');
                                      }}
                                    />
                                  </div>
                                )}
                                <CardContent className="p-4">
                                  <div className="flex justify-between items-start mb-2">
                                    <h4 className="font-semibold text-lg">{place.displayName.text}</h4>
                                    <Button
                                      variant={isSelected ? "default" : "outline"}
                                      size="sm"
                                      onClick={() => {
                                        if (isSelected) {
                                          setSelectedPlaces(prev => 
                                            prev.filter(p => p.displayName.text !== place.displayName.text)
                                          );
                                        } else {
                                          setSelectedPlaces(prev => [...prev, place]);
                                        }
                                      }}
                                    >
                                      {isSelected ? "Seleccionado" : "Seleccionar"}
                                    </Button>
                                  </div>
                                  <p className="text-sm text-gray-600 mb-2">{place.formattedAddress}</p>
                                  {place.rating && (
                                    <div className="flex items-center gap-2">
                                      <span className="text-yellow-500">★</span>
                                      <span>{place.rating.toFixed(1)}</span>
                                      <span className="text-sm text-gray-500">
                                        ({place.userRatingCount} reseñas)
                                      </span>
                                    </div>
                                  )}
                                </CardContent>
                              </Card>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="text-center py-8">
                          <p className="text-gray-500">No se encontraron lugares destacados</p>
                          <Button 
                            variant="outline" 
                            className="mt-4"
                            onClick={() => selectedLocation && loadPlaces(selectedLocation)}
                          >
                            Reintentar
                          </Button>
                        </div>
                      )}
                    </div>
                  )}
                </>
              )}

              {showGeneratePlanButton && ( /* Nuevo: Botón para generar plan */
                <DialogFooter className="mt-8">
                  <Button
                    className="w-full text-lg py-6 bg-black text-white hover:bg-gray-800"
                    onClick={generateTravelPlan}
                    disabled={isGeneratingPlan}
                  >
                    {isGeneratingPlan ? (
                      <><Loader2 className="h-5 w-5 animate-spin mr-2" /> Generando Plan...</>
                    ) : (
                      "¿Planificamos el viaje?"
                    )}
                  </Button>
                </DialogFooter>
              )}

              {generatedTravelPlan && ( /* Modificar la sección del plan generado */
                <div className="mt-8 p-4 bg-gray-50 rounded-md shadow-inner">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-xl font-semibold">Tu Plan de Viaje Personalizado:</h3>
                    <Button
                      onClick={saveToFavorites}
                      disabled={isSavingFavorite || isSaved}
                      className={`flex items-center gap-2 ${
                        isSaved ? 'bg-green-500 hover:bg-green-600' : ''
                      }`}
                    >
                      {isSavingFavorite ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Guardando...
                        </>
                      ) : isSaved ? (
                        <>
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                          Guardado en favoritos
                        </>
                      ) : (
                        <>
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                            <path d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" />
                          </svg>
                          Guardar en favoritos
                        </>
                      )}
                    </Button>
                  </div>
                  <div className="prose prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: generatedTravelPlan }} />
                </div>
              )}
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Añadir el diálogo para mostrar los viajes guardados */}
      <Dialog open={showSavedPlans} onOpenChange={setShowSavedPlans}>
        <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl">Mis Viajes Guardados</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 mt-4">
            {savedPlans.length === 0 ? (
              <p className="text-center text-gray-500 py-8">No tienes viajes guardados</p>
            ) : (
              savedPlans.map((plan) => (
                <Card key={plan.id} className="overflow-hidden">
                  <CardContent className="p-4">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h3 className="text-xl font-semibold">{plan.destination}</h3>
                        <p className="text-sm text-gray-600">
                          {new Date(plan.startDate).toLocaleDateString()} - {new Date(plan.endDate).toLocaleDateString()}
                        </p>
                        <p className="text-sm text-gray-600">
                          {plan.travelers} {plan.travelers === 1 ? 'viajero' : 'viajeros'} • {plan.transportType}
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setSavedPlans(prev => prev.filter(p => p.id !== plan.id));
                        }}
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-red-500" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                      </Button>
                    </div>
                    <div className="prose prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: plan.plan }} />
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>

    </div>
  );
}

// Componente de botón para cambiar el modo (fuera del componente principal Dashboard)
function ModeToggle() {
  const { setTheme, theme } = useTheme();

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
      className="transition-all duration-300"
    >
      {theme === "light" ? (
        <Sun className="h-[1.5rem] w-[1.5rem] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
      ) : (
        <Moon className="absolute h-[1.5rem] w-[1.5rem] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
      )}
      <span className="sr-only">Cambiar tema</span>
    </Button>
  );
}