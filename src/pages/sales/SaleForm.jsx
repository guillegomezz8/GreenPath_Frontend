import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Calculator, FileText, Receipt, Save, UserRound } from "lucide-react";
import { useAuth } from "@/context/AuthProvider";
import { useSnackbar } from "@/context/SnackbarProvider";
import { handleApiError } from "@/components/Utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const INITIAL_FORM = {
  buyer: "",
  invoice_number: "",
  invoice_date: "",
  product_description: "",
  quantity: "",
  unit: "L",
  unit_price: "",
  tax_rate: "21.00",
  currency: "EUR",
  notes: "",
};

const CURRENCY_OPTIONS = ["EUR", "USD"];
const UNIT_OPTIONS = ["L", "kg", "ud", "m3"];

function normalizeSalePayload(payload = {}) {
  return {
    buyer: payload.buyer ? String(payload.buyer) : "",
    invoice_number: payload.invoice_number || "",
    invoice_date: payload.invoice_date || payload.sale_date || "",
    product_description: payload.product_description || "",
    quantity: payload.quantity !== undefined && payload.quantity !== null ? String(payload.quantity) : "",
    unit: payload.unit || "L",
    unit_price: payload.unit_price !== undefined && payload.unit_price !== null ? String(payload.unit_price) : "",
    tax_rate: payload.tax_rate !== undefined && payload.tax_rate !== null ? String(payload.tax_rate) : "21.00",
    currency: payload.currency || "EUR",
    notes: payload.notes || "",
  };
}

