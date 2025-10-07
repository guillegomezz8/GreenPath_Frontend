import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthProvider";
import PaginatedScaffold from "@/components/common/PaginatedScaffold";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Eye, Edit, Trash2, Truck, User, Calendar } from "lucide-react";
import { useSnackbar } from "@/context/SnackbarProvider";
import { handleApiError } from "@/components/Utils";
import ConfirmDeleteDialog from "@/components/common/ConfirmDeleteDialog";
import { EmptyState } from "@/components/common/EmptyState";

const STATUS_OPTIONS = ["Todos", "Activo", "En Servicio", "Mantenimiento", "Fuera de Servicio", "Retirado"];
const STATUS_MAP = {
  Todos: undefined,
  Activo: "ACTIVE",
  "En Servicio": "IN_SERVICE",
  Mantenimiento: "MAINTENANCE",
  "Fuera de Servicio": "OUT_OF_SERVICE",
  Retirado: "DECOMMISSIONED",
};

export default function TrucksList() {
  const { api } = useAuth();
  const navigate = useNavigate();
  const showSnackbar = useSnackbar();

  const [trucks, setTrucks] = useState([]);
  const [counts, setCounts] = useState({});
  const [loading, setLoading] = useState(false);

  const [search, setSearch] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("Todos");
  const [ordering, setOrdering] = useState("registration_number");

  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  const [total, setTotal] = useState(0);

  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [toDelete, setToDelete] = useState(null);

  const totalPages = useMemo(
    () => Math.max(1, Math.ceil(total / pageSize)),
    [total, pageSize]
  );

  const [debouncedSearch, setDebouncedSearch] = useState(search);
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 350);
    return () => clearTimeout(t);
  }, [search]);

  // --- Fetch de camiones ---
  const fetchTrucks = useCallback(async () => {
    try {
      setLoading(true);
      const params = { page, page_size: pageSize, ordering };
      if (debouncedSearch) params.search = debouncedSearch;
      if (selectedStatus && selectedStatus !== "Todos")
        params.status = STATUS_MAP[selectedStatus];

      const res = await api().get("trucks", { params });
      const payload = res.data;

      if (payload && typeof payload === "object" && "results" in payload) {
        setTrucks(payload.results);
        setTotal(payload.count ?? 0);
        setCounts(payload.counts ?? {});
      } else {
        const arr = Array.isArray(payload) ? payload : [];
        setTrucks(arr);
        setTotal(arr.length);
      }
    } catch (e) {
      const msg = handleApiError(e, "Error obteniendo camiones.");
      showSnackbar(msg, "error");
    } finally {
      setLoading(false);
    }
  }, [api, page, pageSize, ordering, debouncedSearch, selectedStatus, showSnackbar]);

  useEffect(() => {
    fetchTrucks();
  }, [fetchTrucks]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, selectedStatus, ordering]);

  const askDelete = (truck) => {
    setToDelete({ id: truck.id, name: truck.registration_number });
    setDeleteOpen(true);
  };

  const confirmDelete = async () => {
    if (!toDelete) return;
    try {
      setDeleting(true);
      await api().delete(`trucks/${encodeURIComponent(toDelete.id)}/`);
      showSnackbar(`Camión ${toDelete.name} eliminado.`, "success");
      await fetchTrucks();
      setDeleteOpen(false);
      setToDelete(null);
    } catch (e) {
      const msg = handleApiError(e, "No se pudo eliminar el camión.");
      showSnackbar(msg, "error");
    } finally {
      setDeleting(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "ACTIVE":
        return "bg-success text-success-foreground";
      case "IN_SERVICE":
        return "bg-primary text-primary-foreground";
      case "MAINTENANCE":
        return "bg-accent text-accent-foreground";
      case "OUT_OF_SERVICE":
        return "bg-destructive text-destructive-foreground";
      case "DECOMMISSIONED":
        return "bg-yellow-600 text-white";
      default:
        return "bg-gray-400 text-white";
    }
  };

  return (
    <>
      <PaginatedScaffold
        layout="list"
        title={
          <>
            <Truck className="w-8 h-8 text-primary" /> Gestión de Camiones
          </>
        }
        subtitle="Gestiona la flota de camiones de la empresa"
        rightAction={{
          label: "Nuevo Camión",
          onClick: () => navigate("/trucks/new"),
          icon: <Plus className="w-4 h-4" />,
        }}
        searchPlaceholder="Buscar por matrícula o marca/modelo..."
        searchValue={search}
        onSearchChange={setSearch}
        filters={STATUS_OPTIONS}
        selectedFilter={selectedStatus}
        onFilterChange={setSelectedStatus}
        counts={counts}
        countDefs={[
          { key: "active", label: "Activo", className: "text-success" },
          { key: "in_service", label: "En servicio", className: "text-blue-600" },
          { key: "maintenance", label: "Mantenimiento", className: "text-orange-500" },
          { key: "out_of_service", label: "Fuera de servicio", className: "text-yellow-600" },
          { key: "decommissioned", label: "Retirado", className: "text-red-600" },
        ]}
        total={total}
        page={page}
        totalPages={totalPages}
        onPrevPage={() => setPage((p) => Math.max(1, p - 1))}
        onNextPage={() => setPage((p) => Math.min(totalPages, p + 1))}
        loading={loading}
        showDefaultEmpty={false}
      >
        <Card>
          <CardHeader>
            <CardTitle>Lista de Camiones</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Matrícula</TableHead>
                  <TableHead>Marca / Modelo</TableHead>
                  <TableHead>Año</TableHead>
                  <TableHead>Capacidad</TableHead>
                  <TableHead>Conductor</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Combustible</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {trucks.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center text-muted-foreground py-6">
                      No hay camiones disponibles.
                    </TableCell>
                  </TableRow>
                ) : (
                  trucks.map((truck) => (
                    <TableRow key={truck.id}>
                      <TableCell className="font-medium">{truck.registration_number}</TableCell>
                      <TableCell>
                        {truck.brand} {truck.model}
                      </TableCell>
                      <TableCell>{truck.year || "-"}</TableCell>
                      <TableCell>
                        {truck.capacity
                          ? `${parseFloat(truck.capacity).toLocaleString()} L`
                          : "-"}
                      </TableCell>
                      <TableCell>
                        {truck.driver_name && truck.driver_name !== "-"
                          ? (
                            <div className="flex items-center gap-2 justify-center">
                              <span>{truck.driver_name}</span>
                            </div>
                          ) : (
                            <span className="text-muted-foreground">Sin asignar</span>
                          )}
                      </TableCell>
                      <TableCell>
                        <Badge className={getStatusColor(truck.status)}>
                          {truck.status_display}
                        </Badge>
                      </TableCell>
                      <TableCell>{truck.fuel_display || "-"}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => navigate(`/trucks/${truck.id}/edit`)}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-destructive hover:text-destructive"
                            onClick={() => askDelete(truck)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </PaginatedScaffold>

      {/* Modal de confirmación */}
      <ConfirmDeleteDialog
        open={deleteOpen}
        onOpenChange={(o) => {
          if (!o) setToDelete(null);
          setDeleteOpen(o);
        }}
        title="Eliminar camión"
        description={
          toDelete ? (
            <span>
              Se eliminará el camión <b>{toDelete.name}</b>. Esta acción no se puede
              deshacer.
            </span>
          ) : (
            "Esta acción no se puede deshacer."
          )
        }
        confirmLabel="Eliminar"
        onConfirm={confirmDelete}
        loading={deleting}
      />
    </>
  );
}
