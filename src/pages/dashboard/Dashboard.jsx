import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { StatCard } from "@/components/common/StatCard";
import { ActionButton } from "@/components/common/ActionButton";
import RouteActionButton from "@/components/routes/RouteActionButton";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/context/AuthProvider";
import { useSnackbar } from "@/context/SnackbarProvider";
import {
  handleApiError,
  getCollectionStatusClass,
  getCollectionStatusLabel,
} from "@/components/Utils";
import {
  Users,
  UserCheck,
  Truck,
  Package,
  MapPin,
  Calendar,
  CheckCircle,
  LayoutDashboard,
  Route,
  BarChart3,
  CalendarClock,
  ClipboardCheck,
  UserCircle2,
  Clock3,
  Navigation2,
  ChevronDown,
} from "lucide-react";

const WEEKDAY_LABELS = ["Lunes", "Martes", "Miercoles", "Jueves", "Viernes", "Sabado", "Domingo"];

function formatDate(dateStr) {
  if (!dateStr) return "-";
  const d = new Date(`${dateStr}T00:00:00`);
  if (Number.isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString("es-ES");
}

function isRouteOperationalToday(route) {
  if (!route) return false;
  const today = new Date();
  const todayDate = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const todayWeekday = (todayDate.getDay() + 6) % 7;

  if (route.start_date) {
    const startDate = new Date(`${route.start_date}T00:00:00`);
    if (!Number.isNaN(startDate.getTime()) && startDate > todayDate) return false;
  }

  if (route.end_date) {
    const endDate = new Date(`${route.end_date}T00:00:00`);
    if (!Number.isNaN(endDate.getTime()) && endDate < todayDate) return false;
  }

  const weekStart = Number(route.week_start);
  const weekEnd = Number(route.week_end);
  if (!Number.isInteger(weekStart) || !Number.isInteger(weekEnd)) return false;

  if (weekStart <= weekEnd) {
    return todayWeekday >= weekStart && todayWeekday <= weekEnd;
  }
  return todayWeekday >= weekStart || todayWeekday <= weekEnd;
}

export default function Dashboard() {
  const { api, user } = useAuth();
  const showSnackbar = useSnackbar();
  const navigate = useNavigate();
  const isClient = user?.role_type === "client";
  const canOperateRoutes = user?.role_type === "owner" || user?.role_type === "worker";

  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState({
    clients: 0,
    activeWorkers: 0,
    operationalTrucks: 0,
    pendingCollections: 0,
    totalRoutes: 0,
    myRequestsPending: 0,
    myCollections: 0,
    myConfirmedCollections: 0,
  });
  const [recentCollections, setRecentCollections] = useState([]);
  const [routeShortcuts, setRouteShortcuts] = useState([]);
  const [isStatsOpen, setIsStatsOpen] = useState(false);

  const fetchDashboard = useCallback(async () => {
    try {
      setLoading(true);
      if (isClient) {
        const [collectionsRes, collectionsPendingRes, collectionsConfirmedRes, requestsRes] = await Promise.all([
          api().get("collections", { params: { page: 1, page_size: 8, ordering: "-collection_date" } }),
          api().get("collections", { params: { page: 1, page_size: 1, status: "PENDING_MEASUREMENT" } }),
          api().get("collections", { params: { page: 1, page_size: 1, status: "CONFIRMED" } }),
          api().get("collections/requests/me/", { params: { page: 1, page_size: 1 } }),
        ]);

        const collectionsPayload = collectionsRes.data || {};
        setStats({
          clients: 0,
          activeWorkers: 0,
          operationalTrucks: 0,
          pendingCollections: Number(collectionsPendingRes.data?.count || 0),
          totalRoutes: 0,
          myRequestsPending: Number(requestsRes.data?.count || 0),
          myCollections: Number(collectionsPayload.count || 0),
          myConfirmedCollections: Number(collectionsConfirmedRes.data?.count || 0),
        });
        setRecentCollections(Array.isArray(collectionsPayload.results) ? collectionsPayload.results : []);
        setRouteShortcuts([]);
        return;
      }

      const [
        clientsRes,
        workersRes,
        trucksRes,
        routesRes,
        collectionsRes,
        collectionsPendingRes,
      ] = await Promise.all([
        api().get("clients", { params: { page: 1, page_size: 1 } }),
        api().get("workers", { params: { page: 1, page_size: 1 } }),
        api().get("trucks", { params: { page: 1, page_size: 1 } }),
        api().get("routes", { params: { page: 1, page_size: 4 } }),
        api().get("collections", { params: { page: 1, page_size: 8, ordering: "-collection_date" } }),
        api().get("collections", { params: { page: 1, page_size: 1, status: "PENDING_MEASUREMENT" } }),
      ]);

      const clientsPayload = clientsRes.data || {};
      const workersPayload = workersRes.data || {};
      const trucksPayload = trucksRes.data || {};
      const routesPayload = routesRes.data || {};
      const collectionsPayload = collectionsRes.data || {};
      const trucksCounts = trucksPayload?.counts || {};

      const operationalTrucks = Number(trucksCounts?.active || 0) + Number(trucksCounts?.in_service || 0);

      setStats({
        clients: Number(clientsPayload.count || 0),
        activeWorkers: Number(workersPayload?.counts?.active || 0),
        operationalTrucks,
        pendingCollections: Number(collectionsPendingRes.data?.count || 0),
        totalRoutes: Number(routesPayload.count || 0),
        myRequestsPending: 0,
        myCollections: 0,
        myConfirmedCollections: 0,
      });
      setRecentCollections(Array.isArray(collectionsPayload.results) ? collectionsPayload.results : []);
      const routeItems = Array.isArray(routesPayload.results) ? routesPayload.results : [];
      const sortedRouteItems = [...routeItems].sort((a, b) => {
        const aToday = isRouteOperationalToday(a) ? 1 : 0;
        const bToday = isRouteOperationalToday(b) ? 1 : 0;
        if (aToday !== bToday) return bToday - aToday;
        return String(a?.name || "").localeCompare(String(b?.name || ""), "es");
      });
      setRouteShortcuts(sortedRouteItems);
    } catch (e) {
      const msg = handleApiError(e, "Error cargando el dashboard.");
      showSnackbar(msg, "error");
    } finally {
      setLoading(false);
    }
  }, [api, isClient, showSnackbar]);

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  const statsData = useMemo(
    () =>
      isClient
        ? [
            {
              title: "Mis Recogidas",
              value: stats.myCollections.toLocaleString("es-ES"),
              icon: Package,
              color: "text-blue-600",
            },
            {
              title: "Solicitudes Abiertas",
              value: stats.myRequestsPending.toLocaleString("es-ES"),
              icon: CalendarClock,
              color: "text-orange-600",
            },
            {
              title: "Confirmadas",
              value: stats.myConfirmedCollections.toLocaleString("es-ES"),
              icon: ClipboardCheck,
              color: "text-green-600",
            },
            {
              title: "Pendientes de medicion",
              value: stats.pendingCollections.toLocaleString("es-ES"),
              icon: Clock3,
              color: "text-amber-600",
            },
          ]
        : [
            {
              title: "Total Clientes",
              value: stats.clients.toLocaleString("es-ES"),
              icon: Users,
              color: "text-blue-600",
            },
            {
              title: "Trabajadores Activos",
              value: stats.activeWorkers.toLocaleString("es-ES"),
              icon: UserCheck,
              color: "text-green-600",
            },
            {
              title: "Camiones Operativos",
              value: stats.operationalTrucks.toLocaleString("es-ES"),
              icon: Truck,
              color: "text-orange-600",
            },
            {
              title: "Total Rutas",
              value: stats.totalRoutes.toLocaleString("es-ES"),
              icon: Route,
              color: "text-sky-600",
            },
            {
              title: "Recogidas Pendientes",
              value: stats.pendingCollections.toLocaleString("es-ES"),
              icon: Package,
              color: "text-amber-600",
            },
          ],
    [isClient, stats]
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="text-left">
          <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
            <LayoutDashboard className="w-8 h-8 text-primary" />
            Dashboard
          </h1>
          <p className="text-muted-foreground">
            {isClient ? "Resumen de tus solicitudes y recogidas" : "Resumen general de operaciones GreenPath"}
          </p>
        </div>

        <div className="flex gap-2">
          <ActionButton variant="outline" icon={Calendar} disabled>
            Hoy
          </ActionButton>
          {isClient ? (
            <ActionButton icon={CalendarClock} onClick={() => navigate("/my-requests")}>
              Ver Solicitudes
            </ActionButton>
          ) : (
            <>
              <ActionButton icon={BarChart3} onClick={() => navigate("/stats")}>
                Ver Estadisticas
              </ActionButton>
            </>
          )}
        </div>
      </div>

      <div className="md:hidden">
        <Card>
          <CardContent className="p-0">
            <button
              type="button"
              onClick={() => setIsStatsOpen((prev) => !prev)}
              className="flex w-full items-center justify-between p-4 text-left transition-colors hover:bg-muted/40"
            >
              <span className="text-sm font-medium text-foreground">Ver contadores</span>
              <ChevronDown className={`h-5 w-5 text-muted-foreground transition-transform ${isStatsOpen ? "rotate-180" : ""}`} />
            </button>

            {isStatsOpen && (
              <div className="space-y-3 border-t px-4 py-3">
                {statsData.map((stat) => (
                  <div key={stat.title} className="flex items-center justify-between border-b pb-2 last:border-b-0 last:pb-0">
                    <span className="text-sm text-muted-foreground">{stat.title}</span>
                    <span className={`text-lg font-bold ${stat.color || "text-primary"}`}>{stat.value}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className={`hidden gap-6 md:grid md:grid-cols-2 ${isClient ? "lg:grid-cols-4" : "lg:grid-cols-5"}`}>
        {statsData.map((stat) => (
          <StatCard key={stat.title} title={stat.title} value={stat.value} icon={stat.icon} color={stat.color} />
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-left">
              <CheckCircle className="w-5 h-5 text-primary" />
              Actividad Reciente
            </CardTitle>
            <CardDescription className="text-left">Ultimas recogidas registradas en el sistema</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-sm text-muted-foreground text-left">Cargando actividad...</p>
            ) : recentCollections.length === 0 ? (
              <p className="text-sm text-muted-foreground text-left">No hay actividad reciente.</p>
            ) : (
              <div className="space-y-4">
                {recentCollections.map((collection) => (
                  <div
                    key={collection.id}
                    className="flex flex-col gap-3 rounded-lg border border-border p-3 transition-colors hover:bg-accent/50 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="min-w-0">
                      <p className="font-medium text-foreground">{collection.client_name || "Cliente"}</p>
                      <p className="text-sm text-muted-foreground truncate">
                        {collection.route_name || "Sin ruta"} | {getCollectionStatusLabel(collection.status)}
                      </p>
                    </div>

                    <div className="flex items-center justify-between gap-3 sm:ml-3 sm:min-w-[118px] sm:flex-col sm:items-end sm:justify-center">
                      <Badge className={`${getCollectionStatusClass(collection.status)} shrink-0 whitespace-nowrap px-2.5 py-1 text-[11px] leading-none sm:text-xs`}>
                        {getCollectionStatusLabel(collection.status)}
                      </Badge>
                      <span className="shrink-0 text-xs text-muted-foreground">{formatDate(collection.collection_date)}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-left">
                <MapPin className="w-5 h-5 text-primary" />
                Acciones Rapidas
              </CardTitle>
              <CardDescription className="text-left">
                {isClient ? "Accesos directos para gestionar tus solicitudes" : "Accesos directos y resumen operativo"}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="p-3 rounded-lg border border-border text-left">
                <p className="text-sm font-medium">Resumen operativo</p>
                <div className="mt-2 grid grid-cols-2 gap-y-1 text-sm text-muted-foreground">
                  {isClient ? (
                    <>
                      <span>Solicitudes abiertas:</span>
                      <span className="text-right font-medium text-foreground">{stats.myRequestsPending}</span>
                      <span>Mis recogidas:</span>
                      <span className="text-right font-medium text-foreground">{stats.myCollections}</span>
                      <span>Pend. medicion:</span>
                      <span className="text-right font-medium text-foreground">{stats.pendingCollections}</span>
                      <span>Confirmadas:</span>
                      <span className="text-right font-medium text-foreground">{stats.myConfirmedCollections}</span>
                    </>
                  ) : (
                    <>
                      <span>Rutas totales:</span>
                      <span className="text-right font-medium text-foreground">{stats.totalRoutes}</span>
                      <span>Camiones operativos:</span>
                      <span className="text-right font-medium text-foreground">{stats.operationalTrucks}</span>
                      <span>Recogidas pendientes:</span>
                      <span className="text-right font-medium text-foreground">{stats.pendingCollections}</span>
                      <span>Trabajadores activos:</span>
                      <span className="text-right font-medium text-foreground">{stats.activeWorkers}</span>
                    </>
                  )}
                </div>
              </div>
              {isClient ? (
                <>
                  <ActionButton variant="outline" icon={CalendarClock} className="w-full justify-start" onClick={() => navigate("/my-requests")}>
                    Mis Solicitudes
                  </ActionButton>
                  <ActionButton variant="outline" icon={Package} className="w-full justify-start" onClick={() => navigate("/collections")}>
                    Historial de Recogidas
                  </ActionButton>
                  <ActionButton variant="success" icon={UserCircle2} className="w-full justify-start" onClick={() => navigate("/profile")}>
                    Mi Perfil
                  </ActionButton>
                </>
              ) : (
                <>
                  <ActionButton variant="outline" icon={Users} className="w-full justify-start" onClick={() => navigate("/clients/new")}>
                    Nuevo Cliente
                  </ActionButton>
                  <ActionButton variant="outline" icon={Package} className="w-full justify-start" onClick={() => navigate("/collections/new")}>
                    Registrar Recogida
                  </ActionButton>
                  <ActionButton variant="outline" icon={Route} className="w-full justify-start" onClick={() => navigate("/routes")}>
                    Gestionar Rutas
                  </ActionButton>
                  <ActionButton variant="success" icon={BarChart3} className="w-full justify-start" onClick={() => navigate("/stats")}>
                    Ver Estadisticas
                  </ActionButton>
                </>
              )}
            </CardContent>
          </Card>

          {!isClient && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-left">
                  <Route className="w-5 h-5 text-primary" />
                  Rutas Operativas
                </CardTitle>
                <CardDescription className="text-left">
                  Acceso rapido para entrar en la operativa diaria de las rutas disponibles.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {routeShortcuts.length === 0 ? (
                  <div className="rounded-lg border border-dashed border-border bg-muted/20 p-4 text-left text-sm text-muted-foreground">
                    No hay rutas disponibles para mostrar en este momento.
                  </div>
                ) : (
                  routeShortcuts.map((route) => {
                    const routeToday = isRouteOperationalToday(route);
                    return (
                      <div key={route.id} className="rounded-xl border border-border/80 bg-background/80 p-3 text-left">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <p className="font-semibold text-foreground">{route.name}</p>
                          {routeToday ? <Badge className="bg-emerald-600 text-white">Hoy</Badge> : <Badge variant="outline">Programada</Badge>}
                        </div>
                        <div className="mt-2 space-y-1 text-xs text-muted-foreground">
                          <p>
                            Semana: {WEEKDAY_LABELS[route.week_start] || "-"} - {WEEKDAY_LABELS[route.week_end] || "-"}
                          </p>
                          <p>Inicio: {formatDate(route.start_date)}{route.end_date ? ` | Fin: ${formatDate(route.end_date)}` : ""}</p>
                        </div>
                        <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                          <RouteActionButton
                            tone="primary"
                            icon={Navigation2}
                            className="w-full justify-center sm:flex-1"
                            onClick={() => navigate(`/routes/${route.id}/execute`)}
                          >
                            Realizar ruta
                          </RouteActionButton>
                          <RouteActionButton
                            tone="secondary"
                            icon={Route}
                            className="w-full justify-center sm:flex-1"
                            onClick={() => navigate(`/routes/${route.id}`)}
                          >
                            Ver detalle
                          </RouteActionButton>
                        </div>
                      </div>
                    );
                  })
                )}

                {canOperateRoutes && (
                  <ActionButton variant="outline" icon={Route} className="w-full justify-start" onClick={() => navigate("/routes")}>
                    Ver todas las rutas
                  </ActionButton>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
