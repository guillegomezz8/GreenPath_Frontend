import { LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/AuthProvider";

const Topbar = () => {
  const { logout } = useAuth();

  return (
    <div className="h-full w-full bg-white border-b border-gray-200 flex items-center justify-between px-3 sm:px-4">
      <div />

      <Button variant="ghost" className="gap-2 text-red-600 hover:text-red-700" onClick={logout}>
        <LogOut className="w-4 h-4" />
        <span className="hidden sm:inline">Cerrar sesion</span>
      </Button>
    </div>
  );
};

export default Topbar;
