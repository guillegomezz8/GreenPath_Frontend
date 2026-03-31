import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Save, UserPen, UserCog, IdCard } from "lucide-react";
import { useSnackbar } from "@/context/SnackbarProvider";
import { handleApiError } from "@/components/Utils";
import { useAuth } from "@/context/AuthProvider";

function toDateInputValue(value) {
  if (!value) return "";
  try {
    if (typeof value === "string") {
      if (value.length >= 10) return value.slice(0, 10);
    } else if (value instanceof Date) {
      const y = value.getFullYear();
      const m = String(value.getMonth() + 1).padStart(2, "0");
      const d = String(value.getDate()).padStart(2, "0");
      return `${y}-${m}-${d}`;
    }
  } catch {}
  return "";
}

const toRoleLabel = (roleValue) => {
  if (!roleValue) return "Trabajador";
  const normalized = String(roleValue)
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

  if (["owner", "propietario", "dueno"].includes(normalized)) return "Propietario";
  if (["worker", "trabajador"].includes(normalized)) return "Trabajador";
  return "Trabajador";
};

export default function WorkerEdit() {
  const navigate = useNavigate();
  const { id } = useParams();
  const showSnackbar = useSnackbar();
  const { api } = useAuth();

  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [photoFile, setPhotoFile] = useState(null);

  const [formData, setFormData] = useState({
    username: "",
    email: "",
    role_label: "Trabajador",
    name: "",
    surname: "",
    address: "",
    phone: "",
    dni: "",
    birth_date: "",
  });

  const update = (field, value) =>
    setFormData((prev) => ({ ...prev, [field]: value }));

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setFetching(true);
        const { data } = await api().get(`/workers/${id}/`);
        if (cancelled) return;

        const username = data?.username ?? data?.user?.username ?? "";
        const email = data?.email ?? data?.user?.email ?? "";

        setFormData({
          username,
          email,
          role_label: toRoleLabel(data?.role_code || data?.role),
          name: data?.name || "",
          surname: data?.surname || "",
          address: data?.address || "",
          phone: data?.phone || "",
          dni: data?.dni || "",
          birth_date: toDateInputValue(data?.birth_date),
        });
      } catch (err) {
        const message = handleApiError(err, "Error inesperado obteniendo trabajador.");
        showSnackbar(message, "error");
        navigate("/workers");
      } finally {
        if (!cancelled) setFetching(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id, api, navigate, showSnackbar]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const jsonPayload = {
        email: formData.email,
        name: formData.name,
        surname: formData.surname,
        address: formData.address,
        phone: formData.phone,
        dni: formData.dni,
        birth_date: formData.birth_date || null,
      };

      if (photoFile) {
        const fd = new FormData();
        fd.append("name", jsonPayload.name || "");
        fd.append("surname", jsonPayload.surname || "");
        fd.append("address", jsonPayload.address || "");
        fd.append("phone", jsonPayload.phone || "");
        fd.append("dni", jsonPayload.dni || "");
        fd.append("email", jsonPayload.email || "");
        if (jsonPayload.birth_date) fd.append("birth_date", jsonPayload.birth_date);
        fd.append("photo", photoFile);

        await api().put(`/workers/${id}/`, fd);
      } else {
        await api().put(`/workers/${id}/`, jsonPayload);
      }

      navigate("/workers");
    } catch (error) {
      const message = handleApiError(error, "Error inesperado actualizando trabajador.");
      showSnackbar(message, "error");
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
          onClick={() => navigate("/workers")}
          className="flex-shrink-0 mt-1 sm:mt-0"
        >
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div className="min-w-0 flex-1">
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-foreground flex flex-wrap items-center gap-2 lg:gap-3 leading-tight">
            <UserCog className="w-6 h-6 sm:w-7 sm:h-7 lg:w-8 lg:h-8 text-primary flex-shrink-0" />
            <span>Editar Trabajador</span>
          </h1>
          <p className="text-sm sm:text-base text-muted-foreground mt-1 leading-relaxed text-left">
            Modifica la informacion del trabajador
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
              <Label htmlFor="username">Username *</Label>
              <Input
                id="username"
                value={formData.username}
                onChange={(e) => update("username", e.target.value)}
                required
                disabled
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
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Informacion del Trabajador */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <IdCard className="w-5 h-5 text-primary" />
            Informacion del Trabajador
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Rol actual</Label>
                <Input value={formData.role_label} disabled />
              </div>

              <div className="space-y-2">
                <Label htmlFor="name">Nombre *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => update("name", e.target.value)}
                  required
                  disabled={fetching}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="surname">Apellidos *</Label>
                <Input
                  id="surname"
                  value={formData.surname}
                  onChange={(e) => update("surname", e.target.value)}
                  required
                  disabled={fetching}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="phone">Telefono *</Label>
                <Input
                  id="phone"
                  value={formData.phone}
                  onChange={(e) => update("phone", e.target.value)}
                  placeholder="+34 666 000 000"
                  disabled={fetching}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="dni">DNI *</Label>
                <Input
                  id="dni"
                  value={formData.dni}
                  onChange={(e) => update("dni", e.target.value)}
                  placeholder="12345678Z"
                  disabled={fetching}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="birth_date">Fecha de nacimiento</Label>
                <Input
                  id="birth_date"
                  type="date"
                  value={formData.birth_date}
                  onChange={(e) => update("birth_date", e.target.value)}
                  disabled={fetching}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2 col-span-full md:col-span-2">
                <Label className="text-sm font-medium text-foreground" htmlFor="address">
                  Direccion *
                </Label>
                <Input
                  id="address"
                  value={formData.address}
                  onChange={(e) => update("address", e.target.value)}
                  placeholder="C/ Ejemplo 123, Sevilla"
                  className="w-full text-sm sm:text-base"
                  disabled={fetching}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="photo">Foto (opcional)</Label>
                <Input
                  id="photo"
                  type="file"
                  accept="image/*"
                  onChange={(e) => setPhotoFile(e.target.files?.[0] || null)}
                  disabled={fetching}
                />
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 pt-4 sm:pt-6">
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate("/workers")}
                className="flex-1 order-2 sm:order-1 h-10 sm:h-9"
              >
                <span className="text-sm sm:text-base">Cancelar</span>
              </Button>
              <Button
                type="submit"
                disabled={loading || fetching}
                className="flex-1 order-1 sm:order-2 gap-2 h-10 sm:h-9"
              >
                <Save className="w-4 h-4 flex-shrink-0" />
                <span className="text-sm sm:text-base">
                  {loading ? "Guardando..." : "Actualizar Trabajador"}
                </span>
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
