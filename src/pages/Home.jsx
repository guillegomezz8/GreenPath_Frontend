import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Leaf, LogIn, LayoutDashboard } from "lucide-react";

export default function Home() {
  const navigate = useNavigate();

  return (
    <div className="min-h-[60vh] flex items-center justify-center p-6">
      <Card className="max-w-lg w-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Leaf className="w-6 h-6 text-primary" />
            GreenPath
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground text-left">
            Portal de gestion operativa para rutas y recogidas de aceite usado.
          </p>
          <div className="flex gap-2">
            <Button className="gap-2" onClick={() => navigate("/socialLogin")}>
              <LogIn className="w-4 h-4" />
              Iniciar sesion
            </Button>
            <Button variant="outline" className="gap-2" onClick={() => navigate("/dashboard")}>
              <LayoutDashboard className="w-4 h-4" />
              Ir al dashboard
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
