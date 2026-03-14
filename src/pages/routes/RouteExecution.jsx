import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "@/context/AuthProvider";
import { useSnackbar } from "@/context/SnackbarProvider";
import { handleApiError, normalizeCollectionStatus } from "@/components/Utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import RouteDayMap from "@/components/routes/RouteDayMap";
import RouteActionButton from "@/components/routes/RouteActionButton";
import { ArrowLeft, Calendar, ClipboardCheck, Eye, RefreshCcw } from "lucide-react";

const WEEKDAY_LABELS = ["Lunes", "Martes", "Miercoles", "Jueves", "Viernes", "Sabado", "Domingo"];
const CONTAINER_TYPES = [
  { value: "BIDONES", label: "Bidones (60L)" },
  { value: "IBC", label: "IBC (1000L)" },
];

function formatDate(dateStr) {
  if (!dateStr) return "-";
  const date = new Date(`${dateStr}T00:00:00`);
  if (Number.isNaN(date.getTime())) return dateStr;
  return date.toLocaleDateString("es-ES");
}

function formatDateTime(dateTime) {
  if (!dateTime) return "-";
  const date = new Date(dateTime);
  if (Number.isNaN(date.getTime())) return dateTime;
  return date.toLocaleString("es-ES");
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

function getContainerCapacity(containerType) {
  if (containerType === "IBC") return 1000;
  return 60;
}

function getContainerNumber(containerNumber) {
  const parsed = Number(containerNumber);
  if (Number.isFinite(parsed) && parsed > 0) return parsed;
  return 1;
}

function isStopCollectable(stop) {
  if (!stop?.collection?.id) return true;
  return normalizeCollectionStatus(stop.collection.status) === "CANCELED";
}

function getCollectableStops(routeDay) {
  const clients = Array.isArray(routeDay?.clients) ? routeDay.clients : [];
  return clients.filter((stop) => isStopCollectable(stop));
}

export default function RouteExecution() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { api } = useAuth();
  const showSnackbar = useSnackbar();

  const [loading, setLoading] = useState(false);
  const [overview, setOverview] = useState({ route: null, route_days: [] });
  const [workersMap, setWorkersMap] = useState({});
  const [weekFilter, setWeekFilter] = useState("");
  const [selectedMapRouteDayId, setSelectedMapRouteDayId] = useState("");
  const [selectedStopByRouteDay, setSelectedStopByRouteDay] = useState({});
  const [workingRouteDayId, setWorkingRouteDayId] = useState(null);
  const [completeModalOpen, setCompleteModalOpen] = useState(false);
  const [finishDecisionModalOpen, setFinishDecisionModalOpen] = useState(false);
  const [finishDecisionContext, setFinishDecisionContext] = useState({ routeDayId: null, date: "", pendingStops: 0 });
  const [activeStop, setActiveStop] = useState(null);
  const [submittingStop, setSubmittingStop] = useState(false);
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
        route_days: Array.isArray(res.data?.route_days) ? res.data.route_days : [],
      });
    } catch (e) {
      const msg = handleApiError(e, "No se pudo cargar la operativa de la ruta.");
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

  const routeDays = useMemo(() => (Array.isArray(overview.route_days) ? overview.route_days : []), [overview.route_days]);

  const executionRouteDays = useMemo(() => {
    return routeDays.filter((routeDay) => {
      const clients = Array.isArray(routeDay?.clients) ? routeDay.clients : [];
      const plannedStops = Number.isFinite(Number(routeDay?.stops)) ? Number(routeDay.stops) : clients.length;
      return plannedStops > 0 || ["IN_PROGRESS", "PARTIAL", "COMPLETED", "CANCELED"].includes(routeDay?.status);
    });
  }, [routeDays]);

  const assignedWorkerLabel = useMemo(() => {
    const workerId = overview.route?.worker;
    if (!workerId) return "Sin asignar";
    return workersMap[workerId] || `Trabajador ${workerId}`;
  }, [overview.route?.worker, workersMap]);

  const routeDefaultCapacityLabel = useMemo(() => {
    const routeDayWithCapacity = executionRouteDays.find(
      (routeDay) => routeDay?.daily_capacity_liters !== null && routeDay?.daily_capacity_liters !== undefined && routeDay?.daily_capacity_liters !== ""
    );
    if (routeDayWithCapacity) return formatCapacityLiters(routeDayWithCapacity.daily_capacity_liters);
    return formatCapacityLiters(overview.route?.default_daily_capacity_liters);
  }, [executionRouteDays, overview.route?.default_daily_capacity_liters]);

  useEffect(() => {
    if (executionRouteDays.length === 0) {
      setSelectedMapRouteDayId("");
      return;
    }

    setSelectedMapRouteDayId((prev) => {
      const stillExists = executionRouteDays.some((routeDay) => String(routeDay.id) === String(prev));
      if (stillExists) return prev;
      const preferred =
        executionRouteDays.find((routeDay) => routeDay.status === "IN_PROGRESS") ||
        executionRouteDays.find((routeDay) => routeDay.status === "PARTIAL") ||
        executionRouteDays[0];
      return preferred ? String(preferred.id) : "";
    });
  }, [executionRouteDays]);

  useEffect(() => {
    if (executionRouteDays.length === 0) {
      setSelectedStopByRouteDay({});
      return;
    }

    setSelectedStopByRouteDay((prev) => {
      const next = { ...prev };
      let changed = false;

      executionRouteDays.forEach((routeDay) => {
        const collectableStops = getCollectableStops(routeDay);
        const currentValue = next[routeDay.id];
        const stillValid = collectableStops.some((stop) => String(stop.route_day_client_id) === String(currentValue));
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
  }, [executionRouteDays]);

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
    const routeDay = executionRouteDays.find((item) => String(item.id) === String(routeDayId));
    const pendingStops = getCollectableStops(routeDay).length;
    if (pendingStops > 0) {
      setFinishDecisionContext({ routeDayId, date: routeDay?.date || "", pendingStops });
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

  const openCompleteStopModal = (routeDay, stop) => {
    setSelectedMapRouteDayId(String(routeDay.id));
    setSelectedStopByRouteDay((prev) => ({ ...prev, [routeDay.id]: String(stop.route_day_client_id) }));
    setActiveStop({ routeDayId: routeDay.id, stop });
    setCompletePayload({
      container_type: stop?.collection_request?.container_type || "BIDONES",
      container_number: String(stop?.collection_request?.container_number || "1"),
      notes: "",
      mark_as_canceled: false,
      force: false,
    });
    setCompleteModalOpen(true);
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
        <div className="flex min-w-0 flex-1 items-start gap-3 sm:items-center sm:gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/routes")} className="mt-1 flex-shrink-0 sm:mt-0">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="min-w-0 flex-1">
            <h1 className="text-left text-xl font-bold leading-tight text-foreground sm:text-2xl lg:text-3xl">
              {overview.route?.name || "Realizar ruta"}
            </h1>
            <p className="mt-1 text-left text-sm leading-relaxed text-muted-foreground sm:text-base">
              Operativa diaria con mapa, jornada activa y registro de la siguiente parada.
            </p>
          </div>
        </div>
        <RouteActionButton tone="secondary" size="sm" icon={Eye} className="w-full sm:w-auto" onClick={() => navigate(`/routes/${id}`)} disabled={loading}>
          Ver detalle
        </RouteActionButton>
      </div>

      <Card className="overflow-hidden">
        <CardContent className="pt-6">
          <div className="flex flex-col gap-4 2xl:flex-row 2xl:items-end 2xl:justify-between">
            <div className="grid gap-3 md:grid-cols-2 2xl:grid-cols-4 2xl:flex-1">
              <div className="rounded-2xl border border-border/80 bg-background/80 px-4 py-3 text-left">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Trabajador</p>
                <p className="mt-1 text-sm font-semibold text-foreground">{assignedWorkerLabel}</p>
              </div>
              <div className="rounded-2xl border border-border/80 bg-background/80 px-4 py-3 text-left">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Semana operativa</p>
                <p className="mt-1 text-sm font-semibold text-foreground">
                  {WEEKDAY_LABELS[overview.route?.week_start ?? 0]} - {WEEKDAY_LABELS[overview.route?.week_end ?? 6]}
                </p>
              </div>
              <div className="rounded-2xl border border-border/80 bg-background/80 px-4 py-3 text-left">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Capacidad diaria</p>
                <p className="mt-1 text-sm font-semibold text-foreground">{routeDefaultCapacityLabel}</p>
              </div>
              <div className="rounded-2xl border border-border/80 bg-background/80 px-4 py-3 text-left">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Dias con paradas</p>
                <p className="mt-1 text-sm font-semibold text-foreground">{executionRouteDays.length}</p>
              </div>
            </div>

            <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto_auto] sm:items-end">
              <div className="min-w-0 space-y-2">
                <Label htmlFor="weekFilter">Semana</Label>
                <Input id="weekFilter" type="date" value={weekFilter} onChange={(e) => setWeekFilter(e.target.value)} />
              </div>
              <RouteActionButton tone="secondary" className="w-full sm:w-auto" onClick={fetchOverview} disabled={loading}>
                <RefreshCcw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />
                Refrescar
              </RouteActionButton>
              <RouteActionButton tone="secondary" className="w-full sm:w-auto" onClick={() => setWeekFilter("")}>Actual</RouteActionButton>
            </div>
          </div>
        </CardContent>
      </Card>

      {loading ? (
        <div className="rounded-xl border border-dashed border-border bg-muted/20 p-6 text-center">
          <p className="text-sm text-muted-foreground">Cargando operativa de la ruta...</p>
        </div>
      ) : routeDays.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-muted/20 p-6 text-center">
          <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
            <Calendar className="h-5 w-5 text-primary" />
          </div>
          <p className="text-sm font-medium text-foreground">Todavia no hay rutas diarias para esta semana operativa.</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Revisa la planificacion desde el detalle de la ruta y genera la semana operativa si hace falta.
          </p>
          <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
            <Button size="sm" variant="outline" onClick={() => navigate(`/routes/${id}`)}>Ir al detalle</Button>
            <Button size="sm" variant="outline" onClick={fetchOverview}>Refrescar</Button>
          </div>
        </div>
      ) : executionRouteDays.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-muted/20 p-6 text-center">
          <p className="text-sm font-medium text-foreground">No hay jornadas con paradas para ejecutar en esta semana.</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Prueba con otra semana o revisa la planificacion desde el detalle de la ruta.
          </p>
        </div>
      ) : (
        <RouteDayMap
          routeDays={executionRouteDays}
          selectedRouteDayId={selectedMapRouteDayId}
          onSelectRouteDay={setSelectedMapRouteDayId}
          onOpenGoogleNavigation={handleGoogleNavigation}
          onStartRouteDay={handleStartRouteDay}
          onFinishRouteDay={handleFinishRouteDay}
          onCollectStop={openCompleteStopModal}
          selectedStopId={selectedMapRouteDayId ? (selectedStopByRouteDay[selectedMapRouteDayId] || "") : ""}
          onChangeSelectedStop={(value) => {
            if (!selectedMapRouteDayId) return;
            setSelectedStopByRouteDay((prev) => ({ ...prev, [selectedMapRouteDayId]: value }));
          }}
          workingRouteDayId={workingRouteDayId}
          hub={overview.route?.hub}
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
              Quedan <span className="font-semibold">{finishDecisionContext.pendingStops}</span> paradas sin registrar en <span className="font-semibold">{formatDate(finishDecisionContext.date)}</span>.
            </p>
            <p className="text-xs text-muted-foreground">
              Elige si quieres cerrar la ruta como parcial o cancelarla por completo.
            </p>
          </div>

          <DialogFooter className="flex-col-reverse gap-2 sm:flex-row sm:justify-between">
            <Button variant="outline" className="w-full sm:w-auto" onClick={() => setFinishDecisionModalOpen(false)}>Volver</Button>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Button className="w-full sm:w-auto" variant="secondary" disabled={workingRouteDayId === finishDecisionContext.routeDayId} onClick={() => handleFinishWithDecision("PARTIAL")}>
                {workingRouteDayId === finishDecisionContext.routeDayId ? "Guardando..." : "Cerrar parcial"}
              </Button>
              <Button className="w-full sm:w-auto" variant="destructive" disabled={workingRouteDayId === finishDecisionContext.routeDayId} onClick={() => handleFinishWithDecision("CANCELED")}>
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
            <div className="space-y-1 rounded-lg border border-border p-3 text-left">
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
            <p className="text-left text-xs text-muted-foreground">
              La medicion y el ajuste de litros se hace en nave, no en esta parada.
            </p>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
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
                  value={completePayload.container_number}
                  onChange={(e) => setCompletePayload((prev) => ({ ...prev, container_number: e.target.value }))}
                  disabled={completePayload.mark_as_canceled}
                />
              </div>
            </div>
            <div className="rounded-lg border border-border bg-muted/20 p-3 text-left text-xs">
              <p>
                <span className="text-muted-foreground">Plan base esperado:</span>{" "}
                {(() => {
                  const containerType = completePayload.container_type || "BIDONES";
                  const containerNumber = getContainerNumber(completePayload.container_number);
                  return `${formatLiters(containerNumber * getContainerCapacity(containerType))} L`;
                })()}
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="notes">Notas</Label>
              <Textarea id="notes" value={completePayload.notes} onChange={(e) => setCompletePayload((prev) => ({ ...prev, notes: e.target.value }))} rows={4} />
            </div>
            <div className="flex items-start gap-2">
              <Checkbox
                id="mark_as_canceled"
                checked={completePayload.mark_as_canceled}
                onCheckedChange={(value) => setCompletePayload((prev) => ({ ...prev, mark_as_canceled: Boolean(value) }))}
              />
              <Label htmlFor="mark_as_canceled" className="text-sm">Marcar parada como cancelada</Label>
            </div>
            <div className="flex items-start gap-2">
              <Checkbox
                id="force"
                checked={completePayload.force}
                onCheckedChange={(value) => setCompletePayload((prev) => ({ ...prev, force: Boolean(value) }))}
              />
              <Label htmlFor="force" className="text-sm">Forzar recogida fuera de orden</Label>
            </div>
          </div>

          <DialogFooter className="flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button className="w-full sm:w-auto" variant="outline" onClick={() => setCompleteModalOpen(false)}>Cancelar</Button>
            <Button onClick={handleCompleteStop} disabled={submittingStop} className="w-full gap-2 sm:w-auto">
              <ClipboardCheck className="h-4 w-4" />
              {submittingStop ? "Registrando..." : "Registrar parada"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
