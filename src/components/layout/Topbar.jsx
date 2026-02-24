import { useNavigate } from "react-router-dom";
import { LogOut, CircleUser } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/AuthProvider";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { getInitials } from "@/components/Utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const Topbar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const userName = user?.username || "Usuario";
  const userEmail = user?.email || "Sin email";
  const userAvatarRaw = user?.photo || user?.avatar_url || user?.photo_url || null;
  const userAvatar = userAvatarRaw && !userAvatarRaw.startsWith("http")
    ? `${import.meta.env.VITE_APP_API_URL}${userAvatarRaw}`
    : userAvatarRaw;

  return (
    <div className="fixed top-0 right-0 left-0 h-16 bg-white border-b border-gray-200 flex items-center justify-between px-4 z-20">
      <div></div>

      <div className="flex items-center gap-4">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-auto px-2 py-1 gap-2 text-green-800 hover:text-green-900">
              <Avatar size="sm" className="h-8 w-8 border border-green-100">
                {userAvatar && <AvatarImage src={userAvatar} alt={userName} className="object-cover" />}
                <AvatarFallback size="sm" className="bg-green-100 text-green-800 font-semibold">
                  {getInitials(userName, "")}
                </AvatarFallback>
              </Avatar>
              <span className="hidden md:inline text-sm font-medium">{userName}</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel className="text-left space-y-1">
              <p className="text-sm font-semibold leading-none">{userName}</p>
              <p className="text-xs font-normal text-muted-foreground">{userEmail}</p>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="gap-2 cursor-pointer" onClick={() => navigate("/profile")}>
              <CircleUser className="w-4 h-4" />
              Mi perfil
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="gap-2 text-red-600 cursor-pointer" onClick={logout}>
              <LogOut className="w-4 h-4" />
              Cerrar sesion
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
};

export default Topbar;
