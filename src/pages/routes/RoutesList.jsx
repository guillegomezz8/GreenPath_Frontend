import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { 
  Route, 
  MapPin, 
  Plus, 
  Clock,
  Users,
  Truck,
  Navigation,
  Search,
  Calendar,
  CheckCircle,
  AlertCircle
} from "lucide-react";

const routesData = [
  {
    id: 1,
    name: "Ruta Centro-01",
    zone: "Centro",
    driver: "José García",
    vehicle: "GRN-001",
    status: "Completada",
    clients: 8,
    estimatedTime: "3h 30m",
    distance: "45.2 km",
    startTime: "08:00",
    endTime: "11:30",
    date: "2024-01-12",
    progress: 100,
    collections: 8
  },
  {
    id: 2,
    name: "Ruta Norte-02",
    zone: "Norte",
    driver: "María López",
    vehicle: "GRN-002",
    status: "En Progreso",
    clients: 6,
    estimatedTime: "2h 45m",
    distance: "32.8 km",
    startTime: "09:00",
    endTime: "11:45",
    date: "2024-01-12",
    progress: 67,
    collections: 4
  },
  {
    id: 3,
    name: "Ruta Sur-01",
    zone: "Sur",
    driver: "Carlos Ruiz",
    vehicle: "GRN-003",
    status: "Planificada",
    clients: 5,
    estimatedTime: "2h 15m",
    distance: "28.5 km",
    startTime: "14:00",
    endTime: "16:15",
    date: "2024-01-12",
    progress: 0,
    collections: 0
  },
  {
    id: 4,
    name: "Ruta Centro-02",
    zone: "Centro",
    driver: "Ana Martín",
    vehicle: "GRN-004",
    status: "Retrasada",
    clients: 7,
    estimatedTime: "3h 00m",
    distance: "38.9 km",
    startTime: "10:00",
    endTime: "13:00",
    date: "2024-01-12",
    progress: 43,
    collections: 3
  }
];

