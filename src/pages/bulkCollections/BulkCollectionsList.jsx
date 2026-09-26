import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { CalendarDays, Edit, Eye, FileText, PackagePlus, Plus, Scale, Trash2, UserRound } from "lucide-react";

import { useAuth } from "@/context/AuthProvider";
import { useSnackbar } from "@/context/SnackbarProvider";
import { handleApiError } from "@/components/Utils";
import ConfirmDeleteDialog from "@/components/common/ConfirmDeleteDialog";
import PaginatedScaffold from "@/components/common/PaginatedScaffold";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatBulkCollectionQuantity, formatCurrency, formatDate } from "./bulkCollectionUtils";

const FILTERS = ["Todas", "Facturables", "No facturables"];

export default function BulkCollectionsList() {
  const navigate = useNavigate();
  const { api } = useAuth();
  const showSnackbar = useSnackbar();
  const [bulkCollections, setBulkCollections] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("Todas");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [toDelete, setToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const pageSize = 10;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const fetchBulkCollections = useCallback(async () => {
    try {
      setLoading(true);
      const params = { page, page_size: pageSize };
      if (search.trim()) params.search = search.trim();
      if (filter === "Facturables") params.billable = true;
      if (filter === "No facturables") params.billable = false;
      const response = await api().get("bulk-collections/", { params });
      const payload = response.data || {};
      const items = Array.isArray(payload.results) ? payload.results : [];
      setBulkCollections(items);
      setTotal(Number(payload.count || items.length));
    } catch (error) {
      showSnackbar(handleApiError(error, "No se pudieron cargar las recogidas al por mayor."), "error");
    } finally {
      setLoading(false);
    }
  }, [api, filter, page, search, showSnackbar]);

  useEffect(() => { fetchBulkCollections(); }, [fetchBulkCollections]);
  useEffect(() => { setPage(1); }, [filter, search]);

  const pageStats = useMemo(() => ({
    total,
    billable: bulkCollections.filter((item) => item.billable).length,
    amount: formatCurrency(bulkCollections.reduce((sum, item) => sum + Number(item.total_price || 0), 0)),
  }), [bulkCollections, total]);

  const confirmDelete = async () => {
    if (!toDelete?.id) return;
    try {
      setDeleting(true);
      await api().delete(`bulk-collections/${encodeURIComponent(toDelete.id)}/`);
      showSnackbar("Recogida eliminada correctamente.", "success");
      setToDelete(null);
      await fetchBulkCollections();
    } catch (error) {
      showSnackbar(handleApiError(error, "No se pudo eliminar la recogida."), "error");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <>
      <PaginatedScaffold
        title={<><PackagePlus className="h-8 w-8 text-primary" /> Recogidas al por mayor</>}
        subtitle="Registra recogidas directas por cantidad, unidad y precio y controla su impacto economico."
        rightAction={{ label: "Nueva recogida", onClick: () => navigate("/bulk-collections/new"), icon: <Plus className="h-4 w-4" /> }}
        searchPlaceholder="Buscar por cliente, CIF u observaciones..."
        searchValue={search}
        onSearchChange={setSearch}
        filters={FILTERS}
        selectedFilter={filter}
        onFilterChange={setFilter}
        counts={pageStats}
        countDefs={[
          { key: "total", label: "Recogidas", className: "text-primary" },
          { key: "billable", label: "Facturables en pagina", className: "text-blue-600" },
          { key: "amount", label: "Importe en pagina", className: "text-emerald-600" },
        ]}
        loading={loading}
        total={total}
        page={page}
        totalPages={totalPages}
        onPrevPage={() => setPage((current) => Math.max(1, current - 1))}
        onNextPage={() => setPage((current) => Math.min(totalPages, current + 1))}
      >
        {bulkCollections.map((bulkCollection) => (
          <Card key={bulkCollection.id} className="transition-shadow hover:shadow-elegant">
            <CardHeader className="pb-3 text-left">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0 space-y-2">
                  <CardTitle className="truncate text-lg">Recogida #{bulkCollection.id}</CardTitle>
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="outline"><UserRound className="mr-1 h-3.5 w-3.5" />{bulkCollection.client_name}</Badge>
                     <Badge variant="outline"><CalendarDays className="mr-1 h-3.5 w-3.5" />{formatDate(bulkCollection.collection_date)}</Badge>
                    <Badge variant={bulkCollection.billable ? "default" : "secondary"}>{bulkCollection.billable ? "Facturable" : "No facturable"}</Badge>
                    {bulkCollection.invoice_file && <Badge variant="outline"><FileText className="mr-1 h-3.5 w-3.5" />Factura adjunta</Badge>}
                  </div>
                </div>
                <div className="text-left sm:text-right">
                  <p className="text-sm text-muted-foreground">Importe final</p>
                  <p className="text-xl font-semibold text-primary">{formatCurrency(bulkCollection.total_price)}</p>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4 text-left">
              <div className="grid grid-cols-1 gap-2 text-sm sm:grid-cols-2">
                <div className="flex items-center gap-2"><Scale className="h-4 w-4 text-muted-foreground" /><span><strong>Cantidad:</strong> {formatBulkCollectionQuantity(bulkCollection.quantity, bulkCollection.unit)}</span></div>
                <div><strong>Precio unitario:</strong> {formatCurrency(bulkCollection.unit_price)}</div>
              </div>
              <div className="grid grid-cols-1 gap-2 border-t border-border pt-3 sm:grid-cols-3">
                <Button variant="outline" size="sm" className="gap-2" onClick={() => navigate(`/bulk-collections/${bulkCollection.id}`)}><Eye className="h-4 w-4" />Detalle</Button>
                <Button variant="outline" size="sm" className="gap-2" onClick={() => navigate(`/bulk-collections/${bulkCollection.id}/edit`)}><Edit className="h-4 w-4" />Editar</Button>
                <Button variant="destructive" size="sm" className="gap-2" onClick={() => setToDelete(bulkCollection)}><Trash2 className="h-4 w-4" />Eliminar</Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </PaginatedScaffold>
      <ConfirmDeleteDialog
        open={!!toDelete}
        onOpenChange={(open) => { if (!open) setToDelete(null); }}
        title="Eliminar recogida"
        description={`Se eliminara la recogida #${toDelete?.id || ""}. Esta accion no se puede deshacer.`}
        confirmLabel="Eliminar"
        onConfirm={confirmDelete}
        loading={deleting}
      />
    </>
  );
}
