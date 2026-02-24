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
} from "@/components/Utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import ConfirmDeleteDialog from "@/components/common/ConfirmDeleteDialog";
import { ArrowLeft, Calendar, CheckCircle, Edit, Route, Trash2, WandSparkles, RefreshCcw, MapPin } from "lucide-react";

const WEEKDAY_LABELS = ["Lunes", "Martes", "Miercoles", "Jueves", "Viernes", "Sabado", "Domingo"];

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

export default function RouteDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { api } = useAuth();
  const showSnackbar = useSnackbar();

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
  const [submittingGenerate, setSubmittingGenerate] = useState(false);

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

  const zoneDaysMap = useMemo(() => {
    const map = {};
    (overview.zone_days || []).forEach((item) => {
      map[item.weekday] = Array.isArray(item.zones) ? item.zones : [];
    });
    return map;
  }, [overview.zone_days]);

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

  const openGenerateModal = () => {
    setWeekStartDate("");
    setDailyCapacityLiters("0");
    setRegenerate(false);
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
        regenerate,
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
        <div className="flex gap-2 sm:gap-3 flex-shrink-0">
          <Button variant="outline" size="sm" onClick={() => navigate(`/routes/${id}/edit`)}>
            <Edit className="w-4 h-4 sm:mr-2" />
            Editar
          </Button>
          <Button size="sm" onClick={openGenerateModal}>
            <WandSparkles className="w-4 h-4 sm:mr-2" />
            Generar Semana
          </Button>
          <Button variant="destructive" size="sm" onClick={() => setDeleteOpen(true)}>
            <Trash2 className="w-4 h-4 sm:mr-2" />
            Eliminar
          </Button>
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
            {WEEKDAY_LABELS.map((label, weekday) => {
              const zones = zoneDaysMap[weekday] || [];
              return (
                <div key={label} className="border rounded-lg p-2">
                  <p className="text-sm font-medium">{label}</p>
                  <div className="flex flex-wrap gap-2 mt-1">
                    {zones.length === 0 ? (
                      <Badge variant="outline">Sin zonas</Badge>
                    ) : (
                      zones.map((zone) => <Badge key={`${weekday}-${zone.id}`} variant="outline">{zone.name}</Badge>)
                    )}
                  </div>
                </div>
              );
            })}
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
            <p className="text-sm text-muted-foreground text-left">No hay rutas diarias generadas para el filtro actual.</p>
          ) : (
            <div className="space-y-4">
              {overview.route_days.map((routeDay) => (
                <div key={routeDay.id} className="border rounded-lg p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="text-left">
                      <p className="font-medium">{formatDate(routeDay.date)}</p>
                      <p className="text-xs text-muted-foreground">
                        Capacidad: {routeDay.daily_capacity_liters ?? "-"} L | Paradas: {routeDay.stops}
                      </p>
                    </div>
                    <Badge className={getRouteStatusClass(routeDay.status)}>{getRouteStatusLabel(routeDay.status)}</Badge>
                  </div>

                  {routeDay.clients.length === 0 ? (
                    <p className="text-xs text-muted-foreground text-left mt-2">No hay clientes asignados en este dia.</p>
                  ) : (
                    <div className="mt-3 overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="text-left border-b">
                            <th className="py-2 pr-2">Orden</th>
                            <th className="py-2 pr-2">Cliente</th>
                            <th className="py-2 pr-2">Solicitud</th>
                            <th className="py-2 pr-2">Expira</th>
                            <th className="py-2 pr-2">Litros</th>
                          </tr>
                        </thead>
                        <tbody>
                          {routeDay.clients.map((clientRow) => (
                            <tr key={clientRow.route_day_client_id} className="border-b last:border-b-0">
                              <td className="py-2 pr-2">{clientRow.order}</td>
                              <td className="py-2 pr-2">
                                <div>
                                  <p className="font-medium">{clientRow.client_name}</p>
                                  <p className="text-xs text-muted-foreground">{clientRow.client_address || "-"}</p>
                                </div>
                              </td>
                              <td className="py-2 pr-2">
                                {clientRow.collection_request?.status ? (
                                  <Badge className={getCollectionRequestStatusClass(clientRow.collection_request.status)}>
                                    {getCollectionRequestStatusLabel(clientRow.collection_request.status)}
                                  </Badge>
                                ) : (
                                  <span className="text-muted-foreground">-</span>
                                )}
                              </td>
                              <td className="py-2 pr-2 text-xs">
                                {formatDateTime(clientRow.collection_request?.expires_at)}
                              </td>
                              <td className="py-2 pr-2 text-xs">
                                {clientRow.collection_request?.estimated_liters ?? "-"} / {clientRow.collection_request?.final_liters ?? "-"}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

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
            <div className="flex items-center space-x-2">
              <Checkbox id="regenerate" checked={regenerate} onCheckedChange={(v) => setRegenerate(Boolean(v))} />
              <Label htmlFor="regenerate" className="text-sm">Regenerar paradas existentes</Label>
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

      <ConfirmDeleteDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Eliminar ruta"
        description={`Se va a eliminar la ruta "${overview.route?.name || id}". Esta accion no se puede deshacer.`}
        confirmLabel="Eliminar"
        onConfirm={handleDelete}
        loading={deleting}
      />
    </div>
  );
}
