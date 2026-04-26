import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import SearchableEntitySelect, { getWorkerLabel, mergeById } from "@/components/common/SearchableEntitySelect";
import { ArrowLeft, Save, Package, FlaskConical, CheckCircle2, AlertTriangle } from "lucide-react";
import { useAuth } from "@/context/AuthProvider";
import { useSnackbar } from "@/context/SnackbarProvider";
import { handleApiError, normalizeCollectionStatus } from "@/components/Utils";

const STATUS_OPTIONS = [
  { value: "PENDING_MEASUREMENT", label: "Pendiente de medicion" },
  { value: "CONFIRMED", label: "Confirmada" },
  { value: "CANCELED", label: "Cancelada" },
];

const EMPTY_DEDUCTION_REASON = "__none__";

const DEDUCTION_OPTIONS = [
  { value: EMPTY_DEDUCTION_REASON, label: "Sin motivo" },
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

function formatDecimal(value, decimals = 2) {
  const n = Number(value);
  return Number.isFinite(n) ? n.toFixed(decimals) : "-";
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
  const [clientSearch, setClientSearch] = useState("");
  const [workerSearch, setWorkerSearch] = useState("");
  const [loadingClients, setLoadingClients] = useState(false);
  const [loadingWorkers, setLoadingWorkers] = useState(false);
  const [formData, setFormData] = useState({
    client: "",
    worker: "",
    route_day_client: "",
    collection_date: "",
    container_type: "BIDONES",
    container_number: "1",
    measured_liters: "",
    deduction_liters: "0",
    deduction_reason: "",
    deduction_notes: "",
    price_per_liter: "0.000",
    total_price: "0.00",
    billable: true,
    status: "PENDING_MEASUREMENT",
    notes: "",
  });

  const measuredValue = toOptionalNumber(formData.measured_liters);
  const isCanceled = formData.status === "CANCELED";
  const isPendingMeasurement = formData.status === "PENDING_MEASUREMENT";

  const handleGoBack = useCallback(() => {
    if (window.history.length > 1) {
      navigate(-1);
      return;
    }
    navigate("/collections");
  }, [navigate]);

  const fetchClients = useCallback(async (search = "") => {
    try {
      setLoadingClients(true);
      const params = { page: 1, page_size: 50 };
      if (search.trim()) params.search = search.trim();
      const res = await api().get("clients", { params });
      const results = Array.isArray(res.data?.results) ? res.data.results : [];
      setClients((prev) => mergeById(prev, results));
    } catch (e) {
      const msg = handleApiError(e, "No se pudieron cargar clientes.");
      showSnackbar(msg, "error");
    } finally {
      setLoadingClients(false);
    }
  }, [api, showSnackbar]);

  const fetchWorkers = useCallback(async (search = "") => {
    try {
      setLoadingWorkers(true);
      const params = { page: 1, page_size: 50 };
      if (search.trim()) params.search = search.trim();
      const res = await api().get("workers", { params });
      const results = Array.isArray(res.data?.results) ? res.data.results : [];
      setWorkers((prev) => mergeById(prev, results));
    } catch (e) {
      const msg = handleApiError(e, "No se pudieron cargar trabajadores.");
      showSnackbar(msg, "error");
    } finally {
      setLoadingWorkers(false);
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
        deduction_reason: item.deduction_reason || "",
        deduction_notes: item.deduction_notes || "",
        price_per_liter: item.price_per_liter ?? "0.000",
        total_price: item.total_price ?? "0.00",
        billable: item.billable !== false,
        status: item.status_code || statusCode,
        notes: item.notes || "",
      });

      if (item.client) {
        setClients((prev) => (
          prev.some((client) => String(client.id) === String(item.client))
            ? prev
            : mergeById(prev, [{ id: item.client, name: item.client_name || `Cliente #${item.client}` }])
        ));
      }

      if (item.worker) {
        setWorkers((prev) => (
          prev.some((worker) => String(worker.id) === String(item.worker))
            ? prev
            : mergeById(prev, [{ id: item.worker, display_name: item.worker_name || `Trabajador #${item.worker}` }])
        ));
      }
    } catch (e) {
      const msg = handleApiError(e, "No se pudo cargar la recogida.");
      showSnackbar(msg, "error");
      navigate("/collections");
    } finally {
      setLoading(false);
    }
  }, [api, id, navigate, showSnackbar]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      fetchClients(clientSearch);
    }, 250);
    return () => window.clearTimeout(timeoutId);
  }, [clientSearch, fetchClients]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      fetchWorkers(workerSearch);
    }, 250);
    return () => window.clearTimeout(timeoutId);
  }, [fetchWorkers, workerSearch]);

  useEffect(() => {
    fetchCollection();
  }, [fetchCollection]);

  const handleChange = (field, value) => {
    setFormData((prev) => {
      const next = { ...prev, [field]: value };

      if (field === "client" && String(value) !== String(prev.client)) {
        next.route_day_client = "";
      }

      if (field === "status" && value === "CANCELED") {
        next.measured_liters = "";
        next.deduction_liters = "0";
        next.deduction_reason = "";
      }

      if (field === "measured_liters" && toOptionalNumber(value) === null) {
        next.deduction_liters = "0";
        next.deduction_reason = "";
      }

      if (field === "deduction_liters" && (toOptionalNumber(value) || 0) <= 0) {
        next.deduction_reason = "";
      }

      return next;
    });
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
      const normalizedStatus = formData.status || "PENDING_MEASUREMENT";
      if (normalizedStatus === "CONFIRMED" && measuredValue === null) {
        showSnackbar("Para confirmar la recogida debes indicar los litros medidos.", "error");
        return;
      }
      const deductionValue = normalizedStatus === "CANCELED" ? 0 : Number(formData.deduction_liters || 0);
      if (deductionValue > 0 && !formData.deduction_reason) {
        showSnackbar("Indica el motivo de deduccion cuando hay litros descontados.", "error");
        return;
      }
      const payload = {
        client: Number(formData.client),
        worker: formData.worker ? Number(formData.worker) : null,
        route_day_client: formData.route_day_client ? Number(formData.route_day_client) : null,
        collection_date: formData.collection_date,
        container_type: formData.container_type,
        container_number: Number(formData.container_number || 1),
        measured_liters: normalizedStatus === "CANCELED" ? null : measuredValue,
        deduction_liters: deductionValue,
        deduction_reason: deductionValue > 0 ? formData.deduction_reason : "",
        deduction_notes: formData.deduction_notes || "",
        price_per_liter: Number(formData.price_per_liter || 0),
        billable: !!formData.billable,
        status: normalizedStatus,
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
        <Button variant="ghost" size="icon" onClick={handleGoBack} className="mt-1 flex-shrink-0 sm:mt-0">
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="min-w-0 flex-1">
          <h1 className="flex flex-wrap items-center gap-2 text-xl font-bold leading-tight text-foreground sm:text-2xl lg:gap-3 lg:text-3xl">
            <Package className="h-6 w-6 flex-shrink-0 text-primary sm:h-7 sm:w-7 lg:h-8 lg:w-8" />
            <span>Editar Recogida</span>
          </h1>
          <p className="mt-1 text-left text-sm text-muted-foreground sm:text-base">Actualiza los datos de la recogida.</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Formulario</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className={`rounded-xl border px-4 py-4 text-left ${
              isCanceled
                ? "border-destructive/20 bg-destructive/5"
                : isPendingMeasurement
                  ? "border-primary/20 bg-primary/5"
                  : "border-emerald-600/20 bg-emerald-500/5"
            }`}>
              <div className="flex items-start gap-3">
                <div className={`mt-0.5 rounded-full p-2 ${
                  isCanceled
                    ? "bg-destructive/10 text-destructive"
                    : isPendingMeasurement
                      ? "bg-primary/10 text-primary"
                      : "bg-emerald-600/10 text-emerald-700"
                }`}>
                  {isCanceled ? <AlertTriangle className="h-4 w-4" /> : isPendingMeasurement ? <FlaskConical className="h-4 w-4" /> : <CheckCircle2 className="h-4 w-4" />}
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-semibold text-foreground">
                    {isCanceled ? "Recogida cancelada" : isPendingMeasurement ? "Pendiente de medicion en nave" : "Recogida confirmada"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {isCanceled
                      ? "Esta recogida queda cerrada sin medicion. Si fue un error, cambia el estado antes de guardar."
                      : isPendingMeasurement
                        ? "Puedes ajustar datos de medicion y mantener la recogida pendiente hasta confirmarla manualmente."
                        : "Puedes ajustar datos operativos sin recalcular el importe abonado."}
                  </p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Cliente *</Label>
                <SearchableEntitySelect
                  value={formData.client}
                  items={clients}
                  placeholder="Seleccionar cliente"
                  searchPlaceholder="Buscar cliente"
                  emptyMessage="No hay clientes"
                  loading={loadingClients}
                  disabled={loading || submitting}
                  searchValue={clientSearch}
                  onSearchChange={setClientSearch}
                  onValueChange={(v) => handleChange("client", v)}
                  getLabel={(client) => client.name || client.user?.username || `Cliente #${client.id}`}
                  getDescription={(client) => client.cif || client.address || client.phone || ""}
                  getSearchText={(client) => [
                    client.name,
                    client.cif,
                    client.phone,
                    client.address,
                    client.user?.username,
                    client.user?.email,
                  ].filter(Boolean).join(" ")}
                />
              </div>
              <div className="space-y-2">
                <Label>Trabajador</Label>
                <SearchableEntitySelect
                  value={formData.worker || ""}
                  items={workers}
                  placeholder="Seleccionar trabajador"
                  searchPlaceholder="Buscar trabajador"
                  emptyMessage="No hay trabajadores"
                  loading={loadingWorkers}
                  disabled={loading || submitting}
                  searchValue={workerSearch}
                  onSearchChange={setWorkerSearch}
                  onValueChange={(v) => handleChange("worker", v)}
                  getLabel={getWorkerLabel}
                  getDescription={(worker) => worker.dni || worker.phone || worker.user?.email || ""}
                  getSearchText={(worker) => [
                    getWorkerLabel(worker),
                    worker.dni,
                    worker.phone,
                    worker.user?.username,
                    worker.user?.email,
                  ].filter(Boolean).join(" ")}
                  allowEmpty
                  emptyLabel="Sin trabajador"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
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

            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <Label>Litros medidos</Label>
                <Input type="number" min="0" step="0.01" value={formData.measured_liters} onChange={(e) => handleChange("measured_liters", e.target.value)} disabled={loading || submitting || isCanceled} />
              </div>
              <div className="space-y-2">
                <Label>Litros deducidos</Label>
                <Input type="number" min="0" step="0.01" value={formData.deduction_liters} onChange={(e) => handleChange("deduction_liters", e.target.value)} disabled={loading || submitting || isCanceled || measuredValue === null} />
              </div>
              <div className="space-y-2">
                <Label>Litros netos prev.</Label>
                <Input value={litersPreview === null ? "-" : litersPreview.toFixed(2)} disabled />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
              <div className="space-y-2">
                <Label>Motivo deduccion</Label>
                <Select
                  value={formData.deduction_reason || EMPTY_DEDUCTION_REASON}
                  onValueChange={(v) => handleChange("deduction_reason", v === EMPTY_DEDUCTION_REASON ? "" : v)}
                  disabled={loading || submitting || isCanceled || measuredValue === null}
                >
                  <SelectTrigger><SelectValue placeholder="Sin motivo" /></SelectTrigger>
                  <SelectContent>
                    {DEDUCTION_OPTIONS.map((item) => (
                      <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Precio por litro</Label>
                <Input type="number" min="0" step="0.001" value={formData.price_per_liter} disabled />
              </div>
              <div className="space-y-2">
                <Label>Importe abonado</Label>
                <Input value={`${formatDecimal(formData.total_price, 2)} EUR`} disabled />
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

            <div className="rounded-xl border border-border/70 bg-background/70 p-4">
              <div className="flex items-center gap-3">
                <Checkbox
                  id="billable"
                  checked={!!formData.billable}
                  onCheckedChange={(checked) => handleChange("billable", checked === true)}
                  disabled={loading || submitting}
                />
                <div className="min-w-0 text-left">
                  <Label htmlFor="billable" className="cursor-pointer">Facturable</Label>
                  <p className="text-xs text-muted-foreground">Incluye esta recogida en el resumen economico.</p>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Notas deduccion</Label>
              <Textarea value={formData.deduction_notes} onChange={(e) => handleChange("deduction_notes", e.target.value)} disabled={loading || submitting || isCanceled || measuredValue === null} rows={3} />
            </div>

            <div className="space-y-2">
              <Label>Notas</Label>
              <Textarea value={formData.notes} onChange={(e) => handleChange("notes", e.target.value)} disabled={loading || submitting} rows={4} />
            </div>

            <div className="flex flex-col gap-3 pt-2 sm:flex-row sm:gap-4">
              <Button type="button" variant="outline" onClick={handleGoBack} className="order-2 h-10 flex-1 sm:order-1 sm:h-9">
                Cancelar
              </Button>
              <Button type="submit" disabled={loading || submitting} className="order-1 h-10 flex-1 gap-2 sm:order-2 sm:h-9">
                <Save className="h-4 w-4 flex-shrink-0" />
                {submitting ? "Guardando..." : "Actualizar Recogida"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
