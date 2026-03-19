import { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "@/context/AuthProvider";
import { useSnackbar } from "@/context/SnackbarProvider";
import { handleApiError, getCollectionStatusClass, getCollectionStatusLabel } from "@/components/Utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import ConfirmDeleteDialog from "@/components/common/ConfirmDeleteDialog";
import { ArrowLeft, Edit, Package, Trash2, Weight, Euro } from "lucide-react";

function formatDate(dateStr) {
  if (!dateStr) return "-";
  const d = new Date(`${dateStr}T00:00:00`);
  if (Number.isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString("es-ES");
}

function asNumber(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

export default function CollectionDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { api, user } = useAuth();
  const showSnackbar = useSnackbar();
  const isOwner = user?.role_type === "owner";

  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [collection, setCollection] = useState(null);

  const fetchCollection = useCallback(async () => {
    if (!id) return;
    try {
      setLoading(true);
      const res = await api().get(`collections/${encodeURIComponent(id)}/`);
      setCollection(res.data || null);
    } catch (e) {
      const msg = handleApiError(e, "No se pudo cargar la recogida.");
      showSnackbar(msg, "error");
      navigate("/collections");
    } finally {
      setLoading(false);
    }
  }, [api, id, navigate, showSnackbar]);

  useEffect(() => {
    fetchCollection();
  }, [fetchCollection]);

  const handleDelete = async () => {
    if (!id) return;
    try {
      setDeleting(true);
      await api().delete(`collections/${encodeURIComponent(id)}/`);
      showSnackbar("Recogida eliminada correctamente.", "success");
      navigate("/collections");
    } catch (e) {
      const msg = handleApiError(e, "No se pudo eliminar la recogida.");
      showSnackbar(msg, "error");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3 sm:items-center sm:gap-4 min-w-0 flex-1">
          <Button variant="ghost" size="icon" onClick={() => navigate("/collections")} className="flex-shrink-0 mt-1 sm:mt-0">
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div className="min-w-0 flex-1">
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-foreground text-left leading-tight">
              {loading ? "Cargando..." : `Recogida #${collection?.id || id}`}
            </h1>
            <p className="text-sm sm:text-base text-muted-foreground text-left mt-1 leading-relaxed">
              Detalle de recogida y sus importes.
            </p>
          </div>
        </div>
        <div className="flex gap-2 sm:gap-3 flex-shrink-0">
          {isOwner && (
            <Button variant="outline" size="sm" onClick={() => navigate(`/collections/${id}/edit`)}>
              <Edit className="w-4 h-4 sm:mr-2" />
              Editar
            </Button>
          )}
          {isOwner && (
            <Button variant="destructive" size="sm" onClick={() => setDeleteOpen(true)}>
              <Trash2 className="w-4 h-4 sm:mr-2" />
              Eliminar
            </Button>
          )}
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="w-5 h-5 text-primary" />
            Datos generales
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-left">
          <p><span className="text-muted-foreground">Cliente:</span> {collection?.client_name || "-"}</p>
          <p><span className="text-muted-foreground">Ruta:</span> {collection?.route_name || "Sin ruta"}</p>
          <p><span className="text-muted-foreground">Fecha:</span> {formatDate(collection?.collection_date)}</p>
          <p><span className="text-muted-foreground">Estado:</span> <Badge className={getCollectionStatusClass(collection?.status)}>{getCollectionStatusLabel(collection?.status)}</Badge></p>
          <p><span className="text-muted-foreground">Trabajador:</span> {collection?.worker_name || "-"}</p>
          <p><span className="text-muted-foreground">Parada planificada:</span> {collection?.route_day_client || "-"}</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Weight className="w-5 h-5 text-primary" />
            Litros y envases
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-left">
          <p><span className="text-muted-foreground">Tipo envase:</span> {collection?.container_type || "-"}</p>
          <p><span className="text-muted-foreground">Numero envases:</span> {collection?.container_number || 0}</p>
          <p><span className="text-muted-foreground">Litros estimados:</span> {asNumber(collection?.estimated_liters).toFixed(2)} L</p>
          <p><span className="text-muted-foreground">Litros medidos:</span> {collection?.measured_liters !== null ? asNumber(collection?.measured_liters).toFixed(2) : "-"} L</p>
          <p><span className="text-muted-foreground">Litros deducidos:</span> {asNumber(collection?.deduction_liters).toFixed(2)} L</p>
          <p><span className="text-muted-foreground">Litros netos:</span> {asNumber(collection?.net_liters).toFixed(2)} L</p>
          <p><span className="text-muted-foreground">Motivo deduccion:</span> {collection?.deduction_reason_label || collection?.deduction_reason || "-"}</p>
          <p><span className="text-muted-foreground">Notas deduccion:</span> {collection?.deduction_notes || "-"}</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Euro className="w-5 h-5 text-primary" />
            Precio
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-left">
          <p><span className="text-muted-foreground">Precio por litro:</span> {asNumber(collection?.price_per_liter).toFixed(3)} EUR</p>
          <p><span className="text-muted-foreground">Total:</span> {asNumber(collection?.total_price).toFixed(2)} EUR</p>
          <p className="md:col-span-2"><span className="text-muted-foreground">Notas:</span> {collection?.notes || "-"}</p>
        </CardContent>
      </Card>

      {isOwner && (
        <ConfirmDeleteDialog
          open={deleteOpen}
          onOpenChange={setDeleteOpen}
          title="Eliminar recogida"
          description={`Se va a eliminar la recogida #${collection?.id || id}. Esta accion no se puede deshacer.`}
          confirmLabel="Eliminar"
          onConfirm={handleDelete}
          loading={deleting}
        />
      )}
    </div>
  );
}
