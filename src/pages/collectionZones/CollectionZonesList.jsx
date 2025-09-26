import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Map, 
  MapPin, 
  Plus, 
  Users, 
  Truck,
  BarChart3,
  Navigation
} from "lucide-react";

const zonesData = [
  {
    id: 1,
    name: "Centro",
    description: "Zona centro de Madrid",
    clients: 45,
    routes: 8,
    status: "Activa",
    coverage: 95,
    lastUpdate: "2024-01-12",
    coordinates: { lat: 40.4168, lng: -3.7038 }
  },
  {
    id: 2,
    name: "Norte",
    description: "Zona norte metropolitana",
    clients: 32,
    routes: 6,
    status: "Activa",
    coverage: 88,
    lastUpdate: "2024-01-11",
    coordinates: { lat: 40.4568, lng: -3.6838 }
  },
  {
    id: 3,
    name: "Sur",
    description: "Zona sur industrial",
    clients: 28,
    routes: 5,
    status: "En Desarrollo",
    coverage: 72,
    lastUpdate: "2024-01-10",
    coordinates: { lat: 40.3768, lng: -3.7238 }
  },
  {
    id: 4,
    name: "Este",
    description: "Zona este residencial",
    clients: 19,
    routes: 4,
    status: "Planificada",
    coverage: 45,
    lastUpdate: "2024-01-09",
    coordinates: { lat: 40.4368, lng: -3.6438 }
  }
];

