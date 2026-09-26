import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Calculator, CalendarDays, FileUp, PackagePlus, Save, UserRound } from "lucide-react";

import { useAuth } from "@/context/AuthProvider";
import { useSnackbar } from "@/context/SnackbarProvider";
import { handleApiError } from "@/components/Utils";
import SearchableEntitySelect, { mergeById } from "@/components/common/SearchableEntitySelect";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { QUANTITY_UNITS, calculateBulkCollectionValues, formatBulkCollectionQuantity, formatCurrency, toNumber } from "./bulkCollectionUtils";

const NUMERIC_FIELDS = ["quantity", "unit_price", "total_price"];
const MODE_BY_DERIVED_FIELD = { quantity: "QUANTITY", unit_price: "UNIT_PRICE", total_price: "TOTAL" };
const INPUTS_BY_MODE = {
  TOTAL: ["quantity", "unit_price"],
  UNIT_PRICE: ["quantity", "total_price"],
  QUANTITY: ["unit_price", "total_price"],
};
const EMPTY_FORM = {
  client: "", collection_date: "", unit: "KG", calculation_mode: "TOTAL",
  quantity: "", unit_price: "", total_price: "", billable: true, notes: "",
};

export default function BulkCollectionForm({ mode = "create" }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const { api } = useAuth();
  const showSnackbar = useSnackbar();
  const isEdit = mode === "edit";
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [manualFields, setManualFields] = useState([]);
  const [invoiceFile, setInvoiceFile] = useState(null);
  const [existingInvoiceUrl, setExistingInvoiceUrl] = useState("");
  const [clients, setClients] = useState([]);
  const [clientSearch, setClientSearch] = useState("");
  const [loadingClients, setLoadingClients] = useState(false);
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const derivedField = manualFields.length === 2 ? NUMERIC_FIELDS.find((field) => !manualFields.includes(field)) : null;
  const quantitySuffix = useMemo(() => QUANTITY_UNITS.find((item) => item.value === formData.unit)?.suffix, [formData.unit]);

  const fetchClients = useCallback(async (search = "") => {
    try {
      setLoadingClients(true);
      const params = { page: 1, page_size: 50 };
      if (search.trim()) params.search = search.trim();
      const response = await api().get("clients", { params });
      setClients((current) => mergeById(current, response.data?.results || []));
    } catch (error) {
      showSnackbar(handleApiError(error, "No se pudieron cargar los clientes."), "error");
    } finally {
      setLoadingClients(false);
    }
  }, [api, showSnackbar]);

  useEffect(() => {
    const timeout = window.setTimeout(() => fetchClients(clientSearch), 250);
    return () => window.clearTimeout(timeout);
  }, [clientSearch, fetchClients]);

  useEffect(() => {
    if (!isEdit || !id) return;
    const fetchBulkCollection = async () => {
      try {
        setLoading(true);
        const { data: bulkCollection } = await api().get(`bulk-collections/${encodeURIComponent(id)}/`);
        setFormData({
          client: String(bulkCollection.client || ""), collection_date: bulkCollection.collection_date || "",
          unit: bulkCollection.unit || "KG", calculation_mode: bulkCollection.calculation_mode || "TOTAL",
          quantity: String(bulkCollection.quantity || ""), unit_price: String(bulkCollection.unit_price || ""),
          total_price: String(bulkCollection.total_price || ""), billable: !!bulkCollection.billable, notes: bulkCollection.notes || "",
        });
        setManualFields(INPUTS_BY_MODE[bulkCollection.calculation_mode] || INPUTS_BY_MODE.TOTAL);
        setExistingInvoiceUrl(bulkCollection.invoice_file || "");
        if (bulkCollection.client) {
          setClients((current) => mergeById(current, [{ id: bulkCollection.client, name: bulkCollection.client_name, cif: bulkCollection.client_tax_id }]));
        }
      } catch (error) {
        showSnackbar(handleApiError(error, "No se pudo cargar la recogida."), "error");
        navigate("/bulk-collections");
      } finally {
        setLoading(false);
      }
    };
    fetchBulkCollection();
  }, [api, id, isEdit, navigate, showSnackbar]);

  const updateField = (field, value) => setFormData((current) => ({ ...current, [field]: value }));

  const handleNumericChange = (field, value) => {
    const nextManualFields = [...manualFields.filter((item) => item !== field), field].slice(-2);
    setManualFields(nextManualFields);
    setFormData((current) => {
      const next = { ...current, [field]: value };
      if (nextManualFields.length < 2) return next;
      const nextDerivedField = NUMERIC_FIELDS.find((item) => !nextManualFields.includes(item));
      return calculateBulkCollectionValues({ ...next, calculation_mode: MODE_BY_DERIVED_FIELD[nextDerivedField] });
    });
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!formData.client || !formData.collection_date || NUMERIC_FIELDS.some((field) => toNumber(formData[field]) <= 0)) {
      showSnackbar("Selecciona cliente y fecha e introduce dos valores mayores que cero.", "error");
      return;
    }

    const payload = new FormData();
    Object.entries(formData).forEach(([field, value]) => payload.append(field, field === "billable" ? String(!!value) : value));
    if (invoiceFile) payload.append("invoice_file", invoiceFile);

    try {
      setSaving(true);
      const response = isEdit
        ? await api().put(`bulk-collections/${encodeURIComponent(id)}/`, payload)
        : await api().post("bulk-collections/", payload);
      showSnackbar(isEdit ? "Recogida actualizada correctamente." : "Recogida creada correctamente.", "success");
      navigate(`/bulk-collections/${response.data?.id || id}`);
    } catch (error) {
      showSnackbar(handleApiError(error, "No se pudo guardar la recogida."), "error");
    } finally {
      setSaving(false);
    }
  };

  const renderNumberField = (field, label, step, suffix) => (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <Label htmlFor={field}>{label} *</Label>
        {derivedField === field && <span className="text-xs font-medium text-primary">Calculado</span>}
      </div>
      <div className="relative">
        <Input id={field} type="number" min="0.0001" step={step} value={formData[field]}
          onChange={(event) => handleNumericChange(field, event.target.value)} disabled={loading || saving}
          className={`${suffix ? "pr-14" : ""} ${derivedField === field ? "border-primary/40 bg-primary/5" : ""}`} required />
        {suffix && <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">{suffix}</span>}
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-start gap-3 sm:items-center">
        <Button variant="ghost" size="icon" onClick={() => navigate(isEdit ? `/bulk-collections/${id}` : "/bulk-collections")}><ArrowLeft className="h-4 w-4" /></Button>
        <div className="min-w-0 text-left">
          <h1 className="flex items-center gap-2 text-xl font-bold sm:text-2xl lg:text-3xl"><PackagePlus className="h-7 w-7 shrink-0 text-primary" />{isEdit ? "Editar recogida" : "Nueva recogida al por mayor"}</h1>
          <p className="mt-1 text-sm text-muted-foreground">Completa dos valores y el tercero se calculara al instante.</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2 text-left"><UserRound className="h-5 w-5 text-primary" />Datos de la recogida</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Cliente *</Label>
              <SearchableEntitySelect value={formData.client} items={clients} placeholder="Seleccionar cliente" searchPlaceholder="Buscar cliente" emptyMessage="No hay clientes" loading={loadingClients} disabled={loading || saving} searchValue={clientSearch} onSearchChange={setClientSearch} onValueChange={(value) => updateField("client", value)} getLabel={(client) => client.name || `Cliente #${client.id}`} getDescription={(client) => client.cif || client.address || ""} getSearchText={(client) => [client.name, client.cif, client.address].filter(Boolean).join(" ")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="collection_date">Fecha *</Label>
              <div className="relative"><CalendarDays className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input id="collection_date" type="date" className="pl-10" value={formData.collection_date} onChange={(event) => updateField("collection_date", event.target.value)} required /></div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2 text-left"><Calculator className="h-5 w-5 text-primary" />Cantidad e importe</CardTitle></CardHeader>
          <CardContent className="space-y-5">
            <div className="max-w-sm space-y-2"><Label>Unidad *</Label><Select value={formData.unit} onValueChange={(value) => updateField("unit", value)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{QUANTITY_UNITS.map((item) => <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>)}</SelectContent></Select></div>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              {renderNumberField("quantity", "Cantidad", formData.unit === "UD" ? "1" : "0.01", quantitySuffix)}
              {renderNumberField("unit_price", "Precio unitario", "0.0001", "EUR")}
              {renderNumberField("total_price", "Importe final", "0.01", "EUR")}
            </div>
            <div className="flex flex-col gap-2 rounded-lg border border-primary/20 bg-primary/5 p-4 sm:flex-row sm:items-center sm:justify-between">
              <span className="font-semibold">{formatBulkCollectionQuantity(formData.quantity, formData.unit)}</span>
              <span className="text-xl font-bold text-primary">{formatCurrency(formData.total_price)}</span>
            </div>
            <div className="flex items-start gap-3 rounded-lg border border-border p-4"><Checkbox id="billable" checked={!!formData.billable} onCheckedChange={(checked) => updateField("billable", checked === true)} /><div className="text-left"><Label htmlFor="billable" className="cursor-pointer">Facturable</Label><p className="text-xs text-muted-foreground">Incluye esta recogida en costes, beneficio y estadisticas.</p></div></div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2 text-left"><FileUp className="h-5 w-5 text-primary" />Factura y observaciones</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2 text-left"><Label htmlFor="invoice_file">Factura adjunta</Label><Input id="invoice_file" type="file" accept=".pdf,.png,.jpg,.jpeg,application/pdf,image/png,image/jpeg" onChange={(event) => setInvoiceFile(event.target.files?.[0] || null)} disabled={loading || saving} /><p className="text-xs text-muted-foreground">PDF, JPG o PNG. Maximo 10 MB.{existingInvoiceUrl && !invoiceFile ? " Se conservara la factura actual." : ""}</p></div>
            <Textarea value={formData.notes} onChange={(event) => updateField("notes", event.target.value)} rows={4} placeholder="Informacion adicional de la recogida..." />
            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end"><Button type="button" variant="outline" onClick={() => navigate("/bulk-collections")} className="w-full sm:w-auto">Cancelar</Button><Button type="submit" disabled={loading || saving} className="w-full gap-2 sm:w-auto"><Save className="h-4 w-4" />{saving ? "Guardando..." : "Guardar recogida"}</Button></div>
          </CardContent>
        </Card>
      </form>
    </div>
  );
}
