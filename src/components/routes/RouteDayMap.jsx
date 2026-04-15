import { useEffect, useMemo } from "react";
import L from "leaflet";
import { MapContainer, Marker, Polyline, Popup, TileLayer, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { CalendarDays, ClipboardCheck, MapPinned, Navigation2, Play, Route as RouteIcon, Square } from "lucide-react";
import {
  getCollectionRequestStatusClass,
  getCollectionRequestStatusLabel,
  getCollectionStatusClass,
  getCollectionStatusLabel,
  getRouteStatusClass,
  getRouteStatusLabel,
  normalizeCollectionStatus,
} from "@/components/Utils";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import RouteActionButton from "@/components/routes/RouteActionButton";

function formatDate(dateStr) {
  if (!dateStr) return "-";
  const date = new Date(`${dateStr}T00:00:00`);
  if (Number.isNaN(date.getTime())) return dateStr;
  return date.toLocaleDateString("es-ES", {
    weekday: "short",
    day: "2-digit",
    month: "short",
  });
}

function formatDateTime(dateTime) {
  if (!dateTime) return "-";
  const date = new Date(dateTime);
  if (Number.isNaN(date.getTime())) return dateTime;
  return date.toLocaleString("es-ES", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatLiters(value) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return "-";
  return parsed.toLocaleString("es-ES", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
}

function getContainerCapacity(containerType) {
  if (containerType === "IBC") return 1000;
  return 60;
}

function getContainerNumber(containerNumber) {
  const parsed = Number(containerNumber);
  if (!Number.isFinite(parsed) || parsed <= 0) return 1;
  return parsed;
}

function isValidLocation(location) {
  return Number.isFinite(Number(location?.lat)) && Number.isFinite(Number(location?.lng));
}

function createHubIcon() {
  return L.divIcon({
    className: "route-map-hub-marker",
    html: `
      <div style="display:flex;align-items:center;justify-content:center;width:34px;height:34px;border-radius:12px;background:#0f3d2e;color:#ffffff;border:3px solid rgba(255,255,255,0.95);box-shadow:0 16px 28px -18px rgba(15,61,46,0.8);font-weight:800;font-size:13px;">
        H
      </div>
    `,
    iconSize: [34, 34],
    iconAnchor: [17, 17],
    popupAnchor: [0, -16],
  });
}

function createStopIcon(order, state) {
  const palette = {
    pending: { background: "#10b981", text: "#ffffff" },
    completed: { background: "#0f766e", text: "#ffffff" },
    canceled: { background: "#ef4444", text: "#ffffff" },
  };
  const colors = palette[state] || palette.pending;
  return L.divIcon({
    className: "route-map-stop-marker",
    html: `
      <div style="display:flex;align-items:center;justify-content:center;min-width:34px;height:34px;padding:0 8px;border-radius:999px;background:${colors.background};color:${colors.text};border:3px solid rgba(255,255,255,0.95);box-shadow:0 16px 28px -18px rgba(15,23,42,0.5);font-weight:800;font-size:12px;line-height:1;">
        ${order}
      </div>
    `,
    iconSize: [34, 34],
    iconAnchor: [17, 17],
    popupAnchor: [0, -16],
  });
}

function MapViewportController({ points }) {
  const map = useMap();

  useEffect(() => {
    const timer = setTimeout(() => {
      map.invalidateSize();
      if (!Array.isArray(points) || points.length === 0) return;
      const bounds = L.latLngBounds(points);
      if (!bounds.isValid()) return;
      map.fitBounds(bounds, { padding: [36, 36] });
    }, 80);

    return () => clearTimeout(timer);
  }, [map, points]);

  return null;
}

function getStopVisualState(stop) {
  const normalizedStatus = normalizeCollectionStatus(stop?.collection?.status);
  if (normalizedStatus === "CANCELED") return "canceled";
  if (stop?.collection?.id) return "completed";
  return "pending";
}

function getCollectableStops(stops) {
  return stops.filter((stop) => !stop?.collection?.id);
}

function getPlanLabel(stop) {
  const requestObj = stop?.collection_request || {};
  const containerType = requestObj.container_type || "BIDONES";
  const containerNumber = getContainerNumber(requestObj.container_number);
  const basePlanLiters = containerNumber * getContainerCapacity(containerType);
  const containerLabel = containerType === "IBC" ? "IBC" : "Bidones";
  return `${formatLiters(basePlanLiters)} L - ${containerNumber} x ${containerLabel}`;
}

function getOperationalPlan(routeDay) {
  if (!routeDay || typeof routeDay !== "object") return { segments: [] };
  return routeDay.operational_plan || { segments: [] };
}

export default function RouteDayMap({
  routeDays = [],
  selectedRouteDayId,
  onSelectRouteDay,
  onOpenGoogleNavigation,
  onStartRouteDay,
  onFinishRouteDay,
  onCollectStop,
  selectedStopId = "",
  onChangeSelectedStop,
  workingRouteDayId = null,
  hub = null,
}) {
  const selectedRouteDay = useMemo(() => {
    if (!Array.isArray(routeDays) || routeDays.length === 0) return null;
    return routeDays.find((item) => String(item.id) === String(selectedRouteDayId)) || routeDays[0];
  }, [routeDays, selectedRouteDayId]);

  const orderedStops = useMemo(() => {
    const rows = Array.isArray(selectedRouteDay?.clients) ? selectedRouteDay.clients : [];
    return [...rows].sort((a, b) => Number(a.order || 0) - Number(b.order || 0));
  }, [selectedRouteDay]);

  const operationalPlan = useMemo(() => getOperationalPlan(selectedRouteDay), [selectedRouteDay]);

  const mappedStops = useMemo(
    () => orderedStops.filter((stop) => isValidLocation(stop?.client_location)),
    [orderedStops]
  );

  const stopById = useMemo(
    () =>
      orderedStops.reduce((acc, stop) => {
        acc[String(stop.route_day_client_id)] = stop;
        return acc;
      }, {}),
    [orderedStops]
  );

  const allCollectableStops = useMemo(() => getCollectableStops(orderedStops), [orderedStops]);

  const activeSegment = useMemo(() => {
    const segments = Array.isArray(operationalPlan?.segments) ? operationalPlan.segments : [];
    return segments.find((segment) => Number(segment.number) === Number(operationalPlan?.active_segment_number)) || segments[0] || null;
  }, [operationalPlan]);

  const collectableStops = useMemo(() => {
    if (!activeSegment) return allCollectableStops;
    const ids = new Set((activeSegment.stop_route_day_client_ids || []).map((value) => String(value)));
    const collectableInSegment = allCollectableStops.filter((stop) => ids.has(String(stop.route_day_client_id)));
    return collectableInSegment.length > 0 ? collectableInSegment : allCollectableStops;
  }, [activeSegment, allCollectableStops]);

  const activeStop = useMemo(() => {
    if (!selectedStopId) return collectableStops[0] || null;
    return collectableStops.find((stop) => String(stop.route_day_client_id) === String(selectedStopId)) || collectableStops[0] || null;
  }, [collectableStops, selectedStopId]);

  const mapPoints = useMemo(() => {
    const points = [];
    if (isValidLocation(hub?.location)) {
      points.push([Number(hub.location.lat), Number(hub.location.lng)]);
    }
    mappedStops.forEach((stop) => {
      points.push([Number(stop.client_location.lat), Number(stop.client_location.lng)]);
    });
    return points;
  }, [hub, mappedStops]);

  const polylineSegments = useMemo(() => {
    const segments = Array.isArray(operationalPlan?.segments) ? operationalPlan.segments : [];
    const hasHub = isValidLocation(hub?.location);
    const hubPoint = hasHub ? [Number(hub.location.lat), Number(hub.location.lng)] : null;

    if (segments.length === 0) {
      return mapPoints.length > 1 ? [mapPoints] : [];
    }

    const resolvedSegments = segments
      .map((segment) => {
        const ids = Array.isArray(segment?.stop_route_day_client_ids) ? segment.stop_route_day_client_ids : [];
        const points = ids
          .map((id) => stopById[String(id)])
          .filter((stop) => isValidLocation(stop?.client_location))
          .map((stop) => [Number(stop.client_location.lat), Number(stop.client_location.lng)]);

        if (points.length === 0) return null;
        if (!hubPoint) return points;
        return [hubPoint, ...points, hubPoint];
      })
      .filter(Boolean);

    return resolvedSegments.length > 0 ? resolvedSegments : (mapPoints.length > 1 ? [mapPoints] : []);
  }, [hub, mapPoints, operationalPlan, stopById]);

  const daySummary = useMemo(() => {
    let completed = 0;
    let canceled = 0;

    orderedStops.forEach((stop) => {
      const normalizedStatus = normalizeCollectionStatus(stop?.collection?.status);
      if (normalizedStatus === "CANCELED") {
        canceled += 1;
        return;
      }
      if (stop?.collection?.id) completed += 1;
    });

    return {
      completed,
      canceled,
      pending: Math.max(orderedStops.length - completed - canceled, 0),
      withoutLocation: Math.max(orderedStops.length - mappedStops.length, 0),
    };
  }, [mappedStops.length, orderedStops]);

  if (!Array.isArray(routeDays) || routeDays.length === 0) {
    return null;
  }

  return (
    <Card className="overflow-hidden border-border/80 bg-card/95">
      <CardContent className="space-y-3 p-2.5 sm:space-y-4 sm:p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-left">
            <p className="flex items-center gap-2 text-sm font-semibold text-foreground">
              <MapPinned className="h-4 w-4 text-primary" />
              Realizacion de ruta
            </p>
          </div>
          {selectedRouteDay ? (
            <div className="flex flex-wrap items-center gap-2">
              <Badge className={getRouteStatusClass(selectedRouteDay.status)}>
                {getRouteStatusLabel(selectedRouteDay.status)}
              </Badge>
              <Badge variant="outline">
                <CalendarDays className="mr-1 h-3.5 w-3.5" />
                {formatDate(selectedRouteDay.date)}
              </Badge>
            </div>
          ) : null}
        </div>

        <div className="md:hidden">
          <Select value={selectedRouteDay ? String(selectedRouteDay.id) : ""} onValueChange={(value) => onSelectRouteDay?.(value)}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Selecciona jornada" />
            </SelectTrigger>
            <SelectContent>
              {routeDays.map((routeDay) => (
                <SelectItem key={routeDay.id} value={String(routeDay.id)}>
                  {formatDate(routeDay.date)} - {getRouteStatusLabel(routeDay.status)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="hidden snap-x gap-2 overflow-x-auto pb-1 md:flex">
          {routeDays.map((routeDay) => {
            const selected = String(routeDay.id) === String(selectedRouteDay?.id);
            return (
              <button
                key={routeDay.id}
                type="button"
                onClick={() => onSelectRouteDay?.(String(routeDay.id))}
                className={`min-w-[124px] snap-start rounded-2xl border px-3 py-3 text-left transition-all sm:min-w-[160px] sm:px-4 ${
                  selected
                    ? "border-primary/40 bg-primary/10 shadow-elegant"
                    : "border-border/80 bg-background/80 hover:border-primary/30 hover:bg-accent/40"
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-semibold text-foreground">{formatDate(routeDay.date)}</span>
                  <Badge className={getRouteStatusClass(routeDay.status)}>{getRouteStatusLabel(routeDay.status)}</Badge>
                </div>
                <p className="mt-2 text-xs text-muted-foreground">{routeDay.stops || 0} paradas previstas</p>
              </button>
            );
          })}
        </div>

        {selectedRouteDay ? (
          <div className="grid items-start gap-3 xl:grid-cols-[minmax(0,1.2fr)_340px] 2xl:grid-cols-[minmax(0,1.45fr)_360px] 2xl:gap-4">
            <div className="order-2 overflow-hidden rounded-3xl border border-border/80 bg-background/70 shadow-elegant 2xl:order-1">
              <div className="flex flex-col gap-2 border-b border-border/80 bg-gradient-to-r from-primary/10 via-primary/5 to-transparent px-4 py-3 text-left">
                <p className="text-sm font-semibold text-foreground">Recorrido del dia</p>
                <p className="text-xs text-muted-foreground">Mapa operativo de la jornada seleccionada.</p>
              </div>

              {mapPoints.length === 0 ? (
                <div className="flex min-h-[340px] flex-col items-center justify-center gap-2 px-6 py-10 text-center sm:min-h-[420px] lg:min-h-[520px] xl:min-h-[620px]">
                  <RouteIcon className="h-10 w-10 text-primary/70" />
                  <p className="text-sm font-medium text-foreground">No hay coordenadas suficientes para dibujar el recorrido.</p>
                  <p className="max-w-md text-xs text-muted-foreground">
                    Configura la ubicacion del hub y de los clientes para ver el trazado en el mapa operativo.
                  </p>
                </div>
              ) : (
                <MapContainer
                  center={mapPoints[0]}
                  zoom={12}
                  scrollWheelZoom
                  className="h-[360px] w-full sm:h-[430px] md:h-[500px] lg:h-[560px] xl:h-[620px]"
                >
                  <TileLayer
                    attribution="&copy; OpenStreetMap contributors"
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  />
                  <MapViewportController points={mapPoints} />
                  {isValidLocation(hub?.location) ? (
                    <Marker
                      position={[Number(hub.location.lat), Number(hub.location.lng)]}
                      icon={createHubIcon()}
                    >
                      <Popup>
                        <div className="space-y-1">
                          <p className="font-semibold">{hub.name || "Hub"}</p>
                          <p className="text-xs text-slate-600">Punto de salida</p>
                        </div>
                      </Popup>
                    </Marker>
                  ) : null}
                  {polylineSegments.map((segmentPoints, index) => (
                    <Polyline
                      key={`segment-${index + 1}`}
                      positions={segmentPoints}
                      pathOptions={{
                        color: "#10b981",
                        weight: 4,
                        opacity: 0.82,
                      }}
                    />
                  ))}
                  {mappedStops.map((stop) => (
                    <Marker
                      key={stop.route_day_client_id}
                      position={[Number(stop.client_location.lat), Number(stop.client_location.lng)]}
                      icon={createStopIcon(stop.order, getStopVisualState(stop))}
                    >
                      <Popup>
                        <div className="min-w-[170px] max-w-[220px] space-y-2">
                          <div>
                            <p className="font-semibold">#{stop.order} - {stop.client_name}</p>
                            <p className="text-xs text-slate-600">{stop.client_address || "-"}</p>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {stop.collection_request?.status ? (
                              <Badge className={getCollectionRequestStatusClass(stop.collection_request.status)}>
                                {getCollectionRequestStatusLabel(stop.collection_request.status)}
                              </Badge>
                            ) : (
                              <Badge variant="outline">Sin solicitud</Badge>
                            )}
                            {stop.collection?.status ? (
                              <Badge className={getCollectionStatusClass(stop.collection.status)}>
                                {getCollectionStatusLabel(stop.collection.status)}
                              </Badge>
                            ) : (
                              <Badge variant="outline">Pendiente</Badge>
                            )}
                          </div>
                          <p className="text-xs text-slate-700">Plan base: {getPlanLabel(stop)}</p>
                        </div>
                      </Popup>
                    </Marker>
                  ))}
                </MapContainer>
              )}
            </div>

            <div className="order-1 space-y-3 2xl:order-2 2xl:sticky 2xl:top-24 2xl:space-y-4">
              <div className="rounded-3xl border border-border/80 bg-background/85 p-3 sm:p-4">
                <div className="text-left">
                  <p className="text-sm font-semibold text-foreground">Jornada</p>
                </div>

                <div className="mt-3 flex flex-col gap-2">
                  <RouteActionButton
                    size="sm"
                    tone="secondary"
                    icon={Navigation2}
                    className="w-full justify-start text-left"
                    disabled={!selectedRouteDay?.id || workingRouteDayId === selectedRouteDay.id || orderedStops.length === 0}
                    onClick={() => onOpenGoogleNavigation?.(selectedRouteDay.id)}
                  >
                    {workingRouteDayId === selectedRouteDay.id ? "Preparando..." : (
                      <>
                        <span className="sm:hidden">Abrir Google Maps</span>
                        <span className="hidden sm:inline">Abrir navegacion en Google</span>
                      </>
                    )}
                  </RouteActionButton>

                  {(selectedRouteDay.status === "PLANNED" || selectedRouteDay.status === "PARTIAL") ? (
                    <RouteActionButton
                      size="sm"
                      tone="accent"
                      icon={Play}
                      className="w-full justify-start text-left"
                      disabled={workingRouteDayId === selectedRouteDay.id}
                      onClick={() => onStartRouteDay?.(selectedRouteDay.id)}
                    >
                      {workingRouteDayId === selectedRouteDay.id ? "Iniciando..." : "Iniciar jornada"}
                    </RouteActionButton>
                  ) : null}

                  {selectedRouteDay.status === "IN_PROGRESS" ? (
                    <RouteActionButton
                      size="sm"
                      tone="danger"
                      icon={Square}
                      className="w-full justify-start text-left"
                      disabled={workingRouteDayId === selectedRouteDay.id}
                      onClick={() => onFinishRouteDay?.(selectedRouteDay.id)}
                    >
                      {workingRouteDayId === selectedRouteDay.id ? "Cerrando..." : "Finalizar jornada"}
                    </RouteActionButton>
                  ) : null}
                </div>

                <div className="mt-3 rounded-2xl border border-border/70 bg-muted/10 p-3 text-left">
                  <p className="text-sm font-medium text-foreground">
                    {daySummary.pending} pendientes, {daySummary.completed} registradas y {daySummary.canceled} canceladas
                  </p>
                  {daySummary.withoutLocation > 0 ? (
                    <p className="mt-1 text-xs text-muted-foreground">
                      {daySummary.withoutLocation} paradas no se muestran en el mapa porque no tienen coordenadas.
                    </p>
                  ) : null}
                </div>
              </div>

              <div className="rounded-3xl border border-border/80 bg-background/85 p-3 sm:p-4">
                <div className="text-left">
                  <p className="text-sm font-semibold text-foreground">Parada activa</p>
                  <p className="text-xs text-muted-foreground">Selecciona la siguiente parada pendiente para registrarla.</p>
                </div>

                {collectableStops.length === 0 ? (
                  <div className="mt-4 rounded-2xl border border-dashed border-border/80 bg-muted/20 px-4 py-6 text-center text-sm text-muted-foreground">
                    No hay paradas pendientes en esta jornada.
                  </div>
                ) : (
                  <div className="mt-4 space-y-3">
                    <Select
                      value={activeStop ? String(activeStop.route_day_client_id) : ""}
                      onValueChange={(value) => onChangeSelectedStop?.(value)}
                      disabled={selectedRouteDay.status !== "IN_PROGRESS" || collectableStops.length === 0}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Selecciona parada pendiente" />
                      </SelectTrigger>
                      <SelectContent>
                        {collectableStops.map((stop) => (
                          <SelectItem key={stop.route_day_client_id} value={String(stop.route_day_client_id)}>
                            #{stop.order} - {stop.client_name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    {activeStop ? (
                      <div className="rounded-2xl border border-border/80 bg-muted/20 p-3 text-left sm:p-4">
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                          <div className="min-w-0">
                            <p className="font-semibold text-foreground">#{activeStop.order} - {activeStop.client_name}</p>
                            <p className="text-xs text-muted-foreground">{activeStop.client_address || "-"}</p>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {activeStop.collection_request?.status ? (
                              <Badge className={getCollectionRequestStatusClass(activeStop.collection_request.status)}>
                                {getCollectionRequestStatusLabel(activeStop.collection_request.status)}
                              </Badge>
                            ) : (
                              <Badge variant="outline">Sin solicitud</Badge>
                            )}
                          </div>
                        </div>

                        <div className="mt-3 grid gap-1 text-xs text-muted-foreground">
                          <p><span className="font-medium text-foreground">Plan base:</span> {getPlanLabel(activeStop)}</p>
                          <p><span className="font-medium text-foreground">Limite:</span> {formatDateTime(activeStop.collection_request?.expires_at)}</p>
                          {activeStop.collection?.status ? (
                            <p>
                              <span className="font-medium text-foreground">Estado recogida:</span>{" "}
                              <Badge className={getCollectionStatusClass(activeStop.collection.status)}>
                                {getCollectionStatusLabel(activeStop.collection.status)}
                              </Badge>
                            </p>
                          ) : null}
                        </div>

                        <RouteActionButton
                          size="sm"
                          tone="primary"
                          icon={ClipboardCheck}
                          className="mt-4 w-full"
                          disabled={selectedRouteDay.status !== "IN_PROGRESS"}
                          onClick={() => onCollectStop?.(selectedRouteDay, activeStop)}
                        >
                          <span className="sm:hidden">Registrar parada</span>
                          <span className="hidden sm:inline">Recoger parada seleccionada</span>
                        </RouteActionButton>
                      </div>
                    ) : null}
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-border/80 bg-muted/20 px-4 py-10 text-center text-sm text-muted-foreground">
            No hay rutas diarias visibles para pintar en el mapa.
          </div>
        )}
      </CardContent>
    </Card>
  );
}
