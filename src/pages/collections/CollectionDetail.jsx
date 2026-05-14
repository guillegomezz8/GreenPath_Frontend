import { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "@/context/AuthProvider";
import { useSnackbar } from "@/context/SnackbarProvider";
import { handleApiError, getCollectionStatusLabel } from "@/components/Utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import ConfirmDeleteDialog from "@/components/common/ConfirmDeleteDialog";
import {
  ArrowLeft,
  CalendarDays,
  CheckCircle,
  ClipboardList,
  Edit,
  Euro,
  MapPin,
  Package,
  Scale,
  Trash2,
  UserRound,
  Weight,
} from "lucide-react";

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

function FieldItem({ icon: Icon, label, value, strong = false }) {
  return (
    <div className="min-w-0 rounded-2xl border border-border/70 bg-background/75 px-4 py-3 text-left">
      <div className="mb-1 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
        {Icon && <Icon className="h-4 w-4 shrink-0" />}
        {label}
      </div>
      <p className={`truncate text-sm ${strong ? "font-bold text-primary" : "font-semibold text-foreground"}`}>{value}</p>
    </div>
  );
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
  const title = loading ? "Cargando..." : `${isClient ? "Mi recogida" : "Recogida"} #${collection?.id || id}`;
  const collectionDate = formatDate(collection?.collection_date);
  const netLitersLabel = `${asNumber(collection?.net_liters).toFixed(2)} L`;
  const totalPriceLabel = `${asNumber(collection?.total_price).toFixed(2)} EUR`;
  const pricePerLiterLabel = `${asNumber(collection?.price_per_liter).toFixed(2)} EUR`;
  const statusLabel = collection?.status ? getCollectionStatusLabel(collection.status) : "-";

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
              {title}
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

      <div className="space-y-6">
        <Card className="border-border/70 bg-card/95 shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-left">
              <ClipboardList className="h-5 w-5 text-primary" />
              Datos de la recogida
            </CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {!isClient && <FieldItem icon={UserRound} label="Cliente" value={collection?.client_name || "-"} strong />}
            {!isClient && <FieldItem icon={MapPin} label="Ruta" value={collection?.route_name || "-"} />}
            <FieldItem icon={CalendarDays} label="Fecha" value={collectionDate} strong />
            <FieldItem icon={UserRound} label={isClient ? "Registrada por" : "Trabajador"} value={collection?.worker_name || "-"} />
            {!isClient && <FieldItem icon={CheckCircle} label="Estado" value={statusLabel} strong />}
          </CardContent>
        </Card>

        <Card className="border-border/70 bg-card/95 shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-left">
              <Scale className="h-5 w-5 text-primary" />
              Medicion e importe
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <FieldItem icon={Package} label="Tipo envase" value={collection?.container_type || "-"} />
              <FieldItem icon={Package} label="Numero envases" value={collection?.container_number || 0} strong />
              {!isClient && <FieldItem icon={Weight} label="Litros estimados" value={`${asNumber(collection?.estimated_liters).toFixed(2)} L`} />}
              {!isClient && <FieldItem icon={Weight} label="Litros medidos" value={collection?.measured_liters !== null ? `${asNumber(collection?.measured_liters).toFixed(2)} L` : "-"} />}
              {!isClient && <FieldItem icon={Weight} label="Litros deducidos" value={`${asNumber(collection?.deduction_liters).toFixed(2)} L`} />}
              <FieldItem icon={CheckCircle} label={isClient ? "Litros registrados" : "Litros netos"} value={netLitersLabel} strong />
              <FieldItem icon={Euro} label="Precio por litro" value={pricePerLiterLabel} />
              <FieldItem icon={Euro} label="Total" value={totalPriceLabel} strong />
              {!isClient && <FieldItem icon={CheckCircle} label="Facturacion" value={billableLabel} />}
            </div>
            {!isClient && (
              <div className="grid grid-cols-1 gap-3 border-t border-border/70 pt-3 sm:grid-cols-2 xl:grid-cols-3">
                <FieldItem icon={ClipboardList} label="Motivo deduccion" value={collection?.deduction_reason_label || collection?.deduction_reason || "-"} />
                <FieldItem icon={ClipboardList} label="Notas deduccion" value={collection?.deduction_notes || "-"} />
                <FieldItem icon={ClipboardList} label="Notas" value={collection?.notes || "-"} />
              </div>
            )}
          </CardContent>
        </Card>
      </div>

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
