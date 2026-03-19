import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Building2, FileText, Mail, MapPin, Phone, Save, UserCircle2 } from "lucide-react";
import { useAuth } from "@/context/AuthProvider";
import { useSnackbar } from "@/context/SnackbarProvider";
import { handleApiError } from "@/components/Utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

const INITIAL_FORM = {
  fiscal_name: "",
  tax_id: "",
  fiscal_address: "",
  postal_code: "",
  city: "",
  province: "",
  country: "Espana",
  email: "",
  phone: "",
  contact_person: "",
  notes: "",
};

function normalizeBuyerPayload(payload = {}) {
  return {
    fiscal_name: payload.fiscal_name || "",
    tax_id: payload.tax_id || "",
    fiscal_address: payload.fiscal_address || "",
    postal_code: payload.postal_code || "",
    city: payload.city || "",
    province: payload.province || "",
    country: payload.country || "Espana",
    email: payload.email || "",
    phone: payload.phone || "",
    contact_person: payload.contact_person || "",
    notes: payload.notes || "",
  };
}

export default function BuyerForm({ mode = "create", buyerId = null }) {
  const navigate = useNavigate();
  const { api } = useAuth();
  const showSnackbar = useSnackbar();

  const isEdit = mode === "edit";
  const [formData, setFormData] = useState(INITIAL_FORM);
  const [loading, setLoading] = useState(isEdit);
  const [submitting, setSubmitting] = useState(false);

  const pageTitle = useMemo(() => (isEdit ? "Editar comprador" : "Nuevo comprador"), [isEdit]);
  const submitLabel = useMemo(() => (isEdit ? "Guardar cambios" : "Crear comprador"), [isEdit]);

  const fetchBuyer = useCallback(async () => {
    if (!isEdit || !buyerId) return;
    try {
      setLoading(true);
      const res = await api().get(`buyers/${encodeURIComponent(buyerId)}`);
      setFormData(normalizeBuyerPayload(res.data || {}));
    } catch (e) {
      const msg = handleApiError(e, "No se pudo cargar el comprador.");
      showSnackbar(msg, "error");
      navigate("/buyers");
    } finally {
      setLoading(false);
    }
  }, [api, buyerId, isEdit, navigate, showSnackbar]);

  useEffect(() => {
    fetchBuyer();
  }, [fetchBuyer]);

  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.fiscal_name || !formData.tax_id || !formData.fiscal_address || !formData.postal_code || !formData.city || !formData.province) {
      showSnackbar("Completa los datos fiscales obligatorios.", "error");
      return;
    }

    try {
      setSubmitting(true);
      const payload = {
        fiscal_name: formData.fiscal_name.trim(),
        tax_id: formData.tax_id.trim(),
        fiscal_address: formData.fiscal_address.trim(),
        postal_code: formData.postal_code.trim(),
        city: formData.city.trim(),
        province: formData.province.trim(),
        country: formData.country.trim() || "Espana",
        email: formData.email.trim(),
        phone: formData.phone.trim(),
        contact_person: formData.contact_person.trim(),
        notes: formData.notes.trim(),
      };

      const res = isEdit
        ? await api().put(`buyers/${encodeURIComponent(buyerId)}/`, payload)
        : await api().post("buyers/", payload);

      const targetId = res.data?.id || buyerId;
      showSnackbar(isEdit ? "Comprador actualizado correctamente." : "Comprador creado correctamente.", "success");
      navigate(targetId ? `/buyers/${targetId}` : "/buyers");
    } catch (e) {
      const msg = handleApiError(e, isEdit ? "No se pudo actualizar el comprador." : "No se pudo crear el comprador.");
      showSnackbar(msg, "error");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start gap-3 sm:items-center sm:gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate(isEdit && buyerId ? `/buyers/${buyerId}` : "/buyers")} className="mt-1 flex-shrink-0 sm:mt-0">
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="min-w-0 flex-1 text-left">
          <h1 className="flex flex-wrap items-center gap-3 text-xl font-bold text-foreground sm:text-2xl lg:text-3xl">
            <Building2 className="h-7 w-7 text-primary" />
            {pageTitle}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground sm:text-base">
            Gestiona la informacion fiscal y de contacto de los compradores internos.
          </p>
        </div>
      </div>

      {loading ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">Cargando comprador...</CardContent>
        </Card>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-6">
          <Card>
            <CardHeader className="text-left">
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-primary" />
                Datos fiscales
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="fiscal_name">Razon social *</Label>
                  <Input id="fiscal_name" value={formData.fiscal_name} onChange={(e) => handleChange("fiscal_name", e.target.value)} disabled={submitting} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="tax_id">CIF / NIF *</Label>
                  <Input id="tax_id" value={formData.tax_id} onChange={(e) => handleChange("tax_id", e.target.value)} disabled={submitting} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="country">Pais</Label>
                  <Input id="country" value={formData.country} onChange={(e) => handleChange("country", e.target.value)} disabled={submitting} />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="fiscal_address">Direccion fiscal *</Label>
                  <Input id="fiscal_address" value={formData.fiscal_address} onChange={(e) => handleChange("fiscal_address", e.target.value)} disabled={submitting} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="postal_code">Codigo postal *</Label>
                  <Input id="postal_code" value={formData.postal_code} onChange={(e) => handleChange("postal_code", e.target.value)} disabled={submitting} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="city">Ciudad *</Label>
                  <Input id="city" value={formData.city} onChange={(e) => handleChange("city", e.target.value)} disabled={submitting} />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="province">Provincia *</Label>
                  <Input id="province" value={formData.province} onChange={(e) => handleChange("province", e.target.value)} disabled={submitting} />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="text-left">
              <CardTitle className="flex items-center gap-2">
                <UserCircle2 className="h-5 w-5 text-primary" />
                Contacto
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <div className="relative">
                    <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input id="email" type="email" className="pl-10" value={formData.email} onChange={(e) => handleChange("email", e.target.value)} disabled={submitting} />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Telefono</Label>
                  <div className="relative">
                    <Phone className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input id="phone" className="pl-10" value={formData.phone} onChange={(e) => handleChange("phone", e.target.value)} disabled={submitting} />
                  </div>
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="contact_person">Persona de contacto</Label>
                  <Input id="contact_person" value={formData.contact_person} onChange={(e) => handleChange("contact_person", e.target.value)} disabled={submitting} />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="text-left">
              <CardTitle className="flex items-center gap-2">
                <MapPin className="h-5 w-5 text-primary" />
                Observaciones
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2 text-left">
                <Label htmlFor="notes">Notas internas</Label>
                <Textarea id="notes" rows={5} value={formData.notes} onChange={(e) => handleChange("notes", e.target.value)} disabled={submitting} />
              </div>
              <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
                <Button type="button" variant="outline" className="w-full sm:w-auto" disabled={submitting} onClick={() => navigate(isEdit && buyerId ? `/buyers/${buyerId}` : "/buyers")}>
                  Cancelar
                </Button>
                <Button type="submit" className="w-full gap-2 sm:w-auto" disabled={submitting}>
                  <Save className="h-4 w-4" />
                  {submitting ? "Guardando..." : submitLabel}
                </Button>
              </div>
            </CardContent>
          </Card>
        </form>
      )}
    </div>
  );
}
