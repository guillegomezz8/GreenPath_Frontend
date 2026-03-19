import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Route,
  MapPin,
  Clock,
  Users,
  Search,
  Calendar,
  RefreshCcw,
  WandSparkles,
  Eye,
  Edit,
  Trash2,
  Plus,
  ChevronDown,
} from "lucide-react";
import { useAuth } from "@/context/AuthProvider";
import { useSnackbar } from "@/context/SnackbarProvider";
import { handleApiError } from "@/components/Utils";
import ConfirmDeleteDialog from "@/components/common/ConfirmDeleteDialog";
import RouteActionButton from "@/components/routes/RouteActionButton";
import GenerateWeekDialog from "@/components/routes/GenerateWeekDialog";

const WEEKDAY_LABELS = ["Lunes", "Martes", "Miercoles", "Jueves", "Viernes", "Sabado", "Domingo"];

function formatDate(dateStr) {
  if (!dateStr) return "-";
  const d = new Date(`${dateStr}T00:00:00`);
  if (Number.isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString("es-ES");
}

export default function RoutesList() {
  const navigate = useNavigate();
  const { api, user } = useAuth();
  const showSnackbar = useSnackbar();
  const roleType = user?.role_type || "";
  const isOwner = roleType === "owner";
  const canManageRoutes = isOwner;

  const [routesData, setRoutesData] = useState([]);
  const [workersMap, setWorkersMap] = useState({});
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [routeFilter, setRouteFilter] = useState("ALL");
  const [generatedByRoute, setGeneratedByRoute] = useState({});

  const [generateModalOpen, setGenerateModalOpen] = useState(false);
  const [selectedRoute, setSelectedRoute] = useState(null);
  const [weekStartDate, setWeekStartDate] = useState("");
  const [dailyCapacityLiters, setDailyCapacityLiters] = useState("0");
  const [regenerate, setRegenerate] = useState(false);
  const [autoEstimateWithoutContact, setAutoEstimateWithoutContact] = useState(false);
  const [checkingWeekGenerationContext, setCheckingWeekGenerationContext] = useState(false);
  const [hasExistingWeekStops, setHasExistingWeekStops] = useState(false);
  const [submittingGenerate, setSubmittingGenerate] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [toDelete, setToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [isStatsOpen, setIsStatsOpen] = useState(false);
  const routeFilterButtonClass = "h-9 rounded-full px-4";

  const fetchWorkers = useCallback(async () => {
    try {
      const res = await api().get("workers", { params: { page: 1, page_size: 300 } });
      const items = Array.isArray(res.data?.results) ? res.data.results : [];
      const map = {};
      items.forEach((w) => {
        map[w.id] = `${w.name || ""} ${w.surname || ""}`.trim() || w.username || `Trabajador ${w.id}`;
      });
      setWorkersMap(map);
    } catch {
      setWorkersMap({});
    }
  }, [api]);

  const fetchRoutes = useCallback(async () => {
    try {
      setLoading(true);
      const params = { page: 1, page_size: 200 };
      if (searchTerm) params.search = searchTerm;

      const res = await api().get("routes", { params });
      const payload = res.data;
      setRoutesData(Array.isArray(payload?.results) ? payload.results : Array.isArray(payload) ? payload : []);
    } catch (e) {
      const msg = handleApiError(e, "Error cargando rutas.");
      showSnackbar(msg, "error");
    } finally {
      setLoading(false);
    }
  }, [api, searchTerm, showSnackbar]);

  useEffect(() => {
    fetchWorkers();
  }, [fetchWorkers]);

  useEffect(() => {
    fetchRoutes();
  }, [fetchRoutes]);

  const filteredRoutes = useMemo(() => {
    if (routeFilter === "WITH_WORKERS") {
      return routesData.filter((route) => Boolean(route.worker));
    }
    if (routeFilter === "WITHOUT_WORKERS") {
      return routesData.filter((route) => !route.worker);
    }
    return routesData;
  }, [routeFilter, routesData]);

  const stats = useMemo(() => {
    const total = routesData.length;
    const withWorkers = routesData.filter((r) => Boolean(r.worker)).length;
    const withoutWorkers = routesData.filter((r) => !r.worker).length;
    const noEndDate = routesData.filter((r) => !r.end_date).length;
    return { total, withWorkers, withoutWorkers, noEndDate };
  }, [routesData]);

  const askGenerateWeek = (route) => {
    setSelectedRoute(route);
    setWeekStartDate("");
    setDailyCapacityLiters("0");
    setRegenerate(false);
    setAutoEstimateWithoutContact(false);
    setCheckingWeekGenerationContext(false);
    setHasExistingWeekStops(false);
    setGenerateModalOpen(true);
  };

  const handleGenerateWeek = async () => {
    if (!selectedRoute?.id) return;
    const normalizedWeekStartDate = typeof weekStartDate === "string" ? weekStartDate : "";
    if (!normalizedWeekStartDate) {
      showSnackbar("Debes indicar la fecha de inicio de semana.", "error");
      return;
    }

    try {
      setSubmittingGenerate(true);
      const payload = {
        week_start_date: normalizedWeekStartDate,
        daily_capacity_liters: dailyCapacityLiters,
        regenerate: hasExistingWeekStops ? regenerate : false,
        auto_estimate_without_contact: autoEstimateWithoutContact,
      };
      const res = await api().post(`routes/${encodeURIComponent(selectedRoute.id)}/generate-week/`, payload);
      const routeDays = Array.isArray(res.data?.route_days) ? res.data.route_days : [];

      setGeneratedByRoute((prev) => ({
        ...prev,
        [selectedRoute.id]: routeDays,
      }));
      showSnackbar("Semana operativa generada correctamente.", "success");
      setGenerateModalOpen(false);
    } catch (e) {
      const msg = handleApiError(e, "No se pudo generar la semana operativa.");
      showSnackbar(msg, "error");
    } finally {
      setSubmittingGenerate(false);
    }
  };

  useEffect(() => {
    if (!generateModalOpen || !selectedRoute?.id || typeof weekStartDate !== "string" || !weekStartDate) {
      setCheckingWeekGenerationContext(false);
      setHasExistingWeekStops(false);
      return;
    }

    let cancelled = false;
    const fetchWeekContext = async () => {
      try {
        setCheckingWeekGenerationContext(true);
        const res = await api().get(`routes/${encodeURIComponent(selectedRoute.id)}/operational-overview/`, {
          params: { week_start_date: weekStartDate },
        });
        if (cancelled) return;
        const routeDays = Array.isArray(res.data?.route_days) ? res.data.route_days : [];
        const hasStops = routeDays.some((routeDay) => {
          if (Array.isArray(routeDay?.clients)) return routeDay.clients.length > 0;
          if (typeof routeDay?.stops === "number") return routeDay.stops > 0;
          return false;
        });
        setHasExistingWeekStops(hasStops);
        if (!hasStops) setRegenerate(false);
      } catch {
        if (cancelled) return;
        setHasExistingWeekStops(false);
        setRegenerate(false);
      } finally {
        if (!cancelled) setCheckingWeekGenerationContext(false);
      }
    };

    fetchWeekContext();
    return () => {
      cancelled = true;
    };
  }, [generateModalOpen, selectedRoute?.id, weekStartDate, api]);

  const askDelete = (route) => {
    setToDelete(route);
    setDeleteOpen(true);
  };

  const handleDelete = async () => {
    if (!toDelete?.id) return;
    try {
      setDeleting(true);
      await api().delete(`routes/${encodeURIComponent(toDelete.id)}/`);
      showSnackbar("Ruta eliminada correctamente.", "success");
      setDeleteOpen(false);
      setToDelete(null);
      await fetchRoutes();
    } catch (e) {
      const msg = handleApiError(e, "No se pudo eliminar la ruta.");
      showSnackbar(msg, "error");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
            <Route className="w-8 h-8 text-primary" />
            {isOwner ? "Gestion de Rutas" : "Rutas Asignadas"}
          </h1>
          <p className="text-muted-foreground">
            {isOwner ? "Planifica y supervisa las rutas operativas" : "Consulta y ejecuta las rutas que tienes asignadas"}
          </p>
        </div>
        {canManageRoutes && (
          <RouteActionButton tone="primary" icon={Plus} onClick={() => navigate("/routes/new")}>
            Nueva Ruta
          </RouteActionButton>
        )}
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4 md:items-end">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nombre de ruta o trabajador..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
              <Button
                size="sm"
                variant={routeFilter === "ALL" ? "default" : "outline"}
                className={routeFilterButtonClass}
                onClick={() => setRouteFilter("ALL")}
              >
                Todas
              </Button>
              <Button
                size="sm"
                variant={routeFilter === "WITH_WORKERS" ? "default" : "outline"}
                className={routeFilterButtonClass}
                onClick={() => setRouteFilter("WITH_WORKERS")}
              >
                Con trabajador
              </Button>
              <Button
                size="sm"
                variant={routeFilter === "WITHOUT_WORKERS" ? "default" : "outline"}
                className={routeFilterButtonClass}
                onClick={() => setRouteFilter("WITHOUT_WORKERS")}
              >
                Sin trabajador
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

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
                <div className="flex items-center justify-between border-b pb-2">
                  <span className="text-sm text-muted-foreground">Total rutas</span>
                  <span className="text-lg font-bold text-primary">{stats.total}</span>
                </div>
                <div className="flex items-center justify-between border-b pb-2">
                  <span className="text-sm text-muted-foreground">Con trabajador</span>
                  <span className="text-lg font-bold text-blue-500">{stats.withWorkers}</span>
                </div>
                <div className="flex items-center justify-between border-b pb-2">
                  <span className="text-sm text-muted-foreground">Sin trabajador</span>
                  <span className="text-lg font-bold text-orange-500">{stats.withoutWorkers}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Sin fecha fin</span>
                  <span className="text-lg font-bold text-success">{stats.noEndDate}</span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="hidden gap-4 md:grid md:grid-cols-4">
        <Card>
          <CardContent className="pt-6 text-center">
            <div className="text-2xl font-bold text-primary">{stats.total}</div>
            <p className="text-sm text-muted-foreground">Total Rutas</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 text-center">
            <div className="text-2xl font-bold text-blue-500">{stats.withWorkers}</div>
            <p className="text-sm text-muted-foreground">Con trabajador</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 text-center">
            <div className="text-2xl font-bold text-orange-500">{stats.withoutWorkers}</div>
            <p className="text-sm text-muted-foreground">Sin trabajador</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 text-center">
            <div className="text-2xl font-bold text-success">{stats.noEndDate}</div>
            <p className="text-sm text-muted-foreground">Sin fecha fin</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {loading ? (
          <Card className="lg:col-span-2">
            <CardContent className="py-12 text-center text-muted-foreground">Cargando rutas...</CardContent>
          </Card>
        ) : filteredRoutes.length === 0 ? (
          <Card className="lg:col-span-2">
            <CardContent className="py-12 text-center text-muted-foreground">
              No hay rutas para la combinacion de busqueda y filtro seleccionada.
            </CardContent>
          </Card>
        ) : (
          filteredRoutes.map((route) => {
            const assignedWorkerId = route.worker || null;
            const assignedWorkerLabel = assignedWorkerId ? (workersMap[assignedWorkerId] || `Trabajador ${assignedWorkerId}`) : null;
            const generatedDays = generatedByRoute[route.id] || [];

            return (
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
                        Empresa #{route.company}
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-muted-foreground" />
                        <span className="text-muted-foreground">Inicio:</span>
                        <span className="font-medium">{formatDate(route.start_date)}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-muted-foreground" />
                        <span className="text-muted-foreground">Fin:</span>
                        <span className="font-medium">{route.end_date ? formatDate(route.end_date) : "Sin fin"}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-muted-foreground" />
                        <span className="text-muted-foreground">Semana:</span>
                        <span className="font-medium">
                          {WEEKDAY_LABELS[route.week_start] || "-"} - {WEEKDAY_LABELS[route.week_end] || "-"}
                        </span>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Users className="w-4 h-4 text-muted-foreground" />
                        <span className="text-muted-foreground">Trabajador:</span>
                        <span className="font-medium">{assignedWorkerId ? 1 : 0}</span>
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {!assignedWorkerLabel ? (
                          <Badge variant="outline">Sin asignar</Badge>
                        ) : (
                          <Badge variant="outline">{assignedWorkerLabel}</Badge>
                        )}
                      </div>
                    </div>
                  </div>

                  {generatedDays.length > 0 && (
                    <div className="pt-2 border-t border-border">
                      <p className="text-sm font-medium mb-2 text-left">Ultima generacion semanal:</p>
                      <div className="space-y-1">
                        {generatedDays.slice(0, 7).map((day) => (
                          <div key={day.id} className="flex items-center justify-between text-xs text-muted-foreground">
                            <span>{formatDate(day.date)}</span>
                            <span>{day.stops} paradas</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-1 gap-2 pt-2 sm:grid-cols-2">
                    <RouteActionButton size="sm" tone="secondary" icon={Eye} className="w-full justify-start sm:justify-center" onClick={() => navigate(`/routes/${route.id}`)}>
                      Ver detalle
                    </RouteActionButton>
                    <RouteActionButton size="sm" tone="primary" icon={Route} className="w-full justify-start sm:justify-center" onClick={() => navigate(`/routes/${route.id}/execute`)}>
                      Realizar ruta
                    </RouteActionButton>
                  </div>

                  {canManageRoutes && (
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]">
                      <RouteActionButton size="sm" tone="secondary" icon={Edit} className="w-full justify-start sm:justify-center" onClick={() => navigate(`/routes/${route.id}/edit`)}>
                        Editar
                      </RouteActionButton>
                      <RouteActionButton size="sm" tone="accent" icon={WandSparkles} className="w-full justify-start sm:justify-center" onClick={() => askGenerateWeek(route)}>
                        Generar semana
                      </RouteActionButton>
                      <RouteActionButton size="sm" tone="danger" className="sm:w-10 sm:px-0" onClick={() => askDelete(route)}>
                        <Trash2 className="w-4 h-4" />
                        <span className="sm:hidden">Eliminar</span>
                      </RouteActionButton>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })
        )}
      </div>

      {canManageRoutes && (
        <GenerateWeekDialog
          open={generateModalOpen}
          onOpenChange={setGenerateModalOpen}
          weekStartDate={weekStartDate}
          onWeekStartDateChange={setWeekStartDate}
          dailyCapacityLiters={dailyCapacityLiters}
          onDailyCapacityLitersChange={setDailyCapacityLiters}
          regenerate={regenerate}
          onRegenerateChange={setRegenerate}
          autoEstimateWithoutContact={autoEstimateWithoutContact}
          onAutoEstimateWithoutContactChange={setAutoEstimateWithoutContact}
          checkingWeekGenerationContext={checkingWeekGenerationContext}
          hasExistingWeekStops={hasExistingWeekStops}
          submittingGenerate={submittingGenerate}
          onSubmit={handleGenerateWeek}
        />
      )}

      {canManageRoutes && (
        <ConfirmDeleteDialog
          open={deleteOpen}
          onOpenChange={setDeleteOpen}
          title="Eliminar ruta"
          description={toDelete ? `Se va a eliminar la ruta "${toDelete.name}". Esta accion no se puede deshacer.` : "Esta accion no se puede deshacer."}
          confirmLabel="Eliminar"
          onConfirm={handleDelete}
          loading={deleting}
        />
      )}
    </div>
  );
}
