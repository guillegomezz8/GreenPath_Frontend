import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Edit, FileText, Receipt, Trash2, UserRound } from "lucide-react";
import { useAuth } from "@/context/AuthProvider";
import { useSnackbar } from "@/context/SnackbarProvider";
import { handleApiError } from "@/components/Utils";
import ConfirmDeleteDialog from "@/components/common/ConfirmDeleteDialog";
import PdfDownloader from "@/components/common/PdfDownloader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

function toNumber(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function formatCurrency(value, currency = "EUR") {
  return new Intl.NumberFormat("es-ES", { style: "currency", currency }).format(toNumber(value));
}

function formatDate(value) {
  if (!value) return "-";
  const parsed = new Date(`${value}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleDateString("es-ES");
}

export default function SaleDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { api } = useAuth();
  const showSnackbar = useSnackbar();

  const [sale, setSale] = useState(null);
  const [loading, setLoading] = useState(true);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const fetchSale = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api().get(`sales/${encodeURIComponent(id)}/`);
      setSale(res.data || null);
    } catch (e) {
      const msg = handleApiError(e, "No se pudo cargar la venta.");
      showSnackbar(msg, "error");
      navigate("/sales");
    } finally {
      setLoading(false);
    }
  }, [api, id, navigate, showSnackbar]);

  useEffect(() => {
    if (!id) {
      navigate("/sales");
      return;
    }
    fetchSale();
  }, [fetchSale, id, navigate]);

  const handleDelete = async () => {
    if (!sale?.id) return;
    try {
      setDeleting(true);
      await api().delete(`sales/${encodeURIComponent(sale.id)}/`);
      showSnackbar("Venta eliminada correctamente.", "success");
      navigate("/sales");
    } catch (e) {
      const msg = handleApiError(e, "No se pudo eliminar la venta.");
      showSnackbar(msg, "error");
    } finally {
      setDeleting(false);
    }
  };

  const summaryCards = useMemo(() => {
    if (!sale) return [];
    return [
      { label: "Base", value: formatCurrency(sale.subtotal, sale.currency || "EUR"), className: "text-blue-600" },
      { label: "IVA", value: formatCurrency(sale.tax_amount, sale.currency || "EUR"), className: "text-orange-500" },
      { label: "Total", value: formatCurrency(sale.total, sale.currency || "EUR"), className: "text-primary" },
    ];
  }, [sale]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 flex-1 items-start gap-3 sm:items-center sm:gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/sales")} className="mt-1 shrink-0 sm:mt-0">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="min-w-0 flex-1 text-left">
            <h1 className="truncate text-xl font-bold text-foreground sm:text-2xl lg:text-3xl">{loading ? "Cargando..." : sale?.invoice_number || `Venta #${id}`}</h1>
            <p className="mt-1 text-sm text-muted-foreground sm:text-base">Detalle de la venta y su factura asociada.</p>
          </div>
        </div>

        <div className="grid w-full grid-cols-1 gap-2 sm:w-auto sm:grid-cols-2 xl:grid-cols-3">
          <PdfDownloader
            url={`sales/${id}/invoice/download/`}
            filename={`${sale?.invoice_number || `venta-${id}`}.pdf`}
            buttonText="Descargar factura"
            className="h-10 w-full justify-center"
            disabled={loading || !sale}
          />
          <Button variant="outline" className="gap-2" disabled={loading || !sale} onClick={() => navigate(`/sales/${id}/edit`)}>
            <Edit className="h-4 w-4" />
            Editar
          </Button>
          <Button variant="destructive" className="gap-2" disabled={loading || !sale || deleting} onClick={() => setDeleteOpen(true)}>
            <Trash2 className="h-4 w-4" />
            {deleting ? "Eliminando..." : "Eliminar"}
          </Button>
        </div>
      </div>

      {loading ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">Cargando venta...</CardContent>
        </Card>
      ) : !sale ? null : (
        <>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {summaryCards.map((item) => (
              <Card key={item.label}>
                <CardContent className="pt-6 text-center">
                  <div className={`text-xl font-bold ${item.className}`}>{item.value}</div>
                  <p className="text-sm text-muted-foreground">{item.label}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1.1fr)_360px]">
            <div className="space-y-6">
              <Card>
                <CardHeader className="text-left">
                  <CardTitle className="flex items-center gap-2">
                    <Receipt className="h-5 w-5 text-primary" />
                    Factura
                  </CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-1 gap-4 text-left md:grid-cols-2">
                  <div className="rounded-xl border border-border/80 p-4">
                    <p className="text-sm text-muted-foreground">Numero de factura</p>
                    <p className="mt-2 font-semibold text-foreground">{sale.invoice_number || "-"}</p>
                  </div>
                <div className="rounded-xl border border-border/80 p-4">
                  <p className="text-sm text-muted-foreground">Moneda</p>
                  <p className="mt-2 font-semibold text-foreground">{sale.currency || "EUR"}</p>
                </div>
                <div className="rounded-xl border border-border/80 p-4">
                  <p className="text-sm text-muted-foreground">Fecha de factura</p>
                  <p className="mt-2 font-semibold text-foreground">{formatDate(sale.invoice_date)}</p>
                </div>
              </CardContent>
            </Card>

              <Card>
                <CardHeader className="text-left">
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5 text-primary" />
                    Concepto facturado
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 text-left">
                  <div className="rounded-xl border border-border/80 p-4">
                    <p className="text-sm text-muted-foreground">Descripcion</p>
                    <p className="mt-2 whitespace-pre-wrap text-foreground">{sale.product_description || "-"}</p>
                  </div>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                    <div className="rounded-xl border border-border/80 p-4">
                      <p className="text-sm text-muted-foreground">Cantidad</p>
                      <p className="mt-2 font-semibold text-foreground">{toNumber(sale.quantity).toFixed(2)} {sale.unit || "-"}</p>
                    </div>
                    <div className="rounded-xl border border-border/80 p-4">
                      <p className="text-sm text-muted-foreground">Precio unitario</p>
                      <p className="mt-2 font-semibold text-foreground">{formatCurrency(sale.unit_price, sale.currency || "EUR")}</p>
                    </div>
                    <div className="rounded-xl border border-border/80 p-4">
                      <p className="text-sm text-muted-foreground">IVA</p>
                      <p className="mt-2 font-semibold text-foreground">{toNumber(sale.tax_rate).toFixed(2)}%</p>
                    </div>
                    <div className="rounded-xl border border-border/80 p-4">
                      <p className="text-sm text-muted-foreground">Importe IVA</p>
                      <p className="mt-2 font-semibold text-foreground">{formatCurrency(sale.tax_amount, sale.currency || "EUR")}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="space-y-6">
              <Card>
                <CardHeader className="text-left">
                  <CardTitle className="flex items-center gap-2">
                    <UserRound className="h-5 w-5 text-primary" />
                    Comprador
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-left text-sm text-muted-foreground">
                  <div>
                    <p className="text-sm text-muted-foreground">Razon social</p>
                    <p className="font-semibold text-foreground">{sale.buyer_name || "-"}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">CIF / NIF</p>
                    <p className="font-semibold text-foreground">{sale.buyer_tax_id || "-"}</p>
                  </div>
                  <Button variant="outline" className="w-full" onClick={() => navigate(sale?.buyer ? `/buyers/${sale.buyer}` : "/buyers")}>
                    Ver comprador
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="text-left">
                  <CardTitle className="flex items-center gap-2">
                    <Receipt className="h-5 w-5 text-primary" />
                    Notas
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-left text-sm text-muted-foreground">
                  {sale.notes ? sale.notes : "Sin observaciones registradas."}
                </CardContent>
              </Card>
            </div>
          </div>
        </>
      )}

      <ConfirmDeleteDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Eliminar venta"
        description={sale ? `Se eliminara la factura ${sale.invoice_number || `#${sale.id}`}. Esta accion no se puede deshacer.` : "Esta accion no se puede deshacer."}
        confirmLabel="Eliminar"
        onConfirm={handleDelete}
        loading={deleting}
      />
    </div>
  );
}
