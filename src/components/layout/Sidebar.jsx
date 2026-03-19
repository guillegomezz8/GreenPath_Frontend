import { useMemo } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  Users,
  UserCog,
  Map,
  Route,
  Truck,
  BarChart3,
  Package,
  CalendarClock,
  Settings2,
  Building2,
  ReceiptText,
} from "lucide-react";
import { useAuth } from "@/context/AuthProvider";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { getAvatarSrc, getInitials, normalizeRoleType } from "@/components/Utils";

const ownerMenuItems = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard, path: "/dashboard" },
  { id: "clientes", label: "Clientes", icon: Users, path: "/clients" },
  { id: "trabajadores", label: "Trabajadores", icon: UserCog, path: "/workers" },
  { id: "camiones", label: "Camiones", icon: Truck, path: "/trucks" },
  { id: "zonas", label: "Zonas de Recogida", icon: Map, path: "/collection-zones" },
  { id: "rutas", label: "Rutas", icon: Route, path: "/routes" },
  { id: "recogidas", label: "Recogidas", icon: Package, path: "/collections" },
  { id: "compradores", label: "Compradores", icon: Building2, path: "/buyers" },
  { id: "ventas", label: "Ventas", icon: ReceiptText, path: "/sales" },
  { id: "estadisticas", label: "Estadisticas", icon: BarChart3, path: "/stats" },
  { id: "configuracion", label: "Configuracion", icon: Settings2, path: "/settings" },
];

const workerMenuItems = [
  { id: "rutas", label: "Rutas", icon: Route, path: "/routes" },
  { id: "recogidas", label: "Recogidas", icon: Package, path: "/collections" },
];

const clientMenuItems = [
  { id: "solicitudes", label: "Mis Solicitudes", icon: CalendarClock, path: "/my-requests" },
  { id: "recogidas", label: "Mis Recogidas", icon: Package, path: "/collections" },
];

const Sidebar = ({ onItemClick }) => {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const userName = user?.username || "Usuario";
  const userAvatar = getAvatarSrc(user);
  const isProfileActive = location.pathname.startsWith("/profile") || location.pathname.startsWith("/perfil");
  const roleType = normalizeRoleType(user?.role_type || "");
  const menuItems = useMemo(() => {
    if (roleType === "client") return clientMenuItems;
    if (roleType === "worker") return workerMenuItems;
    return ownerMenuItems;
  }, [roleType]);

  const handleNavigation = (path) => {
    navigate(path);
    if (onItemClick) {
      onItemClick();
    }
  };

  return (
    <div className="p-4 bg-sidebar h-full">
      <button
        type="button"
        onClick={() => handleNavigation("/profile")}
        className={`mb-6 w-full rounded-lg px-2 py-2 text-left transition-colors ${
          isProfileActive ? "bg-green-100" : "hover:bg-green-50"
        }`}
      >
        <div className="flex items-center gap-3">
        <Avatar size="sm" className="h-10 w-10 border border-primary/25 shadow-sm">
          {userAvatar && <AvatarImage src={userAvatar} alt={userName} className="object-cover" />}
          <AvatarFallback size="sm" className="bg-gradient-hero text-white font-bold text-sm">
            {getInitials(userName, "")}
          </AvatarFallback>
        </Avatar>
          <div className="min-w-0">
            <div className="font-semibold text-sidebar-foreground truncate">{userName}</div>
            <div className="text-sm text-muted-foreground truncate">{user?.email || "Sin email"}</div>
          </div>
        </div>
      </button>

      <nav className="px-2">
        {menuItems.map(({ id, label, icon: Icon, path }) => (
          <div
            key={id}
            onClick={() => handleNavigation(path)}
            className={`group cursor-pointer w-full flex items-center gap-3 px-4 py-3 text-left rounded-lg mb-1 transition-all text-sidebar-foreground/85 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground ${
              location.pathname.startsWith(path)
                ? "bg-gradient-hero text-white font-semibold shadow-green"
                : ""
            }`}
          >
            <Icon
              size={18}
              className={`flex-shrink-0 transition-transform ${location.pathname.startsWith(path) ? "" : "group-hover:-translate-y-0.5"}`}
            />
            <span className="text-sm truncate">{label}</span>
          </div>
        ))}
      </nav>
    </div>
  );
};

export default Sidebar;
