import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Save, Users, UserPen, IdCard } from "lucide-react";
import { useSnackbar } from '@/context/SnackbarProvider';
import { handleApiError } from '@/components/Utils';
import { useAuth } from "@/context/AuthProvider";
import { Checkbox } from "@/components/ui/checkbox";

export default function ClientCreate() {
  const navigate = useNavigate();
  const showSnackbar = useSnackbar();
  const { api } = useAuth();
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    username: "",
    email: "",
    get_access: false,
    name: "",
    phone: "",
    cif: "",
    address: "",
    city: "",
    postal_code: "",
    country: "España",
    frequency: "WEEKLY",
  });

  const update = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const requiresEmailForAccess = formData.get_access;

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (requiresEmailForAccess && !formData.email.trim()) {
      showSnackbar("Debes indicar un email si quieres enviar acceso a la plataforma.", "error");
      return;
    }

    setLoading(true);
    try {
      const payload = {
        get_access: formData.get_access,
        user: {
          username: formData.username.trim(),
          email: formData.email.trim(),
        },
        name: formData.name.trim(),
        address: formData.address.trim(),
        phone: formData.phone.trim(),
        cif: formData.cif.trim(),
        city: formData.city.trim(),
        postal_code: formData.postal_code.trim(),
        country: formData.country.trim(),
        frequency: formData.frequency,
      };

      await api().post("/clients/", payload);
      navigate("/clients");
    } catch (error) {
      const message = handleApiError(error, 'Error inesperado creando cliente.');
      showSnackbar(message, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start gap-3 sm:items-center sm:gap-4">
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={() => navigate("/clients")}
          className="flex-shrink-0 mt-1 sm:mt-0"
        >
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div className="min-w-0 flex-1">
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-foreground flex flex-wrap items-center gap-2 lg:gap-3 leading-tight">
            <Users className="w-6 h-6 sm:w-7 sm:h-7 lg:w-8 lg:h-8 text-primary flex-shrink-0" />
            <span>Crear Cliente</span>
          </h1>
          <p className="text-sm sm:text-base text-muted-foreground mt-1 leading-relaxed text-left">
            Rellena la información para registrar un nuevo cliente
          </p>
        </div>
      </div>

      {/* Usuario asociado */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserPen className="w-5 h-5 text-primary" />
            Usuario asociado
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                value={formData.username}
                onChange={(e) => update("username", e.target.value)}
                placeholder="Se generará automáticamente si lo dejas vacío"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">{requiresEmailForAccess ? "Email *" : "Email"}</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => update("email", e.target.value)}
                placeholder={requiresEmailForAccess ? "Necesario para enviar acceso" : "Opcional si no das acceso"}
              />
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="get_access"
              checked={formData.get_access}
              onCheckedChange={(v) => update("get_access", !!v)}
            />
            <Label htmlFor="get_access">Dar acceso a la plataforma (enviar contrasena temporal por email)</Label>
          </div>
        </CardContent>
      </Card>

      {/* Informacion del Cliente */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <IdCard className="w-5 h-5 text-primary" />
            Informacion del Cliente
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nombre *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => update("name", e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="cif">CIF</Label>
                <Input
                  id="cif"
                  value={formData.cif}
                  onChange={(e) => update("cif", e.target.value)}
                  placeholder="Opcional"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="address">Direccion *</Label>
              <Input
                id="address"
                value={formData.address}
                onChange={(e) => update("address", e.target.value)}
                required
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="city">Ciudad *</Label>
                <Input
                  id="city"
                  value={formData.city}
                  onChange={(e) => update("city", e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="postal_code">Codigo postal *</Label>
                <Input
                  id="postal_code"
                  value={formData.postal_code}
                  onChange={(e) => update("postal_code", e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="country">Pais *</Label>
                <Input
                  id="country"
                  value={formData.country}
                  onChange={(e) => update("country", e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="phone">Telefono *</Label>
                <Input
                  id="phone"
                  value={formData.phone}
                  onChange={(e) => update("phone", e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="frequency">Frecuencia de Recogida</Label>
                <Select
                  value={formData.frequency}
                  onValueChange={(value) => update("frequency", value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona la frecuencia" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="WEEKLY">Cada semana</SelectItem>
                    <SelectItem value="2_WEEKS">Cada 2 semanas</SelectItem>
                    <SelectItem value="3_WEEKS">Cada 3 semanas</SelectItem>
                    <SelectItem value="4_WEEKS">Cada 4 semanas</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 pt-4 sm:pt-6">
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate("/clients")}
                className="flex-1 order-2 sm:order-1 h-10 sm:h-9"
              >
                <span className="text-sm sm:text-base">Cancelar</span>
              </Button>
              <Button
                type="submit"
                disabled={loading}
                className="flex-1 order-1 sm:order-2 gap-2 h-10 sm:h-9"
              >
                <Save className="w-4 h-4 flex-shrink-0" />
                <span className="text-sm sm:text-base">
                  {loading ? "Guardando..." : "Crear Cliente"}
                </span>
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
