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
  Search,
  Calendar,
  CalendarRange,
  Gauge,
  UserRound,
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
import { getRouteOptimizationFeedback } from "@/utils/routeOptimization";

const WEEKDAY_LABELS = ["Lunes", "Martes", "Miercoles", "Jueves", "Viernes", "Sabado", "Domingo"];

function formatDate(dateStr) {
  if (!dateStr) return "-";
  const d = new Date(`${dateStr}T00:00:00`);
  if (Number.isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString("es-ES");
}

function formatCapacityLiters(value) {
  if (value === null || value === undefined || value === "") return "Sin definir";
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return "Sin definir";
  return `${parsed.toLocaleString("es-ES", { maximumFractionDigits: 2 })} L`;
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
    setDailyCapacityLiters(
      route?.default_daily_capacity_liters !== null &&
      route?.default_daily_capacity_liters !== undefined &&
      route?.default_daily_capacity_liters !== ""
        ? String(route.default_daily_capacity_liters)
        : "0"
    );
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
      const response = await api().post(`routes/${encodeURIComponent(selectedRoute.id)}/generate-week/`, payload);
      const optimizationFeedback = getRouteOptimizationFeedback(response.data?.route_days);
      showSnackbar(
        optimizationFeedback || "Semana operativa generada y optimizada correctamente.",
        optimizationFeedback ? "warning" : "success",
        optimizationFeedback ? 9000 : 6000,
      );
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
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-3">
              <Button
                size="sm"
                variant={routeFilter === "ALL" ? "default" : "outline"}
                className="h-8 w-full justify-center px-3 text-xs sm:text-sm md:w-auto"
                onClick={() => setRouteFilter("ALL")}
              >
                Todas
              </Button>
              <Button
                size="sm"
                variant={routeFilter === "WITH_WORKERS" ? "default" : "outline"}
                className="h-8 w-full justify-center px-3 text-xs sm:text-sm md:w-auto"
                onClick={() => setRouteFilter("WITH_WORKERS")}
              >
                Con trabajador
              </Button>
              <Button
                size="sm"
                variant={routeFilter === "WITHOUT_WORKERS" ? "default" : "outline"}
                className="h-8 w-full justify-center px-3 text-xs sm:text-sm md:w-auto"
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

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
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

            return (
              <Card key={route.id} className="flex h-full flex-col overflow-hidden transition-shadow hover:shadow-elegant">
                <CardHeader className="border-b border-primary/15 bg-primary/5 px-4 py-4 sm:px-5">
                  <div className="flex min-w-0 items-start justify-between gap-3">
                    <div className="min-w-0 text-left">
                      <CardTitle className="flex items-center gap-2 text-lg">
                        <Route className="h-5 w-5 shrink-0 text-primary" />
                        <span className="truncate">{route.name}</span>
                      </CardTitle>
                      <CardDescription className="mt-1 flex items-center gap-2">
                        <MapPin className="h-4 w-4 shrink-0" />
                        <span className="truncate">{route.company_name || `Empresa #${route.company}`}</span>
                      </CardDescription>
                    </div>
                    {canManageRoutes && (
                      <RouteActionButton
                        size="sm"
                        tone="danger"
                        className="h-9 w-9 shrink-0 p-0"
                        onClick={() => askDelete(route)}
                        title={`Eliminar ${route.name}`}
                      >
                        <Trash2 className="h-4 w-4" />
                        <span className="sr-only">Eliminar ruta</span>
                      </RouteActionButton>
                    )}
                  </div>
                </CardHeader>

                <CardContent className="flex flex-1 flex-col p-0 text-sm">
                  <div className="flex items-start justify-between gap-6 px-4 pt-4 sm:px-5 sm:pt-5">
                    <div className="min-w-0 text-left">
                      <div className="mb-2 flex items-center gap-2 text-xs text-muted-foreground">
                        <Calendar className="h-4 w-4 text-primary" aria-hidden="true" />
                        Inicio
                      </div>
                      <p className="text-base font-semibold text-foreground">{formatDate(route.start_date)}</p>
                    </div>
                    <div className="min-w-0 text-right">
                      <div className="mb-2 flex items-center justify-end gap-2 text-xs text-muted-foreground">
                        Fin
                        <Calendar className="h-4 w-4 text-primary" aria-hidden="true" />
                      </div>
                      <p className="text-base font-semibold text-foreground">
                        {route.end_date ? formatDate(route.end_date) : "Sin fin"}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-col gap-4 px-4 py-5 sm:flex-row sm:gap-10 sm:px-5">
                    <div className="flex min-w-0 items-start gap-3 text-left">
                      <CalendarRange className="mt-0.5 h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
                      <div className="min-w-0">
                        <p className="text-xs text-muted-foreground">Semana operativa</p>
                        <p className="mt-1 font-medium text-foreground">
                          {WEEKDAY_LABELS[route.week_start] || "-"} - {WEEKDAY_LABELS[route.week_end] || "-"}
                        </p>
                      </div>
                    </div>
                    <div className="flex min-w-0 items-start gap-3 text-left">
                      <Gauge className="mt-0.5 h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
                      <div className="min-w-0">
                        <p className="text-xs text-muted-foreground">Capacidad por viaje</p>
                        <p className="mt-1 font-medium text-foreground">
                          {formatCapacityLiters(route.default_capacity_liters ?? route.default_daily_capacity_liters)}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="mx-4 mb-4 flex min-w-0 flex-1 items-start gap-3 rounded-md bg-muted/30 px-3 py-2.5 text-left sm:mx-5 sm:mb-5">
                    <UserRound className="mt-0.5 h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
                    <div className="min-w-0">
                      <p className="mb-2 text-xs text-muted-foreground">Trabajador asignado</p>
                      <div className="flex flex-wrap gap-2">
                        {!assignedWorkerLabel ? (
                          <Badge variant="outline">Sin asignar</Badge>
                        ) : (
                          <Badge variant="outline">{assignedWorkerLabel}</Badge>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-2 border-t border-border p-4 sm:grid-cols-2">
                    <RouteActionButton size="sm" tone="primary" icon={Route} className="w-full justify-start sm:justify-center" onClick={() => navigate(`/routes/${route.id}/execute`)}>
                      Realizar ruta
                    </RouteActionButton>
                    <RouteActionButton size="sm" tone="secondary" icon={Eye} className="w-full justify-start sm:justify-center" onClick={() => navigate(`/routes/${route.id}`)}>
                      Ver detalle
                    </RouteActionButton>
                    {canManageRoutes && (
                      <>
                        <RouteActionButton size="sm" tone="secondary" icon={Edit} className="w-full justify-start sm:justify-center" onClick={() => navigate(`/routes/${route.id}/edit`)}>
                          Editar
                        </RouteActionButton>
                        <RouteActionButton size="sm" tone="accent" icon={WandSparkles} className="w-full justify-start sm:justify-center" onClick={() => askGenerateWeek(route)}>
                          Generar semana
                        </RouteActionButton>
                      </>
                    )}
                  </div>
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
