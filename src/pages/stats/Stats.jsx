import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  BarChart3, 
  TrendingUp, 
  TrendingDown,
  Calendar,
  Download,
  Users,
  Truck,
  MapPin,
  Droplets,
  Euro,
  Clock
} from "lucide-react";

const monthlyData = [
  { month: "Ene", collections: 245, volume: 3420, revenue: 15600, efficiency: 94 },
  { month: "Feb", collections: 298, volume: 4180, revenue: 18900, efficiency: 96 },
  { month: "Mar", collections: 312, volume: 4390, revenue: 19850, efficiency: 92 },
  { month: "Abr", collections: 285, volume: 3980, revenue: 18200, efficiency: 89 },
  { month: "May", collections: 356, volume: 5020, revenue: 22300, efficiency: 97 },
  { month: "Jun", collections: 378, volume: 5340, revenue: 24100, efficiency: 95 }
];

const zoneStats = [
  { zone: "Centro", collections: 156, volume: 2890, efficiency: 96, growth: "+12%" },
  { zone: "Norte", collections: 89, volume: 1670, efficiency: 94, growth: "+8%" },
  { zone: "Sur", collections: 67, volume: 1290, efficiency: 88, growth: "+15%" },
  { zone: "Este", collections: 66, volume: 1490, efficiency: 91, growth: "+5%" }
];

const kpiData = [
  { title: "Total Recogidas", value: "1,245", change: "+12.5%", trend: "up", icon: Truck, description: "Este mes" },
  { title: "Volumen Total", value: "18,430 L", change: "+8.2%", trend: "up", icon: Droplets, description: "Aceite recogido" },
  { title: "Ingresos", value: "€82,540", change: "+15.7%", trend: "up", icon: Euro, description: "Este mes" },
  { title: "Eficiencia Media", value: "94.2%", change: "-2.1%", trend: "down", icon: BarChart3, description: "Rutas completadas" },
  { title: "Clientes Activos", value: "248", change: "+6.8%", trend: "up", icon: Users, description: "Total activos" },
  { title: "Tiempo Promedio", value: "2.8h", change: "-5.3%", trend: "up", icon: Clock, description: "Por ruta" }
];

