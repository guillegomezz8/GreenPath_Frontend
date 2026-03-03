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
  { id: "estadisticas", label: "Estadisticas", icon: BarChart3, path: "/stats" },
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
    <div className="p-4 bg-white h-full">
      <button
        type="button"
        onClick={() => handleNavigation("/profile")}
        className={`mb-6 w-full rounded-lg px-2 py-2 text-left transition-colors ${
          isProfileActive ? "bg-green-100" : "hover:bg-green-50"
        }`}
      >
        <div className="flex items-center gap-3">
        <Avatar size="sm" className="h-10 w-10 border border-green-200">
          {userAvatar && <AvatarImage src={userAvatar} alt={userName} className="object-cover" />}
          <AvatarFallback size="sm" className="bg-green-500 text-white font-bold text-sm">
            {getInitials(userName, "")}
          </AvatarFallback>
        </Avatar>
          <div className="min-w-0">
            <div className="font-semibold text-green-900 truncate">{userName}</div>
            <div className="text-sm text-green-800 truncate">{user?.email || "Sin email"}</div>
          </div>
        </div>
      </button>

      <nav className="px-2">
        {menuItems.map(({ id, label, icon: Icon, path }) => (
          <div
            key={id}
            onClick={() => handleNavigation(path)}
            className={`cursor-pointer w-full flex items-center gap-3 px-4 py-3 text-left rounded-lg mb-1 transition-colors text-green-700 hover:bg-green-200 hover:text-green-900 ${
              location.pathname.startsWith(path)
                ? "bg-green-200 text-green-900 font-semibold border-l-4 border-green-500 shadow-inner"
                : ""
            }`}
          >
            <Icon size={18} className="flex-shrink-0" />
            <span className="text-sm truncate">{label}</span>
          </div>
        ))}
      </nav>
    </div>
  );
};

export default Sidebar;