export default function Rutas() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("Todas");

  const filteredRoutes = routesData.filter(route => {
    const matchesSearch = route.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         route.zone.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         route.driver.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = selectedStatus === "Todas" || route.status === selectedStatus;
    return matchesSearch && matchesStatus;
  });

  const getStatusColor = (status) => {
    switch (status) {
      case "Completada":
        return "bg-success text-success-foreground";
      case "En Progreso":
        return "bg-blue-500 text-white";
      case "Planificada":
        return "bg-orange-500 text-white";
      case "Retrasada":
        return "bg-destructive text-destructive-foreground";
      default:
        return "bg-secondary text-secondary-foreground";
    }
  };

  const getProgressColor = (progress, status) => {
    if (status === "Retrasada") return "bg-destructive";
    if (progress === 100) return "bg-success";
    if (progress > 0) return "bg-blue-500";
    return "bg-secondary";
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
            <Route className="w-8 h-8 text-primary" />
            Gestión de Rutas
          </h1>
          <p className="text-muted-foreground">Planifica y supervisa las rutas de recogida diarias</p>
        </div>
        
        <div className="flex gap-2">
          <Button variant="outline" className="gap-2">
            <Calendar className="w-4 h-4" />
            Planificar Día
          </Button>
          <Button className="gap-2">
            <Plus className="w-4 h-4" />
            Nueva Ruta
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nombre, zona o conductor..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            
            <div className="flex gap-2">
              {["Todas", "Completada", "En Progreso", "Planificada", "Retrasada"].map((status) => (
                <Button
                  key={status}
                  variant={selectedStatus === status ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedStatus(status)}
                >
                  {status}
                </Button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-primary">{routesData.length}</div>
              <p className="text-sm text-muted-foreground">Rutas Hoy</p>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-success">
                {routesData.filter(r => r.status === "Completada").length}
              </div>
              <p className="text-sm text-muted-foreground">Completadas</p>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-500">
                {routesData.filter(r => r.status === "En Progreso").length}
              </div>
              <p className="text-sm text-muted-foreground">En Progreso</p>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-primary">
                {routesData.reduce((sum, route) => sum + route.collections, 0)}
              </div>
              <p className="text-sm text-muted-foreground">Recogidas Hoy</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Routes List */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {filteredRoutes.map((route) => (
          <Card key={route.id} className="hover:shadow-elegant transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Route className="w-5 h-5 text-primary" />
                    {route.name}
                  </CardTitle>
                  <CardDescription className="flex items-center gap-2 mt-1">
                    <MapPin className="w-4 h-4" />
                    Zona {route.zone}
                  </CardDescription>
                </div>
                
                <div className="flex flex-col items-end gap-2">
                  <Badge className={getStatusColor(route.status)}>
                    {route.status}
                  </Badge>
                  {route.status === "Retrasada" && (
                    <AlertCircle className="w-4 h-4 text-destructive" />
                  )}
                  {route.status === "Completada" && (
                    <CheckCircle className="w-4 h-4 text-success" />
                  )}
                </div>
              </div>
            </CardHeader>
            
            <CardContent className="space-y-4">
              {/* Route Info */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm">
                    <Users className="w-4 h-4 text-muted-foreground" />
                    <span className="text-muted-foreground">Conductor:</span>
                    <span className="font-medium">{route.driver}</span>
                  </div>
                  
                  <div className="flex items-center gap-2 text-sm">
                    <Truck className="w-4 h-4 text-muted-foreground" />
                    <span className="text-muted-foreground">Vehículo:</span>
                    <span className="font-medium">{route.vehicle}</span>
                  </div>
                  
                  <div className="flex items-center gap-2 text-sm">
                    <Clock className="w-4 h-4 text-muted-foreground" />
                    <span className="text-muted-foreground">Horario:</span>
                    <span className="font-medium">{route.startTime} - {route.endTime}</span>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <div className="text-sm">
                    <span className="text-muted-foreground">Clientes: </span>
                    <span className="font-medium">{route.clients}</span>
                  </div>
                  
                  <div className="text-sm">
                    <span className="text-muted-foreground">Distancia: </span>
                    <span className="font-medium">{route.distance}</span>
                  </div>
                  
                  <div className="text-sm">
                    <span className="text-muted-foreground">Tiempo est.: </span>
                    <span className="font-medium">{route.estimatedTime}</span>
                  </div>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Progreso de recogidas</span>
                  <span className="font-medium">
                    {route.collections}/{route.clients} ({route.progress}%)
                  </span>
                </div>
                <div className="w-full bg-secondary rounded-full h-2">
                  <div 
                    className={`h-2 rounded-full transition-all ${getProgressColor(route.progress, route.status)}`}
                    style={{ width: `${route.progress}%` }}
                  ></div>
                </div>
              </div>
              
              {/* Action Buttons */}
              <div className="flex gap-2 pt-2">
                <Button variant="outline" size="sm" className="flex-1 gap-2">
                  <Navigation className="w-4 h-4" />
                  Ver Ruta
                </Button>
                {route.status === "En Progreso" && (
                  <Button size="sm" className="flex-1 gap-2">
                    <MapPin className="w-4 h-4" />
                    Seguir
                  </Button>
                )}
                {route.status === "Planificada" && (
                  <Button size="sm" className="flex-1 gap-2">
                    <CheckCircle className="w-4 h-4" />
                    Iniciar
                  </Button>
                )}
                {route.status === "Completada" && (
                  <Button variant="success" size="sm" className="flex-1 gap-2">
                    <CheckCircle className="w-4 h-4" />
                    Reporte
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredRoutes.length === 0 && (
        <Card>
          <CardContent className="text-center py-12">
            <Route className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">No se encontraron rutas con los criterios seleccionados</p>
          </CardContent>
        </Card>
      )}

      {/* Route Optimization CTA */}
      <Card className="bg-gradient-primary text-primary-foreground">
        <CardContent className="pt-6">
          <div className="text-center">
            <Navigation className="w-12 h-12 mx-auto mb-4 opacity-90" />
            <h3 className="text-xl font-semibold mb-2">Optimiza tus rutas automáticamente</h3>
            <p className="opacity-90 mb-4">
              Usa nuestro algoritmo de optimización para crear rutas más eficientes y reducir tiempos
            </p>
            <Button variant="secondary" className="gap-2">
              <Route className="w-4 h-4" />
              Optimizar Rutas
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
