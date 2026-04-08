import { useCallback, useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/context/AuthProvider";
import { useSnackbar } from "@/context/SnackbarProvider";
import {
  getCollectionRequestStatusClass,
  getCollectionRequestStatusLabel,
  handleApiError,
} from "@/components/Utils";
import { CalendarClock, CheckCircle, ChevronDown, Clock3, RefreshCcw } from "lucide-react";

const FILTER_OPTIONS = [
  { value: "OPEN", label: "Abiertas" },
  { value: "PENDING", label: "Pendientes" },
  { value: "AUTO_ESTIMATED", label: "Autoestimadas" },
  { value: "ANSWERED", label: "Respondidas" },
  { value: "MANUAL", label: "Manuales" },
  { value: "ALL", label: "Todas" },
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

function isExpired(expiresAt) {
  if (!expiresAt) return false;
  const d = new Date(expiresAt);
  if (Number.isNaN(d.getTime())) return false;
  return d.getTime() <= Date.now();
}

function getRequestRows(payload) {
  if (Array.isArray(payload?.results)) return payload.results;
  if (Array.isArray(payload)) return payload;
  return [];
}

export default function CollectionRequestsPage() {
  const { api } = useAuth();
  const showSnackbar = useSnackbar();

  const [loading, setLoading] = useState(false);
  const [filterStatus, setFilterStatus] = useState("OPEN");
  const [requests, setRequests] = useState([]);
  const [answerModalOpen, setAnswerModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [finalLiters, setFinalLiters] = useState("");
  const [isStatsOpen, setIsStatsOpen] = useState(false);

  const fetchRequests = useCallback(async () => {
    try {
      setLoading(true);
      if (filterStatus === "ALL") {
        const statuses = ["PENDING", "AUTO_ESTIMATED", "ANSWERED", "MANUAL"];
        const responses = await Promise.all(
          statuses.map((status) =>
            api().get("collections/requests/me/", { params: { page: 1, page_size: 100, status } })
          )
        );
        const allRows = responses.flatMap((res) => getRequestRows(res.data));
        const deduped = [...new Map(allRows.map((row) => [row.id, row])).values()];
        setRequests(deduped.sort((a, b) => String(b.route_day_date || "").localeCompare(String(a.route_day_date || ""))));
        return;
      }

      const params = { page: 1, page_size: 100 };
      if (filterStatus !== "OPEN") params.status = filterStatus;
      const res = await api().get("collections/requests/me/", { params });
      const rows = getRequestRows(res.data);
      setRequests(rows.sort((a, b) => String(b.route_day_date || "").localeCompare(String(a.route_day_date || ""))));
    } catch (e) {
      const msg = handleApiError(e, "No se pudieron cargar las solicitudes.");
      showSnackbar(msg, "error");
    } finally {
      setLoading(false);
    }
  }, [api, filterStatus, showSnackbar]);

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  const stats = useMemo(() => {
    const total = requests.length;
    const pending = requests.filter((row) => row.status === "PENDING" || row.status === "AUTO_ESTIMATED").length;
    const answered = requests.filter((row) => row.status === "ANSWERED" || row.status === "MANUAL").length;
    const expired = requests.filter((row) => isExpired(row.expires_at) && (row.status === "PENDING" || row.status === "AUTO_ESTIMATED")).length;
    return { total, pending, answered, expired };
  }, [requests]);

  const openAnswerModal = (row) => {
    setSelectedRequest(row);
    setFinalLiters(row?.final_liters || row?.estimated_liters || "");
    setAnswerModalOpen(true);
  };

  const handleSubmitAnswer = async () => {
    if (!selectedRequest?.id) return;
    const litersValue = Number(finalLiters);
    if (!Number.isFinite(litersValue) || litersValue <= 0) {
      showSnackbar("Debes introducir litros validos mayores que cero.", "error");
      return;
    }
    try {
      setSubmitting(true);
      await api().post(`collections/requests/${encodeURIComponent(selectedRequest.id)}/answer/`, {
        final_liters: String(litersValue),
      });
      showSnackbar("Solicitud respondida correctamente.", "success");
      setAnswerModalOpen(false);
      setSelectedRequest(null);
      setFinalLiters("");
      await fetchRequests();
    } catch (e) {
      const msg = handleApiError(e, "No se pudo responder la solicitud.");
      showSnackbar(msg, "error");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="text-left">
          <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
            <CalendarClock className="w-8 h-8 text-primary" />
            Mis solicitudes de recogida
          </h1>
          <p className="text-muted-foreground">Consulta tus proximas recogidas y responde los litros previstos antes del limite.</p>
        </div>
        <Button variant="outline" onClick={fetchRequests} disabled={loading} className="w-full gap-2 md:w-auto">
          <RefreshCcw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          Refrescar
        </Button>
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
                <div className="flex items-center justify-between border-b pb-2">
                  <span className="text-sm text-muted-foreground">Total</span>
                  <span className="text-lg font-bold text-primary">{stats.total}</span>
                </div>
                <div className="flex items-center justify-between border-b pb-2">
                  <span className="text-sm text-muted-foreground">Pendientes</span>
                  <span className="text-lg font-bold text-blue-500">{stats.pending}</span>
                </div>
                <div className="flex items-center justify-between border-b pb-2">
                  <span className="text-sm text-muted-foreground">Respondidas</span>
                  <span className="text-lg font-bold text-success">{stats.answered}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Expiradas</span>
                  <span className="text-lg font-bold text-destructive">{stats.expired}</span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="hidden gap-4 md:grid md:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardContent className="pt-6 text-left">
            <p className="text-xs text-muted-foreground">Total</p>
            <p className="text-2xl font-semibold">{stats.total}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 text-left">
            <p className="text-xs text-muted-foreground">Pendientes</p>
            <p className="text-2xl font-semibold">{stats.pending}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 text-left">
            <p className="text-xs text-muted-foreground">Respondidas</p>
            <p className="text-2xl font-semibold">{stats.answered}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 text-left">
            <p className="text-xs text-muted-foreground">Expiradas</p>
            <p className="text-2xl font-semibold">{stats.expired}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Listado</CardTitle>
          <CardDescription className="text-left">Puedes filtrar por estado y registrar tu respuesta de litros.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="w-full space-y-2 md:max-w-sm">
            <Label htmlFor="request_status_filter">Estado</Label>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger id="request_status_filter">
                <SelectValue placeholder="Filtrar por estado" />
              </SelectTrigger>
              <SelectContent>
                {FILTER_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {loading ? (
            <p className="text-sm text-muted-foreground text-left">Cargando solicitudes...</p>
          ) : requests.length === 0 ? (
            <p className="text-sm text-muted-foreground text-left">No hay solicitudes para el filtro seleccionado.</p>
          ) : (
            <>
            <div className="space-y-3 md:hidden">
              {requests.map((row) => {
                const canAnswer = (row.status === "PENDING" || row.status === "AUTO_ESTIMATED") && !isExpired(row.expires_at);
                return (
                  <div key={row.id} className="rounded-2xl border border-border/80 bg-background/80 p-4 text-left shadow-sm">
                    <div className="flex flex-col gap-3">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="font-semibold text-foreground">{row.route_name || "-"}</p>
                          <p className="text-xs text-muted-foreground">Recogida prevista para {formatDate(row.route_day_date)}</p>
                        </div>
                        <Badge className={getCollectionRequestStatusClass(row.status)}>
                          {getCollectionRequestStatusLabel(row.status)}
                        </Badge>
                      </div>

                      <div className="grid grid-cols-1 gap-2 text-xs text-muted-foreground sm:grid-cols-2">
                        <p><span className="font-medium text-foreground">Fecha:</span> {formatDate(row.route_day_date)}</p>
                        <p><span className="font-medium text-foreground">Plan:</span> {row.estimated_liters || "-"} L</p>
                        <p><span className="font-medium text-foreground">Final:</span> {row.final_liters ? `${row.final_liters} L` : "-"}</p>
                        <p><span className="font-medium text-foreground">Envases:</span> {row.container_number || 0} x {row.container_type === "IBC" ? "IBC" : "Bidones"}</p>
                      </div>

                      <div className="rounded-xl bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
                        <p><span className="font-medium text-foreground">Limite:</span> {formatDateTime(row.expires_at)}</p>
                        {isExpired(row.expires_at) ? (
                          <Badge variant="outline" className="mt-2 border-red-300 text-red-700">
                            <Clock3 className="w-3 h-3 mr-1" />
                            Expirada
                          </Badge>
                        ) : null}
                      </div>

                      {canAnswer ? (
                        <Button size="sm" className="w-full gap-1" onClick={() => openAnswerModal(row)}>
                          <CheckCircle className="w-4 h-4" />
                          Responder
                        </Button>
                      ) : (
                        <Badge variant="outline" className="w-fit">Sin accion</Badge>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="hidden overflow-x-auto rounded-lg border border-border md:block">
              <table className="min-w-[980px] w-full text-left">
                <thead className="bg-muted/30 border-b">
                  <tr>
                    <th className="px-3 py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Ruta</th>
                    <th className="px-3 py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Fecha</th>
                    <th className="px-3 py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Estado</th>
                    <th className="px-3 py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Limite</th>
                    <th className="px-3 py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Plan</th>
                    <th className="px-3 py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Final</th>
                    <th className="px-3 py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {requests.map((row) => {
                    const canAnswer = (row.status === "PENDING" || row.status === "AUTO_ESTIMATED") && !isExpired(row.expires_at);
                    return (
                      <tr key={row.id} className="border-b border-border last:border-0">
                        <td className="px-3 py-2 align-middle">
                          <p className="font-medium">{row.route_name || "-"}</p>
                        </td>
                        <td className="px-3 py-2 text-sm align-middle">{formatDate(row.route_day_date)}</td>
                        <td className="px-3 py-2 align-middle">
                          <Badge className={getCollectionRequestStatusClass(row.status)}>
                            {getCollectionRequestStatusLabel(row.status)}
                          </Badge>
                        </td>
                        <td className="px-3 py-2 text-xs align-middle">
                          <div className="space-y-1">
                            <p>{formatDateTime(row.expires_at)}</p>
                            {isExpired(row.expires_at) && (
                              <Badge variant="outline" className="border-red-300 text-red-700">
                                <Clock3 className="w-3 h-3 mr-1" />
                                Expirada
                              </Badge>
                            )}
                          </div>
                        </td>
                        <td className="px-3 py-2 text-xs align-middle">
                          {row.container_number || 0} x {row.container_type === "IBC" ? "IBC" : "Bidones"}
                          <p className="text-muted-foreground">{row.estimated_liters || "-"} L</p>
                        </td>
                        <td className="px-3 py-2 text-sm align-middle">{row.final_liters ? `${row.final_liters} L` : "-"}</td>
                        <td className="px-3 py-2 text-right align-middle">
                          {canAnswer ? (
                            <Button size="sm" className="gap-1" onClick={() => openAnswerModal(row)}>
                              <CheckCircle className="w-4 h-4" />
                              Responder
                            </Button>
                          ) : (
                            <Badge variant="outline">Sin accion</Badge>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            </>
          )}
        </CardContent>
      </Card>

      <Dialog open={answerModalOpen} onOpenChange={setAnswerModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Responder solicitud</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="rounded-lg border border-border p-3 text-left">
              <p className="font-medium">{selectedRequest?.route_name || "-"}</p>
              <p className="text-xs text-muted-foreground">
                Fecha: {formatDate(selectedRequest?.route_day_date)} | Limite: {formatDateTime(selectedRequest?.expires_at)}
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="final_liters">Litros finales</Label>
              <Input
                id="final_liters"
                type="number"
                min="0.01"
                step="0.01"
                value={finalLiters}
                onChange={(e) => setFinalLiters(e.target.value)}
                placeholder="Ejemplo: 180"
              />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" className="w-full sm:w-auto" onClick={() => setAnswerModalOpen(false)}>Cancelar</Button>
            <Button className="w-full sm:w-auto" onClick={handleSubmitAnswer} disabled={submitting}>
              {submitting ? "Guardando..." : "Enviar respuesta"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

