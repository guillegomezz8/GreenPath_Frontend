import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthProvider";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useSnackbar } from "@/context/SnackbarProvider";
import { handleApiError, formatNumber, formatCurrency } from "@/components/Utils";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ArrowLeft, MapPin, Phone, Mail, Calendar, Truck,
  Edit, Trash2, FileText, Globe, Building2, Package, Loader2,
  Droplet, BarChart3, Coins
} from "lucide-react";
import ConfirmDeleteDialog from "@/components/common/ConfirmDeleteDialog";
import { EmptyState } from "@/components/common/EmptyState";

export default function ClientDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { api } = useAuth();
  const showSnackbar = useSnackbar();

  const [client, setClient] = useState(null);
  const [total_liters, setTotalLiters] = useState(0);
  const [media, setMedia] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [collectionHistory, setCollectionHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  const [histPage, setHistPage] = useState(1);
  const [histPageSize] = useState(5);
  const histTotal = collectionHistory.length;
  const histTotalPages = Math.max(1, Math.ceil(histTotal / histPageSize));
  const start = (histPage - 1) * histPageSize;
  const end = start + histPageSize;
  const historyPageItems = collectionHistory.slice(start, end);

  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const fetchClient = async (clientId) => {
    try {
      setLoading(true);
      setError("");
      const { data } = await api().get(`clients/${encodeURIComponent(clientId)}/`);
      setClient(data);
    } catch (e) {
      const message = handleApiError(e, "Error inesperado obteniendo cliente.");
      showSnackbar(message, "error");
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const fetchHistorial = async (clientId) => {
    try {
      setHistoryLoading(true);
      const { data } = await api().get(`clients/historial/${encodeURIComponent(clientId)}/`);
      setCollectionHistory(data?.historial ?? []);
      setTotalLiters(Number(data?.total_liters ?? 0));
      setMedia(Number(data?.media ?? 0));
      setHistPage(1);
    } catch (e) {
      const message = handleApiError(e, "Error inesperado obteniendo historial de recogidas.");
      showSnackbar(message, "error");
      setCollectionHistory([]);
    } finally {
      setHistoryLoading(false);
    }
  };

  useEffect(() => {
    if (!id) {
      setLoading(false);
      setError("No se encontró el ID del cliente en la URL");
      return;
    }
    fetchClient(id);
    fetchHistorial(id);
  }, [id]);

  const getFrequencyColor = (freq) => {
    switch (freq) {
      case "Cada semana":
        return "bg-success text-success-foreground";
      case "Cada 2 semanas":
        return "bg-blue-600 text-white";
      case "Cada 3 semanas":
        return "bg-orange-500 text-white";
      case "Cada 4 semanas":
        return "bg-red-600 text-white";
      default:
        return "bg-secondary text-secondary-foreground";
    }
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

  const handleDelete = async () => {
    if (!id) return;
    try {
      setDeleting(true);
      await api().delete(`clients/${encodeURIComponent(id)}/`);
      showSnackbar("Cliente eliminado correctamente.", "success");
      setDeleteOpen(false);
      navigate("/clients");
    } catch (e) {
      const message = handleApiError(e, "No se pudo eliminar el cliente.");
      showSnackbar(message, "error");
    } finally {
      setDeleting(false);
    }
  };

  const asNum = (v) => (Number.isFinite(Number(v)) ? Number(v) : 0);

  const name = client?.name ?? "—";
  const email = client?.email ?? "—";
  const phone = client?.phone ?? "—";
  const cif = client?.cif ?? "—";
  const address = client?.address ?? "—";
  const city = client?.city ?? "—";
  const postalCode = client?.postal_code ?? "—";
  const country = client?.country ?? "—";
  const frequency = client?.frequency ?? "—";
  const lastCollection = client?.last_pick_up ?? "—";
  const companiesCount = Array.isArray(client?.companies) ? client.companies.length : 0;

  const totalPaid = asNum(client?.total_paid);
  const pickups = collectionHistory.length;
  const completed = collectionHistory.filter((c) =>
    ["COMPLETED", "COMPLETADA"].includes((c.status || "").toUpperCase())
  ).length;
  const pending = collectionHistory.filter((c) =>
    ["PENDING", "PENDIENTE"].includes((c.status || "").toUpperCase())
  ).length;
  const canceled = collectionHistory.filter((c) =>
    ["CANCELLED", "CANCELADA", "CANCELED"].includes((c.status || "").toUpperCase())
  ).length;

  const litersPerPickup = pickups > 0 ? total_liters / pickups : 0;
  const euroPerLiter = total_liters > 0 ? totalPaid / total_liters : 0;
  const avgTicket = pickups > 0 ? totalPaid / pickups : 0;
  const completionRate = pickups > 0 ? (completed / pickups) * 100 : 0;

  const parseISO = (s) => (s ? new Date(`${s}T00:00:00`) : null);
  const today = new Date();
  const monthName = new Intl.DateTimeFormat("es-ES", { month: "long" }).format(today);
  const monthNameCap = monthName.charAt(0).toUpperCase() + monthName.slice(1);  
  const y = today.getFullYear();
  const m = today.getMonth();
  const monthStart = new Date(y, m, 1);
  const nextMonthStart = new Date(y, m + 1, 1);
  const isInCurrentMonth = (s) => {
    const d = parseISO(s);
    return d && d >= monthStart && d < nextMonthStart;
  };
  const isCompleted = (status) =>
    ["COMPLETED", "COMPLETADA"].includes((status || "").toUpperCase());

  const monthCollections = collectionHistory.filter(
    (c) => isCompleted(c.status) && isInCurrentMonth(c.collection_date)
  );
  const currentMonthLiters = monthCollections.reduce(
    (acc, c) => acc + Number(c.liters_collected || 0),
    0
  );
  const currentMonthCount = monthCollections.length;
  const litersPerPickupMonth = currentMonthCount ? currentMonthLiters / currentMonthCount : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/clients")}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-foreground text-left">
              {loading ? "Cargando..." : name}
            </h1>
            <p className="text-muted-foreground text-left">Información detallada del cliente</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate(`/clients/${id}/edit`)}
            disabled={loading || !client || deleting}
          >
            <Edit className="w-4 h-4 mr-2" />
            Editar
          </Button>
          <Button
            variant="destructive"
            size="sm"
            disabled={loading || !client || deleting}
            onClick={() => setDeleteOpen(true)}
          >
            {deleting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Eliminando…
              </>
            ) : (
              <>
                <Trash2 className="w-4 h-4 mr-2" />
                Eliminar
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

      {/* Métricas superiores */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        <Card>
          <CardContent className="pt-6 text-center">
            <div className="text-2xl font-bold text-primary">
              {loading ? "—" : `${formatNumber(total_liters)} L`}
            </div>
            <p className="text-sm text-muted-foreground">Total Recogido</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 text-center">
            <div className="text-2xl font-bold">
              {loading ? "—" : lastCollection}
            </div>
            <p className="text-sm text-muted-foreground">Última Recogida</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 text-center">
            <Badge className={getFrequencyColor(frequency)}>
              {loading ? "—" : frequency}
            </Badge>
            <p className="text-sm text-muted-foreground mt-2">Frecuencia</p>
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

        {/* INFO */}
        <TabsContent value="info" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Información del Cliente</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-left">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-muted-foreground" />
                    <div>
                      <p className="font-medium">Dirección</p>
                      <p className="text-sm text-muted-foreground">{loading ? "—" : address}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Phone className="w-4 h-4 text-muted-foreground" />
                    <div>
                      <p className="font-medium">Teléfono</p>
                      <p className="text-sm text-muted-foreground">{loading ? "—" : phone}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Mail className="w-4 h-4 text-muted-foreground" />
                    <div>
                      <p className="font-medium">Email</p>
                      <p className="text-sm text-muted-foreground">{loading ? "—" : email}</p>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-muted-foreground" />
                    <div>
                      <p className="font-medium">CIF</p>
                      <p className="text-sm text-muted-foreground">{loading ? "—" : cif}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Globe className="w-4 h-4 text-muted-foreground" />
                    <div>
                      <p className="font-medium">Ciudad / CP / País</p>
                      <p className="text-sm text-muted-foreground">
                        {loading ? "—" : `${city} · ${postalCode} · ${country}`}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-muted-foreground" />
                    <div>
                      <p className="font-medium">Empresas asociadas</p>
                      <p className="text-sm text-muted-foreground">
                        {loading ? "—" : `${companiesCount} vinculada(s)`}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* HISTORIAL con paginado front */}
        <TabsContent value="history">
          <Card>
            <CardHeader className="flex items-center justify-between">
              <CardTitle>Historial de Recogidas</CardTitle>
            </CardHeader>
            <CardContent>
              {historyLoading ? (
                <div className="py-6 text-center text-muted-foreground">
                  <Loader2 className="w-5 h-5 animate-spin inline-block mr-2" />
                  Cargando...
                </div>
              ) : histTotal === 0 ? (
                <EmptyState icon={Package} message="Sin registros de recogida para este cliente." />
              ) : (
                <>
                  <div className="space-y-3">
                    {historyPageItems.map((c) => (
                      <div key={c.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex items-center gap-3">
                          <Package className="w-5 h-5 text-muted-foreground" />
                          <div className="text-left">
                            <p className="font-medium">{c.collection_date} · {c.route_name ??  "Ruta Desconocido"}</p>
                            <p className="text-sm text-muted-foreground">
                              {c.container_number} {c.container_type} / {c.liters_collected} L / {c.total_price} €
                            </p>
                          </div>
                        </div>
                        <Badge className={getCollectionStatusClass(c.status)}>{c.status}</Badge>
                      </div>
                    ))}
                  </div>

                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mt-4">
                    <div className="text-sm text-muted-foreground">
                      Página <span className="font-medium">{histPage}</span> de{" "}
                      <span className="font-medium">{histTotalPages}</span> ·{" "}
                      <span className="font-medium">{histTotal}</span> resultados
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={historyLoading || histPage <= 1}
                        onClick={() => setHistPage((p) => Math.max(1, p - 1))}
                      >
                        Anterior
                      </Button>
                      <Button
                        size="sm"
                        disabled={historyLoading || histPage >= histTotalPages}
                        onClick={() => setHistPage((p) => Math.min(histTotalPages, p + 1))}
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

        {/* ESTADÍSTICAS mejoradas */}
        <TabsContent value="stats" className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-primary" />
                Estadísticas
              </CardTitle>
            </CardHeader>

            <CardContent>
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
                  {/* KPIs principales */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* Total cobrado */}
                    <div className="relative overflow-hidden rounded-xl border bg-gradient-to-br from-amber-500/5 to-transparent p-5 hover:shadow-elegant transition">
                      <div className="flex items-center justify-between">
                        <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-amber-500/15">
                          <Coins className="h-5 w-5 text-amber-600" />
                        </span>
                        <span className="text-xs px-2 py-1 rounded-full bg-amber-500/10 text-amber-700">
                          {euroPerLiter ? `${euroPerLiter.toFixed(3)} €/L` : "— €/L"}
                        </span>
                      </div>
                      <div className="mt-3 text-3xl font-bold text-foreground">
                        {formatCurrency(totalPaid)}
                      </div>
                      <p className="text-sm text-muted-foreground">Total Pagado</p>
                    </div>

                    {/* Litros totales */}
                    <div className="relative overflow-hidden rounded-xl border bg-gradient-to-br from-emerald-500/5 to-transparent p-5 hover:shadow-elegant transition">
                      <div className="flex items-center justify-between">
                        <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-emerald-500/15">
                          <Droplet className="h-5 w-5 text-emerald-600" />
                        </span>
                        <span className="text-xs px-2 py-1 rounded-full bg-emerald-500/10 text-emerald-700">
                          {`${Math.round(litersPerPickupMonth || 0)} L/rec.`}
                        </span>
                      </div>
                      <div className="mt-3 text-3xl font-bold text-foreground">
                        {formatNumber(currentMonthLiters)} L
                      </div>
                      <p className="text-sm text-muted-foreground">Litros Totales Recogidos ({monthNameCap})</p>
                    </div>

                    {/* Recogidas totales */}
                    <div className="relative overflow-hidden rounded-xl border bg-gradient-to-br from-blue-500/5 to-transparent p-5 hover:shadow-elegant transition">
                      <div className="flex items-center justify-between">
                        <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-blue-500/15">
                          <Package className="h-5 w-5 text-blue-600" />
                        </span>
                        <span className="text-xs px-2 py-1 rounded-full bg-blue-500/10 text-blue-700">
                          {`${Math.round(completionRate)}% completadas`}
                        </span>
                      </div>
                      <div className="mt-3 text-3xl font-bold text-foreground">
                        {formatNumber(pickups)}
                      </div>
                      <p className="text-sm text-muted-foreground">Recogidas Totales</p>
                    </div>
                  </div>

                  {/* Mini KPIs */}
                  <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div className="rounded-lg border p-3 flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Ticket medio</span>
                      <span className="text-sm font-semibold">
                        {pickups ? formatCurrency(avgTicket) : "—"}
                      </span>
                    </div>
                    <div className="rounded-lg border p-3 flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Litros por recogida</span>
                      <span className="text-sm font-semibold">
                        {pickups ? `${Math.round(litersPerPickup)} L` : "—"}
                      </span>
                    </div>
                    <div className="rounded-lg border p-3 flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Última recogida completada</span>
                      <span className="text-sm font-semibold">
                        {client?.last_completed_pick_up ?? "—"}
                      </span>
                    </div>
                  </div>

                  {/* Desglose por estado */}
                  <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div className="rounded-lg border p-3 flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Recogidas Completadas</span>
                      <span className="text-sm font-semibold text-success">{formatNumber(completed)}</span>
                    </div>
                    <div className="rounded-lg border p-3 flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Recogidas Pendientes</span>
                      <span className="text-sm font-semibold text-blue-600">{formatNumber(pending)}</span>
                    </div>
                    <div className="rounded-lg border p-3 flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Recogidas Canceladas</span>
                      <span className="text-sm font-semibold text-red-600">{formatNumber(canceled)}</span>
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <ConfirmDeleteDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Eliminar cliente"
        description={`Se va a eliminar el cliente "${name}". Esta acción no se puede deshacer.`}
        confirmLabel="Eliminar"
        onConfirm={handleDelete}
        loading={deleting}
      />
    </div>
  );
}
