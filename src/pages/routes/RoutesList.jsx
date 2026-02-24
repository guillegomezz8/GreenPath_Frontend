import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
} from "lucide-react";
import { useAuth } from "@/context/AuthProvider";
import { useSnackbar } from "@/context/SnackbarProvider";
import { handleApiError } from "@/components/Utils";
import ConfirmDeleteDialog from "@/components/common/ConfirmDeleteDialog";

const WEEKDAY_LABELS = ["Lunes", "Martes", "Miercoles", "Jueves", "Viernes", "Sabado", "Domingo"];

function formatDate(dateStr) {
  if (!dateStr) return "-";
  const d = new Date(`${dateStr}T00:00:00`);
  if (Number.isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString("es-ES");
}

export default function RoutesList() {
  const navigate = useNavigate();
  const { api } = useAuth();
  const showSnackbar = useSnackbar();

  const [routesData, setRoutesData] = useState([]);
  const [workersMap, setWorkersMap] = useState({});
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [generatedByRoute, setGeneratedByRoute] = useState({});

  const [generateModalOpen, setGenerateModalOpen] = useState(false);
  const [selectedRoute, setSelectedRoute] = useState(null);
  const [weekStartDate, setWeekStartDate] = useState("");
  const [dailyCapacityLiters, setDailyCapacityLiters] = useState("0");
  const [regenerate, setRegenerate] = useState(false);
  const [submittingGenerate, setSubmittingGenerate] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [toDelete, setToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

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

  const filteredRoutes = useMemo(() => routesData, [routesData]);

  const stats = useMemo(() => {
    const total = routesData.length;
    const withWorkers = routesData.filter((r) => Array.isArray(r.workers) && r.workers.length > 0).length;
    const withoutWorkers = routesData.filter((r) => !Array.isArray(r.workers) || r.workers.length === 0).length;
    const noEndDate = routesData.filter((r) => !r.end_date).length;
    return { total, withWorkers, withoutWorkers, noEndDate };
  }, [routesData]);

  const askGenerateWeek = (route) => {
    setSelectedRoute(route);
    setWeekStartDate("");
    setDailyCapacityLiters("0");
    setRegenerate(false);
    setGenerateModalOpen(true);
  };

  const handleGenerateWeek = async () => {
    if (!selectedRoute?.id) return;
    if (!weekStartDate) {
      showSnackbar("Debes indicar la fecha de inicio de semana.", "error");
      return;
    }

    try {
      setSubmittingGenerate(true);
      const payload = {
        week_start_date: weekStartDate,
        daily_capacity_liters: dailyCapacityLiters,
        regenerate,
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
            Gestion de Rutas
          </h1>
          <p className="text-muted-foreground">Planifica y supervisa las rutas operativas</p>
        </div>
        <Button className="gap-2" onClick={() => navigate("/routes/new")}>
          <Plus className="w-4 h-4" />
          Nueva Ruta
        </Button>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nombre de ruta o trabajador..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6 text-center">
            <div className="text-2xl font-bold text-primary">{stats.total}</div>
            <p className="text-sm text-muted-foreground">Total Rutas</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 text-center">
            <div className="text-2xl font-bold text-blue-500">{stats.withWorkers}</div>
            <p className="text-sm text-muted-foreground">Con trabajadores</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 text-center">
            <div className="text-2xl font-bold text-orange-500">{stats.withoutWorkers}</div>
            <p className="text-sm text-muted-foreground">Sin trabajadores</p>
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
            <CardContent className="py-12 text-center text-muted-foreground">No hay rutas para los filtros aplicados.</CardContent>
          </Card>
        ) : (
          filteredRoutes.map((route) => {
            const assignedWorkers = Array.isArray(route.workers) ? route.workers : [];
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
                        <span className="text-muted-foreground">Trabajadores:</span>
                        <span className="font-medium">{assignedWorkers.length}</span>
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {assignedWorkers.length === 0 ? (
                          <Badge variant="outline">Sin asignar</Badge>
                        ) : (
                          assignedWorkers.map((id) => (
                            <Badge key={id} variant="outline">
                              {workersMap[id] || `Trabajador ${id}`}
                            </Badge>
                          ))
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

                  <div className="flex gap-2 pt-2">
                    <Button size="sm" variant="outline" className="flex-1 gap-2" onClick={() => navigate(`/routes/${route.id}`)}>
                      <Eye className="w-4 h-4" />
                      Ver
                    </Button>
                    <Button size="sm" variant="outline" className="flex-1 gap-2" onClick={() => navigate(`/routes/${route.id}/edit`)}>
                      <Edit className="w-4 h-4" />
                      Editar
                    </Button>
                    <Button size="sm" className="flex-1 gap-2" onClick={() => askGenerateWeek(route)}>
                      <WandSparkles className="w-4 h-4" />
                      Generar Semana
                    </Button>
                    <Button size="sm" variant="destructive" className="gap-2" onClick={() => askDelete(route)}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>

      <Dialog open={generateModalOpen} onOpenChange={setGenerateModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Generar semana operativa</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="weekStartDate">Inicio de semana</Label>
              <Input
                id="weekStartDate"
                type="date"
                value={weekStartDate}
                onChange={(e) => setWeekStartDate(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="capacity">Capacidad diaria (litros)</Label>
              <Input
                id="capacity"
                type="number"
                min="0"
                step="0.01"
                value={dailyCapacityLiters}
                onChange={(e) => setDailyCapacityLiters(e.target.value)}
              />
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox id="regenerate" checked={regenerate} onCheckedChange={(v) => setRegenerate(Boolean(v))} />
              <Label htmlFor="regenerate" className="text-sm">
                Regenerar paradas existentes
              </Label>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setGenerateModalOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleGenerateWeek} disabled={submittingGenerate} className="gap-2">
              <RefreshCcw className={`w-4 h-4 ${submittingGenerate ? "animate-spin" : ""}`} />
              {submittingGenerate ? "Generando..." : "Generar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDeleteDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Eliminar ruta"
        description={toDelete ? `Se va a eliminar la ruta "${toDelete.name}". Esta accion no se puede deshacer.` : "Esta accion no se puede deshacer."}
        confirmLabel="Eliminar"
        onConfirm={handleDelete}
        loading={deleting}
      />
    </div>
  );
}
