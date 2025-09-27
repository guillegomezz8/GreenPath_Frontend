import { useEffect, useState, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthProvider";
import PaginatedScaffold from "@/components/common/PaginatedScaffold";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useSnackbar } from '@/context/SnackbarProvider';
import { handleApiError } from '@/components/Utils';
import { Users, Plus, MoreVertical, Edit, Trash2, MapPin, Phone, Mail } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import ConfirmDeleteDialog from "@/components/common/ConfirmDeleteDialog";

const FREQUENCIES = ["Todos", "Cada semana", "Cada 2 semanas", "Cada 3 semanas", "Cada 4 semanas"];
const FREQ_MAP = { "Todos": undefined, "Cada semana": "WEEKLY", "Cada 2 semanas": "2_WEEKS", "Cada 3 semanas": "3_WEEKS", "Cada 4 semanas": "4_WEEKS" };

export default function ClientsList() {
  const { api } = useAuth();
  const navigate = useNavigate();
  const showSnackbar = useSnackbar();

  const [clients, setClients] = useState([]);
  const [countData, setCountData] = useState({});
  const [loading, setLoading] = useState(false);

  const [search, setSearch] = useState("");
  const [frequency, setFrequency] = useState("Todos");
  const [ordering, setOrdering] = useState("name");

  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  const [total, setTotal] = useState(0);
  
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [toDelete, setToDelete] = useState(null);

  const totalPages = useMemo(() => Math.max(1, Math.ceil(total / pageSize)), [total, pageSize]);

  const [debouncedSearch, setDebouncedSearch] = useState(search);
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 350);
    return () => clearTimeout(t);
  }, [search]);

  const fetchClients = useCallback(async () => {
    try {
      setLoading(true);
      const params = { page, page_size: pageSize, ordering };
      if (debouncedSearch) params.search = debouncedSearch;
      if (frequency && frequency !== "Todos") params.frequency = FREQ_MAP[frequency];

      const res = await api().get("clients", { params });
      const payload = res.data;

      if (payload && typeof payload === "object" && "results" in payload) {
        setClients(payload.results);
        setTotal(payload.count ?? 0);
        setCountData(payload.counts ?? {});
      } else {
        const arr = Array.isArray(payload) ? payload : [];
        setClients(arr);
        setTotal(arr.length);
      }
    } catch (e) {
      const message = handleApiError(e, 'Error inesperado obteniendo clientes.');
      showSnackbar(message, 'error');
    } finally {
      setLoading(false);
    }
  }, [api, page, pageSize, ordering, debouncedSearch, frequency]);

  useEffect(() => { fetchClients(); }, [fetchClients]);
  useEffect(() => { setPage(1); }, [debouncedSearch, frequency, ordering]);

  const getStatusColor = (st) => {
    switch (st) {
      case "Cada semana": return "bg-success text-success-foreground";
      case "Cada 2 semanas": return "bg-blue-600 text-white";
      case "Cada 3 semanas": return "bg-orange-500 text-white";
      case "Cada 4 semanas": return "bg-red-600 text-white";
      default: return "bg-gray-400 text-white";
    }
  };

  const askDelete = (client) => {
    setToDelete({ id: client.id, name: client.name });
    setDeleteOpen(true);
  };

  const confirmDelete = async () => {
    if (!toDelete) return;
    try {
      setDeleting(true);
      await api().delete(`clients/${encodeURIComponent(toDelete.id)}/`);
      showSnackbar(`Cliente "${toDelete.name}" eliminado.`, 'success');
      await fetchClients();
      setDeleteOpen(false);
      setToDelete(null);
    } catch (e) {
      const msg = handleApiError(e, 'No se pudo eliminar el cliente.');
      showSnackbar(msg, 'error');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <>
      <PaginatedScaffold
        title={<><Users className="w-8 h-8 text-primary" /> Gestión de Clientes</>}
        subtitle="Administra la información de todos tus clientes"
        rightAction={{ label: "Nuevo Cliente", onClick: () => navigate("/clients/new"), icon: <Plus className="w-4 h-4" /> }}

        searchPlaceholder="Buscar por nombre o dirección..."
        searchValue={search}
        onSearchChange={setSearch}

        filters={FREQUENCIES}
        selectedFilter={frequency}
        onFilterChange={setFrequency}

        counts={countData}
        countDefs={[
          { label: "Cada semana", key: "every_week", className: "text-success" },
          { label: "Cada 2 semanas", key: "every_2_weeks", className: "text-blue-600" },
          { label: "Cada 3 semanas", key: "every_3_weeks", className: "text-orange-500" },
          { label: "Cada 4 semanas", key: "every_4_weeks", className: "text-red-600" },
        ]}

        loading={loading}
        total={total}
        page={page}
        totalPages={totalPages}
        onPrevPage={() => setPage((p) => Math.max(1, p - 1))}
        onNextPage={() => setPage((p) => Math.min(totalPages, p + 1))}
      >
        {clients.length === 0 && !loading ? null : clients.map((client) => (
          <Card key={client.id} className="hover:shadow-elegant transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-lg text-left">{client.name}</CardTitle>
                  <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
                    <Badge variant="outline">{client.city}</Badge>
                    <Badge className={getStatusColor(client.frequency)}>{client.frequency}</Badge>
                  </div>
                </div>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon"><MoreVertical className="w-4 h-4" /></Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem className="gap-2" onClick={() => navigate(`/clients/${client.id}/edit`)}>
                      <Edit className="w-4 h-4" /> Editar
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      className="gap-2 text-destructive"
                      onClick={() => askDelete(client)}
                    >
                      <Trash2 className="w-4 h-4" /> Eliminar
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </CardHeader>

            <CardContent className="space-y-3">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <MapPin className="w-4 h-4" /> {client.address}
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Phone className="w-4 h-4" /> {client.phone}
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Mail className="w-4 h-4" /> {client.email}
              </div>

              <div className="pt-3 border-t border-border">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Última recogida:</span>
                  <span className="font-medium">{client.last_pick_up}</span>
                </div>
                <div className="flex justify-between text-sm mt-1">
                  <span className="text-muted-foreground">Total recogidas:</span>
                  <span className="font-medium text-primary">{client.total_pick_ups}</span>
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <Button variant="outline" size="sm" className="flex-1" onClick={() => navigate(`/clients/${client.id}`)}>
                  Ver Detalle
                </Button>
                <Button size="sm" className="flex-1" onClick={() => navigate(`/collections/${client.id}/new`)}>
                  Nueva Recogida
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </PaginatedScaffold>

      {/* Modal de confirmación */}
      <ConfirmDeleteDialog
        open={deleteOpen}
        onOpenChange={(o) => { if (!o) setToDelete(null); setDeleteOpen(o); }}
        title="Eliminar cliente"
        description={
          toDelete
            ? <span>Se eliminará <b>{toDelete.name}</b>. Esta acción no se puede deshacer.</span>
            : "Esta acción no se puede deshacer."
        }
        confirmLabel="Eliminar"
        onConfirm={confirmDelete}
        loading={deleting}
      />
      {/* <<< */}
    </>
  );
}
