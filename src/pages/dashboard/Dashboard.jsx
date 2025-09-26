import { StatCard } from "@/components/common/StatCard";
import { FilterSection } from "@/components/common/FilterSection";
import { ActionButton } from "@/components/common/ActionButton";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  Users, 
  UserCheck, 
  Truck, 
  BarChart3, 
  TrendingUp, 
  MapPin,
  Calendar,
  CheckCircle,
  LayoutDashboard
} from "lucide-react";

const statsData = [
  {
    title: "Total Clientes",
    value: "248",
    change: "+12%",
    icon: Users,
    color: "text-blue-600"
  },
  {
    title: "Trabajadores Activos",
    value: "32",
    change: "+3%",
    icon: UserCheck,
    color: "text-green-600"
  },
  {
    title: "Recogidas Hoy",
    value: "45",
    change: "+8%",
    icon: Truck,
    color: "text-orange-600"
  },
  {
    title: "Ingresos del Mes",
    value: "€15,420",
    change: "+15%",
    icon: BarChart3,
    color: "text-purple-600"
  }
];

const recentActivities = [
  {
    id: 1,
    type: "Recogida Completada",
    client: "Restaurante El Sol",
    worker: "José García",
    time: "Hace 2 horas",
    status: "completed"
  },
  {
    id: 2,
    type: "Nueva Ruta Asignada",
    client: "Hotel Plaza",
    worker: "María López",
    time: "Hace 4 horas",
    status: "assigned"
  },
  {
    id: 3,
    type: "Cliente Registrado",
    client: "Cafetería Central",
    worker: "Sistema",
    time: "Hace 6 horas",
    status: "new"
  }
];

const quickActions = [
  { label: "Nuevo Cliente", icon: Users, variant: "outline" },
  { label: "Registrar Recogida", icon: Truck, variant: "outline" },
  { label: "Crear Ruta", icon: MapPin, variant: "outline" },
  { label: "Ver Estadísticas", icon: BarChart3, variant: "success" }
];

export default function Dashboard() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="text-left">
          <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
            <LayoutDashboard className="w-8 h-8 text-primary" />
            Dashboard
          </h1>
          <p className="text-muted-foreground">Resumen general de operaciones GreenPath</p>
        </div>
        
        <div className="flex gap-2">
          <ActionButton variant="outline" icon={Calendar}>
            Hoy
          </ActionButton>
          <ActionButton icon={TrendingUp}>
            Ver Reportes
          </ActionButton>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statsData.map((stat, index) => (
          <StatCard
            key={index}
            title={stat.title}
            value={stat.value}
            change={stat.change}
            icon={stat.icon}
            color={stat.color}
            className="text-left"
          />
        ))}
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Activities */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-left">
              <CheckCircle className="w-5 h-5 text-primary" />
              Actividad Reciente
            </CardTitle>
            <CardDescription className="text-left">
              Últimas operaciones registradas en el sistema
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentActivities.map((activity) => (
                <div key={activity.id} className="flex items-center justify-between p-3 border border-border rounded-lg hover:bg-accent/50 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className={`w-3 h-3 rounded-full ${
                      activity.status === 'completed' ? 'bg-success' :
                      activity.status === 'assigned' ? 'bg-orange-500' :
                      'bg-blue-500'
                    }`}></div>
                    <div className="text-left">
                      <p className="font-medium text-foreground">{activity.type}</p>
                      <p className="text-sm text-muted-foreground">
                        {activity.client} • {activity.worker}
                      </p>
                    </div>
                  </div>
                  <span className="text-xs text-muted-foreground">{activity.time}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-left">
              <MapPin className="w-5 h-5 text-primary" />
              Acciones Rápidas
            </CardTitle>
            <CardDescription className="text-left">
              Accesos directos a funciones principales
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {quickActions.map((action, index) => (
              <ActionButton
                key={index}
                variant={action.variant}
                icon={action.icon}
                className="w-full justify-start"
              >
                {action.label}
              </ActionButton>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Map Preview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-left">
            <MapPin className="w-5 h-5 text-primary" />
            Mapa de Operaciones
          </CardTitle>
          <CardDescription className="text-left">
            Vista general de zonas de recogida y rutas activas
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-64 bg-gradient-subtle rounded-lg flex items-center justify-center border border-border">
            <div className="text-center">
              <MapPin className="w-12 h-12 text-primary mx-auto mb-3" />
              <p className="text-muted-foreground">Mapa interactivo disponible en la sección de Zonas</p>
              <ActionButton variant="outline" className="mt-3">
                Ver Mapa Completo
              </ActionButton>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}