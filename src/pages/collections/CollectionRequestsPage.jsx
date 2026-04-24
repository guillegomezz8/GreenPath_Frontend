import { useCallback, useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/context/AuthProvider";
import { useSnackbar } from "@/context/SnackbarProvider";
import {
  getCollectionRequestStatusClass,
  getCollectionRequestStatusLabel,
  handleApiError,
} from "@/components/Utils";
import { CalendarClock, CheckCircle, ChevronDown, Clock3, Inbox, PackageCheck } from "lucide-react";

const FILTER_OPTIONS = [
  { value: "ALL", label: "Todas" },
  { value: "PENDING", label: "Pendientes" },
  { value: "AUTO_ESTIMATED", label: "Autoestimadas" },
  { value: "ANSWERED", label: "Respondidas" },
  { value: "MANUAL", label: "Manuales" },
];

const CONTAINER_TYPES = [
  { value: "BIDONES", label: "Bidones", capacity: 60 },
  { value: "IBC", label: "IBC", capacity: 1000 },
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

function formatLiters(value) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return "-";
  return parsed.toLocaleString("es-ES", { minimumFractionDigits: 0, maximumFractionDigits: 2 });
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

function getContainerConfig(containerType) {
  return CONTAINER_TYPES.find((item) => item.value === containerType) || CONTAINER_TYPES[0];
}

function getContainerNumber(value) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 1) return 1;
  return Math.floor(parsed);
}

function getContainerSummary(containerType, containerNumber) {
  const config = getContainerConfig(containerType);
  const number = getContainerNumber(containerNumber);
  return {
    label: `${number} x ${config.label}`,
    liters: number * config.capacity,
  };
}

function inferContainerDraft(row) {
  const rawLiters = Number(row?.final_liters ?? row?.estimated_liters);
  if (Number.isFinite(rawLiters) && rawLiters > 0) {
    if (rawLiters >= 1000 && rawLiters % 1000 === 0) {
      return { container_type: "IBC", container_number: String(rawLiters / 1000) };
    }
    if (rawLiters % 60 === 0) {
      return { container_type: "BIDONES", container_number: String(rawLiters / 60) };
    }
  }

  return {
    container_type: row?.container_type || "BIDONES",
    container_number: String(row?.container_number || 1),
  };
}

function sortRequests(rows) {
  return [...rows].sort((a, b) => {
    const dateA = new Date(a?.created_date || 0).getTime();
    const dateB = new Date(b?.created_date || 0).getTime();
    if (dateA !== dateB) return dateB - dateA;
    return Number(b?.id || 0) - Number(a?.id || 0);
  });
}

function getFinalSourceLabel(source) {
  if (source === "CLIENT") return "Respuesta del cliente";
  if (source === "AUTO") return "Autoestimada";
  if (source === "MANUAL") return "Ajuste manual";
  return "Sin respuesta";
}

