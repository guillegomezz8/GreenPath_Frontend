import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Building2, Edit, Eye, Mail, MapPin, Phone, Plus, Trash2, UserCircle2 } from "lucide-react";
import { useAuth } from "@/context/AuthProvider";
import { useSnackbar } from "@/context/SnackbarProvider";
import { handleApiError } from "@/components/Utils";
import PaginatedScaffold from "@/components/common/PaginatedScaffold";
import ConfirmDeleteDialog from "@/components/common/ConfirmDeleteDialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const CONTACT_FILTERS = [];

export default function BuyersList() {
  const navigate = useNavigate();
  const { api } = useAuth();
  const showSnackbar = useSnackbar();

  const [buyers, setBuyers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [cityFilter, setCityFilter] = useState("");
  const [provinceFilter, setProvinceFilter] = useState("");
  const [contactFilter, setContactFilter] = useState("Todos");
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  const [total, setTotal] = useState(0);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [toDelete, setToDelete] = useState(null);

  const totalPages = useMemo(() => Math.max(1, Math.ceil(total / pageSize)), [pageSize, total]);

  const fetchBuyers = useCallback(async () => {
    try {
      setLoading(true);
      const params = { page, page_size: pageSize };
      if (search) params.search = search;
      if (cityFilter) params.city = cityFilter;
      if (provinceFilter) params.province = provinceFilter;
      const res = await api().get("buyers/", { params });
      const payload = res.data || {};
      const items = Array.isArray(payload?.results) ? payload.results : Array.isArray(payload) ? payload : [];
      setBuyers(items);
      setTotal(Number(payload?.count || items.length));
    } catch (e) {
      const msg = handleApiError(e, "No se pudieron cargar los compradores.");
      showSnackbar(msg, "error");
    } finally {
      setLoading(false);
    }
  }, [api, cityFilter, page, pageSize, provinceFilter, search, showSnackbar]);

  useEffect(() => {
    fetchBuyers();
  }, [fetchBuyers]);

  useEffect(() => {
    setPage(1);
  }, [search, cityFilter, provinceFilter, contactFilter]);

  const visibleBuyers = useMemo(() => {
    if (contactFilter === "Con email") {
      return buyers.filter((item) => !!item.email);
    }
    if (contactFilter === "Con telefono") {
      return buyers.filter((item) => !!item.phone);
    }
    if (contactFilter === "Con contacto") {
      return buyers.filter((item) => !!item.contact_person);
    }
    return buyers;
  }, [buyers, contactFilter]);

  const visibleStats = useMemo(() => {
    const withEmail = visibleBuyers.filter((item) => !!item.email).length;
    const withContact = visibleBuyers.filter((item) => !!item.contact_person).length;
    const withPhone = visibleBuyers.filter((item) => !!item.phone).length;
    return {
      total: visibleBuyers.length,
      with_email: withEmail,
      with_contact: withContact,
      with_phone: withPhone,
    };
  }, [visibleBuyers]);

  const askDelete = (buyer) => {
    setToDelete(buyer);
    setDeleteOpen(true);
  };

  const confirmDelete = async () => {
    if (!toDelete?.id) return;
    try {
      setDeleting(true);
      await api().delete(`buyers/${encodeURIComponent(toDelete.id)}/`);
      showSnackbar("Comprador eliminado correctamente.", "success");
      setDeleteOpen(false);
      setToDelete(null);
      await fetchBuyers();
    } catch (e) {
      const msg = handleApiError(e, "No se pudo eliminar el comprador.");
      showSnackbar(msg, "error");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <>
      <PaginatedScaffold
        title={<><Building2 className="h-8 w-8 text-primary" /> Gestion de Compradores</>}
        subtitle="Controla los datos fiscales y de contacto de los compradores internos."
        rightAction={{ label: "Nuevo comprador", onClick: () => navigate("/buyers/new"), icon: <Plus className="h-4 w-4" /> }}
        searchPlaceholder="Buscar por razon social, CIF, ciudad o contacto..."
        searchValue={search}
        onSearchChange={setSearch}
        renderSearch={(defaultSearch) => (
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,0.8fr)_minmax(0,0.8fr)]">
            {defaultSearch}
            <Input
              placeholder="Filtrar por ciudad..."
              value={cityFilter}
              onChange={(e) => setCityFilter(e.target.value)}
            />
            <Input
              placeholder="Filtrar por provincia..."
              value={provinceFilter}
              onChange={(e) => setProvinceFilter(e.target.value)}
            />
          </div>
        )}
        filters={CONTACT_FILTERS}
        selectedFilter={contactFilter}
        onFilterChange={setContactFilter}
        counts={visibleStats}
        countDefs={[]}
        loading={loading}
        total={total}
        page={page}
        totalPages={totalPages}
        onPrevPage={() => setPage((prev) => Math.max(1, prev - 1))}
        onNextPage={() => setPage((prev) => Math.min(totalPages, prev + 1))}
        showDefaultEmpty={false}
      >
        {!loading && visibleBuyers.length === 0 ? (
          <Card className="lg:col-span-2">
            <CardContent className="py-12 text-center text-muted-foreground">
              No hay compradores con los filtros seleccionados.
            </CardContent>
          </Card>
        ) : visibleBuyers.map((buyer) => (
          <Card key={buyer.id} className="transition-shadow hover:shadow-elegant">
            <CardHeader className="pb-3 text-left">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <CardTitle className="truncate text-lg">{buyer.fiscal_name}</CardTitle>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <Badge variant="outline">{buyer.tax_id}</Badge>
                    <Badge variant="outline">{buyer.city || "Sin ciudad"}</Badge>
                  </div>
                </div>
                <Button variant="outline" size="sm" className="w-full gap-2 sm:w-auto" onClick={() => navigate(`/buyers/${buyer.id}`)}>
                  <Eye className="h-4 w-4" />
                  Ver detalle
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4 text-left">
              <div className="space-y-2 text-sm text-muted-foreground">
                <div className="flex items-start gap-2">
                  <MapPin className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>{buyer.full_fiscal_address || buyer.fiscal_address}</span>
                </div>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4 shrink-0" />
                    <span className="truncate">{buyer.email || "Sin email"}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4 shrink-0" />
                    <span>{buyer.phone || "Sin telefono"}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <UserCircle2 className="h-4 w-4 shrink-0" />
                  <span>{buyer.contact_person || "Sin persona de contacto"}</span>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-2 border-t border-border pt-3 sm:grid-cols-3">
                <Button variant="outline" size="sm" className="gap-2" onClick={() => navigate(`/buyers/${buyer.id}`)}>
                  <Eye className="h-4 w-4" />
                  Ver
                </Button>
                <Button variant="outline" size="sm" className="gap-2" onClick={() => navigate(`/buyers/${buyer.id}/edit`)}>
                  <Edit className="h-4 w-4" />
                  Editar
                </Button>
                <Button variant="destructive" size="sm" className="gap-2" onClick={() => askDelete(buyer)}>
                  <Trash2 className="h-4 w-4" />
                  Eliminar
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </PaginatedScaffold>

      <ConfirmDeleteDialog
        open={deleteOpen}
        onOpenChange={(open) => {
          setDeleteOpen(open);
          if (!open) setToDelete(null);
        }}
        title="Eliminar comprador"
        description={toDelete ? `Se eliminara ${toDelete.fiscal_name}. Esta accion no se puede deshacer.` : "Esta accion no se puede deshacer."}
        confirmLabel="Eliminar"
        onConfirm={confirmDelete}
        loading={deleting}
      />
    </>
  );
}
