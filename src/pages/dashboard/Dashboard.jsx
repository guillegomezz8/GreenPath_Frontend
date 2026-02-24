import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { StatCard } from "@/components/common/StatCard";
import { ActionButton } from "@/components/common/ActionButton";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/context/AuthProvider";
import { useSnackbar } from "@/context/SnackbarProvider";
import {
  handleApiError,
  getCollectionStatusClass,
  getCollectionStatusLabel,
} from "@/components/Utils";
import {
  Users,
  UserCheck,
  Truck,
  Package,
  MapPin,
  Calendar,
  CheckCircle,
  LayoutDashboard,
  Route,
  BarChart3,
} from "lucide-react";

function formatDate(dateStr) {
  if (!dateStr) return "-";
  const d = new Date(`${dateStr}T00:00:00`);
  if (Number.isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString("es-ES");
}

export default function Dashboard() {
  const { api } = useAuth();
  const showSnackbar = useSnackbar();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState({
    clients: 0,
    activeWorkers: 0,
    operationalTrucks: 0,
    pendingCollections: 0,
    totalRoutes: 0,
  });
  const [recentCollections, setRecentCollections] = useState([]);

  const fetchDashboard = useCallback(async () => {
    try {
      setLoading(true);
      const [
        clientsRes,
        workersRes,
        trucksRes,
        routesRes,
        collectionsRes,
        collectionsPendingRes,
      ] = await Promise.all([
        api().get("clients", { params: { page: 1, page_size: 1 } }),
        api().get("workers", { params: { page: 1, page_size: 1 } }),
        api().get("trucks", { params: { page: 1, page_size: 1 } }),
        api().get("routes", { params: { page: 1, page_size: 1 } }),
        api().get("collections", { params: { page: 1, page_size: 8, ordering: "-collection_date" } }),
        api().get("collections", { params: { page: 1, page_size: 1, status: "PENDING_MEASUREMENT" } }),
      ]);

      const clientsPayload = clientsRes.data || {};
      const workersPayload = workersRes.data || {};
      const trucksPayload = trucksRes.data || {};
      const routesPayload = routesRes.data || {};
      const collectionsPayload = collectionsRes.data || {};
      const trucksCounts = trucksPayload?.counts || {};

      const operationalTrucks = Number(trucksCounts?.active || 0) + Number(trucksCounts?.in_service || 0);

      setStats({
        clients: Number(clientsPayload.count || 0),
        activeWorkers: Number(workersPayload?.counts?.active || 0),
        operationalTrucks,
        pendingCollections: Number(collectionsPendingRes.data?.count || 0),
        totalRoutes: Number(routesPayload.count || 0),
      });
      setRecentCollections(Array.isArray(collectionsPayload.results) ? collectionsPayload.results : []);
    } catch (e) {
      const msg = handleApiError(e, "Error cargando el dashboard.");
      showSnackbar(msg, "error");
    } finally {
      setLoading(false);
    }
  }, [api, showSnackbar]);

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  const statsData = useMemo(
    () => [
      {
        title: "Total Clientes",
        value: stats.clients.toLocaleString("es-ES"),
        icon: Users,
        color: "text-blue-600",
      },
      {
        title: "Trabajadores Activos",
        value: stats.activeWorkers.toLocaleString("es-ES"),
        icon: UserCheck,
        color: "text-green-600",
      },
      {
        title: "Camiones Operativos",
        value: stats.operationalTrucks.toLocaleString("es-ES"),
        icon: Truck,
        color: "text-orange-600",
      },
      {
        title: "Total Rutas",
        value: stats.totalRoutes.toLocaleString("es-ES"),
        icon: Route,
        color: "text-sky-600",
      },
      {
        title: "Recogidas Pendientes",
        value: stats.pendingCollections.toLocaleString("es-ES"),
        icon: Package,
        color: "text-amber-600",
      },
    ],
    [stats]
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="text-left">
          <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
            <LayoutDashboard className="w-8 h-8 text-primary" />
            Dashboard
          </h1>
          <p className="text-muted-foreground">Resumen general de operaciones GreenPath</p>
        </div>

        <div className="flex gap-2">
          <ActionButton variant="outline" icon={Calendar} disabled>
            Hoy
          </ActionButton>
          <ActionButton icon={BarChart3} onClick={() => navigate("/stats")}>
            Ver Estadisticas
          </ActionButton>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
        {statsData.map((stat) => (
          <StatCard key={stat.title} title={stat.title} value={stat.value} icon={stat.icon} color={stat.color} />
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-left">
              <CheckCircle className="w-5 h-5 text-primary" />
              Actividad Reciente
            </CardTitle>
            <CardDescription className="text-left">Ultimas recogidas registradas en el sistema</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-sm text-muted-foreground text-left">Cargando actividad...</p>
            ) : recentCollections.length === 0 ? (
              <p className="text-sm text-muted-foreground text-left">No hay actividad reciente.</p>
            ) : (
              <div className="space-y-4">
                {recentCollections.map((collection) => (
                  <div
                    key={collection.id}
                    className="flex items-center justify-between p-3 border border-border rounded-lg hover:bg-accent/50 transition-colors"
                  >
                    <div className="min-w-0">
                      <p className="font-medium text-foreground">{collection.client_name || "Cliente"}</p>
                      <p className="text-sm text-muted-foreground truncate">
                        {collection.route_name || "Sin ruta"} | {getCollectionStatusLabel(collection.status)}
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-1 ml-3">
                      <Badge className={getCollectionStatusClass(collection.status)}>
                        {getCollectionStatusLabel(collection.status)}
                      </Badge>
                      <span className="text-xs text-muted-foreground">{formatDate(collection.collection_date)}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-left">
              <MapPin className="w-5 h-5 text-primary" />
              Acciones Rapidas
            </CardTitle>
            <CardDescription className="text-left">Accesos directos y resumen operativo</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="p-3 rounded-lg border border-border text-left">
              <p className="text-sm font-medium">Resumen operativo</p>
              <div className="mt-2 grid grid-cols-2 gap-y-1 text-sm text-muted-foreground">
                <span>Rutas totales:</span>
                <span className="text-right font-medium text-foreground">{stats.totalRoutes}</span>
                <span>Camiones operativos:</span>
                <span className="text-right font-medium text-foreground">{stats.operationalTrucks}</span>
                <span>Recogidas pendientes:</span>
                <span className="text-right font-medium text-foreground">{stats.pendingCollections}</span>
                <span>Trabajadores activos:</span>
                <span className="text-right font-medium text-foreground">{stats.activeWorkers}</span>
              </div>
            </div>
            <ActionButton variant="outline" icon={Users} className="w-full justify-start" onClick={() => navigate("/clients/new")}>
              Nuevo Cliente
            </ActionButton>
            <ActionButton variant="outline" icon={Package} className="w-full justify-start" onClick={() => navigate("/collections/new")}>
              Registrar Recogida
            </ActionButton>
            <ActionButton variant="outline" icon={Route} className="w-full justify-start" onClick={() => navigate("/routes")}>
              Gestionar Rutas
            </ActionButton>
            <ActionButton variant="success" icon={BarChart3} className="w-full justify-start" onClick={() => navigate("/stats")}>
              Ver Estadisticas
            </ActionButton>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
