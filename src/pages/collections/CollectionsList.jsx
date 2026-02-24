import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Package,
  Truck,
  Search,
  Plus,
  Calendar,
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
  const { api } = useAuth();
  const showSnackbar = useSnackbar();

  const [collections, setCollections] = useState([]);
  const [workersMap, setWorkersMap] = useState({});
  const [loading, setLoading] = useState(false);

  const [searchTerm, setSearchTerm] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("Todas");
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  const [total, setTotal] = useState(0);

  const [counts, setCounts] = useState({
    total: 0,
    pending: 0,
    confirmed: 0,
    canceled: 0,
  });
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [toDelete, setToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const totalPages = useMemo(() => Math.max(1, Math.ceil(total / pageSize)), [total, pageSize]);

  const fetchWorkersMap = useCallback(async () => {
    try {
      const res = await api().get("workers", { params: { page: 1, page_size: 300 } });
      const items = Array.isArray(res.data?.results) ? res.data.results : [];
      const map = {};
      items.forEach((w) => {
        map[w.id] = `${w.name || ""} ${w.surname || ""}`.trim() || w.username || `Worker ${w.id}`;
      });
      setWorkersMap(map);
    } catch {
      setWorkersMap({});
    }
  }, [api]);

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
    fetchWorkersMap();
  }, [fetchWorkersMap]);

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
    () => collections.reduce((acc, item) => acc + normalizeNumber(item.net_liters), 0),
    [collections]
  );

  const totalPrice = useMemo(
    () => collections.reduce((acc, item) => acc + normalizeNumber(item.total_price), 0),
    [collections]
  );

  const getStatusIcon = (status) => {
    const normalized = normalizeCollectionStatus(status);
    if (normalized === "CONFIRMED") return <CheckCircle className="w-4 h-4" />;
    if (normalized === "CANCELED") return <AlertTriangle className="w-4 h-4" />;
    return <Truck className="w-4 h-4" />;
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
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
            <Package className="w-8 h-8 text-primary" />
            Gestion de Recogidas
          </h1>
          <p className="text-muted-foreground">Supervisa y registra las recogidas de aceite usado</p>
        </div>

        <div className="flex gap-2">
          <Button variant="outline" className="gap-2" onClick={() => navigate("/stats")}>
            <BarChart3 className="w-4 h-4" />
            Reportes
          </Button>
          <Button className="gap-2" onClick={() => navigate("/collections/new")}>
            <Plus className="w-4 h-4" />
            Nueva Recogida
          </Button>
        </div>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por cliente, ruta, trabajador o notas..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            <div className="flex gap-2">
              {STATUS_OPTIONS.map((status) => (
                <Button
                  key={status}
                  variant={selectedStatus === status ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedStatus(status)}
                >
                  {status}
                </Button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="pt-6 text-center">
            <div className="text-2xl font-bold text-primary">{counts.total}</div>
            <p className="text-sm text-muted-foreground">Total</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 text-center">
            <div className="text-2xl font-bold text-blue-500">{counts.pending}</div>
            <p className="text-sm text-muted-foreground">Pendientes</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 text-center">
            <div className="text-2xl font-bold text-success">{counts.confirmed}</div>
            <p className="text-sm text-muted-foreground">Confirmadas</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 text-center">
            <div className="text-2xl font-bold text-destructive">{counts.canceled}</div>
            <p className="text-sm text-muted-foreground">Canceladas</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 text-center">
            <div className="text-2xl font-bold text-primary">{Math.round(totalNetLiters)}L</div>
            <p className="text-sm text-muted-foreground">Litros (pagina)</p>
          </CardContent>
        </Card>
      </div>

      {loading ? (
        <Card>
          <CardContent className="text-center py-12 text-muted-foreground">Cargando recogidas...</CardContent>
        </Card>
      ) : collections.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <Truck className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">No se encontraron recogidas con los criterios seleccionados</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {collections.map((collection) => (
            <Card key={collection.id} className="hover:shadow-elegant transition-shadow">
              <CardContent className="pt-6">
                <div className="flex flex-col lg:flex-row gap-6">
                  <div className="flex-1 space-y-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
                          {getStatusIcon(collection.status)}
                          {collection.client_name || "Cliente"}
                        </h3>
                        <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                          <MapPin className="w-4 h-4" />
                          {collection.route_name || "Sin ruta planificada"}
                        </p>
                      </div>

                      <Badge className={getCollectionStatusClass(collection.status)}>{getCollectionStatusLabel(collection.status)}</Badge>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                      <div className="flex items-center gap-2">
                        <Users className="w-4 h-4 text-muted-foreground" />
                        <span className="text-muted-foreground">Trabajador:</span>
                        <span className="font-medium">{workersMap[collection.worker] || "-"}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-muted-foreground" />
                        <span className="text-muted-foreground">Fecha:</span>
                        <span className="font-medium">{formatDate(collection.collection_date)}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Weight className="w-4 h-4 text-muted-foreground" />
                        <span className="text-muted-foreground">Envases:</span>
                        <span className="font-medium">
                          {collection.container_number || 0} ({collection.container_type || "-"})
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="lg:w-80 space-y-3">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="p-3 bg-accent/50 rounded-lg">
                        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                          <Weight className="w-4 h-4" />
                          Estimados
                        </div>
                        <div className="font-semibold">{normalizeNumber(collection.estimated_liters).toFixed(2)} L</div>
                      </div>

                      <div className="p-3 bg-accent/50 rounded-lg">
                        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                          <CheckCircle className="w-4 h-4" />
                          Netos
                        </div>
                        <div className="font-semibold">{normalizeNumber(collection.net_liters).toFixed(2)} L</div>
                      </div>
                    </div>

                    <div className="p-3 bg-primary/10 rounded-lg">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                        <Euro className="w-4 h-4" />
                        Precio total
                      </div>
                      <div className="font-semibold text-primary">{normalizeNumber(collection.total_price).toFixed(2)} EUR</div>
                    </div>
                  </div>
                </div>

                {collection.notes && (
                  <div className="mt-4 pt-4 border-t border-border">
                    <p className="text-sm text-muted-foreground text-left">
                      <strong>Notas:</strong> {collection.notes}
                    </p>
                  </div>
                )}

                <div className="mt-3 pt-3 border-t border-border flex gap-2 justify-end">
                  <Button variant="outline" size="sm" className="gap-2" onClick={() => navigate(`/collections/${collection.id}`)}>
                    <Eye className="w-4 h-4" />
                    Ver
                  </Button>
                  <Button variant="outline" size="sm" className="gap-2" onClick={() => navigate(`/collections/${collection.id}/edit`)}>
                    <Edit className="w-4 h-4" />
                    Editar
                  </Button>
                  <Button variant="destructive" size="sm" className="gap-2" onClick={() => askDelete(collection)}>
                    <Trash2 className="w-4 h-4" />
                    Eliminar
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {!loading && totalPages > 1 && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <p className="text-sm text-muted-foreground">
                {total} resultados • Pagina {page} de {totalPages}
              </p>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>
                  Anterior
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                >
                  Siguiente
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Card className="bg-gradient-primary text-primary-foreground">
        <CardContent className="pt-6">
          <div className="text-center">
            <Weight className="w-12 h-12 mx-auto mb-4 opacity-90" />
            <h3 className="text-xl font-semibold mb-2">Resumen de pagina</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
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
                <p className="opacity-90">Importe total</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <ConfirmDeleteDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Eliminar recogida"
        description={toDelete ? `Se va a eliminar la recogida #${toDelete.id}. Esta accion no se puede deshacer.` : "Esta accion no se puede deshacer."}
        confirmLabel="Eliminar"
        onConfirm={handleDelete}
        loading={deleting}
      />
    </div>
  );
}
