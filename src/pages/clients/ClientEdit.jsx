import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useSnackbar } from '@/context/SnackbarProvider';
import { handleApiError } from '@/components/Utils';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Save, Users } from "lucide-react";
import { useAuth } from "@/context/AuthProvider";

const displayToCode = (label) => {
  switch ((label || "").toLowerCase()) {
    case "cada semana": return "WEEKLY";
    case "cada 2 semanas": return "2_WEEKS";
    case "cada 3 semanas": return "3_WEEKS";
    case "cada 4 semanas": return "4_WEEKS";
    default: return "WEEKLY";
  }
};

export default function EditarCliente() {
  const navigate = useNavigate();
  const { id } = useParams();
  const showSnackbar = useSnackbar();
  const { api } = useAuth();

  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);

  const [formData, setFormData] = useState({
    // Usuario asociado
    username: "",
    email: "",

    // Cliente
    name: "",
    cif: "",
    address: "",
    city: "",
    postal_code: "",
    country: "España",
    phone: "",
    frequency: "WEEKLY",
  });

  const update = (k, v) => setFormData((p) => ({ ...p, [k]: v }));

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setFetching(true);
        const { data } = await api().get(`/clients/${id}/`);
        if (cancelled) return;

        const freqCode = data?.frequency ? displayToCode(data.frequency) : "WEEKLY";

        setFormData({
          username: data?.username || data?.user?.username || "",
          email: data?.email || "",
          name: data?.name || "",
          cif: data?.cif || "",
          address: data?.address || "",
          city: data?.city || "",
          postal_code: data?.postal_code || "",
          country: data?.country || "España",
          phone: data?.phone || "",
          frequency: freqCode,
        });
      } catch (err) {
      const message = handleApiError(err, 'Error inesperado obteniendo cliente.');
      showSnackbar(message, 'error');
      navigate("/clients");
      } finally {
        if (!cancelled) setFetching(false);
      }
    })();
    return () => { cancelled = true; };
  }, [id, api, navigate, showSnackbar]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const payload = {
        name: formData.name,
        email: formData.email,
        address: formData.address,
        phone: formData.phone,
        cif: formData.cif,
        city: formData.city,
        postal_code: formData.postal_code,
        country: formData.country,
        frequency: formData.frequency,
      };

      await api().put(`/clients/${id}/`, payload);
      navigate("/clients");
    } catch (error) {
      const message = handleApiError(error, 'Error inesperado actualizando cliente.');
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
            <span>Editar Cliente</span>
          </h1>
          <p className="text-sm sm:text-base text-muted-foreground mt-1 leading-relaxed">
            Modifica la información del cliente
          </p>
        </div>
    </div>

      {/* Usuario asociado */}
      <Card>
        <CardHeader>
          <CardTitle>Usuario asociado</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                value={formData.username}
                onChange={(e) => update("username", e.target.value)}
                disabled   /* normalmente no se cambia */
                placeholder="username"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email *</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => update("email", e.target.value)}
                required
                disabled={fetching}
                placeholder="contacto@ejemplo.com"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Información del Cliente */}
      <Card>
        <CardHeader>
          <CardTitle>Información del Cliente</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Nombre / CIF */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nombre *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => update("name", e.target.value)}
                  required
                  disabled={fetching}
                  placeholder="Ej: Restaurante El Sol"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="cif">CIF *</Label>
                <Input
                  id="cif"
                  value={formData.cif}
                  onChange={(e) => update("cif", e.target.value)}
                  required
                  disabled={fetching}
                />
              </div>
            </div>

            {/* Dirección */}
            <div className="space-y-2">
              <Label htmlFor="address">Dirección *</Label>
              <Input
                id="address"
                value={formData.address}
                onChange={(e) => update("address", e.target.value)}
                required
                disabled={fetching}
                placeholder="Calle, número, ciudad"
              />
            </div>

            {/* City / CP / País */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="city">Ciudad</Label>
                <Input
                  id="city"
                  value={formData.city}
                  onChange={(e) => update("city", e.target.value)}
                  disabled={fetching}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="postal_code">Código Postal</Label>
                <Input
                  id="postal_code"
                  value={formData.postal_code}
                  onChange={(e) => update("postal_code", e.target.value)}
                  disabled={fetching}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="country">País</Label>
                <Input
                  id="country"
                  value={formData.country}
                  onChange={(e) => update("country", e.target.value)}
                  disabled={fetching}
                />
              </div>
            </div>

            {/* Teléfono / Frecuencia */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="phone">Teléfono *</Label>
                <Input
                  id="phone"
                  value={formData.phone}
                  onChange={(e) => update("phone", e.target.value)}
                  required
                  disabled={fetching}
                  placeholder="+34 XXX XXX XXX"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="frequency">Frecuencia de Recogida</Label>
                <Select
                  value={formData.frequency}
                  onValueChange={(v) => update("frequency", v)}
                  disabled={fetching}
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

            <div className="flex gap-4 pt-4">
              <Button type="button" variant="outline" onClick={() => navigate("/clients")} className="flex-1">
                Cancelar
              </Button>
              <Button type="submit" disabled={loading || fetching} className="flex-1 gap-2">
                <Save className="w-4 h-4" />
                {loading ? "Guardando..." : "Actualizar Cliente"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
