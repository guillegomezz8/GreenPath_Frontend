import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthProvider";
import { useSnackbar } from "@/context/SnackbarProvider";
import { handleApiError } from "@/components/Utils";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ArrowLeft,
  MapPin,
  Phone,
  Mail,
  Calendar,
  Truck,
  Edit,
  Loader2,
  IdCard,
  Trash2,
  Package,
  Route as RouteIcon,
  Droplet,
  BarChart3,
  Coins,
  UserCheck,
} from "lucide-react";

import ConfirmDeleteDialog from "@/components/common/ConfirmDeleteDialog";
import { EmptyState } from "@/components/common/EmptyState";
import { ActionButton } from "@/components/common/ActionButton";
import { getInitials, getAvatarSrc, formatNumber, formatCurrency } from "@/components/Utils";

export default function WorkerDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { api } = useAuth();
  const showSnackbar = useSnackbar()

  const [worker, setWorker] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [collections, setCollections] = useState([]);
  const [collectionsLoading, setCollectionsLoading] = useState(false);
  const [collectionsError, setCollectionsError] = useState("");
  const [collPage, setCollPage] = useState(1);
  const [collPageSize] = useState(5);
  const [collTotal, setCollTotal] = useState(0);

  const collTotalPages = Math.max(1, Math.ceil(collTotal / collPageSize));

  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const fetchWorker = async (workerId) => {
    try {
      setLoading(true);
      setError("");
      const { data } = await api().get(`workers/${encodeURIComponent(workerId)}/`);
      setWorker(data);
    } catch (e) {
      const msg = handleApiError(e, "Error obteniendo trabajador.");
      showSnackbar(msg, "error");
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const fetchCollections = async (workerId) => {
    try {
      setCollectionsLoading(true);
      setCollectionsError("");

      const params = {
        page: collPage,
        page_size: collPageSize,
      };

      const { data } = await api().get(`collections/?worker_id=${encodeURIComponent(workerId)}`, { params });

      if (data && typeof data === "object" && "results" in data) {
        setCollections(data.results ?? []);
        setCollTotal(data.count ?? 0);
      } else {
        const arr = Array.isArray(data) ? data : [];
        setCollections(arr);
        setCollTotal(arr.length);
      }
    } catch (e) {
      const msg = handleApiError(e, "Error obteniendo recogidas del trabajador.");
      showSnackbar(msg, "error");
      setCollectionsError(msg);
      setCollections([]);
      setCollTotal(0);
    } finally {
      setCollectionsLoading(false);
    }
  };

  useEffect(() => {
    if (!id) {
      setLoading(false);
      setError("No se encontró el ID del trabajador en la URL");
      return;
    }
    fetchWorker(id);
    setCollPage(1);
  }, [id]);

  useEffect(() => {
    if (!id) return;
    fetchCollections(id);
  }, [id, collPage]);

  const isDisabled = worker?.disabled;
  const toggleButtonText = isDisabled ? "Habilitar" : "Deshabilitar";
  const toggleButtonIcon = isDisabled ? UserCheck : Trash2;
  const toggleButtonVariant = isDisabled ? "default" : "destructive";
  const loadingText = isDisabled ? "Habilitando…" : "Deshabilitando…";

  const handleToggleStatus = async () => {
    if (!id || !worker) return;
    
    const isDisabled = worker.disabled;
    const actionUrl = isDisabled ? `workers/${encodeURIComponent(id)}/activate/` : `workers/${encodeURIComponent(id)}/`;
    const method = isDisabled ? 'put' : 'delete';
    const successMessage = isDisabled ? 'Trabajador habilitado correctamente.' : 'Trabajador deshabilitado correctamente.';
    const errorMessage = isDisabled ? 'No se pudo habilitar el trabajador.' : 'No se pudo deshabilitar el trabajador.';
    
    try {
      setDeleting(true);
      await api()[method](actionUrl);
      showSnackbar(successMessage, "success");
      setDeleteOpen(false);
      await fetchWorker(id);
    } catch (e) {
      const message = handleApiError(e, errorMessage);
      showSnackbar(message, "error");
    } finally {
      setDeleting(false);
    }
  };

  const getWorkerStatusBadge = (disabled) => {
    if (disabled) return <Badge className="bg-red-600 text-white">Inactivo</Badge>;
    return <Badge className="bg-success text-success-foreground">Activo</Badge>;
  };

  const getCollectionStatusClass = (status) => {
    switch ((status || "").toUpperCase()) {
      case "COMPLETED":
      case "COMPLETADA":
        return "bg-success text-success-foreground";
      case "PENDING":
      case "PENDIENTE":
        return "bg-blue-600 text-white";
      case "CANCELLED":
      case "CANCELADA":
      case "CANCELED":
        return "bg-red-600 text-white";
      default:
        return "bg-secondary text-secondary-foreground";
    }
  };

  const asNum = (v) => Number.isFinite(Number(v)) ? Number(v) : 0;

  const totalLiters = asNum(worker?.total_liters_collected);
  const totalRoutes = asNum(worker?.total_routes);
  const totalIncomes = asNum(worker?.total_incomes);

  const litersPerRoute = totalRoutes > 0 ? totalLiters / totalRoutes : 0;
  const euroPerLiter = totalLiters > 0 ? totalIncomes / totalLiters : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        {/* Left section: Back button + Avatar + Info */}
        <div className="flex items-start gap-3 sm:items-center sm:gap-4 min-w-0 flex-1">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => navigate("/workers")}
            className="flex-shrink-0 mt-2 sm:mt-0"
          >
            <ArrowLeft className="w-4 h-4" />
          </Button>
          
          {/* Avatar + Info container */}
          <div className="flex items-start sm:items-center gap-3 sm:gap-4 min-w-0 flex-1">
            <Avatar className="w-12 h-12 sm:w-14 sm:h-14 flex-shrink-0" size="lg">
              {worker && getAvatarSrc(worker) && (
                <AvatarImage
                  src={getAvatarSrc(worker)}
                  alt={`${worker?.name ?? ""} ${worker?.surname ?? ""}`}
                  className="object-cover"
                />
              )}
              <AvatarFallback className="bg-primary text-primary-foreground font-bold text-sm sm:text-lg">
                {getInitials(worker?.name, worker?.surname)}
              </AvatarFallback>
            </Avatar>
            
            <div className="text-left min-w-0 flex-1">
              <h1 className="text-lg sm:text-2xl lg:text-3xl font-bold text-foreground leading-tight">
                {loading ? "Cargando..." : `${worker?.name ?? ""} ${worker?.surname ?? ""}`}
              </h1>
              <p className="text-sm sm:text-base text-muted-foreground mt-1 leading-relaxed">
                {loading ? "—" : (
                  <>
                    <span className="hidden sm:inline">Nombre de Usuario: </span>
                    <span className="sm:hidden">Usuario: </span>
                    <span className="font-medium">{worker?.username ?? "—"}</span>
                  </>
                )}
              </p>
            </div>
          </div>
        </div>

        {/* Right section: Action buttons */}
        <div className="flex gap-2 sm:gap-3 flex-shrink-0 self-start lg:self-center">
          {/* Edit button */}
          <Button
            variant="outline"
            size="sm"
            disabled={loading || !worker}
            onClick={() => navigate(`/workers/${id}/edit`)}
            className="flex-1 sm:flex-none min-w-0"
          >
            <Edit className="w-4 h-4 sm:mr-2 flex-shrink-0" />
            <span className="hidden xs:inline sm:hidden md:inline">Editar</span>
          </Button>

          {/* Delete button */}
          <Button
            variant={toggleButtonVariant}
            size="sm"
            disabled={loading || !worker || deleting}
            onClick={() => setDeleteOpen(true)}
            className="flex-1 sm:flex-none min-w-0"
          >
            {deleting ? (
              <>
                <Loader2 className="w-4 h-4 sm:mr-2 animate-spin flex-shrink-0" />
                <span className="hidden xs:inline sm:hidden md:inline">{loadingText}</span>
              </>
            ) : (
              <>
                {React.createElement(toggleButtonIcon, { className: "w-4 h-4 sm:mr-2 flex-shrink-0" })}
                <span className="hidden xs:inline sm:hidden md:inline">{toggleButtonText}</span>
              </>
            )}
          </Button>
        </div>
      </div>

      {error && (
        <Card>
          <CardContent className="text-destructive py-4">{error}</CardContent>
        </Card>
      )}

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        <Card>
          <CardContent className="pt-6 text-center">
            <div className="text-2xl font-bold text-primary">
              {loading ? "—" : worker?.total_collections ?? 0}
            </div>
            <p className="text-sm text-muted-foreground">Total de Recogidas</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 text-center">
            <div className="text-2xl font-bold text-orange-500">
              {loading ? "—" : worker?.vehicle ?? "-"}
            </div>
            <p className="text-sm text-muted-foreground">Ruta Activa</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 text-center">
            {loading ? (
              <Loader2 className="w-5 h-5 animate-spin mx-auto" />
            ) : (
              getWorkerStatusBadge(worker?.disabled)
            )}
            <p className="text-sm text-muted-foreground mt-2">Estado</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="info" className="space-y-4">
        <TabsList>
          <TabsTrigger value="info">Información</TabsTrigger>
          <TabsTrigger value="history">Historial</TabsTrigger>
          <TabsTrigger value="stats">Estadísticas</TabsTrigger>
        </TabsList>

        {/* Información */}
        <TabsContent value="info" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Información del Trabajador</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-left">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-muted-foreground" />
                    <div>
                      <p className="font-medium">Dirección</p>
                      <p className="text-sm text-muted-foreground">{worker?.address ?? "—"}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Phone className="w-4 h-4 text-muted-foreground" />
                    <div>
                      <p className="font-medium">Teléfono</p>
                      <p className="text-sm text-muted-foreground">{worker?.phone ?? "—"}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Mail className="w-4 h-4 text-muted-foreground" />
                    <div>
                      <p className="font-medium">Email</p>
                      <p className="text-sm text-muted-foreground">{worker?.email ?? "—"}</p>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <IdCard className="w-4 h-4 text-muted-foreground" />
                    <div>
                      <p className="font-medium">DNI</p>
                      <p className="text-sm text-muted-foreground">{worker?.dni ?? "—"}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-muted-foreground" />
                    <div>
                      <p className="font-medium">Fecha de nacimiento</p>
                      <p className="text-sm text-muted-foreground">
                        {loading ? "—" : `${worker?.birth_date ?? "—"}`}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Truck className="w-4 h-4 text-muted-foreground" />
                    <div>
                      <p className="font-medium">Vehículo Asociado</p>
                      <p className="text-sm text-muted-foreground">
                        {loading ? "—" : `${worker?.assigned_trucks ?? "Sin asignar"}`}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Historial de recogidas */}
        <TabsContent value="history" className="space-y-4">
          <Card>
            <CardHeader className="flex items-center justify-between">
              <CardTitle>Historial de Recogidas</CardTitle>
            </CardHeader>
            <CardContent>
              {collectionsLoading ? (
                <div className="py-6 text-center text-muted-foreground">
                  <Loader2 className="w-5 h-5 animate-spin inline-block mr-2" />
                  Cargando...
                </div>
              ) : collectionsError ? (
                <div className="py-6 text-center text-destructive">{collectionsError}</div>
              ) : collections.length === 0 ? (
                <EmptyState icon={Package} message="Este trabajador no tiene recogidas." />
              ) : (
                <>
                  <div className="space-y-3">
                    {collections.map((c) => (
                      <div key={c.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex items-center gap-3">
                          <Package className="w-5 h-5 text-muted-foreground" />
                          <div className="text-left">
                            <p className="font-medium">
                              {c.collection_date} · {c.client_name ??  "Cliente Desconocido"}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {c.container_number} {c.container_type} / {c.liters_collected} L / {c.total_price} €
                            </p>
                          </div>
                        </div>
                        <Badge className={getCollectionStatusClass(c.status)}>{c.status}</Badge>
                      </div>
                    ))}
                  </div>

                  {/* Footer de paginación */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mt-4">
                    <div className="text-sm text-muted-foreground">
                      Página <span className="font-medium">{collPage}</span> de{" "}
                      <span className="font-medium">{collTotalPages}</span>
                      {typeof collTotal === "number" && (
                        <> · <span className="font-medium">{collTotal}</span> resultados</>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={collectionsLoading || collPage <= 1}
                        onClick={() => setCollPage((p) => Math.max(1, p - 1))}
                      >
                        Anterior
                      </Button>
                      <Button
                        size="sm"
                        disabled={collectionsLoading || collPage >= collTotalPages}
                        onClick={() => setCollPage((p) => Math.min(collTotalPages, p + 1))}
                      >
                        Siguiente
                      </Button>
                    </div>
                  </div>
                  </>
                )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Estadísticas */}
        <TabsContent value="stats" className="space-y-4">
          <Card>
            <CardHeader className="flex items-center justify-between">
              <CardTitle>Estadísticas</CardTitle>
            </CardHeader>

            <CardContent>
              {/* Skeleton simple mientras carga */}
              {loading ? (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="p-5 rounded-xl border animate-pulse">
                      <div className="h-5 w-24 bg-muted rounded mb-4" />
                      <div className="h-8 w-32 bg-muted rounded" />
                      <div className="mt-3 h-4 w-40 bg-muted rounded" />
                    </div>
                  ))}
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* Litros Totales */}
                    <div className="relative overflow-hidden rounded-xl border bg-gradient-to-br from-emerald-500/5 to-transparent p-5 hover:shadow-elegant transition">
                      <div className="flex items-center justify-between">
                        <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-emerald-500/15">
                          <Droplet className="h-5 w-5 text-emerald-600" />
                        </span>
                        <span className="text-xs px-2 py-1 rounded-full bg-emerald-500/10 text-emerald-700">
                          {`${Math.round(litersPerRoute || 0)} L/ruta`}
                        </span>
                      </div>
                      <div className="mt-3 text-3xl font-bold text-foreground">
                        {formatNumber(totalLiters)}
                      </div>
                      <p className="text-sm text-muted-foreground">Litros Totales Recogidos</p>
                    </div>

                    {/* Rutas Totales */}
                    <div className="relative overflow-hidden rounded-xl border bg-gradient-to-br from-blue-500/5 to-transparent p-5 hover:shadow-elegant transition">
                      <div className="flex items-center justify-between">
                        <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-blue-500/15">
                          <RouteIcon className="h-5 w-5 text-blue-600" />
                        </span>
                        <span className="text-xs px-2 py-1 rounded-full bg-blue-500/10 text-blue-700">
                          {`${formatNumber(totalRoutes)} rutas`}
                        </span>
                      </div>
                      <div className="mt-3 text-3xl font-bold text-foreground">
                        {formatNumber(totalRoutes)}
                      </div>
                      <p className="text-sm text-muted-foreground">Rutas Totales Asignadas</p>
                    </div>

                    {/* Ingresos Totales */}
                    <div className="relative overflow-hidden rounded-xl border bg-gradient-to-br from-amber-500/5 to-transparent p-5 hover:shadow-elegant transition">
                      <div className="flex items-center justify-between">
                        <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-amber-500/15">
                          <Coins className="h-5 w-5 text-amber-600" />
                        </span>
                        <span className="text-xs px-2 py-1 rounded-full bg-amber-500/10 text-amber-700">
                          {`${euroPerLiter ? euroPerLiter.toFixed(2) : "0.00"} €/L`}
                        </span>
                      </div>
                      <div className="mt-3 text-3xl font-bold text-foreground">
                        {formatCurrency(totalIncomes)}
                      </div>
                      <p className="text-sm text-muted-foreground">Ingresos Totales</p>
                    </div>
                  </div>

                  {/* Línea secundaria con “mini KPIs” */}
                  <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div className="rounded-lg border p-3 flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">€/L medio</span>
                      <span className="text-sm font-semibold">
                        {euroPerLiter ? `${euroPerLiter.toFixed(3)} €` : "—"}
                      </span>
                    </div>
                    <div className="rounded-lg border p-3 flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Litros por ruta</span>
                      <span className="text-sm font-semibold">
                        {litersPerRoute ? `${Math.round(litersPerRoute)} L` : "—"}
                      </span>
                    </div>
                    <div className="rounded-lg border p-3 flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Ingresos por ruta</span>
                      <span className="text-sm font-semibold">
                        {totalRoutes ? formatCurrency(totalIncomes / totalRoutes) : "—"}
                      </span>
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Modal de confirmación de borrado */}
      <ConfirmDeleteDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title={isDisabled ? "Habilitar trabajador" : "Deshabilitar trabajador"}
        description={
          isDisabled 
            ? `Se habilitará el trabajador ${worker?.name ?? ""} ${worker?.surname ?? ""}. Podrá acceder al sistema nuevamente.`
            : `Se deshabilitará el trabajador ${worker?.name ?? ""} ${worker?.surname ?? ""}. Esta acción no se puede deshacer.`
        }
        confirmLabel={isDisabled ? "Habilitar" : "Deshabilitar"}
        onConfirm={handleToggleStatus}
        loading={deleting}
      />
    </div>
  );
}