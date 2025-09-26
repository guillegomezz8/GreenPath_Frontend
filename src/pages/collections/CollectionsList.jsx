import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { 
  Package,
  Truck, 
  Search, 
  Plus, 
  Calendar,
  MapPin,
  Users,
  Clock,
  Weight,
  CheckCircle,
  AlertTriangle,
  BarChart3
} from "lucide-react";

const recogidas = [
  {
    id: 1,
    client: "Restaurante El Sol",
    address: "Calle Mayor 123",
    driver: "José García",
    vehicle: "GRN-001",
    scheduledTime: "09:00",
    actualTime: "09:15",
    status: "Completada",
    quantity: "45 L",
    quality: "Excelente",
    date: "2024-01-12",
    route: "Centro-01",
    notes: "Recogida normal, aceite en buen estado"
  },
  {
    id: 2,
    client: "Hotel Plaza",
    address: "Plaza España 45",
    driver: "María López",
    vehicle: "GRN-002",
    scheduledTime: "10:30",
    actualTime: "10:45",
    status: "Completada",
    quantity: "78 L",
    quality: "Buena",
    date: "2024-01-12",
    route: "Norte-02",
    notes: "Ligera demora por tráfico"
  },
  {
    id: 3,
    client: "Cafetería Central",
    address: "Avenida Central 67",
    driver: "Carlos Ruiz",
    vehicle: "GRN-003",
    scheduledTime: "14:00",
    actualTime: null,
    status: "Programada",
    quantity: "25 L",
    quality: null,
    date: "2024-01-12",
    route: "Sur-01",
    notes: "Primera recogida programada"
  },
  {
    id: 4,
    client: "Industrias García",
    address: "Polígono Industrial Sur 89",
    driver: "Ana Martín",
    vehicle: "GRN-004",
    scheduledTime: "11:00",
    actualTime: "11:30",
    status: "Problema",
    quantity: "120 L",
    quality: "Regular",
    date: "2024-01-12",
    route: "Centro-02",
    notes: "Aceite con impurezas, requiere filtrado especial"
  },
  {
    id: 5,
    client: "Panadería San Juan",
    address: "Calle San Juan 34",
    driver: "José García",
    vehicle: "GRN-001",
    scheduledTime: "15:30",
    actualTime: "15:25",
    status: "En Progreso",
    quantity: "32 L",
    quality: null,
    date: "2024-01-12",
    route: "Centro-01",
    notes: "Recogida en curso"
  }
];

