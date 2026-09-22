import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Package,
  Truck,
  Search,
  Plus,
  MapPin,
  Users,
  Clock,
  Weight,
  CheckCircle,
  BarChart3,
  Eye,
  Edit,
  Trash2,
  ChevronDown,
  ClipboardCheck,
} from "lucide-react";
import { useAuth } from "@/context/AuthProvider";
import { useSnackbar } from "@/context/SnackbarProvider";
import { handleApiError, getCollectionStatusClass, getCollectionStatusLabel, normalizeCollectionStatus } from "@/components/Utils";
import ConfirmDeleteDialog from "@/components/common/ConfirmDeleteDialog";

const STATUS_OPTIONS = ["Todas", "Pendiente", "Confirmada", "Cancelada"];
const STATUS_MAP = {
  Todas: undefined,
  Pendiente: "PENDING_MEASUREMENT",
  Confirmada: "CONFIRMED",
  Cancelada: "CANCELED",
};
const EMPTY_DEDUCTION_REASON = "__none__";
const DEDUCTION_OPTIONS = [
  { value: "WATER", label: "Agua" },
  { value: "RESIDUE", label: "Residuo" },
  { value: "MIXED", label: "Mezcla" },
  { value: "OTHER", label: "Otro" },
];

function formatDate(dateStr) {
  if (!dateStr) return "-";
  const d = new Date(`${dateStr}T00:00:00`);
  if (Number.isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString("es-ES");
}

function normalizeNumber(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function getCollectionLiters(collection) {
  return normalizeNumber(collection.measured_liters ?? collection.estimated_liters);
}

export default function CollectionsList() {
  const navigate = useNavigate();
  const { api, user } = useAuth();
  const showSnackbar = useSnackbar();
  const roleType = user?.role_type || "";
  const isOwner = roleType === "owner";
  const isWorker = roleType === "worker";
  const isClient = roleType === "client";
  const canCreateCollection = isOwner || isWorker;
  const canManageCollection = isOwner;

  const [collections, setCollections] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedDate, setSelectedDate] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("Todas");
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  const [total, setTotal] = useState(0);
  const [counts, setCounts] = useState({ total: 0, pending: 0, confirmed: 0, canceled: 0 });
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [toDelete, setToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [toConfirm, setToConfirm] = useState(null);
  const [measuredLiters, setMeasuredLiters] = useState("");
  const [deductionReason, setDeductionReason] = useState("");
  const [confirming, setConfirming] = useState(false);
  const [isCountsOpen, setIsCountsOpen] = useState(false);
  const searchPlaceholder = isClient
    ? "Buscar por trabajador..."
    : "Buscar por cliente, ruta, trabajador o notas...";

  const totalPages = useMemo(() => Math.max(1, Math.ceil(total / pageSize)), [total, pageSize]);

  const fetchCollections = useCallback(async () => {
    try {
      setLoading(true);
      const params = { page, page_size: pageSize, ordering: "-collection_date" };
      if (searchTerm) params.search = searchTerm;
      if (selectedDate) {
        params.start_date = selectedDate;
        params.end_date = selectedDate;
      }
      if (!isClient && selectedStatus !== "Todas") params.status = STATUS_MAP[selectedStatus];

      const res = await api().get("collections", { params });
      const payload = res.data || {};
      const items = Array.isArray(payload?.results) ? payload.results : Array.isArray(payload) ? payload : [];
      setCollections(items);
      setTotal(Number(payload.count || items.length));
    } catch (e) {
      const msg = handleApiError(e, "Error cargando recogidas.");
      showSnackbar(msg, "error");
    } finally {
      setLoading(false);
    }
  }, [api, isClient, page, pageSize, searchTerm, selectedDate, selectedStatus, showSnackbar]);

  const fetchCounts = useCallback(async () => {
    if (isClient) return;

    try {
      const base = { page: 1, page_size: 1 };
      if (searchTerm) base.search = searchTerm;
      if (selectedDate) {
        base.start_date = selectedDate;
        base.end_date = selectedDate;
      }

      const [allRes, pendingRes, confirmedRes, canceledRes] = await Promise.all([
        api().get("collections", { params: base }),
        api().get("collections", { params: { ...base, status: "PENDING_MEASUREMENT" } }),
        api().get("collections", { params: { ...base, status: "CONFIRMED" } }),
        api().get("collections", { params: { ...base, status: "CANCELED" } }),
      ]);

      setCounts({
        total: Number(allRes.data?.count || 0),
        pending: Number(pendingRes.data?.count || 0),
        confirmed: Number(confirmedRes.data?.count || 0),
        canceled: Number(canceledRes.data?.count || 0),
      });
    } catch {
      setCounts((prev) => ({ ...prev }));
    }
  }, [api, isClient, searchTerm, selectedDate]);

  useEffect(() => {
    fetchCollections();
  }, [fetchCollections]);

  useEffect(() => {
    fetchCounts();
  }, [fetchCounts]);

  useEffect(() => {
    setPage(1);
  }, [searchTerm, selectedDate, selectedStatus]);

  const totalMeasuredLiters = useMemo(
    () => collections.filter((item) => normalizeCollectionStatus(item.status) === "CONFIRMED").reduce((acc, item) => acc + normalizeNumber(item.measured_liters), 0),
    [collections]
  );

  const totalPrice = useMemo(
    () => collections.filter((item) => normalizeCollectionStatus(item.status) !== "CANCELED" && item.billable !== false).reduce((acc, item) => acc + normalizeNumber(item.total_price), 0),
    [collections]
  );

  const askDelete = (collection) => {
    setToDelete(collection);
    setDeleteOpen(true);
  };

  const openConfirmDialog = (collection) => {
    setToConfirm(collection);
    setMeasuredLiters("");
    setDeductionReason("");
    setConfirmOpen(true);
  };

  const closeConfirmDialog = () => {
    if (confirming) return;
    setConfirmOpen(false);
    setToConfirm(null);
    setMeasuredLiters("");
    setDeductionReason("");
  };

  const estimatedLiters = normalizeNumber(toConfirm?.estimated_liters);
  const measuredLitersValue = measuredLiters === "" ? null : Number(measuredLiters);
  const validMeasuredLiters = measuredLitersValue !== null && Number.isFinite(measuredLitersValue) && measuredLitersValue >= 0;
  const deductedLiters = validMeasuredLiters ? Math.max(0, estimatedLiters - measuredLitersValue) : 0;

  const handleQuickConfirm = async () => {
    if (!toConfirm?.id || !validMeasuredLiters) {
      showSnackbar("Indica una cantidad valida de litros medidos.", "error");
      return;
    }
    if (deductedLiters > 0 && !deductionReason) {
      showSnackbar("Indica el motivo de deduccion.", "error");
      return;
    }

    try {
      setConfirming(true);
      await api().patch(`collections/${encodeURIComponent(toConfirm.id)}/`, {
        measured_liters: measuredLitersValue,
        deduction_reason: deductedLiters > 0 ? deductionReason : "",
        status: "CONFIRMED",
      });
      showSnackbar("Recogida confirmada correctamente.", "success");
      setConfirmOpen(false);
      setToConfirm(null);
      setMeasuredLiters("");
      setDeductionReason("");
      await Promise.all([fetchCollections(), fetchCounts()]);
    } catch (e) {
      const msg = handleApiError(e, "No se pudo confirmar la recogida.");
      showSnackbar(msg, "error");
    } finally {
      setConfirming(false);
    }
  };

  const handleDelete = async () => {
    if (!toDelete?.id) return;
    try {
      setDeleting(true);
      await api().delete(`collections/${encodeURIComponent(toDelete.id)}/`);
      showSnackbar("Recogida eliminada correctamente.", "success");
      setDeleteOpen(false);
      setToDelete(null);
      await fetchCollections();
      await fetchCounts();
    } catch (e) {
      const msg = handleApiError(e, "No se pudo eliminar la recogida.");
      showSnackbar(msg, "error");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="flex items-center gap-3 text-3xl font-bold text-foreground">
            <Package className="h-8 w-8 text-primary" />
            {isClient ? "Historial de Recogidas" : "Gestion de Recogidas"}
          </h1>
          <p className="text-left text-muted-foreground">
            {isClient ? "Consulta tus recogidas pasadas." : "Supervisa y registra las recogidas de aceite usado"}
          </p>
        </div>

        <div className="grid w-full grid-cols-1 gap-2 sm:grid-cols-2 md:w-auto">
          {isOwner && (
            <Button variant="outline" className="w-full gap-2 md:w-auto" onClick={() => navigate("/stats")}>
              <BarChart3 className="h-4 w-4" />
              Ver Estadísticas
            </Button>
          )}
          {canCreateCollection && (
            <Button className="w-full gap-2 md:w-auto" onClick={() => navigate("/collections/new")}>
              <Plus className="h-4 w-4" />
              Nueva Recogida
            </Button>
          )}
        </div>
      </div>

      <Card className="overflow-hidden border-border/70 bg-card/95 shadow-sm">
        <CardContent className="p-4 sm:p-5">
          <div className="flex flex-col gap-4 md:flex-row md:items-end">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={searchPlaceholder}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            <div className="grid gap-1 md:w-56">
              <Input
                aria-label="Filtrar por fecha"
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
              />
            </div>

            {!isClient && (
              <div className="grid grid-cols-2 gap-2 md:flex md:max-w-[38rem] md:flex-wrap md:justify-end">
                {STATUS_OPTIONS.map((status) => (
                  <Button
                    key={status}
                    variant={selectedStatus === status ? "default" : "outline"}
                    size="sm"
                    className="w-full text-xs sm:text-sm md:w-auto"
                    onClick={() => setSelectedStatus(status)}
                  >
                    {status}
                  </Button>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {!isClient && (
      <div className="md:hidden">
        <Card>
          <CardContent className="p-0">
            <button
              type="button"
              onClick={() => setIsCountsOpen((prev) => !prev)}
              className="flex w-full items-center justify-between p-4 text-left transition-colors hover:bg-muted/40"
            >
              <span className="text-sm font-medium text-foreground">Ver contadores</span>
              <ChevronDown className={`h-5 w-5 text-muted-foreground transition-transform ${isCountsOpen ? "rotate-180" : ""}`} />
            </button>

            {isCountsOpen && (
              <div className="space-y-3 border-t px-4 py-3">
                <div className="flex items-center justify-between border-b pb-2">
                  <span className="text-sm text-muted-foreground">Total</span>
                  <span className="text-lg font-bold text-primary">{counts.total}</span>
                </div>
                <div className="flex items-center justify-between border-b pb-2">
                  <span className="text-sm text-muted-foreground">Pendientes</span>
                  <span className="text-lg font-bold text-blue-500">{counts.pending}</span>
                </div>
                <div className="flex items-center justify-between border-b pb-2">
                  <span className="text-sm text-muted-foreground">Confirmadas</span>
                  <span className="text-lg font-bold text-success">{counts.confirmed}</span>
                </div>
                <div className="flex items-center justify-between border-b pb-2">
                  <span className="text-sm text-muted-foreground">Canceladas</span>
                  <span className="text-lg font-bold text-destructive">{counts.canceled}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Litros pagina</span>
                  <span className="text-lg font-bold text-primary">{Math.round(totalMeasuredLiters)}L</span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
      )}

      {!isClient && (
      <div className="hidden gap-3 md:grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        <Card><CardContent className="pt-6 text-center"><div className="text-2xl font-bold text-primary">{counts.total}</div><p className="text-sm text-muted-foreground">Total</p></CardContent></Card>
        <Card><CardContent className="pt-6 text-center"><div className="text-2xl font-bold text-blue-500">{counts.pending}</div><p className="text-sm text-muted-foreground">Pendientes</p></CardContent></Card>
        <Card><CardContent className="pt-6 text-center"><div className="text-2xl font-bold text-success">{counts.confirmed}</div><p className="text-sm text-muted-foreground">Confirmadas</p></CardContent></Card>
        <Card><CardContent className="pt-6 text-center"><div className="text-2xl font-bold text-destructive">{counts.canceled}</div><p className="text-sm text-muted-foreground">Canceladas</p></CardContent></Card>
        <Card><CardContent className="pt-6 text-center"><div className="text-2xl font-bold text-primary">{Math.round(totalMeasuredLiters)}L</div><p className="text-sm text-muted-foreground">Litros (pagina)</p></CardContent></Card>
      </div>
      )}

      {loading ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">Cargando recogidas...</CardContent>
        </Card>
      ) : collections.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Truck className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
            <p className="text-muted-foreground">No se encontraron recogidas con los criterios seleccionados</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {collections.map((collection) => {
            if (!isClient) {
              return (
                <Card key={collection.id} className="overflow-hidden border-border/70 bg-card/95 shadow-sm transition-shadow hover:shadow-elegant">
                  <CardContent className="p-0">
                    <div className="grid lg:grid-cols-[minmax(0,1fr)_16rem]">
                      <div className="p-4 sm:p-5">
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                          <div className="min-w-0 text-left">
                            <h3 className="flex items-center gap-2 text-lg font-semibold text-foreground">
                              <Package className="h-5 w-5 text-primary" />
                              <span>Recogida #{collection.id}</span>
                            </h3>
                          </div>

                          <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                            {collection.billable === false && (
                              <Badge variant="outline" className="border-slate-200 bg-slate-50 text-slate-600">
                                No facturable
                              </Badge>
                            )}
                            <Badge className={`${getCollectionStatusClass(collection.status)} w-fit`}>
                              {getCollectionStatusLabel(collection.status)}
                            </Badge>
                          </div>
                        </div>

                        <div className="mt-5 grid grid-cols-1 gap-3 text-sm sm:grid-cols-2 xl:grid-cols-3">
                          <div className="min-w-0 rounded-2xl border border-border/60 bg-background/70 px-4 py-3 text-left">
                            <div className="mb-1 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                              <Users className="h-4 w-4" />
                              Cliente
                            </div>
                            <p className="truncate font-semibold text-foreground">{collection.client_name || "-"}</p>
                          </div>

                          <div className="hidden min-w-0 rounded-2xl border border-border/60 bg-background/70 px-4 py-3 text-left sm:block">
                            <div className="mb-1 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                              <MapPin className="h-4 w-4" />
                              Ruta
                            </div>
                            <p className="truncate font-semibold text-foreground">{collection.route_name || "-"}</p>
                          </div>

                          <div className="min-w-0 rounded-2xl border border-border/60 bg-background/70 px-4 py-3 text-left">
                            <div className="mb-1 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                              <Clock className="h-4 w-4" />
                              Fecha
                            </div>
                            <p className="font-semibold text-foreground">{formatDate(collection.collection_date)}</p>
                          </div>

                          <div className="hidden min-w-0 rounded-2xl border border-border/60 bg-background/70 px-4 py-3 text-left sm:block">
                            <div className="mb-1 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                              <Users className="h-4 w-4" />
                              Trabajador
                            </div>
                            <p className="truncate font-semibold text-foreground">{collection.worker_name || "-"}</p>
                          </div>

                          <div className="hidden min-w-0 rounded-2xl border border-border/60 bg-background/70 px-4 py-3 text-left sm:block">
                            <div className="mb-1 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                              <Weight className="h-4 w-4" />
                              Envases
                            </div>
                            <p className="font-semibold text-foreground">{collection.container_number || 0} ({collection.container_type || "-"})</p>
                          </div>

                          <div className="min-w-0 rounded-2xl border border-border/60 bg-primary/5 px-4 py-3 text-left">
                            <div className="mb-1 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                              <CheckCircle className="h-4 w-4" />
                              {collection.measured_liters == null ? "Litros estimados" : "Litros medidos"}
                            </div>
                            <p className="font-semibold text-foreground">{getCollectionLiters(collection).toFixed(2)} L</p>
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-col justify-between gap-4 border-t border-border/70 bg-primary/5 p-4 sm:p-5 lg:border-l lg:border-t-0">
                        <div className="text-left lg:text-right">
                          <div className="mb-1 text-xs uppercase tracking-wide text-muted-foreground">Importe total</div>
                          <p className="text-2xl font-bold text-primary">{normalizeNumber(collection.total_price).toFixed(2)} EUR</p>
                        </div>

                        <div className="grid grid-cols-2 gap-2 lg:grid-cols-1">
                          <Button variant="outline" size="sm" className="gap-2" onClick={() => navigate(`/collections/${collection.id}`)}>
                            <Eye className="h-4 w-4" />
                            Ver
                          </Button>
                          {canManageCollection && normalizeCollectionStatus(collection.status) === "PENDING_MEASUREMENT" && (
                            <Button size="sm" className="gap-2" onClick={() => openConfirmDialog(collection)}>
                              <ClipboardCheck className="h-4 w-4" />
                              Confirmar
                            </Button>
                          )}
                          {canManageCollection && (
                            <Button variant="outline" size="sm" className="gap-2" onClick={() => navigate(`/collections/${collection.id}/edit`)}>
                              <Edit className="h-4 w-4" />
                              Editar
                            </Button>
                          )}
                          {canManageCollection && (
                            <Button variant="destructive" size="sm" className="gap-2" onClick={() => askDelete(collection)}>
                              <Trash2 className="h-4 w-4" />
                              Eliminar
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            }

            return (
              <Card key={collection.id} className="overflow-hidden border-border/70 bg-card/95 shadow-sm transition-shadow hover:shadow-elegant">
                <CardContent className="p-0">
                  <div className="grid lg:grid-cols-[minmax(0,1fr)_16rem]">
                    <div className="p-4 sm:p-5">
                      <div className="min-w-0 text-left">
                        <h3 className="flex items-center gap-2 text-lg font-semibold text-foreground">
                          <Package className="h-5 w-5 text-primary" />
                          <span>Recogida #{collection.id}</span>
                        </h3>
                      </div>

                      <div className="mt-5 grid grid-cols-1 gap-3 text-sm sm:grid-cols-2 xl:grid-cols-4">
                        <div className="min-w-0 rounded-2xl border border-border/60 bg-background/70 px-4 py-3 text-left">
                          <div className="mb-1 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                            <Clock className="h-4 w-4" />
                            Fecha
                          </div>
                          <p className="font-semibold text-foreground">{formatDate(collection.collection_date)}</p>
                        </div>

                        <div className="hidden min-w-0 rounded-2xl border border-border/60 bg-background/70 px-4 py-3 text-left sm:block">
                          <div className="mb-1 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                            <Users className="h-4 w-4" />
                            Registrada por
                          </div>
                          <p className="truncate font-semibold text-foreground">{collection.worker_name || "-"}</p>
                        </div>

                        <div className="hidden min-w-0 rounded-2xl border border-border/60 bg-background/70 px-4 py-3 text-left sm:block">
                          <div className="mb-1 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                            <Weight className="h-4 w-4" />
                            Envases
                          </div>
                          <p className="font-semibold text-foreground">{collection.container_number || 0} ({collection.container_type || "-"})</p>
                        </div>

                        <div className="min-w-0 rounded-2xl border border-border/60 bg-primary/5 px-4 py-3 text-left">
                          <div className="mb-1 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                            <CheckCircle className="h-4 w-4" />
                            {collection.measured_liters == null ? "Litros estimados" : "Litros medidos"}
                          </div>
                          <p className="font-semibold text-foreground">{getCollectionLiters(collection).toFixed(2)} L</p>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col justify-between gap-4 border-t border-border/70 bg-primary/5 p-4 sm:p-5 lg:border-l lg:border-t-0">
                      <div className="text-left lg:text-right">
                        <div className="mb-1 text-xs uppercase tracking-wide text-muted-foreground">Importe total</div>
                        <p className="text-2xl font-bold text-primary">{normalizeNumber(collection.total_price).toFixed(2)} EUR</p>
                      </div>

                      <Button variant="outline" size="sm" className="w-full gap-2" onClick={() => navigate(`/collections/${collection.id}`)}>
                        <Eye className="h-4 w-4" />
                        Ver
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {!loading && totalPages > 1 && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
              <p className="text-sm text-muted-foreground">{total} resultados • Pagina {page} de {totalPages}</p>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>Anterior</Button>
                <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))}>Siguiente</Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Card className="overflow-hidden border-primary/15 bg-card/95 shadow-sm">
        <CardContent className="p-4 sm:p-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center gap-3 text-left">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <Weight className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-foreground">{isClient ? "Resumen de mis recogidas" : "Resumen de pagina"}</h3>
                <p className="text-sm text-muted-foreground">Totales de las recogidas visibles en esta pagina.</p>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-3 lg:min-w-[38rem]">
              <div className="rounded-2xl bg-primary/5 px-4 py-3 text-center">
                <div className="text-xl font-bold text-primary">{collections.length}</div>
                <p className="text-xs text-muted-foreground">Recogidas visibles</p>
              </div>
              <div className="rounded-2xl bg-primary/5 px-4 py-3 text-center">
                <div className="text-xl font-bold text-primary">{totalMeasuredLiters.toFixed(2)} L</div>
                <p className="text-xs text-muted-foreground">Litros medidos</p>
              </div>
              <div className="rounded-2xl bg-primary/5 px-4 py-3 text-center">
                <div className="text-xl font-bold text-primary">{totalPrice.toFixed(2)} EUR</div>
                <p className="text-xs text-muted-foreground">{isClient ? "Importe asociado" : "Importe facturable"}</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Dialog open={confirmOpen} onOpenChange={(open) => (open ? setConfirmOpen(true) : closeConfirmDialog())}>
        <DialogContent className="max-h-[calc(100dvh-1rem)] w-[calc(100vw-1rem)] max-w-md overflow-y-auto rounded-lg p-0 sm:max-h-[90vh]">
          <DialogHeader className="border-b border-border/70 px-4 py-4 text-left sm:px-6">
            <DialogTitle>Confirmar medicion</DialogTitle>
          </DialogHeader>

          <div className="space-y-5 px-4 py-5 sm:px-6">
            <div className="grid grid-cols-2 gap-3">
              <div className="min-w-0 border-l-4 border-primary bg-primary/5 px-3 py-2 text-left">
                <p className="text-xs text-muted-foreground">Litros estimados</p>
                <p className="text-lg font-semibold text-foreground">{estimatedLiters.toFixed(2)} L</p>
              </div>
              <div className="min-w-0 border-l-4 border-amber-500 bg-amber-500/5 px-3 py-2 text-left">
                <p className="text-xs text-muted-foreground">Litros deducidos</p>
                <p className="text-lg font-semibold text-foreground">{deductedLiters.toFixed(2)} L</p>
              </div>
            </div>

            <div className="space-y-2 text-left">
              <Label htmlFor="quick-measured-liters">Litros medidos finales *</Label>
              <Input
                id="quick-measured-liters"
                type="number"
                min="0"
                step="0.01"
                value={measuredLiters}
                onChange={(event) => {
                  setMeasuredLiters(event.target.value);
                  const nextValue = Number(event.target.value);
                  if (event.target.value !== "" && Number.isFinite(nextValue) && nextValue >= estimatedLiters) {
                    setDeductionReason("");
                  }
                }}
                placeholder="Introduce los litros medidos"
                disabled={confirming}
              />
            </div>

            <div className="space-y-2 text-left">
              <Label>Motivo de deduccion{deductedLiters > 0 ? " *" : ""}</Label>
              <Select
                value={deductionReason || EMPTY_DEDUCTION_REASON}
                onValueChange={(value) => setDeductionReason(value === EMPTY_DEDUCTION_REASON ? "" : value)}
                disabled={confirming || deductedLiters <= 0}
              >
                <SelectTrigger><SelectValue placeholder="Sin deduccion" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={EMPTY_DEDUCTION_REASON}>Sin deduccion</SelectItem>
                  {DEDUCTION_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {deductedLiters > 0 && (
                <p className="text-xs text-muted-foreground">La diferencia respecto a la estimacion requiere indicar un motivo.</p>
              )}
            </div>
          </div>

          <DialogFooter className="grid grid-cols-2 gap-2 border-t border-border/70 px-4 py-4 sm:flex sm:px-6">
            <Button type="button" variant="outline" onClick={closeConfirmDialog} disabled={confirming}>Cancelar</Button>
            <Button type="button" onClick={handleQuickConfirm} disabled={confirming || !validMeasuredLiters} className="gap-2">
              <ClipboardCheck className="h-4 w-4" />
              {confirming ? "Confirmando..." : "Confirmar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {canManageCollection && (
        <ConfirmDeleteDialog
          open={deleteOpen}
          onOpenChange={setDeleteOpen}
          title="Eliminar recogida"
          description={toDelete ? `Se va a eliminar la recogida #${toDelete.id}. Esta accion no se puede deshacer.` : "Esta accion no se puede deshacer."}
          confirmLabel="Eliminar"
          onConfirm={handleDelete}
          loading={deleting}
        />
      )}
    </div>
  );
}
