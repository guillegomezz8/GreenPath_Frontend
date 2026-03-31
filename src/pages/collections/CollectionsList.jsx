import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
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
  AlertTriangle,
  BarChart3,
  Euro,
  Eye,
  Edit,
  Trash2,
  ChevronDown,
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
  const [selectedStatus, setSelectedStatus] = useState("Todas");
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  const [total, setTotal] = useState(0);
  const [counts, setCounts] = useState({ total: 0, pending: 0, confirmed: 0, canceled: 0 });
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [toDelete, setToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [isCountsOpen, setIsCountsOpen] = useState(false);

  const totalPages = useMemo(() => Math.max(1, Math.ceil(total / pageSize)), [total, pageSize]);

  const fetchCollections = useCallback(async () => {
    try {
      setLoading(true);
      const params = { page, page_size: pageSize, ordering: "-collection_date" };
      if (searchTerm) params.search = searchTerm;
      if (selectedStatus !== "Todas") params.status = STATUS_MAP[selectedStatus];

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
  }, [api, page, pageSize, searchTerm, selectedStatus, showSnackbar]);

  const fetchCounts = useCallback(async () => {
    try {
      const base = { page: 1, page_size: 1 };
      if (searchTerm) base.search = searchTerm;

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
  }, [api, searchTerm]);

  useEffect(() => {
    fetchCollections();
  }, [fetchCollections]);

  useEffect(() => {
    fetchCounts();
  }, [fetchCounts]);

  useEffect(() => {
    setPage(1);
  }, [searchTerm, selectedStatus]);

  const totalNetLiters = useMemo(
    () => collections.filter((item) => normalizeCollectionStatus(item.status) !== "CANCELED").reduce((acc, item) => acc + normalizeNumber(item.net_liters), 0),
    [collections]
  );

  const totalPrice = useMemo(
    () => collections.filter((item) => normalizeCollectionStatus(item.status) !== "CANCELED" && item.billable !== false).reduce((acc, item) => acc + normalizeNumber(item.total_price), 0),
    [collections]
  );

  const getStatusIcon = (status) => {
    const normalized = normalizeCollectionStatus(status);
    if (normalized === "CONFIRMED") return <CheckCircle className="h-4 w-4" />;
    if (normalized === "CANCELED") return <AlertTriangle className="h-4 w-4" />;
    return <Truck className="h-4 w-4" />;
  };

  const askDelete = (collection) => {
    setToDelete(collection);
    setDeleteOpen(true);
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
          <p className="text-muted-foreground">
            {isClient ? "Consulta tus recogidas pasadas y su estado" : "Supervisa y registra las recogidas de aceite usado"}
          </p>
        </div>

        <div className="grid w-full grid-cols-1 gap-2 sm:grid-cols-2 md:w-auto">
          {isOwner && (
            <Button variant="outline" className="w-full gap-2 md:w-auto" onClick={() => navigate("/stats")}>
              <BarChart3 className="h-4 w-4" />
              Reportes
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

      <Card className="overflow-hidden">
        <CardContent className="pt-6">
          <div className="flex flex-col gap-4 xl:flex-row">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por cliente, ruta, trabajador o notas..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            <div className="grid grid-cols-2 gap-2 md:flex md:flex-wrap md:justify-end">
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
          </div>
        </CardContent>
      </Card>

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
                  <span className="text-lg font-bold text-primary">{Math.round(totalNetLiters)}L</span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="hidden gap-3 md:grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        <Card><CardContent className="pt-6 text-center"><div className="text-2xl font-bold text-primary">{counts.total}</div><p className="text-sm text-muted-foreground">Total</p></CardContent></Card>
        <Card><CardContent className="pt-6 text-center"><div className="text-2xl font-bold text-blue-500">{counts.pending}</div><p className="text-sm text-muted-foreground">Pendientes</p></CardContent></Card>
        <Card><CardContent className="pt-6 text-center"><div className="text-2xl font-bold text-success">{counts.confirmed}</div><p className="text-sm text-muted-foreground">Confirmadas</p></CardContent></Card>
        <Card><CardContent className="pt-6 text-center"><div className="text-2xl font-bold text-destructive">{counts.canceled}</div><p className="text-sm text-muted-foreground">Canceladas</p></CardContent></Card>
        <Card><CardContent className="pt-6 text-center"><div className="text-2xl font-bold text-primary">{Math.round(totalNetLiters)}L</div><p className="text-sm text-muted-foreground">Litros (pagina)</p></CardContent></Card>
      </div>

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
          {collections.map((collection) => (
            <Card key={collection.id} className="transition-shadow hover:shadow-elegant">
              <CardContent className="pt-6">
                <div className="flex flex-col gap-5 xl:flex-row xl:items-start">
                  <div className="flex-1 space-y-3">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <h3 className="flex items-center gap-2 text-lg font-semibold text-foreground">
                          {getStatusIcon(collection.status)}
                          {collection.client_name || "Cliente"}
                        </h3>
                        <p className="mt-1 flex items-center gap-1 text-sm text-muted-foreground">
                          <MapPin className="h-4 w-4" />
                          {collection.route_name || "Sin ruta planificada"}
                        </p>
                      </div>

                      <Badge className={`${getCollectionStatusClass(collection.status)} w-fit self-start`}>
                        {getCollectionStatusLabel(collection.status)}
                      </Badge>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <Badge variant="outline" className={collection.billable ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-slate-200 bg-slate-50 text-slate-600"}>
                        {collection.billable ? "Facturable" : "No facturable"}
                      </Badge>
                    </div>

                    <div className="grid grid-cols-1 gap-3 text-sm md:grid-cols-3">
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4 text-muted-foreground" />
                        <span className="text-muted-foreground">Trabajador:</span>
                        <span className="font-medium">{collection.worker_name || "-"}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-muted-foreground" />
                        <span className="text-muted-foreground">Fecha:</span>
                        <span className="font-medium">{formatDate(collection.collection_date)}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Weight className="h-4 w-4 text-muted-foreground" />
                        <span className="text-muted-foreground">Envases:</span>
                        <span className="font-medium">{collection.container_number || 0} ({collection.container_type || "-"})</span>
                      </div>
                    </div>
                  </div>

                  <div className="w-full space-y-3 xl:w-80">
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-2">
                      <div className="rounded-lg bg-accent/50 p-3">
                        <div className="mb-1 flex items-center gap-2 text-sm text-muted-foreground">
                          <Weight className="h-4 w-4" />
                          Estimados
                        </div>
                        <div className="font-semibold">{normalizeNumber(collection.estimated_liters).toFixed(2)} L</div>
                      </div>

                      <div className="rounded-lg bg-accent/50 p-3">
                        <div className="mb-1 flex items-center gap-2 text-sm text-muted-foreground">
                          <CheckCircle className="h-4 w-4" />
                          Netos
                        </div>
                        <div className="font-semibold">{normalizeNumber(collection.net_liters).toFixed(2)} L</div>
                      </div>
                    </div>

                    <div className="rounded-lg bg-primary/10 p-3">
                      <div className="mb-1 flex items-center gap-2 text-sm text-muted-foreground">
                        <Euro className="h-4 w-4" />
                        Importe
                      </div>
                      <div className="font-semibold text-primary">{normalizeNumber(collection.total_price).toFixed(2)} EUR</div>
                    </div>
                  </div>
                </div>

                {collection.notes && (
                  <div className="mt-4 border-t border-border pt-4">
                    <p className="text-left text-sm text-muted-foreground">
                      <strong>Notas:</strong> {collection.notes}
                    </p>
                  </div>
                )}

                <div className="mt-3 grid grid-cols-1 gap-2 border-t border-border pt-3 sm:grid-cols-2 xl:grid-cols-3">
                  <Button variant="outline" size="sm" className="gap-2" onClick={() => navigate(`/collections/${collection.id}`)}>
                    <Eye className="h-4 w-4" />
                    Ver
                  </Button>
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
              </CardContent>
            </Card>
          ))}
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

      <Card className="bg-gradient-primary text-primary-foreground">
        <CardContent className="pt-6">
          <div className="text-center">
            <Weight className="mx-auto mb-4 h-12 w-12 opacity-90" />
            <h3 className="mb-2 text-xl font-semibold">Resumen de pagina</h3>
            <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-3">
              <div>
                <div className="text-2xl font-bold">{collections.length}</div>
                <p className="opacity-90">Recogidas visibles</p>
              </div>
              <div>
                <div className="text-2xl font-bold">{totalNetLiters.toFixed(2)}L</div>
                <p className="opacity-90">Litros netos</p>
              </div>
              <div>
                <div className="text-2xl font-bold">{totalPrice.toFixed(2)} EUR</div>
                <p className="opacity-90">Importe facturable</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

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
