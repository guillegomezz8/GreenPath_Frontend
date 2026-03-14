import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Save, Package } from "lucide-react";
import { useAuth } from "@/context/AuthProvider";
import { useSnackbar } from "@/context/SnackbarProvider";
import { handleApiError, normalizeCollectionStatus } from "@/components/Utils";

const STATUS_OPTIONS = [
  { value: "PENDING_MEASUREMENT", label: "Pendiente de medicion" },
  { value: "CONFIRMED", label: "Confirmada" },
  { value: "CANCELED", label: "Cancelada" },
];

const DEDUCTION_OPTIONS = [
  { value: "WATER", label: "Agua" },
  { value: "RESIDUE", label: "Residuo" },
  { value: "MIXED", label: "Mezcla" },
  { value: "OTHER", label: "Otro" },
];

const CONTAINER_OPTIONS = [
  { value: "BIDONES", label: "Bidones" },
  { value: "IBC", label: "IBC" },
];

function toOptionalNumber(value) {
  if (value === "" || value === null || value === undefined) return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

export default function CollectionEdit() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { api } = useAuth();
  const showSnackbar = useSnackbar();

  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [clients, setClients] = useState([]);
  const [workers, setWorkers] = useState([]);
  const [formData, setFormData] = useState({
    client: "",
    worker: "",
    route_day_client: "",
    collection_date: "",
    container_type: "BIDONES",
    container_number: "1",
    measured_liters: "",
    deduction_liters: "0",
    deduction_reason: "RESIDUE",
    deduction_notes: "",
    price_per_liter: "0.000",
    status: "PENDING_MEASUREMENT",
    notes: "",
  });

  const fetchBase = useCallback(async () => {
    try {
      const [clientsRes, workersRes] = await Promise.all([
        api().get("clients", { params: { page: 1, page_size: 300 } }),
        api().get("workers", { params: { page: 1, page_size: 300 } }),
      ]);
      setClients(Array.isArray(clientsRes.data?.results) ? clientsRes.data.results : []);
      setWorkers(Array.isArray(workersRes.data?.results) ? workersRes.data.results : []);
    } catch (e) {
      const msg = handleApiError(e, "No se pudieron cargar clientes o trabajadores.");
      showSnackbar(msg, "error");
    }
  }, [api, showSnackbar]);

  const fetchCollection = useCallback(async () => {
    if (!id) return;
    try {
      setLoading(true);
      const res = await api().get(`collections/${encodeURIComponent(id)}/`);
      const item = res.data || {};
      const statusCode = normalizeCollectionStatus(item.status || "PENDING_MEASUREMENT");
      setFormData({
        client: item.client ? String(item.client) : "",
        worker: item.worker ? String(item.worker) : "",
        route_day_client: item.route_day_client ? String(item.route_day_client) : "",
        collection_date: item.collection_date || "",
        container_type: item.container_type || "BIDONES",
        container_number: String(item.container_number ?? "1"),
        measured_liters: item.measured_liters ?? "",
        deduction_liters: item.deduction_liters ?? "0",
        deduction_reason: item.deduction_reason || "RESIDUE",
        deduction_notes: item.deduction_notes || "",
        price_per_liter: item.price_per_liter ?? "0.000",
        status: statusCode,
        notes: item.notes || "",
      });
    } catch (e) {
      const msg = handleApiError(e, "No se pudo cargar la recogida.");
      showSnackbar(msg, "error");
      navigate("/collections");
    } finally {
      setLoading(false);
    }
  }, [api, id, navigate, showSnackbar]);

  useEffect(() => {
    fetchBase();
  }, [fetchBase]);

  useEffect(() => {
    fetchCollection();
  }, [fetchCollection]);

  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const litersPreview = useMemo(() => {
    const measured = toOptionalNumber(formData.measured_liters);
    const deduction = toOptionalNumber(formData.deduction_liters) || 0;
    if (measured === null) return null;
    return Math.max(0, measured - deduction);
  }, [formData.measured_liters, formData.deduction_liters]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.client || !formData.collection_date) {
      showSnackbar("Cliente y fecha son obligatorios.", "error");
      return;
    }

    try {
      setSubmitting(true);
      const payload = {
        client: Number(formData.client),
        worker: formData.worker ? Number(formData.worker) : null,
        route_day_client: formData.route_day_client ? Number(formData.route_day_client) : null,
        collection_date: formData.collection_date,
        container_type: formData.container_type,
        container_number: Number(formData.container_number || 1),
        measured_liters: toOptionalNumber(formData.measured_liters),
        deduction_liters: Number(formData.deduction_liters || 0),
        deduction_reason: formData.deduction_reason,
        deduction_notes: formData.deduction_notes || "",
        price_per_liter: Number(formData.price_per_liter || 0),
        status: formData.status,
        notes: formData.notes || "",
      };
      await api().put(`collections/${encodeURIComponent(id)}/`, payload);
      showSnackbar("Recogida actualizada correctamente.", "success");
      navigate(`/collections/${id}`);
    } catch (e) {
      const msg = handleApiError(e, "No se pudo actualizar la recogida.");
      showSnackbar(msg, "error");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start gap-3 sm:items-center sm:gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate(`/collections/${id}`)} className="flex-shrink-0 mt-1 sm:mt-0">
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div className="min-w-0 flex-1">
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-foreground flex flex-wrap items-center gap-2 lg:gap-3 leading-tight">
            <Package className="w-6 h-6 sm:w-7 sm:h-7 lg:w-8 lg:h-8 text-primary flex-shrink-0" />
            <span>Editar Recogida</span>
          </h1>
          <p className="text-sm sm:text-base text-muted-foreground mt-1 text-left">Actualiza los datos de la recogida.</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Formulario</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Cliente *</Label>
                <Select value={formData.client} onValueChange={(v) => handleChange("client", v)} disabled={loading || submitting}>
                  <SelectTrigger><SelectValue placeholder="Seleccionar cliente" /></SelectTrigger>
                  <SelectContent>
                    {clients.map((client) => (
                      <SelectItem key={client.id} value={String(client.id)}>{client.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Trabajador</Label>
                <Select value={formData.worker || ""} onValueChange={(v) => handleChange("worker", v === "__none__" ? "" : v)} disabled={loading || submitting}>
                  <SelectTrigger><SelectValue placeholder="Seleccionar trabajador" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">Sin trabajador</SelectItem>
                    {workers.map((worker) => (
                      <SelectItem key={worker.id} value={String(worker.id)}>
                        {`${worker.name || ""} ${worker.surname || ""}`.trim() || worker.username}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Fecha *</Label>
                <Input type="date" value={formData.collection_date} onChange={(e) => handleChange("collection_date", e.target.value)} disabled={loading || submitting} />
              </div>
              <div className="space-y-2">
                <Label>Tipo envase</Label>
                <Select value={formData.container_type} onValueChange={(v) => handleChange("container_type", v)} disabled={loading || submitting}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CONTAINER_OPTIONS.map((item) => (
                      <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Numero envases</Label>
                <Input type="number" min="1" value={formData.container_number} onChange={(e) => handleChange("container_number", e.target.value)} disabled={loading || submitting} />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Litros medidos</Label>
                <Input type="number" min="0" step="0.01" value={formData.measured_liters} onChange={(e) => handleChange("measured_liters", e.target.value)} disabled={loading || submitting} />
              </div>
              <div className="space-y-2">
                <Label>Litros deducidos</Label>
                <Input type="number" min="0" step="0.01" value={formData.deduction_liters} onChange={(e) => handleChange("deduction_liters", e.target.value)} disabled={loading || submitting} />
              </div>
              <div className="space-y-2">
                <Label>Litros netos prev.</Label>
                <Input value={litersPreview === null ? "-" : litersPreview.toFixed(2)} disabled />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Motivo deduccion</Label>
                <Select value={formData.deduction_reason} onValueChange={(v) => handleChange("deduction_reason", v)} disabled={loading || submitting}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {DEDUCTION_OPTIONS.map((item) => (
                      <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Precio por litro</Label>
                <Input type="number" min="0" step="0.001" value={formData.price_per_liter} onChange={(e) => handleChange("price_per_liter", e.target.value)} disabled={loading || submitting} />
              </div>
              <div className="space-y-2">
                <Label>Estado</Label>
                <Select value={formData.status} onValueChange={(v) => handleChange("status", v)} disabled={loading || submitting}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {STATUS_OPTIONS.map((item) => (
                      <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Notas deduccion</Label>
              <Input value={formData.deduction_notes} onChange={(e) => handleChange("deduction_notes", e.target.value)} disabled={loading || submitting} />
            </div>

            <div className="space-y-2">
              <Label>Notas</Label>
              <Input value={formData.notes} onChange={(e) => handleChange("notes", e.target.value)} disabled={loading || submitting} />
            </div>

            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 pt-2">
              <Button type="button" variant="outline" onClick={() => navigate(`/collections/${id}`)} className="flex-1 order-2 sm:order-1 h-10 sm:h-9">
                Cancelar
              </Button>
              <Button type="submit" disabled={loading || submitting} className="flex-1 order-1 sm:order-2 gap-2 h-10 sm:h-9">
                <Save className="w-4 h-4 flex-shrink-0" />
                {submitting ? "Guardando..." : "Actualizar Recogida"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
