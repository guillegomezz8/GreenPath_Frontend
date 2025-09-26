import { User, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/context/AuthProvider';

const Topbar = ({ onToggleSidebar }) => {
  const { user, logout } = useAuth();

  return (
    <div className="fixed top-0 right-0 left-0 h-16 bg-white border-b border-gray-200 flex items-center justify-between px-4 z-20">
      <div></div>

      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={() => window.location.href = "#/perfil"}>
            <User className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={logout}
            className="p-2"
          >
            <LogOut size={16} />
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Topbar;
