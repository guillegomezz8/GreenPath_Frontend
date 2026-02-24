import { useCallback, useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  Calendar,
  Users,
  UserCheck,
  Truck,
  MapPin,
  Droplets,
  Euro,
  Package,
} from "lucide-react";
import { useAuth } from "@/context/AuthProvider";
import { useSnackbar } from "@/context/SnackbarProvider";
import { handleApiError, normalizeCollectionStatus } from "@/components/Utils";

const MONTH_FORMATTER = new Intl.DateTimeFormat("es-ES", { month: "short" });

function toNumber(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function monthKey(dateStr) {
  if (!dateStr) return null;
  const d = new Date(`${dateStr}T00:00:00`);
  if (Number.isNaN(d.getTime())) return null;
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function buildLastMonths(count = 6) {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const months = [];
  for (let i = count - 1; i >= 0; i -= 1) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    months.push({ key, label: MONTH_FORMATTER.format(d).replace(".", "") });
  }
  return months;
}

export default function Stats() {
  const { api } = useAuth();
  const showSnackbar = useSnackbar();

  const [loading, setLoading] = useState(false);
  const [collections, setCollections] = useState([]);
  const [clientsTotal, setClientsTotal] = useState(0);
  const [workersActive, setWorkersActive] = useState(0);

  const fetchAllCollections = useCallback(async () => {
    let page = 1;
    const pageSize = 300;
    const maxPages = 30;
    const rows = [];
    let totalCount = 0;

    while (page <= maxPages) {
      const res = await api().get("collections", { params: { page, page_size: pageSize, ordering: "-collection_date" } });
      const payload = res.data || {};
      const items = Array.isArray(payload?.results) ? payload.results : [];
      rows.push(...items);
      totalCount = Number(payload?.count || rows.length);

      if (!payload?.next || items.length === 0 || rows.length >= totalCount) {
        break;
      }
      page += 1;
    }

    return rows;
  }, [api]);

  const fetchStatsData = useCallback(async () => {
    try {
      setLoading(true);
      const [collectionsRows, clientsRes, workersRes] = await Promise.all([
        fetchAllCollections(),
        api().get("clients", { params: { page: 1, page_size: 1 } }),
        api().get("workers", { params: { page: 1, page_size: 1 } }),
      ]);

      setCollections(collectionsRows);
      setClientsTotal(Number(clientsRes.data?.count || 0));
      setWorkersActive(Number(workersRes.data?.counts?.active || 0));
    } catch (e) {
      const msg = handleApiError(e, "Error cargando estadisticas.");
      showSnackbar(msg, "error");
    } finally {
      setLoading(false);
    }
  }, [api, fetchAllCollections, showSnackbar]);

  useEffect(() => {
    fetchStatsData();
  }, [fetchStatsData]);

  const { monthlyData, routeStats, kpiData } = useMemo(() => {
    const months = buildLastMonths(6);
    const monthMap = {};
    months.forEach((m) => {
      monthMap[m.key] = { month: m.label, collections: 0, volume: 0, revenue: 0, efficiency: 0, confirmed: 0 };
    });

    const routeMap = {};
    let confirmedTotal = 0;
    let canceledTotal = 0;
    let totalVolume = 0;
    let totalRevenue = 0;

    collections.forEach((item) => {
      const mKey = monthKey(item.collection_date);
      const volume = toNumber(item.net_liters);
      const revenue = toNumber(item.total_price);
      const normalizedStatus = normalizeCollectionStatus(item.status);
      const isConfirmed = normalizedStatus === "CONFIRMED";
      const isCanceled = normalizedStatus === "CANCELED";

      if (mKey && monthMap[mKey]) {
        monthMap[mKey].collections += 1;
        monthMap[mKey].volume += volume;
        monthMap[mKey].revenue += revenue;
        if (isConfirmed) monthMap[mKey].confirmed += 1;
      }

      const routeName = item.route_name || "Sin ruta";
      if (!routeMap[routeName]) {
        routeMap[routeName] = { route: routeName, collections: 0, volume: 0, confirmed: 0 };
      }
      routeMap[routeName].collections += 1;
      routeMap[routeName].volume += volume;
      if (isConfirmed) routeMap[routeName].confirmed += 1;

      if (isConfirmed) confirmedTotal += 1;
      if (isCanceled) canceledTotal += 1;
      totalVolume += volume;
      totalRevenue += revenue;
    });

    const monthly = months.map((m) => {
      const raw = monthMap[m.key] || { collections: 0, volume: 0, revenue: 0, confirmed: 0 };
      const efficiency = raw.collections > 0 ? Math.round((raw.confirmed / raw.collections) * 100) : 0;
      return { ...raw, efficiency };
    });

    const routes = Object.values(routeMap)
      .map((row) => {
        const efficiency = row.collections > 0 ? Math.round((row.confirmed / row.collections) * 100) : 0;
        return { ...row, efficiency };
      })
      .sort((a, b) => b.collections - a.collections)
      .slice(0, 4);

    const lastMonth = monthly[monthly.length - 1] || { collections: 0, volume: 0, revenue: 0, efficiency: 0 };
    const prevMonth = monthly[monthly.length - 2] || { collections: 0, volume: 0, revenue: 0, efficiency: 0 };
    const growthCollections = prevMonth.collections > 0 ? ((lastMonth.collections - prevMonth.collections) / prevMonth.collections) * 100 : 0;
    const growthRevenue = prevMonth.revenue > 0 ? ((lastMonth.revenue - prevMonth.revenue) / prevMonth.revenue) * 100 : 0;
    const kpi = [
      {
        title: "Total Recogidas",
        value: collections.length.toLocaleString("es-ES"),
        change: `${growthCollections >= 0 ? "+" : ""}${growthCollections.toFixed(1)}%`,
        trend: growthCollections >= 0 ? "up" : "down",
        icon: Truck,
        description: "Ultimos registros",
      },
      {
        title: "Volumen Total",
        value: `${Math.round(totalVolume).toLocaleString("es-ES")} L`,
        change: `${totalVolume > 0 ? "+" : ""}${lastMonth.volume.toFixed(0)}L`,
        trend: "up",
        icon: Droplets,
        description: "Litros netos",
      },
      {
        title: "Ingresos",
        value: `${totalRevenue.toFixed(2)} EUR`,
        change: `${growthRevenue >= 0 ? "+" : ""}${growthRevenue.toFixed(1)}%`,
        trend: growthRevenue >= 0 ? "up" : "down",
        icon: Euro,
        description: "Ultimos registros",
      },
      {
        title: "Eficiencia Media",
        value: `${collections.length > 0 ? Math.round((confirmedTotal / collections.length) * 100) : 0}%`,
        change: `${lastMonth.efficiency >= prevMonth.efficiency ? "+" : ""}${(lastMonth.efficiency - prevMonth.efficiency).toFixed(1)}%`,
        trend: lastMonth.efficiency >= prevMonth.efficiency ? "up" : "down",
        icon: BarChart3,
        description: "Confirmadas / Total",
      },
      {
        title: "Clientes Activos",
        value: clientsTotal.toLocaleString("es-ES"),
        change: null,
        trend: null,
        icon: Users,
        description: "Clientes registrados",
      },
      {
        title: "Trabajadores Activos",
        value: workersActive.toLocaleString("es-ES"),
        change: null,
        trend: null,
        icon: UserCheck,
        description: "Con perfil habilitado",
      },
    ];

    return {
      monthlyData: monthly,
      routeStats: routes,
      kpiData: kpi,
      confirmedTotal,
      canceledTotal,
    };
  }, [clientsTotal, collections, workersActive]);

  const getTrendColor = (trend) => (trend === "up" ? "text-success" : "text-destructive");
  const getTrendIcon = (trend) => (trend === "up" ? TrendingUp : TrendingDown);
  const maxVolume = Math.max(1, ...monthlyData.map((m) => m.volume));
  const maxRevenue = Math.max(1, ...monthlyData.map((m) => m.revenue));
  const maxCollections = Math.max(1, ...monthlyData.map((m) => m.collections));

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
            <BarChart3 className="w-8 h-8 text-primary" />
            Estadisticas y Reportes
          </h1>
          <p className="text-muted-foreground text-left">Analisis del rendimiento operativo real</p>
        </div>

        <div className="flex gap-2">
          <Button variant="outline" className="gap-2" disabled>
            <Calendar className="w-4 h-4" />
            Ultimos 6 meses
          </Button>
        </div>
      </div>

      {loading ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">Cargando estadisticas...</CardContent>
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
            {kpiData.map((kpi) => {
              const TrendIcon = kpi.trend ? getTrendIcon(kpi.trend) : null;
              return (
                <Card key={kpi.title} className="hover:shadow-elegant transition-shadow">
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between mb-2">
                      <kpi.icon className="w-5 h-5 text-primary" />
                      {kpi.change && TrendIcon ? (
                        <div className={`flex items-center gap-1 text-sm ${getTrendColor(kpi.trend)}`}>
                          <TrendIcon className="w-3 h-3" />
                          {kpi.change}
                        </div>
                      ) : null}
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

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Droplets className="w-5 h-5 text-primary" />
                  Volumen de Recogida Mensual
                </CardTitle>
                <CardDescription className="text-left">Evolucion de litros netos por mes</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-64 flex items-end justify-between gap-2 p-4">
                  {monthlyData.map((data) => (
                    <div key={data.month} className="flex flex-col items-center gap-2 flex-1">
                      <div className="text-xs text-muted-foreground">{Math.round(data.volume)}L</div>
                      <div className="w-full bg-primary rounded-t-sm transition-all hover:bg-primary-glow" style={{ height: `${(data.volume / maxVolume) * 100}%`, minHeight: "20px" }}></div>
                      <div className="text-xs font-medium text-foreground">{data.month}</div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Euro className="w-5 h-5 text-primary" />
                  Ingresos Mensuales
                </CardTitle>
                <CardDescription className="text-left">Evolucion de ingresos por mes</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-64 flex items-end justify-between gap-2 p-4">
                  {monthlyData.map((data) => (
                    <div key={data.month} className="flex flex-col items-center gap-2 flex-1">
                      <div className="text-xs text-muted-foreground">{data.revenue.toFixed(0)} EUR</div>
                      <div className="w-full bg-success rounded-t-sm transition-all hover:bg-success/80" style={{ height: `${(data.revenue / maxRevenue) * 100}%`, minHeight: "20px" }}></div>
                      <div className="text-xs font-medium text-foreground">{data.month}</div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="w-5 h-5 text-primary" />
                Rendimiento por Rutas
              </CardTitle>
              <CardDescription className="text-left">Comparacion de rendimiento entre rutas activas</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {routeStats.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No hay datos suficientes para calcular rendimiento por rutas.</p>
                ) : (
                  routeStats.map((route) => (
                    <div key={route.route} className="flex items-center justify-between p-4 border border-border rounded-lg hover:bg-accent/50 transition-colors">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                          <MapPin className="w-6 h-6 text-primary" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-foreground text-left">{route.route}</h3>
                          <p className="text-sm text-muted-foreground">
                            {route.collections} recogidas | {Math.round(route.volume)}L
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-6">
                        <div className="text-center">
                          <div className="text-lg font-semibold text-foreground">{route.efficiency}%</div>
                          <div className="text-xs text-muted-foreground">Eficiencia</div>
                        </div>
                        <Badge variant="outline" className="text-success">
                          <Package className="w-3 h-3 mr-1" />
                          Top
                        </Badge>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-primary" />
                  Tendencia de Eficiencia
                </CardTitle>
                <CardDescription className="text-left">Porcentaje de recogidas confirmadas por mes</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-64 flex items-end justify-between gap-2 p-4">
                  {monthlyData.map((data) => (
                    <div key={data.month} className="flex flex-col items-center gap-2 flex-1">
                      <div className="text-xs text-muted-foreground">{data.efficiency}%</div>
                      <div
                        className={`w-full rounded-t-sm transition-all ${
                          data.efficiency >= 95 ? "bg-success" : data.efficiency >= 80 ? "bg-orange-500" : "bg-destructive"
                        }`}
                        style={{ height: `${Math.max(5, data.efficiency)}%`, minHeight: "20px" }}
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
                <CardDescription className="text-left">Numero total de recogidas realizadas</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-64 flex items-end justify-between gap-2 p-4">
                  {monthlyData.map((data) => (
                    <div key={data.month} className="flex flex-col items-center gap-2 flex-1">
                      <div className="text-xs text-muted-foreground">{data.collections}</div>
                      <div className="w-full bg-blue-500 rounded-t-sm transition-all hover:bg-blue-600" style={{ height: `${(data.collections / maxCollections) * 100}%`, minHeight: "20px" }}></div>
                      <div className="text-xs font-medium text-foreground">{data.month}</div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