export default function CollectionZonesList() {
  const getStatusColor = (status) => {
    switch (status) {
      case "Activa":
        return "bg-success text-success-foreground";
      case "En Desarrollo":
        return "bg-orange-500 text-white";
      case "Planificada":
        return "bg-blue-500 text-white";
      default:
        return "bg-secondary text-secondary-foreground";
    }
  };

  const getCoverageColor = (coverage) => {
    if (coverage >= 90) return "text-success";
    if (coverage >= 70) return "text-orange-500";
    return "text-destructive";
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
            <Map className="w-8 h-8 text-primary" />
            Zonas de Recogida
          </h1>
          <p className="text-muted-foreground">Gestiona las zonas de operación y rutas de recogida</p>
        </div>
        
        <div className="flex gap-2">
          <Button variant="outline" className="gap-2">
            <Navigation className="w-4 h-4" />
            Ver Mapa Completo
          </Button>
          <Button className="gap-2">
            <Plus className="w-4 h-4" />
            Nueva Zona
          </Button>
        </div>
      </div>

      {/* Statistics Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-primary">{zonesData.length}</div>
              <p className="text-sm text-muted-foreground">Total Zonas</p>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-success">
                {zonesData.filter(z => z.status === "Activa").length}
              </div>
              <p className="text-sm text-muted-foreground">Zonas Activas</p>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-primary">
                {zonesData.reduce((sum, zone) => sum + zone.clients, 0)}
              </div>
              <p className="text-sm text-muted-foreground">Total Clientes</p>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-primary">
                {zonesData.reduce((sum, zone) => sum + zone.routes, 0)}
              </div>
              <p className="text-sm text-muted-foreground">Total Rutas</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Interactive Map Placeholder */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="w-5 h-5 text-primary" />
            Mapa Interactivo de Zonas
          </CardTitle>
          <CardDescription className="text-left">
            Vista general de todas las zonas de recogida con sus límites y rutas
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-96 bg-gradient-subtle rounded-lg flex items-center justify-center border border-border relative overflow-hidden">
            {/* Map placeholder with zone markers */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="grid grid-cols-2 gap-8 w-full h-full p-8">
                {zonesData.map((zone) => (
                  <div 
                    key={zone.id}
                    className="relative flex items-center justify-center"
                  >
                    <div className="text-center p-4 bg-background/80 backdrop-blur-sm rounded-lg border border-border shadow-elegant">
                      <MapPin className="w-6 h-6 text-primary mx-auto mb-2" />
                      <h3 className="font-semibold text-foreground">{zone.name}</h3>
                      <Badge className={`${getStatusColor(zone.status)} text-xs mt-1`}>
                        {zone.status}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            
            <div className="absolute bottom-4 right-4">
              <Button variant="outline" className="gap-2">
                <Navigation className="w-4 h-4" />
                Abrir Mapa Completo
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Zones Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {zonesData.map((zone) => (
          <Card key={zone.id} className="hover:shadow-elegant transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-xl flex items-center gap-2">
                    <MapPin className="w-5 h-5 text-primary" />
                    {zone.name}
                  </CardTitle>
                  <CardDescription className="mt-1">
                    {zone.description}
                  </CardDescription>
                </div>
                
                <Badge className={getStatusColor(zone.status)}>
                  {zone.status}
                </Badge>
              </div>
            </CardHeader>
            
            <CardContent className="space-y-4">
              {/* Zone Stats */}
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center p-3 bg-accent/50 rounded-lg">
                  <Users className="w-5 h-5 text-primary mx-auto mb-1" />
                  <div className="text-lg font-semibold text-foreground">{zone.clients}</div>
                  <div className="text-xs text-muted-foreground">Clientes</div>
                </div>
                
                <div className="text-center p-3 bg-accent/50 rounded-lg">
                  <Truck className="w-5 h-5 text-primary mx-auto mb-1" />
                  <div className="text-lg font-semibold text-foreground">{zone.routes}</div>
                  <div className="text-xs text-muted-foreground">Rutas</div>
                </div>
                
                <div className="text-center p-3 bg-accent/50 rounded-lg">
                  <BarChart3 className="w-5 h-5 text-primary mx-auto mb-1" />
                  <div className={`text-lg font-semibold ${getCoverageColor(zone.coverage)}`}>
                    {zone.coverage}%
                  </div>
                  <div className="text-xs text-muted-foreground">Cobertura</div>
                </div>
              </div>

              {/* Coverage Progress Bar */}
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Cobertura de la zona</span>
                  <span className={`font-medium ${getCoverageColor(zone.coverage)}`}>
                    {zone.coverage}%
                  </span>
                </div>
                <div className="w-full bg-secondary rounded-full h-2">
                  <div 
                    className={`h-2 rounded-full transition-all ${
                      zone.coverage >= 90 ? 'bg-success' :
                      zone.coverage >= 70 ? 'bg-orange-500' :
                      'bg-destructive'
                    }`}
                    style={{ width: `${zone.coverage}%` }}
                  ></div>
                </div>
              </div>

              {/* Zone Details */}
              <div className="pt-3 border-t border-border">
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-muted-foreground">Última actualización:</span>
                  <span className="font-medium">{zone.lastUpdate}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Coordenadas:</span>
                  <span className="font-medium text-primary">
                    {zone.coordinates.lat}, {zone.coordinates.lng}
                  </span>
                </div>
              </div>
              
              {/* Action Buttons */}
              <div className="flex gap-2 pt-3">
                <Button variant="outline" size="sm" className="flex-1 gap-2">
                  <MapPin className="w-4 h-4" />
                  Ver en Mapa
                </Button>
                <Button size="sm" className="flex-1 gap-2">
                  <BarChart3 className="w-4 h-4" />
                  Estadísticas
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Zone Creation CTA */}
      <Card className="bg-gradient-primary text-primary-foreground">
        <CardContent className="pt-6">
          <div className="text-center">
            <MapPin className="w-12 h-12 mx-auto mb-4 opacity-90" />
            <h3 className="text-xl font-semibold mb-2">¿Necesitas expandir la cobertura?</h3>
            <p className="opacity-90 mb-4">
              Crea nuevas zonas de recogida para optimizar tus operaciones y aumentar la eficiencia
            </p>
            <Button variant="secondary" className="gap-2">
              <Plus className="w-4 h-4" />
              Crear Nueva Zona
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