export default function CollectionRequestsPage() {
  const { api } = useAuth();
  const showSnackbar = useSnackbar();

  const [loading, setLoading] = useState(false);
  const [filterStatus, setFilterStatus] = useState("ALL");
  const [requests, setRequests] = useState([]);
  const [answerModalOpen, setAnswerModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [containerDraft, setContainerDraft] = useState({ container_type: "BIDONES", container_number: "1" });
  const [isStatsOpen, setIsStatsOpen] = useState(false);

  const fetchRequests = useCallback(async () => {
    try {
      setLoading(true);
      const params = { page: 1, page_size: 100, status: filterStatus };
      const res = await api().get("collections/requests/me/", { params });
      setRequests(sortRequests(getRequestRows(res.data)));
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

  const selectedSummary = useMemo(
    () => getContainerSummary(containerDraft.container_type, containerDraft.container_number),
    [containerDraft]
  );

  const openAnswerModal = (row) => {
    setSelectedRequest(row);
    setContainerDraft(inferContainerDraft(row));
    setAnswerModalOpen(true);
  };

  const handleSubmitAnswer = async () => {
    if (!selectedRequest?.id) return;
    const containerNumber = getContainerNumber(containerDraft.container_number);
    if (!Number.isFinite(containerNumber) || containerNumber <= 0) {
      showSnackbar("Debes indicar un numero de envases valido.", "error");
      return;
    }

    try {
      setSubmitting(true);
      await api().post(`collections/requests/${encodeURIComponent(selectedRequest.id)}/answer/`, {
        container_type: containerDraft.container_type,
        container_number: containerNumber,
      });
      showSnackbar("Solicitud respondida correctamente.", "success");
      setAnswerModalOpen(false);
      setSelectedRequest(null);
      setContainerDraft({ container_type: "BIDONES", container_number: "1" });
      await fetchRequests();
    } catch (e) {
      const msg = handleApiError(e, "No se pudo responder la solicitud.");
      showSnackbar(msg, "error");
    } finally {
      setSubmitting(false);
    }
  };

  const renderRequestCard = (row) => {
    const canAnswer = (row.status === "PENDING" || row.status === "AUTO_ESTIMATED") && !isExpired(row.expires_at);
    const summary = getContainerSummary(row.container_type, row.container_number || 1);
    const finalLabel = row.final_liters ? `${formatLiters(row.final_liters)} L` : "-";

    return (
      <Card key={row.id} className="transition-shadow hover:shadow-elegant">
        <CardContent className="pt-6">
          <div className="flex flex-col gap-5 xl:flex-row xl:items-start">
            <div className="flex-1 space-y-3">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <h3 className="flex items-center gap-2 text-lg font-semibold text-foreground">
                    <CalendarClock className="h-4 w-4 text-primary" />
                    {row.route_name || "Ruta planificada"}
                  </h3>
                  <p className="mt-1 text-sm text-muted-foreground">Solicitud #{row.id} - {formatDate(row.route_day_date)}</p>
                </div>

                <Badge className={`${getCollectionRequestStatusClass(row.status)} w-fit self-start`}>
                  {getCollectionRequestStatusLabel(row.status)}
                </Badge>
              </div>

              <div className="grid grid-cols-1 gap-3 text-sm md:grid-cols-3">
                <div>
                  <span className="text-muted-foreground">Creada:</span>{" "}
                  <span className="font-medium">{formatDateTime(row.created_date)}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Limite:</span>{" "}
                  <span className="font-medium">{formatDateTime(row.expires_at)}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Respuesta:</span>{" "}
                  <span className="font-medium">{getFinalSourceLabel(row.final_source)}</span>
                </div>
              </div>

              {isExpired(row.expires_at) && (row.status === "PENDING" || row.status === "AUTO_ESTIMATED") && (
                <Badge variant="outline" className="w-fit border-red-300 text-red-700">
                  <Clock3 className="mr-1 h-3 w-3" />
                  Expirada
                </Badge>
              )}
            </div>

            <div className="w-full space-y-3 xl:w-80">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="rounded-lg bg-accent/50 p-3">
                  <div className="mb-1 flex items-center gap-2 text-sm text-muted-foreground">
                    <PackageCheck className="h-4 w-4" />
                    Envases
                  </div>
                  <div className="font-semibold">{summary.label}</div>
                  <p className="text-xs text-muted-foreground">{formatLiters(summary.liters)} L aprox.</p>
                </div>

                <div className="rounded-lg bg-primary/10 p-3">
                  <div className="mb-1 flex items-center gap-2 text-sm text-muted-foreground">
                    <CheckCircle className="h-4 w-4" />
                    Final
                  </div>
                  <div className="font-semibold text-primary">{finalLabel}</div>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-3 flex flex-col gap-2 border-t border-border pt-3 sm:flex-row sm:justify-end">
            {canAnswer ? (
              <Button size="sm" className="w-full gap-1 sm:w-auto" onClick={() => openAnswerModal(row)}>
                <CheckCircle className="h-4 w-4" />
                Responder
              </Button>
            ) : (
              <Badge variant="outline" className="w-fit">Sin accion pendiente</Badge>
            )}
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-6">
      <div className="text-left">
        <div>
          <h1 className="flex items-center gap-3 text-3xl font-bold text-foreground">
            <CalendarClock className="h-8 w-8 text-primary" />
            Solicitudes de Recogida
          </h1>
          <p className="text-left text-muted-foreground">Responde tus proximas recogidas indicando bidones o IBC.</p>
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
              <div className="grid grid-cols-2 gap-3 border-t px-4 py-3">
                <div>
                  <p className="text-xs text-muted-foreground">Total</p>
                  <p className="text-xl font-bold text-primary">{stats.total}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Pendientes</p>
                  <p className="text-xl font-bold text-blue-500">{stats.pending}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Respondidas</p>
                  <p className="text-xl font-bold text-success">{stats.answered}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Expiradas</p>
                  <p className="text-xl font-bold text-destructive">{stats.expired}</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="hidden gap-3 md:grid md:grid-cols-2 xl:grid-cols-4">
        {[
          ["Total", stats.total, "text-primary"],
          ["Pendientes", stats.pending, "text-blue-500"],
          ["Respondidas", stats.answered, "text-success"],
          ["Expiradas", stats.expired, "text-destructive"],
        ].map(([label, value, colorClass]) => (
          <Card key={label}>
            <CardContent className="pt-6 text-center">
              <div className={`text-2xl font-bold ${colorClass}`}>{value}</div>
              <p className="text-sm text-muted-foreground">{label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="mb-4 grid gap-3 sm:grid-cols-[1fr_auto_1fr] sm:items-end">
            <div className="hidden sm:block" />

            <h2 className="flex items-center justify-center gap-2 text-center text-lg font-semibold text-foreground">
              <PackageCheck className="h-5 w-5 text-primary" />
              Solicitudes
            </h2>

            <div className="w-full space-y-2 sm:w-56 sm:justify-self-end">
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
          </div>

          {loading ? (
            <div className="py-12 text-center text-muted-foreground">Cargando solicitudes...</div>
          ) : requests.length === 0 ? (
            <div className="py-12 text-center">
              <Inbox className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
              <p className="text-muted-foreground">No hay solicitudes para este filtro</p>
            </div>
          ) : (
            <div className="space-y-4">
              {requests.map(renderRequestCard)}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={answerModalOpen} onOpenChange={setAnswerModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Responder solicitud</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="rounded-2xl border border-border bg-muted/20 p-3 text-left">
              <p className="font-medium">{selectedRequest?.route_name || "-"}</p>
              <p className="text-xs text-muted-foreground">
                Fecha: {formatDate(selectedRequest?.route_day_date)} | Limite: {formatDateTime(selectedRequest?.expires_at)}
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-[1fr_120px]">
              <div className="space-y-2">
                <Label htmlFor="container_type">Tipo de envase</Label>
                <Select
                  value={containerDraft.container_type}
                  onValueChange={(value) => setContainerDraft((prev) => ({ ...prev, container_type: value }))}
                >
                  <SelectTrigger id="container_type">
                    <SelectValue placeholder="Selecciona envase" />
                  </SelectTrigger>
                  <SelectContent>
                    {CONTAINER_TYPES.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label} ({type.capacity} L)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="container_number">Cantidad</Label>
                <Input
                  id="container_number"
                  type="number"
                  min="1"
                  step="1"
                  value={containerDraft.container_number}
                  onChange={(e) => setContainerDraft((prev) => ({ ...prev, container_number: e.target.value }))}
                />
              </div>
            </div>

            <div className="rounded-2xl border border-primary/20 bg-primary/5 p-3 text-left">
              <p className="text-xs text-muted-foreground">Litros calculados automaticamente</p>
              <p className="text-xl font-semibold text-foreground">{formatLiters(selectedSummary.liters)} L</p>
              <p className="text-xs text-muted-foreground">{selectedSummary.label}</p>
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
