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
import RouteActionButton from "@/components/routes/RouteActionButton";
import GenerateWeekDialog from "@/components/routes/GenerateWeekDialog";
import { ArrowLeft, Calendar, CheckCircle, Edit, Route, Trash2, WandSparkles, RefreshCcw, MapPin, Play, Square, Navigation2, ClipboardCheck, ChevronDown, ChevronUp } from "lucide-react";

const WEEKDAY_LABELS = ["Lunes", "Martes", "Miercoles", "Jueves", "Viernes", "Sabado", "Domingo"];
const CONTAINER_TYPES = [
  { value: "BIDONES", label: "Bidones (60L)" },
  { value: "IBC", label: "IBC (1000L)" },
];
const ROUTE_DAY_STATUS_FILTERS = [
  { value: "ALL", label: "Todos" },
  { value: "PLANNED", label: "Planificadas" },
  { value: "IN_PROGRESS", label: "En curso" },
  { value: "PARTIAL", label: "Parciales" },
  { value: "COMPLETED", label: "Completadas" },
  { value: "CANCELED", label: "Canceladas" },
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
  const [routeDayStatusFilter, setRouteDayStatusFilter] = useState("ALL");
  const [completePayload, setCompletePayload] = useState({
    container_type: "BIDONES",
    container_number: "1",
    notes: "",
    mark_as_canceled: false,
    force: false,
  });
  const routeFilterButtonClass = "h-9 rounded-full px-4";

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
    const workerId = overview.route?.worker;
    if (!workerId) return [];
    return [workersMap[workerId] || `Trabajador ${workerId}`];
  }, [overview.route?.worker, workersMap]);
  const routeDays = useMemo(() => (Array.isArray(overview.route_days) ? overview.route_days : []), [overview.route_days]);

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
    const routeDayWithCapacity = routeDays.find(
      (routeDay) => routeDay?.daily_capacity_liters !== null && routeDay?.daily_capacity_liters !== undefined && routeDay?.daily_capacity_liters !== ""
    );
    if (routeDayWithCapacity) return formatCapacityLiters(routeDayWithCapacity.daily_capacity_liters);
    return formatCapacityLiters(overview.route?.default_daily_capacity_liters);
  }, [overview.route?.default_daily_capacity_liters, routeDays]);

  const routeDayOverview = useMemo(() => {
    const statusCounts = {
      PLANNED: 0,
      IN_PROGRESS: 0,
      PARTIAL: 0,
      COMPLETED: 0,
      CANCELED: 0,
    };
    let totalStops = 0;
    let completedStops = 0;
    let canceledStops = 0;
    let pendingStops = 0;

    routeDays.forEach((routeDay) => {
      if (statusCounts[routeDay.status] !== undefined) statusCounts[routeDay.status] += 1;
      const clients = Array.isArray(routeDay?.clients) ? routeDay.clients : [];
      const plannedStops = Number.isFinite(Number(routeDay?.stops)) ? Number(routeDay.stops) : clients.length;
      totalStops += plannedStops;

      let dayCompleted = 0;
      let dayCanceled = 0;
      clients.forEach((row) => {
        const normalizedStatus = normalizeCollectionStatus(row?.collection?.status);
        if (row?.collection?.id && normalizedStatus !== "CANCELED") {
          dayCompleted += 1;
        } else if (normalizedStatus === "CANCELED") {
          dayCanceled += 1;
        }
      });

      completedStops += dayCompleted;
      canceledStops += dayCanceled;
      pendingStops += Math.max(plannedStops - dayCompleted - dayCanceled, 0);
    });

    return { statusCounts, totalStops, completedStops, canceledStops, pendingStops };
  }, [routeDays]);

  const filteredRouteDays = useMemo(() => {
    if (routeDayStatusFilter === "ALL") return routeDays;
    return routeDays.filter((routeDay) => routeDay?.status === routeDayStatusFilter);
  }, [routeDayStatusFilter, routeDays]);

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
    const normalizedPresetWeekStart = typeof presetWeekStart === "string" ? presetWeekStart : suggestedWeekStartDate;
    setWeekStartDate(normalizedPresetWeekStart || "");
    setDailyCapacityLiters(suggestedDailyCapacityLiters);
    setRegenerate(false);
    setAutoEstimateWithoutContact(false);
    setHasExistingWeekStops(false);
    setCheckingWeekGenerationContext(false);
    setGenerateModalOpen(true);
  };

  const handleGenerateWeek = async () => {
    if (!id) return;
    const normalizedWeekStartDate = typeof weekStartDate === "string" ? weekStartDate : "";
    if (!normalizedWeekStartDate) {
      showSnackbar("Debes indicar la fecha de inicio de semana.", "error");
      return;
    }

    try {
      setSubmittingGenerate(true);
      await api().post(`routes/${encodeURIComponent(id)}/generate-week/`, {
        week_start_date: normalizedWeekStartDate,
        daily_capacity_liters: dailyCapacityLiters,
        regenerate: hasExistingWeekStops ? regenerate : false,
        auto_estimate_without_contact: autoEstimateWithoutContact,
      });
      showSnackbar("Semana operativa generada correctamente.", "success");
      setGenerateModalOpen(false);
      setWeekFilter(normalizedWeekStartDate);
      await fetchOverview();
    } catch (e) {
      const msg = handleApiError(e, "No se pudo generar la semana operativa.");
      showSnackbar(msg, "error");
    } finally {
      setSubmittingGenerate(false);
    }
  };

  useEffect(() => {
    if (!generateModalOpen || !id || typeof weekStartDate !== "string" || !weekStartDate) {
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
  }, [routeDays, getCollectableStops]);

  useEffect(() => {
    if (routeDays.length === 0) {
      setExpandedRouteDays({});
      return;
    }

    setExpandedRouteDays((prev) => {
      const next = {};
      routeDays.forEach((routeDay) => {
        const previousValue = prev[routeDay.id];
        next[routeDay.id] = previousValue === undefined ? routeDay.status === "IN_PROGRESS" : previousValue;
      });
      return next;
    });
  }, [routeDays]);

  const toggleRouteDayExpanded = (routeDayId) => {
    setExpandedRouteDays((prev) => ({ ...prev, [routeDayId]: !prev[routeDayId] }));
  };

  const allFilteredRouteDaysExpanded = useMemo(() => {
    if (filteredRouteDays.length === 0) return false;
    return filteredRouteDays.every((routeDay) => expandedRouteDays[routeDay.id] === true);
  }, [expandedRouteDays, filteredRouteDays]);

  const toggleAllRouteDaysExpanded = () => {
    const shouldExpand = !allFilteredRouteDaysExpanded;
    setExpandedRouteDays((prev) => {
      const next = { ...prev };
      filteredRouteDays.forEach((routeDay) => {
        next[routeDay.id] = shouldExpand;
      });
      return next;
    });
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
        <div className="grid w-full grid-cols-1 gap-2 sm:flex sm:w-auto sm:flex-wrap sm:gap-3 flex-shrink-0">
          <RouteActionButton tone="primary" size="sm" icon={Navigation2} className="w-full sm:w-auto" onClick={() => navigate(`/routes/${id}/execute`)} disabled={loading || deleting}>
            Realizar ruta
          </RouteActionButton>
          {isOwner && (
            <RouteActionButton tone="secondary" size="sm" icon={Edit} className="w-full sm:w-auto" onClick={() => navigate(`/routes/${id}/edit`)} disabled={loading || deleting}>
              Editar
            </RouteActionButton>
          )}
          {isOwner && (
            <RouteActionButton tone="accent" size="sm" icon={WandSparkles} className="w-full sm:w-auto" onClick={() => openGenerateModal()} disabled={loading || deleting}>
              Generar Semana
            </RouteActionButton>
          )}
          {isOwner && (
            <RouteActionButton tone="danger" size="sm" className="w-full sm:w-auto" onClick={() => setDeleteOpen(true)} disabled={loading || deleting}>
              {deleting ? <RefreshCcw className="w-4 h-4 sm:mr-2 animate-spin" /> : <Trash2 className="w-4 h-4 sm:mr-2" />}
              {deleting ? "Eliminando..." : "Eliminar"}
            </RouteActionButton>
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
              <p className="text-muted-foreground mb-1">Trabajador:</p>
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
          <div className="flex flex-col md:flex-row gap-3 md:items-end md:justify-between">
            <div className="space-y-2">
              <Label htmlFor="weekFilter">Filtrar por inicio de semana</Label>
              <Input id="weekFilter" type="date" value={weekFilter} onChange={(e) => setWeekFilter(e.target.value)} />
            </div>
            <div className="grid grid-cols-1 gap-2 sm:flex">
              <RouteActionButton tone="secondary" className={loading ? "opacity-70" : ""} onClick={fetchOverview} disabled={loading}>
                <RefreshCcw className={`w-4 h-4 mr-2 ${loading ? "animate-spin" : ""}`} />
                Refrescar
              </RouteActionButton>
              <RouteActionButton tone="secondary" onClick={() => setWeekFilter("")}>
                Semana actual
              </RouteActionButton>
              <RouteActionButton tone="secondary" onClick={toggleAllRouteDaysExpanded} disabled={filteredRouteDays.length === 0}>
                {allFilteredRouteDaysExpanded ? "Ocultar todos" : "Expandir todos"}
              </RouteActionButton>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <div className="rounded-lg border border-border bg-muted/20 p-3 text-left">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Dias operativos</p>
              <p className="mt-1 text-xl font-semibold">{routeDays.length}</p>
            </div>
            <div className="rounded-lg border border-border bg-muted/20 p-3 text-left">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Paradas previstas</p>
              <p className="mt-1 text-xl font-semibold">{routeDayOverview.totalStops}</p>
            </div>
            <div className="rounded-lg border border-border bg-muted/20 p-3 text-left">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Paradas registradas</p>
              <p className="mt-1 text-xl font-semibold text-success">{routeDayOverview.completedStops}</p>
            </div>
            <div className="rounded-lg border border-border bg-muted/20 p-3 text-left">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Pendientes</p>
              <p className="mt-1 text-xl font-semibold text-amber-600">{routeDayOverview.pendingStops}</p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {ROUTE_DAY_STATUS_FILTERS.map((statusOption) => {
              const count = statusOption.value === "ALL"
                ? routeDays.length
                : routeDayOverview.statusCounts[statusOption.value] || 0;
              const selected = routeDayStatusFilter === statusOption.value;
              return (
                <Button
                  key={statusOption.value}
                  size="sm"
                  variant={selected ? "default" : "outline"}
                  className={`${routeFilterButtonClass} gap-1`}
                  onClick={() => setRouteDayStatusFilter(statusOption.value)}
                >
                  {statusOption.label}
                  <span className="text-xs opacity-80">({count})</span>
                </Button>
              );
            })}
          </div>

          {loading ? (
            <p className="text-sm text-muted-foreground text-left">Cargando detalle operativo...</p>
          ) : routeDays.length === 0 ? (
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
          ) : filteredRouteDays.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border bg-muted/20 p-6 text-center">
              <p className="text-sm font-medium text-foreground">No hay rutas diarias para el estado seleccionado.</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Cambia el filtro de estado para ver otros dias operativos.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredRouteDays.map((routeDay) => {
                const clients = Array.isArray(routeDay?.clients) ? routeDay.clients : [];
                const plannedStops = Number.isFinite(Number(routeDay?.stops)) ? Number(routeDay.stops) : clients.length;
                const completedStops = clients.filter(
                  (row) => row?.collection?.id && normalizeCollectionStatus(row.collection.status) !== "CANCELED"
                ).length;
                const canceledStops = clients.filter(
                  (row) => normalizeCollectionStatus(row?.collection?.status) === "CANCELED"
                ).length;
                const pendingStops = Math.max(plannedStops - completedStops - canceledStops, 0);
                const progress = plannedStops > 0 ? Math.round((completedStops / plannedStops) * 100) : 0;
                const progressBarClass = routeDay.status === "CANCELED"
                  ? "bg-destructive"
                  : routeDay.status === "COMPLETED"
                    ? "bg-success"
                    : "bg-primary";

                return (
                <div
                  key={routeDay.id}
                  className={`border rounded-lg p-3 ${routeDay.status === "IN_PROGRESS" ? "border-primary/40 bg-primary/5" : ""}`}
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="text-left">
                      <p className="font-medium">{formatDate(routeDay.date)}</p>
                      <p className="text-xs text-muted-foreground">
                        Capacidad: {formatCapacityLiters(routeDay.daily_capacity_liters)} | Paradas: {plannedStops}
                      </p>
                    </div>
                    <div className="flex w-full flex-wrap items-center justify-end gap-2 sm:w-auto">
                      <Badge className={getRouteStatusClass(routeDay.status)}>{getRouteStatusLabel(routeDay.status)}</Badge>
                    </div>
                  </div>

                  <div className="mt-3 space-y-1">
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>{completedStops} registradas</span>
                      <span>{pendingStops} pendientes</span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-secondary">
                      <div
                        className={`h-2 rounded-full transition-all ${progressBarClass}`}
                        style={{ width: `${Math.max(0, Math.min(progress, 100))}%` }}
                      />
                    </div>
                  </div>

                  {(() => {
                    const tableExpanded = expandedRouteDays[routeDay.id] === true;
                    return (
                      <>
                        <div className="mt-3 rounded-lg border border-border bg-muted/20 p-3">
                          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                            <div className="grid grid-cols-1 gap-2 text-left text-xs sm:grid-cols-3">
                              <p><span className="text-muted-foreground">Pendientes:</span> {pendingStops}</p>
                              <p><span className="text-muted-foreground">Registradas:</span> {completedStops}</p>
                              <p><span className="text-muted-foreground">Canceladas:</span> {canceledStops}</p>
                            </div>
                          </div>
                        </div>

                        {tableExpanded ? (
                          routeDay.clients.length === 0 ? (
                            <p className="mt-2 text-xs text-muted-foreground text-left">No hay clientes asignados en este dia.</p>
                          ) : (
                            <>
                              <div className="mt-3 space-y-2 md:hidden">
                                {routeDay.clients.map((clientRow) => {
                                  const requestObj = clientRow.collection_request || {};
                                  const containerType = requestObj.container_type || "BIDONES";
                                  const containerNumber = getContainerNumber(requestObj.container_number);
                                  const basePlanLiters = containerNumber * getContainerCapacity(containerType);
                                  const autoPlanLiters = requestObj.final_liters ?? requestObj.estimated_liters ?? null;
                                  const autoDiffers = autoPlanLiters !== null && Number(autoPlanLiters) !== Number(basePlanLiters);
                                  const containerLabel = containerType === "IBC" ? "IBC" : "Bidones";
                                  return (
                                    <div key={clientRow.route_day_client_id} className="rounded-lg border border-border bg-background p-3 text-left">
                                      <div className="flex items-start justify-between gap-2">
                                        <div className="min-w-0">
                                          <p className="text-xs text-muted-foreground">#{clientRow.order}</p>
                                          <p className="font-medium truncate">{clientRow.client_name}</p>
                                          <p className="text-xs text-muted-foreground truncate">{clientRow.client_address || "-"}</p>
                                        </div>
                                        {clientRow.collection?.status ? (
                                          <Badge className={getCollectionStatusClass(clientRow.collection.status)}>
                                            {getCollectionStatusLabel(clientRow.collection.status)}
                                          </Badge>
                                        ) : (
                                          <Badge variant="outline">Sin recoger</Badge>
                                        )}
                                      </div>
                                      <div className="mt-2 grid grid-cols-1 gap-1 text-xs">
                                        <p><span className="text-muted-foreground">Solicitud:</span> {clientRow.collection_request?.status ? getCollectionRequestStatusLabel(clientRow.collection_request.status) : "-"}</p>
                                        <p><span className="text-muted-foreground">Limite:</span> {formatDateTime(clientRow.collection_request?.expires_at)}</p>
                                        <p><span className="text-muted-foreground">Plan:</span> {formatLiters(basePlanLiters)} L ({containerNumber} x {containerLabel})</p>
                                        {autoDiffers && <p><span className="text-muted-foreground">Auto:</span> {formatLiters(autoPlanLiters)} L</p>}
                                      </div>
                                      <div className="mt-3">
                                        {clientRow.collection?.id && normalizeCollectionStatus(clientRow.collection.status) !== "CANCELED" ? (
                                          <Badge variant="outline">Registrada</Badge>
                                        ) : (
                                          <Badge variant="outline">Pendiente</Badge>
                                        )}
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>

                              <div className="mt-3 overflow-x-auto rounded-lg border border-border hidden md:block">
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
                                      <th className="px-3 py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground text-right">Estado</th>
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
                                            <Badge variant="outline">Pendiente</Badge>
                                          )}
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            </>
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
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {isOwner && (
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

      <Dialog
        open={finishDecisionModalOpen}
        onOpenChange={(open) => {
          if (!open) {
            setFinishDecisionContext({ routeDayId: null, date: "", pendingStops: 0 });
          }
          setFinishDecisionModalOpen(open);
        }}
      >
        <DialogContent className="max-h-[90vh] w-[calc(100vw-1rem)] max-w-[calc(100vw-1rem)] overflow-y-auto rounded-3xl sm:max-w-lg">
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

          <DialogFooter className="flex-col-reverse gap-2 sm:flex-row sm:justify-between">
            <Button variant="outline" className="w-full sm:w-auto" onClick={() => setFinishDecisionModalOpen(false)}>
              Volver
            </Button>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Button
                variant="secondary"
                className="w-full sm:w-auto"
                disabled={workingRouteDayId === finishDecisionContext.routeDayId}
                onClick={() => handleFinishWithDecision("PARTIAL")}
              >
                {workingRouteDayId === finishDecisionContext.routeDayId ? "Guardando..." : "Cerrar parcial"}
              </Button>
              <Button
                variant="destructive"
                className="w-full sm:w-auto"
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
        <DialogContent className="max-h-[90vh] w-[calc(100vw-1rem)] max-w-[calc(100vw-1rem)] overflow-y-auto rounded-3xl sm:max-w-lg">
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

          <DialogFooter className="flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button variant="outline" className="w-full sm:w-auto" onClick={() => setCompleteModalOpen(false)}>Cancelar</Button>
            <Button onClick={handleCompleteStop} disabled={submittingStop} className="w-full gap-2 sm:w-auto">
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