export default function CollectionsList() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("Todas");

  const filteredRecogidas = recogidas.filter(recogida => {
    const matchesSearch = recogida.client.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         recogida.address.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         recogida.driver.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = selectedStatus === "Todas" || recogida.status === selectedStatus;
    return matchesSearch && matchesStatus;
  });

  const getStatusColor = (status) => {
    switch (status) {
      case "Completada":
        return "bg-success text-success-foreground";
      case "En Progreso":
        return "bg-blue-500 text-white";
      case "Programada":
        return "bg-orange-500 text-white";
      case "Problema":
        return "bg-destructive text-destructive-foreground";
      default:
        return "bg-secondary text-secondary-foreground";
    }
  };

  const getQualityColor = (quality) => {
    switch (quality) {
      case "Excelente":
        return "text-success";
      case "Buena":
        return "text-blue-500";
      case "Regular":
        return "text-orange-500";
      case "Mala":
        return "text-destructive";
      default:
        return "text-muted-foreground";
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case "Completada":
        return <CheckCircle className="w-4 h-4" />;
      case "Problema":
        return <AlertTriangle className="w-4 h-4" />;
      default:
        return <Truck className="w-4 h-4" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
            <Package className="w-8 h-8 text-primary" />
            Gestión de Recogidas
          </h1>
          <p className="text-muted-foreground">Supervisa y registra todas las recogidas de aceite usado</p>
        </div>
        
        <div className="flex gap-2">
          <Button variant="outline" className="gap-2">
            <BarChart3 className="w-4 h-4" />
            Reportes
          </Button>
          <Button className="gap-2">
            <Plus className="w-4 h-4" />
            Nueva Recogida
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
                placeholder="Buscar por cliente, dirección o conductor..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            
            <div className="flex gap-2">
              {["Todas", "Completada", "En Progreso", "Programada", "Problema"].map((status) => (
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
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-primary">{recogidas.length}</div>
              <p className="text-sm text-muted-foreground">Total Hoy</p>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-success">
                {recogidas.filter(r => r.status === "Completada").length}
              </div>
              <p className="text-sm text-muted-foreground">Completadas</p>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-500">
                {recogidas.filter(r => r.status === "En Progreso").length}
              </div>
              <p className="text-sm text-muted-foreground">En Progreso</p>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-destructive">
                {recogidas.filter(r => r.status === "Problema").length}
              </div>
              <p className="text-sm text-muted-foreground">Problemas</p>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-primary">
                {recogidas
                  .filter(r => r.status === "Completada")
                  .reduce((total, r) => total + parseInt(r.quantity), 0)}L
              </div>
              <p className="text-sm text-muted-foreground">Aceite Recogido</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recogidas List */}
      <div className="space-y-4">
        {filteredRecogidas.map((recogida) => (
          <Card key={recogida.id} className="hover:shadow-elegant transition-shadow">
            <CardContent className="pt-6">
              <div className="flex flex-col lg:flex-row gap-6">
                {/* Main Info */}
                <div className="flex-1 space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
                        {getStatusIcon(recogida.status)}
                        {recogida.client}
                      </h3>
                      <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                        <MapPin className="w-4 h-4" />
                        {recogida.address}
                      </p>
                    </div>
                    
                    <Badge className={getStatusColor(recogida.status)}>
                      {recogida.status}
                    </Badge>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                    <div className="flex items-center gap-2">
                      <Users className="w-4 h-4 text-muted-foreground" />
                      <span className="text-muted-foreground">Conductor:</span>
                      <span className="font-medium">{recogida.driver}</span>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <Truck className="w-4 h-4 text-muted-foreground" />
                      <span className="text-muted-foreground">Vehículo:</span>
                      <span className="font-medium">{recogida.vehicle}</span>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-muted-foreground" />
                      <span className="text-muted-foreground">Ruta:</span>
                      <span className="font-medium">{recogida.route}</span>
                    </div>
                  </div>
                </div>

                {/* Time and Quantity Info */}
                <div className="lg:w-80 space-y-3">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-3 bg-accent/50 rounded-lg">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                        <Clock className="w-4 h-4" />
                        Programada
                      </div>
                      <div className="font-semibold">{recogida.scheduledTime}</div>
                    </div>
                    
                    <div className="p-3 bg-accent/50 rounded-lg">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                        <CheckCircle className="w-4 h-4" />
                        {recogida.actualTime ? "Realizada" : "Estimada"}
                      </div>
                      <div className="font-semibold">
                        {recogida.actualTime || "Pendiente"}
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-3 bg-primary/10 rounded-lg">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                        <Weight className="w-4 h-4" />
                        Cantidad
                      </div>
                      <div className="font-semibold text-primary">{recogida.quantity}</div>
                    </div>
                    
                    <div className="p-3 bg-accent/50 rounded-lg">
                      <div className="text-sm text-muted-foreground mb-1">Calidad</div>
                      <div className={`font-semibold ${getQualityColor(recogida.quality)}`}>
                        {recogida.quality || "Pendiente"}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Notes and Actions */}
              <div className="mt-4 pt-4 border-t border-border">
                <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-3">
                  <div className="flex-1">
                    <p className="text-sm text-muted-foreground text-left">
                      <strong>Notas:</strong> {recogida.notes}
                    </p>
                  </div>
                  
                  <div className="flex gap-2">
                    {recogida.status === "Programada" && (
                      <Button size="sm" className="gap-2">
                        <CheckCircle className="w-4 h-4" />
                        Iniciar
                      </Button>
                    )}
                    {recogida.status === "En Progreso" && (
                      <Button size="sm" className="gap-2">
                        <CheckCircle className="w-4 h-4" />
                        Completar
                      </Button>
                    )}
                    {recogida.status === "Completada" && (
                      <Button variant="outline" size="sm" className="gap-2">
                        <BarChart3 className="w-4 h-4" />
                        Ver Detalles
                      </Button>
                    )}
                    {recogida.status === "Problema" && (
                      <Button variant="destructive" size="sm" className="gap-2">
                        <AlertTriangle className="w-4 h-4" />
                        Resolver
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredRecogidas.length === 0 && (
        <Card>
          <CardContent className="text-center py-12">
            <Truck className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">No se encontraron recogidas con los criterios seleccionados</p>
          </CardContent>
        </Card>
      )}

      {/* Quick Stats Card */}
      <Card className="bg-gradient-primary text-primary-foreground">
        <CardContent className="pt-6">
          <div className="text-center">
            <Weight className="w-12 h-12 mx-auto mb-4 opacity-90" />
            <h3 className="text-xl font-semibold mb-2">Resumen del Día</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
              <div>
                <div className="text-2xl font-bold">
                  {recogidas.filter(r => r.status === "Completada").length}
                </div>
                <p className="opacity-90">Recogidas Completadas</p>
              </div>
              <div>
                <div className="text-2xl font-bold">
                  {recogidas
                    .filter(r => r.status === "Completada")
                    .reduce((total, r) => total + parseInt(r.quantity), 0)}L
                </div>
                <p className="opacity-90">Aceite Recogido</p>
              </div>
              <div>
                <div className="text-2xl font-bold">
                  {Math.round((recogidas.filter(r => r.status === "Completada").length / recogidas.length) * 100)}%
                </div>
                <p className="opacity-90">Eficiencia</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