function toNumber(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

export default function SaleForm({ mode = "create", saleId = null }) {
  const navigate = useNavigate();
  const { api } = useAuth();
  const showSnackbar = useSnackbar();

  const isEdit = mode === "edit";
  const [buyers, setBuyers] = useState([]);
  const [formData, setFormData] = useState(INITIAL_FORM);
  const [loading, setLoading] = useState(isEdit);
  const [submitting, setSubmitting] = useState(false);

  const pageTitle = useMemo(() => (isEdit ? "Editar venta" : "Nueva venta"), [isEdit]);
  const submitLabel = useMemo(() => (isEdit ? "Guardar cambios" : "Registrar venta"), [isEdit]);

  const totals = useMemo(() => {
    const quantity = toNumber(formData.quantity);
    const unitPrice = toNumber(formData.unit_price);
    const taxRate = toNumber(formData.tax_rate);
    const subtotal = quantity * unitPrice;
    const taxAmount = subtotal * (taxRate / 100);
    const total = subtotal + taxAmount;
    return { subtotal, taxAmount, total };
  }, [formData.quantity, formData.tax_rate, formData.unit_price]);

  const fetchBuyers = useCallback(async () => {
    const res = await api().get("buyers/", { params: { page: 1, page_size: 300 } });
    return Array.isArray(res.data?.results) ? res.data.results : [];
  }, [api]);

  const fetchSale = useCallback(async () => {
    if (!isEdit || !saleId) return null;
    const res = await api().get(`sales/${encodeURIComponent(saleId)}/`);
    return res.data || null;
  }, [api, isEdit, saleId]);

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        const [buyersRows, saleRow] = await Promise.all([fetchBuyers(), fetchSale()]);
        setBuyers(buyersRows);
        if (saleRow) {
          setFormData(normalizeSalePayload(saleRow));
        }
      } catch (e) {
        const msg = handleApiError(e, isEdit ? "No se pudo cargar la venta." : "No se pudieron cargar los compradores.");
        showSnackbar(msg, "error");
        if (isEdit) navigate("/sales");
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [fetchBuyers, fetchSale, isEdit, navigate, showSnackbar]);

  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.buyer || !formData.invoice_number || !formData.invoice_date || !formData.product_description || !formData.quantity || !formData.unit_price) {
      showSnackbar("Completa los campos obligatorios de la venta.", "error");
      return;
    }

    if (toNumber(formData.quantity) <= 0 || toNumber(formData.unit_price) < 0 || toNumber(formData.tax_rate) < 0) {
      showSnackbar("Revisa cantidad, precio unitario e IVA.", "error");
      return;
    }

    try {
      setSubmitting(true);
      const payload = {
        buyer: Number(formData.buyer),
        invoice_number: formData.invoice_number.trim(),
        invoice_date: formData.invoice_date,
        product_description: formData.product_description.trim(),
        quantity: formData.quantity,
        unit: formData.unit,
        unit_price: formData.unit_price,
        tax_rate: formData.tax_rate,
        currency: formData.currency,
        notes: formData.notes.trim(),
      };

      const res = isEdit
        ? await api().put(`sales/${encodeURIComponent(saleId)}/`, payload)
        : await api().post("sales/", payload);

      const targetId = res.data?.id || saleId;
      showSnackbar(isEdit ? "Venta actualizada correctamente." : "Venta creada y facturada correctamente.", "success");
      navigate(targetId ? `/sales/${targetId}` : "/sales");
    } catch (e) {
      const msg = handleApiError(e, isEdit ? "No se pudo actualizar la venta." : "No se pudo crear la venta.");
      showSnackbar(msg, "error");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start gap-3 sm:items-center sm:gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate(isEdit && saleId ? `/sales/${saleId}` : "/sales")} className="mt-1 shrink-0 sm:mt-0">
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="min-w-0 flex-1 text-left">
          <h1 className="flex flex-wrap items-center gap-3 text-xl font-bold text-foreground sm:text-2xl lg:text-3xl">
            <Receipt className="h-7 w-7 text-primary" />
            {pageTitle}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground sm:text-base">Registra ventas, genera la factura y deja preparado el control economico.</p>
        </div>
      </div>

      {loading ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">Cargando formulario...</CardContent>
        </Card>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-6">
          <Card>
            <CardHeader className="text-left">
            <CardTitle className="flex items-center gap-2">
                <UserRound className="h-5 w-5 text-primary" />
                Factura y comprador
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                <div className="min-w-0 space-y-2">
                  <Label htmlFor="buyer">Comprador *</Label>
                  <Select value={formData.buyer} onValueChange={(value) => handleChange("buyer", value)} disabled={submitting}>
                    <SelectTrigger id="buyer">
                      <SelectValue placeholder="Selecciona comprador" />
                    </SelectTrigger>
                    <SelectContent>
                      {buyers.map((buyer) => (
                        <SelectItem key={buyer.id} value={String(buyer.id)}>
                          {buyer.fiscal_name} - {buyer.tax_id}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="min-w-0 space-y-2">
                  <Label htmlFor="invoice_number">Numero de factura *</Label>
                  <Input
                    id="invoice_number"
                    value={formData.invoice_number}
                    onChange={(e) => handleChange("invoice_number", e.target.value)}
                    placeholder="Ej: 004/2026"
                    disabled={submitting}
                  />
                </div>
                <div className="min-w-0 space-y-2">
                  <Label htmlFor="invoice_date">Fecha de factura *</Label>
                  <Input id="invoice_date" type="date" className="min-w-0 max-w-full" value={formData.invoice_date} onChange={(e) => handleChange("invoice_date", e.target.value)} disabled={submitting} />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="text-left">
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-primary" />
                Concepto de venta
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2 text-left">
                <Label htmlFor="product_description">Producto o descripcion *</Label>
                <Textarea id="product_description" rows={4} value={formData.product_description} onChange={(e) => handleChange("product_description", e.target.value)} disabled={submitting} />
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <div className="space-y-2">
                  <Label htmlFor="quantity">Cantidad *</Label>
                  <Input id="quantity" type="number" min="0.01" step="0.01" value={formData.quantity} onChange={(e) => handleChange("quantity", e.target.value)} disabled={submitting} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="unit">Unidad</Label>
                  <Select value={formData.unit} onValueChange={(value) => handleChange("unit", value)} disabled={submitting}>
                    <SelectTrigger id="unit">
                      <SelectValue placeholder="Unidad" />
                    </SelectTrigger>
                    <SelectContent>
                      {UNIT_OPTIONS.map((unit) => (
                        <SelectItem key={unit} value={unit}>{unit}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="unit_price">Precio unitario *</Label>
                  <Input id="unit_price" type="number" min="0" step="0.0001" value={formData.unit_price} onChange={(e) => handleChange("unit_price", e.target.value)} disabled={submitting} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="tax_rate">IVA %</Label>
                  <Input id="tax_rate" type="number" min="0" step="0.01" value={formData.tax_rate} onChange={(e) => handleChange("tax_rate", e.target.value)} disabled={submitting} />
                </div>
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <div className="space-y-2">
                  <Label htmlFor="currency">Moneda</Label>
                  <Select value={formData.currency} onValueChange={(value) => handleChange("currency", value)} disabled={submitting}>
                    <SelectTrigger id="currency">
                      <SelectValue placeholder="Moneda" />
                    </SelectTrigger>
                    <SelectContent>
                      {CURRENCY_OPTIONS.map((currency) => (
                        <SelectItem key={currency} value={currency}>{currency}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="text-left">
              <CardTitle className="flex items-center gap-2">
                <Calculator className="h-5 w-5 text-primary" />
                Totales y observaciones
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
                <div className="rounded-xl border border-border/80 bg-accent/30 p-4 text-left">
                  <p className="text-sm text-muted-foreground">Base imponible</p>
                  <p className="mt-2 text-xl font-semibold text-foreground">{totals.subtotal.toFixed(2)} {formData.currency}</p>
                </div>
                <div className="rounded-xl border border-border/80 bg-accent/30 p-4 text-left">
                  <p className="text-sm text-muted-foreground">IVA</p>
                  <p className="mt-2 text-xl font-semibold text-foreground">{totals.taxAmount.toFixed(2)} {formData.currency}</p>
                </div>
                <div className="rounded-xl border border-primary/20 bg-primary/10 p-4 text-left">
                  <p className="text-sm text-muted-foreground">Total</p>
                  <p className="mt-2 text-xl font-semibold text-primary">{totals.total.toFixed(2)} {formData.currency}</p>
                </div>
              </div>

              <div className="space-y-2 text-left">
                <Label htmlFor="notes">Notas</Label>
                <Textarea id="notes" rows={5} value={formData.notes} onChange={(e) => handleChange("notes", e.target.value)} disabled={submitting} />
              </div>

              <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
                <Button type="button" variant="outline" className="w-full sm:w-auto" disabled={submitting} onClick={() => navigate(isEdit && saleId ? `/sales/${saleId}` : "/sales")}>
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
