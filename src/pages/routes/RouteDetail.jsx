import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "@/context/AuthProvider";
import { useSnackbar } from "@/context/SnackbarProvider";
import {
  handleApiError,
  getRouteStatusClass,
  getRouteStatusLabel,
  getCollectionRequestStatusClass,
  getCollectionRequestStatusLabel,
  getCollectionStatusClass,
  getCollectionStatusLabel,
  normalizeCollectionStatus,
} from "@/components/Utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import ConfirmDeleteDialog from "@/components/common/ConfirmDeleteDialog";
import { ArrowLeft, Calendar, CheckCircle, Edit, Route, Trash2, WandSparkles, RefreshCcw, MapPin, Play, Square, Navigation2, ClipboardCheck, ChevronDown, ChevronUp } from "lucide-react";

const WEEKDAY_LABELS = ["Lunes", "Martes", "Miercoles", "Jueves", "Viernes", "Sabado", "Domingo"];
const CONTAINER_TYPES = [
  { value: "BIDONES", label: "Bidones (60L)" },
  { value: "IBC", label: "IBC (1000L)" },
];

function formatDate(dateStr) {
  if (!dateStr) return "-";
  const d = new Date(`${dateStr}T00:00:00`);
  if (Number.isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString("es-ES");
}

function formatDateTime(dateTime) {
  if (!dateTime) return "-";
  const d = new Date(dateTime);
  if (Number.isNaN(d.getTime())) return dateTime;
  return d.toLocaleString("es-ES");
}

function toDateInputValue(dateObj) {
  const year = dateObj.getFullYear();
  const month = String(dateObj.getMonth() + 1).padStart(2, "0");
  const day = String(dateObj.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getOperationalWeekStartDate(weekStart, referenceDate = new Date()) {
  const startWeekday = Number.isInteger(Number(weekStart)) ? Number(weekStart) : 0;
  const date = new Date(referenceDate);
  date.setHours(12, 0, 0, 0);
  const currentWeekday = (date.getDay() + 6) % 7;
  const shift = (currentWeekday - startWeekday + 7) % 7;
  date.setDate(date.getDate() - shift);
  return date;
}

function getContainerCapacity(containerType) {
  if (containerType === "IBC") return 1000;
  return 60;
}

function getContainerNumber(containerNumber) {
  const parsed = Number(containerNumber);
  if (Number.isFinite(parsed) && parsed > 0) return parsed;
  return 1;
}

function formatLiters(value) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return "-";
  return parsed.toLocaleString("es-ES", { minimumFractionDigits: 0, maximumFractionDigits: 2 });
}

function formatCapacityLiters(value) {
  if (value === null || value === undefined || value === "") return "Sin definir";
  return `${formatLiters(value)} L`;
}

export default function RouteDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { api, user } = useAuth();
  const showSnackbar = useSnackbar();
  const isOwner = user?.role_type === "owner";

  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const [overview, setOverview] = useState({ route: null, zone_days: [], route_days: [] });
  const [workersMap, setWorkersMap] = useState({});
  const [weekFilter, setWeekFilter] = useState("");

  const [generateModalOpen, setGenerateModalOpen] = useState(false);
  const [weekStartDate, setWeekStartDate] = useState("");
  const [dailyCapacityLiters, setDailyCapacityLiters] = useState("0");
  const [regenerate, setRegenerate] = useState(false);
  const [autoEstimateWithoutContact, setAutoEstimateWithoutContact] = useState(false);
  const [checkingWeekGenerationContext, setCheckingWeekGenerationContext] = useState(false);
  const [hasExistingWeekStops, setHasExistingWeekStops] = useState(false);
  const [submittingGenerate, setSubmittingGenerate] = useState(false);
  const [workingRouteDayId, setWorkingRouteDayId] = useState(null);
  const [completeModalOpen, setCompleteModalOpen] = useState(false);
  const [finishDecisionModalOpen, setFinishDecisionModalOpen] = useState(false);
  const [finishDecisionContext, setFinishDecisionContext] = useState({
    routeDayId: null,
    date: "",
    pendingStops: 0,
  });
  const [activeStop, setActiveStop] = useState(null);
  const [submittingStop, setSubmittingStop] = useState(false);
  const [selectedStopByRouteDay, setSelectedStopByRouteDay] = useState({});
  const [expandedRouteDays, setExpandedRouteDays] = useState({});
  const [completePayload, setCompletePayload] = useState({
    container_type: "BIDONES",
    container_number: "1",
    notes: "",
    mark_as_canceled: false,
    force: false,
  });

  const fetchWorkers = useCallback(async () => {
    try {
      const res = await api().get("workers", { params: { page: 1, page_size: 300 } });
      const items = Array.isArray(res.data?.results) ? res.data.results : [];
      const map = {};
      items.forEach((worker) => {
        map[worker.id] = `${worker.name || ""} ${worker.surname || ""}`.trim() || worker.username || `Trabajador ${worker.id}`;
      });
      setWorkersMap(map);
    } catch {
      setWorkersMap({});
    }
  }, [api]);

  const fetchOverview = useCallback(async () => {
    if (!id) return;
    try {
      setLoading(true);
      const params = {};
      if (weekFilter) params.week_start_date = weekFilter;
      const res = await api().get(`routes/${encodeURIComponent(id)}/operational-overview/`, { params });
      setOverview({
        route: res.data?.route || null,
        zone_days: Array.isArray(res.data?.zone_days) ? res.data.zone_days : [],
        route_days: Array.isArray(res.data?.route_days) ? res.data.route_days : [],
      });
    } catch (e) {
      const msg = handleApiError(e, "No se pudo cargar el detalle de la ruta.");
      showSnackbar(msg, "error");
    } finally {
      setLoading(false);
    }
  }, [api, id, showSnackbar, weekFilter]);

  useEffect(() => {
    fetchWorkers();
  }, [fetchWorkers]);

  useEffect(() => {
    fetchOverview();
  }, [fetchOverview]);

  const assignedWorkers = useMemo(() => {
    const workerIds = Array.isArray(overview.route?.workers) ? overview.route.workers : [];
    return workerIds.map((workerId) => workersMap[workerId] || `Trabajador ${workerId}`);
  }, [overview.route?.workers, workersMap]);

  const configuredZoneDays = useMemo(() => {
    const zoneDays = Array.isArray(overview.zone_days) ? overview.zone_days : [];
    return zoneDays
      .filter((item) => Array.isArray(item?.zones) && item.zones.length > 0)
      .sort((a, b) => Number(a.weekday) - Number(b.weekday));
  }, [overview.zone_days]);

  const suggestedWeekStartDate = useMemo(() => {
    const weekStart = Number(overview.route?.week_start ?? 0);
    return toDateInputValue(getOperationalWeekStartDate(weekStart));
  }, [overview.route?.week_start]);

  const suggestedDailyCapacityLiters = useMemo(() => {
    const routeDays = Array.isArray(overview.route_days) ? overview.route_days : [];
    const routeDayWithCapacity = routeDays.find(
      (routeDay) => routeDay?.daily_capacity_liters !== null && routeDay?.daily_capacity_liters !== undefined && routeDay?.daily_capacity_liters !== ""
    );
    if (routeDayWithCapacity) return String(routeDayWithCapacity.daily_capacity_liters);
    if (
      overview.route?.default_daily_capacity_liters !== null &&
      overview.route?.default_daily_capacity_liters !== undefined &&
      overview.route?.default_daily_capacity_liters !== ""
    ) {
      return String(overview.route.default_daily_capacity_liters);
    }
    return "0";
  }, [overview.route?.default_daily_capacity_liters, overview.route_days]);

  const routeDefaultCapacityLabel = useMemo(() => {
    const routeDays = Array.isArray(overview.route_days) ? overview.route_days : [];
    const routeDayWithCapacity = routeDays.find(
      (routeDay) => routeDay?.daily_capacity_liters !== null && routeDay?.daily_capacity_liters !== undefined && routeDay?.daily_capacity_liters !== ""
    );
    if (routeDayWithCapacity) return formatCapacityLiters(routeDayWithCapacity.daily_capacity_liters);
    return formatCapacityLiters(overview.route?.default_daily_capacity_liters);
  }, [overview.route?.default_daily_capacity_liters, overview.route_days]);

  const handleDelete = async () => {
    if (!id) return;
    try {
      setDeleting(true);
      await api().delete(`routes/${encodeURIComponent(id)}/`);
      showSnackbar("Ruta eliminada correctamente.", "success");
      navigate("/routes");
    } catch (e) {
      const msg = handleApiError(e, "No se pudo eliminar la ruta.");
      showSnackbar(msg, "error");
    } finally {
      setDeleting(false);
    }
  };

  const openGenerateModal = (presetWeekStart = suggestedWeekStartDate) => {
    setWeekStartDate(presetWeekStart || "");
    setDailyCapacityLiters(suggestedDailyCapacityLiters);
    setRegenerate(false);
    setAutoEstimateWithoutContact(false);
    setHasExistingWeekStops(false);
    setCheckingWeekGenerationContext(false);
    setGenerateModalOpen(true);
  };

  const handleGenerateWeek = async () => {
    if (!id) return;
    if (!weekStartDate) {
      showSnackbar("Debes indicar la fecha de inicio de semana.", "error");
      return;
    }

    try {
      setSubmittingGenerate(true);
      await api().post(`routes/${encodeURIComponent(id)}/generate-week/`, {
        week_start_date: weekStartDate,
        daily_capacity_liters: dailyCapacityLiters,
        regenerate: hasExistingWeekStops ? regenerate : false,
        auto_estimate_without_contact: autoEstimateWithoutContact,
      });
      showSnackbar("Semana operativa generada correctamente.", "success");
      setGenerateModalOpen(false);
      setWeekFilter(weekStartDate);
      await fetchOverview();
    } catch (e) {
      const msg = handleApiError(e, "No se pudo generar la semana operativa.");
      showSnackbar(msg, "error");
    } finally {
      setSubmittingGenerate(false);
    }
  };

  useEffect(() => {
    if (!generateModalOpen || !id || !weekStartDate) {
      setHasExistingWeekStops(false);
      setCheckingWeekGenerationContext(false);
      return;
    }

    let cancelled = false;
    const fetchWeekContext = async () => {
      try {
        setCheckingWeekGenerationContext(true);
        const res = await api().get(`routes/${encodeURIComponent(id)}/operational-overview/`, {
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
  }, [generateModalOpen, id, weekStartDate, api]);

  const isStopCollectable = useCallback((clientRow) => {
    if (!clientRow?.collection?.id) return true;
    return normalizeCollectionStatus(clientRow.collection.status) === "CANCELED";
  }, []);

  const getCollectableStops = useCallback((routeDay) => {
    const clients = Array.isArray(routeDay?.clients) ? routeDay.clients : [];
    return clients.filter((row) => isStopCollectable(row));
  }, [isStopCollectable]);

  const getPendingStopsCount = useCallback((routeDay) => {
    const clients = Array.isArray(routeDay?.clients) ? routeDay.clients : [];
    return clients.filter((row) => !row?.collection?.id).length;
  }, []);

  useEffect(() => {
    const routeDays = Array.isArray(overview.route_days) ? overview.route_days : [];
    if (routeDays.length === 0) {
      setSelectedStopByRouteDay({});
      return;
    }

    setSelectedStopByRouteDay((prev) => {
      const next = { ...prev };
      let changed = false;

      routeDays.forEach((routeDay) => {
        const collectableStops = getCollectableStops(routeDay);
        const currentValue = next[routeDay.id];
        const stillValid = collectableStops.some((row) => String(row.route_day_client_id) === String(currentValue));
        if (!stillValid) {
          const first = collectableStops[0];
          const newValue = first ? String(first.route_day_client_id) : "";
          if ((currentValue || "") !== newValue) {
            next[routeDay.id] = newValue;
            changed = true;
          }
        }
      });

      return changed ? next : prev;
    });
  }, [overview.route_days, getCollectableStops]);

  useEffect(() => {
    const routeDays = Array.isArray(overview.route_days) ? overview.route_days : [];
    if (routeDays.length === 0) {
      setExpandedRouteDays({});
      return;
    }

    setExpandedRouteDays((prev) => {
      const next = {};
      routeDays.forEach((routeDay) => {
        const previousValue = prev[routeDay.id];
        next[routeDay.id] = previousValue === undefined ? false : previousValue;
      });
      return next;
    });
  }, [overview.route_days]);

  const toggleRouteDayExpanded = (routeDayId) => {
    setExpandedRouteDays((prev) => ({ ...prev, [routeDayId]: !prev[routeDayId] }));
  };

  const handleStartRouteDay = async (routeDayId) => {
    if (!id || !routeDayId) return;
    try {
      setWorkingRouteDayId(routeDayId);
      await api().post(`routes/${encodeURIComponent(id)}/route-days/${encodeURIComponent(routeDayId)}/start/`, {});
      showSnackbar("Ruta diaria iniciada correctamente.", "success");
      await fetchOverview();
    } catch (e) {
      const msg = handleApiError(e, "No se pudo iniciar la ruta diaria.");
      showSnackbar(msg, "error");
    } finally {
      setWorkingRouteDayId(null);
    }
  };

  const submitFinishRouteDay = async (routeDayId, closeAction = null) => {
    if (!id || !routeDayId) return false;
    try {
      setWorkingRouteDayId(routeDayId);
      const payload = closeAction ? { close_action: closeAction } : {};
      await api().post(`routes/${encodeURIComponent(id)}/route-days/${encodeURIComponent(routeDayId)}/finish/`, payload);
      showSnackbar("Ruta diaria finalizada correctamente.", "success");
      await fetchOverview();
      return true;
    } catch (e) {
      const msg = handleApiError(e, "No se pudo finalizar la ruta diaria.");
      showSnackbar(msg, "error");
      return false;
    } finally {
      setWorkingRouteDayId(null);
    }
  };

  const handleFinishRouteDay = async (routeDayId) => {
    if (!routeDayId) return;
    const routeDays = Array.isArray(overview.route_days) ? overview.route_days : [];
    const routeDay = routeDays.find((item) => String(item.id) === String(routeDayId));
    const pendingStops = getPendingStopsCount(routeDay);
    if (pendingStops > 0) {
      setFinishDecisionContext({
        routeDayId,
        date: routeDay?.date || "",
        pendingStops,
      });
      setFinishDecisionModalOpen(true);
      return;
    }
    await submitFinishRouteDay(routeDayId);
  };

  const handleFinishWithDecision = async (closeAction) => {
    const targetRouteDayId = finishDecisionContext.routeDayId;
    if (!targetRouteDayId) return;
    const finished = await submitFinishRouteDay(targetRouteDayId, closeAction);
    if (finished) {
      setFinishDecisionModalOpen(false);
      setFinishDecisionContext({ routeDayId: null, date: "", pendingStops: 0 });
    }
  };

  const handleGoogleNavigation = async (routeDayId) => {
    if (!id || !routeDayId) return;
    try {
      setWorkingRouteDayId(routeDayId);
      const res = await api().get(`routes/${encodeURIComponent(id)}/route-days/${encodeURIComponent(routeDayId)}/google-navigation/`);
      const navigationUrl = res.data?.url;
      if (!navigationUrl) {
        showSnackbar("No se pudo generar el enlace de navegacion.", "error");
        return;
      }
      window.open(navigationUrl, "_blank", "noopener,noreferrer");
    } catch (e) {
      const msg = handleApiError(e, "No se pudo generar la navegacion de Google.");
      showSnackbar(msg, "error");
    } finally {
      setWorkingRouteDayId(null);
    }
  };

  const openCompleteStopModal = (routeDay, clientRow) => {
    setActiveStop({ routeDayId: routeDay.id, stop: clientRow });
    setCompletePayload({
      container_type: clientRow?.collection_request?.container_type || "BIDONES",
      container_number: String(clientRow?.collection_request?.container_number || "1"),
      notes: "",
      mark_as_canceled: false,
      force: false,
    });
    setCompleteModalOpen(true);
  };

  const openSelectedStopFromDropdown = (routeDay) => {
    const selectedId = selectedStopByRouteDay[routeDay.id];
    if (!selectedId) {
      showSnackbar("Selecciona una parada pendiente.", "error");
      return;
    }
    const target = (routeDay.clients || []).find((row) => String(row.route_day_client_id) === String(selectedId));
    if (!target) {
      showSnackbar("La parada seleccionada ya no esta disponible.", "error");
      return;
    }
    openCompleteStopModal(routeDay, target);
  };

  const handleCompleteStop = async () => {
    if (!id || !activeStop?.routeDayId || !activeStop?.stop?.route_day_client_id) return;
    try {
      setSubmittingStop(true);
      const payload = {
        container_type: completePayload.container_type,
        container_number: completePayload.container_number === "" ? "1" : completePayload.container_number,
        notes: completePayload.notes,
        mark_as_canceled: Boolean(completePayload.mark_as_canceled),
        force: Boolean(completePayload.force),
      };
      await api().post(
        `routes/${encodeURIComponent(id)}/route-days/${encodeURIComponent(activeStop.routeDayId)}/stops/${encodeURIComponent(activeStop.stop.route_day_client_id)}/complete/`,
        payload
      );
      showSnackbar("Parada registrada correctamente.", "success");
      setCompleteModalOpen(false);
      setActiveStop(null);
      await fetchOverview();
    } catch (e) {
      const msg = handleApiError(e, "No se pudo registrar la parada.");
      showSnackbar(msg, "error");
    } finally {
      setSubmittingStop(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3 sm:items-center sm:gap-4 min-w-0 flex-1">
          <Button variant="ghost" size="icon" onClick={() => navigate("/routes")} className="flex-shrink-0 mt-1 sm:mt-0">
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div className="min-w-0 flex-1">
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-foreground text-left leading-tight">
              {overview.route?.name || "Detalle de Ruta"}
            </h1>
            <p className="text-sm sm:text-base text-muted-foreground text-left mt-1 leading-relaxed">
              Vista operativa de zonas semanales, rutas diarias y paradas por cliente.
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2 sm:gap-3 flex-shrink-0">
          {isOwner && (
            <Button variant="outline" size="sm" onClick={() => navigate(`/routes/${id}/edit`)} disabled={loading || deleting}>
              <Edit className="w-4 h-4 sm:mr-2" />
              Editar
            </Button>
          )}
          {isOwner && (
            <Button size="sm" onClick={openGenerateModal} disabled={loading || deleting}>
              <WandSparkles className="w-4 h-4 sm:mr-2" />
              Generar Semana
            </Button>
          )}
          {isOwner && (
            <Button variant="destructive" size="sm" onClick={() => setDeleteOpen(true)} disabled={loading || deleting}>
              {deleting ? <RefreshCcw className="w-4 h-4 sm:mr-2 animate-spin" /> : <Trash2 className="w-4 h-4 sm:mr-2" />}
              {deleting ? "Eliminando..." : "Eliminar"}
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Route className="w-5 h-5 text-primary" />
              Datos de Ruta
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-left text-sm">
            <p><span className="text-muted-foreground">Inicio:</span> {formatDate(overview.route?.start_date)}</p>
            <p><span className="text-muted-foreground">Fin:</span> {overview.route?.end_date ? formatDate(overview.route.end_date) : "Sin fin"}</p>
            <p>
              <span className="text-muted-foreground">Semana operativa:</span>{" "}
              {WEEKDAY_LABELS[overview.route?.week_start ?? 0]} - {WEEKDAY_LABELS[overview.route?.week_end ?? 6]}
            </p>
            <p>
              <span className="text-muted-foreground">Capacidad diaria:</span> {routeDefaultCapacityLabel}
            </p>
            <div className="pt-2">
              <p className="text-muted-foreground mb-1">Trabajadores:</p>
              <div className="flex flex-wrap gap-2">
                {assignedWorkers.length === 0 ? <Badge variant="outline">Sin asignar</Badge> : assignedWorkers.map((label) => <Badge key={label} variant="outline">{label}</Badge>)}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="w-5 h-5 text-primary" />
              Zonas por dia
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-left">
            {configuredZoneDays.length === 0 ? (
              <p className="text-sm text-muted-foreground">No hay dias con zonas configuradas para esta ruta.</p>
            ) : (
              configuredZoneDays.map((item) => (
                <div key={`zone-day-${item.weekday}`} className="border rounded-lg p-2">
                  <p className="text-sm font-medium">{WEEKDAY_LABELS[item.weekday] || `Dia ${item.weekday}`}</p>
                  <div className="flex flex-wrap gap-2 mt-1">
                    {item.zones.map((zone) => <Badge key={`${item.weekday}-${zone.id}`} variant="outline">{zone.name}</Badge>)}
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-primary" />
            Rutas diarias y clientes por dia
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col md:flex-row gap-3 md:items-end">
            <div className="space-y-2">
              <Label htmlFor="weekFilter">Filtrar por inicio de semana</Label>
              <Input id="weekFilter" type="date" value={weekFilter} onChange={(e) => setWeekFilter(e.target.value)} />
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={fetchOverview} disabled={loading}>
                <RefreshCcw className={`w-4 h-4 mr-2 ${loading ? "animate-spin" : ""}`} />
                Refrescar
              </Button>
              <Button variant="outline" onClick={() => setWeekFilter("")}>
                Quitar Filtro
              </Button>
            </div>
          </div>

          {loading ? (
            <p className="text-sm text-muted-foreground text-left">Cargando detalle operativo...</p>
          ) : overview.route_days.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border bg-muted/20 p-6 text-center">
              <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                <Calendar className="h-5 w-5 text-primary" />
              </div>
              <p className="text-sm font-medium text-foreground">Todavia no hay rutas diarias para esta semana operativa.</p>
              <p className="mt-1 text-xs text-muted-foreground">
                {isOwner ? "Genera la semana actual para poder iniciar la ruta de hoy." : "Aun no hay dias operativos generados para esta semana."}
              </p>
              <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
                {isOwner && (
                  <Button size="sm" className="gap-2" onClick={() => openGenerateModal(suggestedWeekStartDate)}>
                    <WandSparkles className="h-4 w-4" />
                    Generar semana actual
                  </Button>
                )}
                <Button size="sm" variant="outline" onClick={fetchOverview}>
                  Refrescar
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {overview.route_days.map((routeDay) => (
                <div key={routeDay.id} className="border rounded-lg p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="text-left">
                      <p className="font-medium">{formatDate(routeDay.date)}</p>
                      <p className="text-xs text-muted-foreground">
                        Capacidad: {formatCapacityLiters(routeDay.daily_capacity_liters)} | Paradas: {routeDay.stops}
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center justify-end gap-2">
                      <Badge className={getRouteStatusClass(routeDay.status)}>{getRouteStatusLabel(routeDay.status)}</Badge>
                      <Button
                        size="sm"
                        variant="secondary"
                        className="gap-1"
                        disabled={workingRouteDayId === routeDay.id}
                        onClick={() => handleGoogleNavigation(routeDay.id)}
                      >
                        {workingRouteDayId === routeDay.id ? <RefreshCcw className="w-4 h-4 animate-spin" /> : <Navigation2 className="w-4 h-4" />}
                        Google
                      </Button>
                      {(routeDay.status === "PLANNED" || routeDay.status === "PARTIAL") && (
                        <Button
                          size="sm"
                          variant="success"
                          className="gap-1"
                          disabled={workingRouteDayId === routeDay.id}
                          onClick={() => handleStartRouteDay(routeDay.id)}
                        >
                          {workingRouteDayId === routeDay.id ? <RefreshCcw className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
                          Iniciar
                        </Button>
                      )}
                      {routeDay.status === "IN_PROGRESS" && (
                        <Button
                          size="sm"
                          variant="destructive"
                          className="gap-1"
                          disabled={workingRouteDayId === routeDay.id}
                          onClick={() => handleFinishRouteDay(routeDay.id)}
                        >
                          {workingRouteDayId === routeDay.id ? <RefreshCcw className="w-4 h-4 animate-spin" /> : <Square className="w-4 h-4" />}
                          Finalizar
                        </Button>
                      )}
                    </div>
                  </div>

                  {(() => {
                    const collectableStops = getCollectableStops(routeDay);
                    const selectedId = selectedStopByRouteDay[routeDay.id] || "";
                    const selectedStop = collectableStops.find((row) => String(row.route_day_client_id) === String(selectedId)) || null;
                    const tableExpanded = expandedRouteDays[routeDay.id] === true;
                    return (
                      <>
                        <div className="mt-3 rounded-lg border border-border bg-muted/20 p-3">
                          <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                            <div className="text-xs text-muted-foreground text-left">
                              {collectableStops.length > 0
                                ? `${collectableStops.length} paradas pendientes para registrar.`
                                : "No hay paradas pendientes en este dia."}
                            </div>
                            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                              <Select
                                value={selectedId}
                                onValueChange={(value) => setSelectedStopByRouteDay((prev) => ({ ...prev, [routeDay.id]: value }))}
                                disabled={routeDay.status !== "IN_PROGRESS" || collectableStops.length === 0}
                              >
                                <SelectTrigger className="min-w-[280px]">
                                  <SelectValue placeholder="Selecciona parada pendiente" />
                                </SelectTrigger>
                                <SelectContent>
                                  {collectableStops.map((row) => (
                                    <SelectItem key={row.route_day_client_id} value={String(row.route_day_client_id)}>
                                      #{row.order} - {row.client_name}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <Button
                                size="sm"
                                className="gap-1"
                                disabled={routeDay.status !== "IN_PROGRESS" || collectableStops.length === 0 || !selectedStop}
                                onClick={() => openSelectedStopFromDropdown(routeDay)}
                              >
                                <ClipboardCheck className="w-4 h-4" />
                                Recoger parada
                              </Button>
                            </div>
                          </div>

                          {selectedStop && (
                            <div className="mt-3 grid grid-cols-1 gap-2 rounded-md border border-border bg-background p-3 text-left text-xs md:grid-cols-2">
                              <p><span className="text-muted-foreground">Cliente:</span> {selectedStop.client_name}</p>
                              <p><span className="text-muted-foreground">Orden:</span> #{selectedStop.order}</p>
                              <p><span className="text-muted-foreground">Direccion:</span> {selectedStop.client_address || "-"}</p>
                              <p><span className="text-muted-foreground">Limite respuesta:</span> {formatDateTime(selectedStop.collection_request?.expires_at)}</p>
                              <p>
                                <span className="text-muted-foreground">Solicitud:</span>{" "}
                                {selectedStop.collection_request?.status ? getCollectionRequestStatusLabel(selectedStop.collection_request.status) : "-"}
                              </p>
                              <p>
                                <span className="text-muted-foreground">Plan base:</span>{" "}
                                {(() => {
                                  const requestObj = selectedStop.collection_request || {};
                                  const containerType = requestObj.container_type || "BIDONES";
                                  const containerNumber = getContainerNumber(requestObj.container_number);
                                  return `${formatLiters(containerNumber * getContainerCapacity(containerType))} L`;
                                })()}
                              </p>
                            </div>
                          )}
                        </div>

                        {tableExpanded ? (
                          routeDay.clients.length === 0 ? (
                            <p className="mt-2 text-xs text-muted-foreground text-left">No hay clientes asignados en este dia.</p>
                          ) : (
                            <div className="mt-3 overflow-x-auto rounded-lg border border-border">
                              <table className="min-w-[980px] w-full table-fixed text-left">
                                <colgroup>
                                  <col className="w-[72px]" />
                                  <col className="w-[30%]" />
                                  <col className="w-[14%]" />
                                  <col className="w-[14%]" />
                                  <col className="w-[20%]" />
                                  <col className="w-[10%]" />
                                  <col className="w-[12%]" />
                                </colgroup>
                                <thead className="bg-muted/30 border-b">
                                  <tr>
                                    <th className="px-3 py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Orden</th>
                                    <th className="px-3 py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Cliente</th>
                                    <th className="px-3 py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Solicitud</th>
                                    <th className="px-3 py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Recogida</th>
                                    <th className="px-3 py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Limite respuesta</th>
                                    <th className="px-3 py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Plan base</th>
                                    <th className="px-3 py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground text-right">Acciones</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {routeDay.clients.map((clientRow) => (
                                    <tr key={clientRow.route_day_client_id} className="border-b border-border last:border-0">
                                      <td className="px-3 py-2 text-sm align-middle">{clientRow.order}</td>
                                      <td className="px-3 py-2 align-middle">
                                        <p className="font-medium truncate">{clientRow.client_name}</p>
                                        <p className="text-xs text-muted-foreground truncate">{clientRow.client_address || "-"}</p>
                                      </td>
                                      <td className="px-3 py-2 align-middle">
                                        {clientRow.collection_request?.status ? (
                                          <Badge className={getCollectionRequestStatusClass(clientRow.collection_request.status)}>
                                            {getCollectionRequestStatusLabel(clientRow.collection_request.status)}
                                          </Badge>
                                        ) : (
                                          <span className="text-muted-foreground">-</span>
                                        )}
                                      </td>
                                      <td className="px-3 py-2 align-middle">
                                        {clientRow.collection?.status ? (
                                          <Badge className={getCollectionStatusClass(clientRow.collection.status)}>
                                            {getCollectionStatusLabel(clientRow.collection.status)}
                                          </Badge>
                                        ) : (
                                          <span className="text-muted-foreground">-</span>
                                        )}
                                      </td>
                                      <td className="px-3 py-2 text-xs whitespace-nowrap align-middle">
                                        {formatDateTime(clientRow.collection_request?.expires_at)}
                                      </td>
                                      <td className="px-3 py-2 text-xs align-middle">
                                        {(() => {
                                          const requestObj = clientRow.collection_request || {};
                                          const containerType = requestObj.container_type || "BIDONES";
                                          const containerNumber = getContainerNumber(requestObj.container_number);
                                          const basePlanLiters = containerNumber * getContainerCapacity(containerType);
                                          const autoPlanLiters = requestObj.final_liters ?? requestObj.estimated_liters ?? null;
                                          const autoDiffers = autoPlanLiters !== null && Number(autoPlanLiters) !== Number(basePlanLiters);
                                          const containerLabel = containerType === "IBC" ? "IBC" : "Bidones";
                                          return (
                                            <div className="space-y-0.5">
                                              <p className="font-medium">{formatLiters(basePlanLiters)} L</p>
                                              <p className="text-muted-foreground">{containerNumber} x {containerLabel}</p>
                                              {autoDiffers && <p className="text-muted-foreground">Auto: {formatLiters(autoPlanLiters)} L</p>}
                                            </div>
                                          );
                                        })()}
                                      </td>
                                      <td className="px-3 py-2 text-right align-middle">
                                        {clientRow.collection?.id && normalizeCollectionStatus(clientRow.collection.status) !== "CANCELED" ? (
                                          <Badge variant="outline">Registrada</Badge>
                                        ) : (
                                          <Button
                                            size="sm"
                                            variant={routeDay.status === "IN_PROGRESS" ? "default" : "outline"}
                                            className="gap-1"
                                            disabled={routeDay.status !== "IN_PROGRESS"}
                                            onClick={() => openCompleteStopModal(routeDay, clientRow)}
                                          >
                                            <ClipboardCheck className="w-4 h-4" />
                                            Registrar
                                          </Button>
                                        )}
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          )
                        ) : null}

                        <div className="mt-3 flex justify-end">
                          <Button size="sm" variant="outline" className="gap-1" onClick={() => toggleRouteDayExpanded(routeDay.id)}>
                            {tableExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                            {tableExpanded ? "Ocultar tabla de paradas" : "Mostrar tabla de paradas"}
                          </Button>
                        </div>
                      </>
                    );
                  })()}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {isOwner && (
      <Dialog open={generateModalOpen} onOpenChange={setGenerateModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Generar semana operativa</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="weekStartDate">Inicio de semana</Label>
              <Input id="weekStartDate" type="date" value={weekStartDate} onChange={(e) => setWeekStartDate(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="capacity">Capacidad diaria (litros)</Label>
              <Input id="capacity" type="number" min="0" step="0.01" value={dailyCapacityLiters} onChange={(e) => setDailyCapacityLiters(e.target.value)} />
            </div>
            {checkingWeekGenerationContext ? (
              <p className="text-xs text-muted-foreground">Comprobando si hay paradas existentes en la semana...</p>
            ) : hasExistingWeekStops ? (
              <div className="flex items-center space-x-2">
                <Checkbox id="regenerate" checked={regenerate} onCheckedChange={(v) => setRegenerate(Boolean(v))} />
                <Label htmlFor="regenerate" className="text-sm">Regenerar paradas existentes</Label>
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">No hay paradas existentes en esa semana. Se generaran directamente.</p>
            )}
            <div className="flex items-center space-x-2">
              <Checkbox id="auto_estimate_without_contact" checked={autoEstimateWithoutContact} onCheckedChange={(v) => setAutoEstimateWithoutContact(Boolean(v))} />
              <Label htmlFor="auto_estimate_without_contact" className="text-sm">Autoestimar sin notificar al cliente</Label>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setGenerateModalOpen(false)}>Cancelar</Button>
            <Button onClick={handleGenerateWeek} disabled={submittingGenerate} className="gap-2">
              <CheckCircle className="w-4 h-4" />
              {submittingGenerate ? "Generando..." : "Generar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      )}

      <Dialog
        open={finishDecisionModalOpen}
        onOpenChange={(open) => {
          if (!open) {
            setFinishDecisionContext({ routeDayId: null, date: "", pendingStops: 0 });
          }
          setFinishDecisionModalOpen(open);
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Finalizar ruta diaria</DialogTitle>
          </DialogHeader>

          <div className="space-y-2 text-left">
            <p className="text-sm">
              Quedan <span className="font-semibold">{finishDecisionContext.pendingStops}</span> paradas sin registrar en{" "}
              <span className="font-semibold">{formatDate(finishDecisionContext.date)}</span>.
            </p>
            <p className="text-xs text-muted-foreground">
              Elige si quieres cerrar la ruta como parcial o cancelarla por completo.
            </p>
          </div>

          <DialogFooter className="gap-2 sm:justify-between">
            <Button variant="outline" onClick={() => setFinishDecisionModalOpen(false)}>
              Volver
            </Button>
            <div className="flex flex-wrap gap-2">
              <Button
                variant="secondary"
                disabled={workingRouteDayId === finishDecisionContext.routeDayId}
                onClick={() => handleFinishWithDecision("PARTIAL")}
              >
                {workingRouteDayId === finishDecisionContext.routeDayId ? "Guardando..." : "Cerrar parcial"}
              </Button>
              <Button
                variant="destructive"
                disabled={workingRouteDayId === finishDecisionContext.routeDayId}
                onClick={() => handleFinishWithDecision("CANCELED")}
              >
                {workingRouteDayId === finishDecisionContext.routeDayId ? "Guardando..." : "Cancelar ruta"}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={completeModalOpen} onOpenChange={setCompleteModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Registrar parada</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="rounded-lg border border-border p-3 text-left space-y-1">
              <p className="font-medium">{activeStop?.stop?.client_name || "Cliente"}</p>
              <p className="text-xs text-muted-foreground">{activeStop?.stop?.client_address || "-"}</p>
              <div className="flex flex-wrap gap-2 pt-1">
                {activeStop?.stop?.collection_request?.estimated_liters ? (
                  <Badge variant="outline">Estimados: {activeStop.stop.collection_request.estimated_liters} L</Badge>
                ) : (
                  <Badge variant="outline">Estimados: -</Badge>
                )}
                <Badge variant="outline">Limite respuesta: {formatDateTime(activeStop?.stop?.collection_request?.expires_at)}</Badge>
              </div>
            </div>
            <p className="text-xs text-muted-foreground text-left">
              La medicion y el ajuste de litros se hace en nave, no en esta parada.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="container_type">Tipo de envase</Label>
                <Select
                  value={completePayload.container_type}
                  onValueChange={(value) => setCompletePayload((prev) => ({ ...prev, container_type: value }))}
                  disabled={completePayload.mark_as_canceled}
                >
                  <SelectTrigger id="container_type">
                    <SelectValue placeholder="Selecciona tipo de envase" />
                  </SelectTrigger>
                  <SelectContent>
                    {CONTAINER_TYPES.map((type) => (
                      <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="container_number">Numero de envases</Label>
                <Input
                  id="container_number"
                  type="number"
                  min="1"
                  step="1"
                  placeholder="1"
                  disabled={completePayload.mark_as_canceled}
                  value={completePayload.container_number}
                  onChange={(e) => setCompletePayload((prev) => ({ ...prev, container_number: e.target.value }))}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="stop_notes">Notas</Label>
              <Textarea
                id="stop_notes"
                rows={3}
                placeholder="Observaciones de la recogida"
                value={completePayload.notes}
                onChange={(e) => setCompletePayload((prev) => ({ ...prev, notes: e.target.value }))}
              />
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="mark_as_canceled"
                checked={completePayload.mark_as_canceled}
                onCheckedChange={(v) => setCompletePayload((prev) => ({ ...prev, mark_as_canceled: Boolean(v) }))}
              />
              <Label htmlFor="mark_as_canceled" className="text-sm">Marcar parada como cancelada</Label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="force_stop"
                checked={completePayload.force}
                onCheckedChange={(v) => setCompletePayload((prev) => ({ ...prev, force: Boolean(v) }))}
              />
              <Label htmlFor="force_stop" className="text-sm">Forzar aunque haya paradas anteriores pendientes</Label>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setCompleteModalOpen(false)}>Cancelar</Button>
            <Button onClick={handleCompleteStop} disabled={submittingStop} className="gap-2">
              <CheckCircle className="w-4 h-4" />
              {submittingStop ? "Guardando..." : "Registrar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {isOwner && (
        <ConfirmDeleteDialog
          open={deleteOpen}
          onOpenChange={setDeleteOpen}
          title="Eliminar ruta"
          description={`Se va a eliminar la ruta "${overview.route?.name || id}". Esta accion no se puede deshacer.`}
          confirmLabel="Eliminar"
          onConfirm={handleDelete}
          loading={deleting}
        />
      )}
    </div>
  );
}
