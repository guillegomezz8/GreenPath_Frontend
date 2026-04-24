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
  const isClient = user?.role_type === "client";

  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [collection, setCollection] = useState(null);
  const billableLabel = collection?.billable_label || (collection?.billable ? "Facturable" : "No facturable");

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
        <div className="flex min-w-0 flex-1 items-start gap-3 sm:items-center sm:gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/collections")} className="mt-1 flex-shrink-0 sm:mt-0">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="min-w-0 flex-1">
            <h1 className="text-left text-xl font-bold leading-tight text-foreground sm:text-2xl lg:text-3xl">
              {loading ? "Cargando..." : `${isClient ? "Mi recogida" : "Recogida"} #${collection?.id || id}`}
            </h1>
            <p className="mt-1 text-left text-sm leading-relaxed text-muted-foreground sm:text-base">
              {isClient ? "Consulta el detalle de tu recogida y los litros registrados." : "Detalle de recogida y sus importes."}
            </p>
          </div>
        </div>
        <div className="flex flex-shrink-0 gap-2 sm:gap-3">
          {isOwner && (
            <Button variant="outline" size="sm" onClick={() => navigate(`/collections/${id}/edit`)}>
              <Edit className="h-4 w-4 sm:mr-2" />
              Editar
            </Button>
          )}
          {isOwner && (
            <Button variant="destructive" size="sm" onClick={() => setDeleteOpen(true)}>
              <Trash2 className="h-4 w-4 sm:mr-2" />
              Eliminar
            </Button>
          )}
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5 text-primary" />
            Datos generales
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-4 text-left text-sm md:grid-cols-2">
          <div><span className="text-muted-foreground">Cliente:</span> {collection?.client_name || "-"}</div>
          <div><span className="text-muted-foreground">Ruta:</span> {collection?.route_name || "Sin ruta"}</div>
          <div><span className="text-muted-foreground">Fecha:</span> {formatDate(collection?.collection_date)}</div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-muted-foreground">Estado:</span>
            <Badge className={getCollectionStatusClass(collection?.status)}>{getCollectionStatusLabel(collection?.status)}</Badge>
          </div>
          <div><span className="text-muted-foreground">Trabajador:</span> {collection?.worker_name || "-"}</div>
          <div><span className="text-muted-foreground">Planificacion:</span> {collection?.route_day_client ? "Asignada a una ruta" : "Sin planificacion previa"}</div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Weight className="h-5 w-5 text-primary" />
            Litros y envases
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-4 text-left text-sm md:grid-cols-2">
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
            <Euro className="h-5 w-5 text-primary" />
            Precio y facturacion
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-4 text-left text-sm md:grid-cols-2">
          <div><span className="text-muted-foreground">Precio por litro:</span> {asNumber(collection?.price_per_liter).toFixed(3)} EUR</div>
          <div><span className="text-muted-foreground">Total:</span> {asNumber(collection?.total_price).toFixed(2)} EUR</div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-muted-foreground">Facturable:</span>
            <Badge variant="outline" className={collection?.billable ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-slate-200 bg-slate-50 text-slate-600"}>
              {billableLabel}
            </Badge>
          </div>
          <div className="md:col-span-2"><span className="text-muted-foreground">Notas:</span> {collection?.notes || "-"}</div>
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
