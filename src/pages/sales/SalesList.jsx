import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Edit, Eye, FileText, Plus, Receipt, Trash2, UserRound } from "lucide-react";
import { useAuth } from "@/context/AuthProvider";
import { useSnackbar } from "@/context/SnackbarProvider";
import { handleApiError } from "@/components/Utils";
import PaginatedScaffold from "@/components/common/PaginatedScaffold";
import ConfirmDeleteDialog from "@/components/common/ConfirmDeleteDialog";
import PdfDownloader from "@/components/common/PdfDownloader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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

function getSaleLines(sale) {
  return Array.isArray(sale.lines) && sale.lines.length > 0
    ? sale.lines
    : [sale];
}

export default function SalesList() {
  const navigate = useNavigate();
  const { api } = useAuth();
  const showSnackbar = useSnackbar();
  const currentYear = new Date().getFullYear();
  const yearFilters = useMemo(() => ["Todas", String(currentYear), String(currentYear - 1)], [currentYear]);

  const [sales, setSales] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [yearFilter, setYearFilter] = useState("Todas");
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  const [total, setTotal] = useState(0);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [toDelete, setToDelete] = useState(null);

  const totalPages = useMemo(() => Math.max(1, Math.ceil(total / pageSize)), [pageSize, total]);

  const fetchSales = useCallback(async () => {
    try {
      setLoading(true);
      const params = { page, page_size: pageSize };
      if (search) params.search = search;
      if (yearFilter !== "Todas") params.invoice_year = yearFilter;
      const res = await api().get("sales/", { params });
      const payload = res.data || {};
      const items = Array.isArray(payload?.results) ? payload.results : Array.isArray(payload) ? payload : [];
      setSales(items);
      setTotal(Number(payload?.count || items.length));
    } catch (e) {
      const msg = handleApiError(e, "No se pudieron cargar las ventas.");
      showSnackbar(msg, "error");
    } finally {
      setLoading(false);
    }
  }, [api, page, pageSize, search, showSnackbar, yearFilter]);

  useEffect(() => {
    fetchSales();
  }, [fetchSales]);

  useEffect(() => {
    setPage(1);
  }, [search, yearFilter]);

  const pageStats = useMemo(() => {
    const subtotal = sales.reduce((acc, item) => acc + toNumber(item.subtotal), 0);
    const tax = sales.reduce((acc, item) => acc + toNumber(item.tax_amount), 0);
    const totalAmount = sales.reduce((acc, item) => acc + toNumber(item.total), 0);
    return {
      total,
      subtotal: formatCurrency(subtotal),
      tax: formatCurrency(tax),
      total_amount: formatCurrency(totalAmount),
    };
  }, [sales, total]);

  const askDelete = (sale) => {
    setToDelete(sale);
    setDeleteOpen(true);
  };

  const confirmDelete = async () => {
    if (!toDelete?.id) return;
    try {
      setDeleting(true);
      await api().delete(`sales/${encodeURIComponent(toDelete.id)}/`);
      showSnackbar("Venta eliminada correctamente.", "success");
      setDeleteOpen(false);
      setToDelete(null);
      await fetchSales();
    } catch (e) {
      const msg = handleApiError(e, "No se pudo eliminar la venta.");
      showSnackbar(msg, "error");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <>
      <PaginatedScaffold
        title={<><Receipt className="h-8 w-8 text-primary" /> Gestion de Ventas</>}
        subtitle="Registra operaciones de venta, consulta facturas y controla el flujo de ingresos."
        rightAction={{ label: "Nueva venta", onClick: () => navigate("/sales/new"), icon: <Plus className="h-4 w-4" /> }}
        searchPlaceholder="Buscar por factura, comprador o concepto..."
        searchValue={search}
        onSearchChange={setSearch}
        filters={yearFilters}
        selectedFilter={yearFilter}
        onFilterChange={setYearFilter}
        counts={pageStats}
        countDefs={[
          { key: "total", label: "Ventas", className: "text-primary" },
          { key: "subtotal", label: "Base pagina", className: "text-blue-600" },
          { key: "tax", label: "IVA pagina", className: "text-orange-500" },
          { key: "total_amount", label: "Facturado pagina", className: "text-emerald-600" },
        ]}
        loading={loading}
        total={total}
        page={page}
        totalPages={totalPages}
        onPrevPage={() => setPage((prev) => Math.max(1, prev - 1))}
        onNextPage={() => setPage((prev) => Math.min(totalPages, prev + 1))}
      >
        {sales.map((sale) => {
          const lines = getSaleLines(sale);
          const description = lines
            .map((line) => line.product_description)
            .filter(Boolean)
            .join(" · ");

          return (
          <Card key={sale.id} className="transition-shadow hover:shadow-elegant">
            <CardHeader className="pb-3 text-left">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                <div className="min-w-0 space-y-2">
                  <CardTitle className="truncate text-lg">{sale.invoice_number || `Venta #${sale.id}`}</CardTitle>
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="outline">{sale.buyer_name || "Sin comprador"}</Badge>
                    <Badge variant="outline">{formatDate(sale.invoice_date)}</Badge>
                  </div>
                </div>
                <div className="text-left lg:text-right">
                  <p className="text-sm text-muted-foreground">Total factura</p>
                  <p className="text-xl font-semibold text-primary">{formatCurrency(sale.total, sale.currency || "EUR")}</p>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4 text-left">
              <div className="space-y-2 text-sm text-muted-foreground">
                <div className="flex min-w-0 items-center gap-2">
                  <FileText className="mt-0.5 h-4 w-4 shrink-0" />
                  <span className="min-w-0 flex-1 truncate">
                    {description || "Sin descripcion"}
                  </span>
                </div>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-3">
                  <div><span className="font-medium text-foreground">Conceptos:</span> {lines.length}</div>
                  <div><span className="font-medium text-foreground">Base:</span> {formatCurrency(sale.subtotal, sale.currency || "EUR")}</div>
                  <div><span className="font-medium text-foreground">IVA:</span> {formatCurrency(sale.tax_amount, sale.currency || "EUR")}</div>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-2 border-t border-border pt-3 sm:grid-cols-2 xl:grid-cols-4">
                <Button variant="outline" size="sm" className="gap-2" onClick={() => navigate(`/sales/${sale.id}`)}>
                  <Eye className="h-4 w-4" />
                  Ver detalle
                </Button>
                <PdfDownloader
                  url={`sales/${sale.id}/invoice/download/`}
                  filename={`${sale.invoice_number || `venta-${sale.id}`}.pdf`}
                  buttonText="Descargar factura"
                  className="h-9 w-full justify-center"
                />
                <Button variant="outline" size="sm" className="gap-2" onClick={() => navigate(`/sales/${sale.id}/edit`)}>
                  <Edit className="h-4 w-4" />
                  Editar
                </Button>
                <Button variant="destructive" size="sm" className="gap-2" onClick={() => askDelete(sale)}>
                  <Trash2 className="h-4 w-4" />
                  Eliminar
                </Button>
              </div>
            </CardContent>
          </Card>
          );
        })}
      </PaginatedScaffold>

      <ConfirmDeleteDialog
        open={deleteOpen}
        onOpenChange={(open) => {
          setDeleteOpen(open);
          if (!open) setToDelete(null);
        }}
        title="Eliminar venta"
        description={toDelete ? `Se eliminara la factura ${toDelete.invoice_number || `#${toDelete.id}`}. Esta accion no se puede deshacer.` : "Esta accion no se puede deshacer."}
        confirmLabel="Eliminar"
        onConfirm={confirmDelete}
        loading={deleting}
      />
    </>
  );
}
