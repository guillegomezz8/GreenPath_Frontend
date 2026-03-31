import React, { useEffect, useState, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthProvider";

import PaginatedScaffold from "@/components/common/PaginatedScaffold";

import { ActionButton } from "@/components/common/ActionButton";
import { StatusBadge } from "@/components/common/StatusComponents";
import { EmptyState } from "@/components/common/EmptyState";

import { useSnackbar } from "@/context/SnackbarProvider";
import { handleApiError, getInitials, getAvatarSrc } from "@/components/Utils";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  UserCog,
  UserCheck,
  Plus,
  Phone,
  Mail,
  MoreVertical,
  Edit,
  MapPin,
  Truck,
  Trash2,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import ConfirmDeleteDialog from "@/components/common/ConfirmDeleteDialog";

const STATUS_OPTIONS = ["Todos", "Activo", "Inactivo"];

const STATUS_MAP = {
  Todos: undefined,
  Activo: "False",
  Inactivo: "True",
};

export default function WorkersList() {
  const { api } = useAuth();
  const navigate = useNavigate();
  const showSnackbar = useSnackbar();

  const [workers, setWorkers] = useState([]);
  const [counts, setCounts] = useState(undefined);
  const [loading, setLoading] = useState(false);

  const [search, setSearch] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("Todos");
  const [ordering, setOrdering] = useState("name");

  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  const [total, setTotal] = useState(0);
  const totalPages = useMemo(() => Math.max(1, Math.ceil(total / pageSize)), [total, pageSize]);

  const [debouncedSearch, setDebouncedSearch] = useState(search);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 350);
    return () => clearTimeout(t);
  }, [search]);

  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [toToggle, setToToggle] = useState(null);

  const toggleButtonIcon = (disabled) => disabled ? UserCheck : Trash2;
  
  const fetchWorkers = useCallback(async () => {
    try {
      setLoading(true);

      const params = { page, page_size: pageSize, ordering };
      if (debouncedSearch) params.search = debouncedSearch;
      if (selectedStatus && selectedStatus !== "Todos") params.disabled = STATUS_MAP[selectedStatus];

      const res = await api().get("workers", { params });
      const payload = res.data;

      if (payload && typeof payload === "object" && "results" in payload) {
        setWorkers(payload.results || []);
        setTotal(payload.count ?? 0);
        setCounts(payload.counts ?? undefined);
      } else {
        const arr = Array.isArray(payload) ? payload : [];
        setWorkers(arr);
        setTotal(arr.length);
        setCounts(undefined);
      }
    } catch (err) {
      const msg = handleApiError(err, "Error inesperado obteniendo trabajadores.");
      showSnackbar(msg, "error");
    } finally {
      setLoading(false);
    }
  }, [api, page, pageSize, ordering, debouncedSearch, selectedStatus, showSnackbar]);

  useEffect(() => {
    fetchWorkers();
  }, [fetchWorkers]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, selectedStatus, ordering]);

  const askToggleStatus = (worker) => {
    const fullName = `${worker.name ?? ""} ${worker.surname ?? ""}`.trim() || worker.username || "Trabajador";
    setToToggle({ 
      id: worker.id, 
      name: fullName, 
      disabled: worker.disabled 
    });
    setDeleteOpen(true);
  };

  const getStatusColor = (st) => {
    switch (st) {
      case false: return "bg-success text-success-foreground";
      case true: return "bg-red-600 text-white";
      default: return "bg-gray-400 text-white";
    }
  };

  const confirmDelete = async () => {
    if (!toToggle) return;
    
    const isDisabled = toToggle.disabled;
    const actionUrl = isDisabled ? `workers/${encodeURIComponent(toToggle.id)}/activate/` : `workers/${encodeURIComponent(toToggle.id)}/`;
    const method = isDisabled ? 'put' : 'delete';
    const successMessage = isDisabled 
      ? `Trabajador "${toToggle.name}" habilitado.`
      : `Trabajador "${toToggle.name}" deshabilitado.`;
    const errorMessage = isDisabled 
      ? 'No se pudo habilitar el trabajador.'
      : 'No se pudo deshabilitar el trabajador.';
    
    try {
      setDeleting(true);
      await api()[method](actionUrl);
      showSnackbar(successMessage, "success");
      await fetchWorkers();
      setDeleteOpen(false);
      setToToggle(null);
    } catch (e) {
      const msg = handleApiError(e, errorMessage);
      showSnackbar(msg, "error");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <>
      <PaginatedScaffold
        title={
          <>
            <UserCog className="w-8 h-8 text-primary" /> Gestion de Trabajadores
          </>
        }
        subtitle="Administra el equipo de trabajo de GreenPath"
        rightAction={{
          label: "Nuevo Trabajador",
          onClick: () => navigate("/workers/new"),
          icon: <Plus className="w-4 h-4" />,
        }}
        searchPlaceholder="Buscar por nombre y apellidos..."
        searchValue={search}
        onSearchChange={setSearch}
        filters={STATUS_OPTIONS}
        selectedFilter={selectedStatus}
        onFilterChange={setSelectedStatus}
        counts={counts}
        countDefs={[
          { key: "total", label: "Total", className: "text-blue-600" },
          { key: "active", label: "Activos", className: "text-success" },
          { key: "inactive", label: "Inactivos", className: "text-red-600" },
        ]}
        loading={loading}
        total={total}
        page={page}
        totalPages={totalPages}
        onPrevPage={() => setPage((p) => Math.max(1, p - 1))}
        onNextPage={() => setPage((p) => Math.min(totalPages, p + 1))}
        emptyNode={
          <EmptyState
            icon={UserCheck}
            message="No se encontraron trabajadores con los criterios seleccionados"
          />
        }
      >
        {workers.map((worker) => (
          <Card key={worker.id} className="hover:shadow-elegant transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <Avatar>
                    {getAvatarSrc(worker) && (
                      <AvatarImage
                        src={getAvatarSrc(worker)}
                        alt={`${worker.name ?? ""} ${worker.surname ?? ""}`.trim() || "Foto"}
                        className="object-cover"
                      />
                    )}
                    <AvatarFallback className="bg-primary text-primary-foreground font-semibold">
                      {getInitials(worker.name, worker.surname)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <CardTitle className="text-lg text-left">
                      {worker.name} {worker.surname}
                    </CardTitle>
                    <div className="flex items-center gap-2 mt-1">
                      <StatusBadge status={worker.role} />
                      <Badge className={getStatusColor(worker.disabled)}>{worker.disabled ? "Inactivo" : "Activo"}</Badge>
                    </div>
                  </div>
                </div>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon">
                      <MoreVertical className="w-4 h-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem className="gap-2" onClick={() => navigate(`/workers/${worker.id}/edit`)}>
                      <Edit className="w-4 h-4" /> Editar
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      className={worker.disabled ? "gap-2 text-emerald-600" : "gap-2 text-destructive"}
                      onClick={() => askToggleStatus(worker)}
                    >
                      {React.createElement(toggleButtonIcon(worker.disabled), { className: "w-4 h-4 sm:mr-2 flex-shrink-0" })}
                      {worker.disabled ? "Habilitar" : "Deshabilitar"}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </CardHeader>

            <CardContent className="space-y-3">
              {worker.phone && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Phone className="w-4 h-4" /> {worker.phone}
                </div>
              )}

              {worker.email && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Mail className="w-4 h-4" /> {worker.email}
                </div>
              )}

              {worker.address && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <MapPin className="w-4 h-4" /> {worker.address}
                </div>
              )}

              {worker.assigned_trucks && worker.assigned_trucks !== "Sin asignar" && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Truck className="w-4 h-4" /> Vehiculo {worker.assigned_trucks}
                </div>
              )}

              {(worker.total_collections != null || worker.birth_date) && (
                <div className="pt-3 border-t border-border">
                  {worker.total_collections != null && (
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Total de recogidas:</span>
                      <span className="font-medium text-primary">{worker.total_collections}</span>
                    </div>
                  )}
                  {worker.birth_date && (
                    <div className="flex justify-between text-sm mt-1">
                      <span className="text-muted-foreground">Fecha de nacimiento:</span>
                      <span className="font-medium">{worker.birth_date}</span>
                    </div>
                  )}
                </div>
              )}

              <div className="flex gap-2 pt-2">
                <ActionButton
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  onClick={() => navigate(`/workers/${worker.id}`)}
                >
                  Ver Detalle
                </ActionButton>
                <ActionButton
                  size="sm"
                  className="flex-1"
                  onClick={() => navigate(`/assign-truck/${worker.id}`)}
                >
                  Asignar Camion
                </ActionButton>
              </div>
            </CardContent>
          </Card>
        ))}
      </PaginatedScaffold>

      {/* Modal de confirmacion */}
      <ConfirmDeleteDialog
        open={deleteOpen}
        onOpenChange={(o) => { if (!o) setToToggle(null); setDeleteOpen(o); }}
        title={toToggle?.disabled ? "Habilitar trabajador" : "Deshabilitar trabajador"}
        description={
          toToggle ? (
            toToggle.disabled 
              ? <span>Se habilitara el trabajador {toToggle.name}. Podra acceder al sistema nuevamente.</span>
              : <span>Se deshabilitara el trabajador {toToggle.name}. Esta accion no se puede deshacer.</span>
          ) : "Esta accion no se puede deshacer."
        }
        confirmLabel={toToggle?.disabled ? "Habilitar" : "Deshabilitar"}
        onConfirm={confirmDelete}
        loading={deleting}
      />
    </>
  );
}