export default function Estadisticas() {
  const getTrendColor = (trend) => {
    return trend === "up" ? "text-success" : "text-destructive";
  };

  const getTrendIcon = (trend) => {
    return trend === "up" ? TrendingUp : TrendingDown;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
            <BarChart3 className="w-8 h-8 text-primary" />
            Estadísticas y Reportes
          </h1>
          <p className="text-muted-foreground text-left">Análisis detallado del rendimiento operativo</p>
        </div>
        
        <div className="flex gap-2">
          <Button variant="outline" className="gap-2">
            <Calendar className="w-4 h-4" />
            Seleccionar Período
          </Button>
          <Button className="gap-2">
            <Download className="w-4 h-4" />
            Exportar Reporte
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {kpiData.map((kpi, index) => {
          const TrendIcon = getTrendIcon(kpi.trend);
          return (
            <Card key={index} className="hover:shadow-elegant transition-shadow">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between mb-2">
                  <kpi.icon className="w-5 h-5 text-primary" />
                  <div className={`flex items-center gap-1 text-sm ${getTrendColor(kpi.trend)}`}>
                    <TrendIcon className="w-3 h-3" />
                    {kpi.change}
                  </div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-foreground text-left">{kpi.value}</div>
                  <p className="text-xs text-muted-foreground text-left">{kpi.title}</p>
                  <p className="text-xs text-muted-foreground mt-1 text-left">{kpi.description}</p>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Volume Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Droplets className="w-5 h-5 text-primary" />
              Volumen de Recogida Mensual
            </CardTitle>
            <CardDescription className="text-left">
              Evolución del volumen de aceite recogido por mes
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-64 flex items-end justify-between gap-2 p-4">
              {monthlyData.map((data, index) => (
                <div key={index} className="flex flex-col items-center gap-2 flex-1">
                  <div className="text-xs text-muted-foreground">{data.volume}L</div>
                  <div 
                    className="w-full bg-primary rounded-t-sm transition-all hover:bg-primary-glow"
                    style={{ height: `${(data.volume / 5500) * 100}%`, minHeight: '20px' }}
                  ></div>
                  <div className="text-xs font-medium text-foreground">{data.month}</div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Revenue Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Euro className="w-5 h-5 text-primary" />
              Ingresos Mensuales
            </CardTitle>
            <CardDescription className="text-left">
              Evolución de los ingresos generados por mes
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-64 flex items-end justify-between gap-2 p-4">
              {monthlyData.map((data, index) => (
                <div key={index} className="flex flex-col items-center gap-2 flex-1">
                  <div className="text-xs text-muted-foreground">€{(data.revenue / 1000).toFixed(1)}k</div>
                  <div 
                    className="w-full bg-success rounded-t-sm transition-all hover:bg-success/80"
                    style={{ height: `${(data.revenue / 25000) * 100}%`, minHeight: '20px' }}
                  ></div>
                  <div className="text-xs font-medium text-foreground">{data.month}</div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Zone Performance */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="w-5 h-5 text-primary" />
            Rendimiento por Zonas
          </CardTitle>
          <CardDescription className="text-left">
            Comparación del desempeño entre las diferentes zonas de operación
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {zoneStats.map((zone) => (
              <div key={zone.zone} className="flex items-center justify-between p-4 border border-border rounded-lg hover:bg-accent/50 transition-colors">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                    <MapPin className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground text-left">Zona {zone.zone}</h3>
                    <p className="text-sm text-muted-foreground">
                      {zone.collections} recogidas • {zone.volume}L
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center gap-6">
                  <div className="text-center">
                    <div className="text-lg font-semibold text-foreground">{zone.efficiency}%</div>
                    <div className="text-xs text-muted-foreground">Eficiencia</div>
                  </div>
                  
                  <Badge variant="outline" className="text-success">
                    {zone.growth}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Efficiency Trends */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-primary" />
              Tendencia de Eficiencia
            </CardTitle>
            <CardDescription className="text-left">
              Porcentaje de rutas completadas exitosamente
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-64 flex items-end justify-between gap-2 p-4">
              {monthlyData.map((data, index) => (
                <div key={index} className="flex flex-col items-center gap-2 flex-1">
                  <div className="text-xs text-muted-foreground">{data.efficiency}%</div>
                  <div 
                    className={`w-full rounded-t-sm transition-all ${
                      data.efficiency >= 95 ? 'bg-success' :
                      data.efficiency >= 90 ? 'bg-orange-500' :
                      'bg-destructive'
                    }`}
                    style={{ height: `${data.efficiency}%`, minHeight: '20px' }}
                  ></div>
                  <div className="text-xs font-medium text-foreground">{data.month}</div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Truck className="w-5 h-5 text-primary" />
              Recogidas por Mes
            </CardTitle>
            <CardDescription className="text-left">
              Número total de recogidas realizadas mensualmente
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-64 flex items-end justify-between gap-2 p-4">
              {monthlyData.map((data, index) => (
                <div key={index} className="flex flex-col items-center gap-2 flex-1">
                  <div className="text-xs text-muted-foreground">{data.collections}</div>
                  <div 
                    className="w-full bg-blue-500 rounded-t-sm transition-all hover:bg-blue-600"
                    style={{ height: `${(data.collections / 400) * 100}%`, minHeight: '20px' }}
                  ></div>
                  <div className="text-xs font-medium text-foreground">{data.month}</div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="bg-gradient-primary text-primary-foreground">
          <CardContent className="pt-6">
            <div className="text-center">
              <TrendingUp className="w-12 h-12 mx-auto mb-4 opacity-90" />
              <h3 className="text-xl font-semibold mb-2">Crecimiento Sostenido</h3>
              <p className="opacity-90 mb-4">
                Las operaciones han mostrado un crecimiento constante del 12% en los últimos 6 meses
              </p>
              <div className="text-3xl font-bold mb-1">+12%</div>
              <p className="text-sm opacity-80">Crecimiento promedio mensual</p>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-subtle border-success/20">
          <CardContent className="pt-6">
            <div className="text-center">
              <BarChart3 className="w-12 h-12 mx-auto mb-4 text-success" />
              <h3 className="text-xl font-semibold mb-2 text-foreground">Meta Alcanzada</h3>
              <p className="text-muted-foreground mb-4">
                Se ha superado la meta mensual de recogidas establecida para este período
              </p>
              <div className="text-3xl font-bold mb-1 text-success">105%</div>
              <p className="text-sm text-muted-foreground">De la meta mensual</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
