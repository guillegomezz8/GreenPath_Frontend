import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  UserCog,
  Map,
  Route,
  Truck,
  BarChart3,
  Package
} from 'lucide-react';
import { useAuth } from '@/context/AuthProvider';

const menuItems = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, path: '/dashboard' },
  { id: 'clientes', label: 'Clientes', icon: Users, path: '/clients' },
  { id: 'trabajadores', label: 'Trabajadores', icon: UserCog, path: '/workers' },
  { id: 'camiones', label: 'Camiones', icon: Truck, path: '/trucks' },
  { id: 'zonas', label: 'Zonas de Recogida', icon: Map, path: '/collection-zones' },
  { id: 'rutas', label: 'Rutas', icon: Route, path: '/routes' },
  { id: 'recogidas', label: 'Recogidas', icon: Package, path: '/collections' },
  { id: 'estadisticas', label: 'Estadísticas', icon: BarChart3, path: '/stats' },

];


const Sidebar = () => {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  return (
    <div className="p-4 bg-white">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center">
          <span className="text-white font-bold text-lg">
            {user.username ? user.username.charAt(0).toUpperCase() : ''}
          </span>
        </div>
        <div>
          <div className="font-semibold text-green-800">{user.email}</div>
        </div>
      </div>

      <nav className="px-2">
        {menuItems.map(({ id, label, icon: Icon, path }) => (
          <div
            key={id}
            onClick={() => navigate(path)}
            className={`cursor-pointer w-full flex items-center gap-3 px-4 py-3 text-left rounded-lg mb-1 transition-colors text-green-700 hover:bg-green-200 hover:text-green-900
              ${location.pathname.startsWith(path) ? 'bg-green-200 text-green-900 font-semibold border-l-4 border-green-500 shadow-inner' : ''}`}
          >
            <Icon size={18} />
            <span className="text-sm">{label}</span>
          </div>
        ))}
      </nav>
    </div>
  );
};

export default Sidebar;