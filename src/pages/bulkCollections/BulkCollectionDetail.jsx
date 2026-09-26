import { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, CalendarDays, CheckCircle2, Download, Edit, Euro, FileText, PackagePlus, Scale, Trash2, UserRound } from "lucide-react";

import { useAuth } from "@/context/AuthProvider";
import { useSnackbar } from "@/context/SnackbarProvider";
import { handleApiError } from "@/components/Utils";
import ConfirmDeleteDialog from "@/components/common/ConfirmDeleteDialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatBulkCollectionQuantity, formatCurrency, formatDate } from "./bulkCollectionUtils";

function Field({ icon: Icon, label, value, strong = false }) {
  return (
    <div className="min-w-0 rounded-lg border border-border/70 bg-background/70 p-4 text-left">
      <div className="mb-1 flex items-center gap-2 text-xs text-muted-foreground">{Icon && <Icon className="h-4 w-4 shrink-0" />}{label}</div>
      <p className={`break-words text-sm ${strong ? "font-bold text-primary" : "font-semibold text-foreground"}`}>{value || "-"}</p>
    </div>
  );
}

export default function BulkCollectionDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { api } = useAuth();
  const showSnackbar = useSnackbar();
  const [bulkCollection, setBulkCollection] = useState(null);
  const [loading, setLoading] = useState(true);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const fetchBulkCollection = useCallback(async () => {
    try {
      setLoading(true);
      const response = await api().get(`bulk-collections/${encodeURIComponent(id)}/`);
      setBulkCollection(response.data || null);
    } catch (error) {
      showSnackbar(handleApiError(error, "No se pudo cargar la recogida."), "error");
      navigate("/bulk-collections");
    } finally {
      setLoading(false);
    }
  }, [api, id, navigate, showSnackbar]);

  useEffect(() => { fetchBulkCollection(); }, [fetchBulkCollection]);

  const deleteBulkCollection = async () => {
    try {
      setDeleting(true);
      await api().delete(`bulk-collections/${encodeURIComponent(id)}/`);
      showSnackbar("Recogida eliminada correctamente.", "success");
      navigate("/bulk-collections");
    } catch (error) {
      showSnackbar(handleApiError(error, "No se pudo eliminar la recogida."), "error");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-start gap-3 sm:items-center">
          <Button variant="ghost" size="icon" onClick={() => navigate("/bulk-collections")}><ArrowLeft className="h-4 w-4" /></Button>
          <div className="min-w-0 text-left"><h1 className="flex items-center gap-2 text-xl font-bold sm:text-2xl lg:text-3xl"><PackagePlus className="h-7 w-7 shrink-0 text-primary" />{loading ? "Cargando..." : `Recogida #${id}`}</h1><p className="mt-1 text-sm text-muted-foreground">{bulkCollection ? `${bulkCollection.client_name} - ${formatDate(bulkCollection.collection_date)}` : "Detalle de la recogida al por mayor."}</p></div>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:flex">
          <Button variant="outline" className="gap-2" disabled={!bulkCollection} onClick={() => navigate(`/bulk-collections/${id}/edit`)}><Edit className="h-4 w-4" />Editar</Button>
          <Button variant="destructive" className="gap-2" disabled={!bulkCollection} onClick={() => setDeleteOpen(true)}><Trash2 className="h-4 w-4" />Eliminar</Button>
        </div>
      </div>

      {loading ? <Card><CardContent className="py-12 text-center text-muted-foreground">Cargando recogida...</CardContent></Card> : bulkCollection && (
        <div className="space-y-6">
          <div className="rounded-lg border border-primary/25 bg-primary/5 p-5 text-left sm:flex sm:items-end sm:justify-between">
            <div><p className="text-sm text-muted-foreground">Importe final</p><p className="mt-1 text-3xl font-bold text-primary">{formatCurrency(bulkCollection.total_price)}</p></div>
            <div className="mt-3 flex flex-wrap gap-2 sm:mt-0"><span className="rounded-full border border-border bg-background px-3 py-1 text-sm">{formatBulkCollectionQuantity(bulkCollection.quantity, bulkCollection.unit)}</span><span className="rounded-full border border-border bg-background px-3 py-1 text-sm">{bulkCollection.billable ? "Facturable" : "No facturable"}</span></div>
          </div>
          <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1.25fr)_minmax(280px,0.75fr)]">
          <div className="space-y-6">
            <Card>
              <CardHeader><CardTitle className="flex items-center gap-2 text-left"><Scale className="h-5 w-5 text-primary" />Resumen economico</CardTitle></CardHeader>
              <CardContent className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <Field icon={Scale} label="Cantidad" value={formatBulkCollectionQuantity(bulkCollection.quantity, bulkCollection.unit)} />
                <Field icon={Euro} label={`Precio por ${bulkCollection.unit_label?.toLowerCase() || "unidad"}`} value={formatCurrency(bulkCollection.unit_price)} />
                <Field icon={CheckCircle2} label="Facturacion" value={bulkCollection.billable ? "Facturable" : "No facturable"} />
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle className="flex items-center gap-2 text-left"><FileText className="h-5 w-5 text-primary" />Observaciones</CardTitle></CardHeader>
              <CardContent className="whitespace-pre-wrap text-left text-sm text-muted-foreground">{bulkCollection.notes || "Sin observaciones registradas."}</CardContent>
            </Card>
          </div>
          <div className="space-y-6">
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2 text-left"><UserRound className="h-5 w-5 text-primary" />Cliente y fecha</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <Field icon={UserRound} label="Cliente" value={bulkCollection.client_name} strong />
              <Field icon={CalendarDays} label="Fecha" value={formatDate(bulkCollection.collection_date)} />
              <Button variant="outline" className="w-full" onClick={() => navigate(`/clients/${bulkCollection.client}`)}>Ver cliente</Button>
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2 text-left"><FileText className="h-5 w-5 text-primary" />Factura adjunta</CardTitle></CardHeader>
            <CardContent>
              {bulkCollection.invoice_file ? <Button asChild className="w-full gap-2"><a href={bulkCollection.invoice_file} target="_blank" rel="noreferrer"><Download className="h-4 w-4" />Abrir factura</a></Button> : <p className="text-left text-sm text-muted-foreground">No hay ninguna factura adjunta.</p>}
            </CardContent>
          </Card>
          </div>
          </div>
        </div>
      )}

      <ConfirmDeleteDialog open={deleteOpen} onOpenChange={setDeleteOpen} title="Eliminar recogida" description={`Se eliminara la recogida #${id}. Esta accion no se puede deshacer.`} confirmLabel="Eliminar" onConfirm={deleteBulkCollection} loading={deleting} />
    </div>
  );
}
