import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Calculator,
  FileText,
  Plus,
  Receipt,
  Save,
  Trash2,
  UserRound,
} from "lucide-react";
import { useAuth } from "@/context/AuthProvider";
import { useSnackbar } from "@/context/SnackbarProvider";
import { handleApiError } from "@/components/Utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";

const createEmptyLine = () => ({
  product_description: "",
  quantity: "",
  unit: "kg",
  unit_price: "",
  tax_rate: "21.00",
});

const INITIAL_FORM = {
  buyer: "",
  invoice_number: "",
  invoice_date: "",
  currency: "EUR",
  notes: "",
  lines: [createEmptyLine()],
};

const CURRENCY_OPTIONS = ["EUR", "USD"];
const UNIT_OPTIONS = ["kg", "L", "ud", "m3"];

function normalizeLine(line = {}) {
  return {
    product_description: line.product_description || "",
    quantity: line.quantity !== undefined && line.quantity !== null ? String(line.quantity) : "",
    unit: line.unit || "kg",
    unit_price: line.unit_price !== undefined && line.unit_price !== null ? String(line.unit_price) : "",
    tax_rate: line.tax_rate !== undefined && line.tax_rate !== null ? String(line.tax_rate) : "21.00",
  };
}

function normalizeSalePayload(payload = {}) {
  const sourceLines = Array.isArray(payload.lines) && payload.lines.length > 0
    ? payload.lines
    : [{
      product_description: payload.product_description,
      quantity: payload.quantity,
      unit: payload.unit,
      unit_price: payload.unit_price,
      tax_rate: payload.tax_rate,
    }];

  return {
    buyer: payload.buyer ? String(payload.buyer) : "",
    invoice_number: payload.invoice_number || "",
    invoice_date: payload.invoice_date || payload.sale_date || "",
    currency: payload.currency || "EUR",
    notes: payload.notes || "",
    lines: sourceLines.map(normalizeLine),
  };
}

function toNumber(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function calculateLine(line) {
  const subtotal = toNumber(line.quantity) * toNumber(line.unit_price);
  const taxAmount = subtotal * (toNumber(line.tax_rate) / 100);
  return { subtotal, taxAmount, total: subtotal + taxAmount };
}

export default function SaleForm({ mode = "create", saleId = null }) {
  const navigate = useNavigate();
  const { api } = useAuth();
  const showSnackbar = useSnackbar();

  const isEdit = mode === "edit";
  const [buyers, setBuyers] = useState([]);
  const [formData, setFormData] = useState(INITIAL_FORM);
  const [latestInvoiceNumber, setLatestInvoiceNumber] = useState("");
  const [recentSales, setRecentSales] = useState([]);
  const [conceptDialogOpen, setConceptDialogOpen] = useState(false);
  const [conceptLineIndex, setConceptLineIndex] = useState(0);
  const [loading, setLoading] = useState(isEdit);
  const [submitting, setSubmitting] = useState(false);

  const pageTitle = isEdit ? "Editar venta" : "Nueva venta";
  const submitLabel = isEdit ? "Guardar cambios" : "Registrar venta";
  const invoiceNumberPlaceholder = latestInvoiceNumber
    ? `Ultima factura: ${latestInvoiceNumber}`
    : "Ej: 004/2026";

  const totals = useMemo(
    () => formData.lines.reduce(
      (result, line) => {
        const lineTotals = calculateLine(line);
        return {
          subtotal: result.subtotal + lineTotals.subtotal,
          taxAmount: result.taxAmount + lineTotals.taxAmount,
          total: result.total + lineTotals.total,
        };
      },
      { subtotal: 0, taxAmount: 0, total: 0 },
    ),
    [formData.lines],
  );

  const productDescriptionOptions = useMemo(() => {
    const seen = new Set();
    const options = [];

    recentSales.forEach((sale) => {
      if (saleId && String(sale.id) === String(saleId)) return;
      const lines = Array.isArray(sale.lines) && sale.lines.length > 0
        ? sale.lines
        : [sale];

      lines.forEach((line) => {
        const description = line.product_description?.trim();
        if (!description) return;
        const key = description.toLowerCase();
        if (seen.has(key)) return;
        seen.add(key);
        options.push({ key, description });
      });
    });

    return options;
  }, [recentSales, saleId]);

  const fetchBuyers = useCallback(async () => {
    const res = await api().get("buyers/", { params: { page: 1, page_size: 300 } });
    return Array.isArray(res.data?.results) ? res.data.results : [];
  }, [api]);

  const fetchSale = useCallback(async () => {
    if (!isEdit || !saleId) return null;
    const res = await api().get(`sales/${encodeURIComponent(saleId)}/`);
    return res.data || null;
  }, [api, isEdit, saleId]);

  const fetchRecentSales = useCallback(async () => {
    try {
      const res = await api().get("sales/", { params: { page: 1, page_size: 50 } });
      return Array.isArray(res.data?.results)
        ? res.data.results
        : Array.isArray(res.data)
          ? res.data
          : [];
    } catch {
      return [];
    }
  }, [api]);

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        const [buyersRows, saleRow, recentSalesRows] = await Promise.all([
          fetchBuyers(),
          fetchSale(),
          fetchRecentSales(),
        ]);
        setBuyers(buyersRows);
        setRecentSales(recentSalesRows);
        setLatestInvoiceNumber(isEdit ? "" : recentSalesRows[0]?.invoice_number || "");
        if (saleRow) setFormData(normalizeSalePayload(saleRow));
      } catch (error) {
        const message = handleApiError(
          error,
          isEdit ? "No se pudo cargar la venta." : "No se pudieron cargar los compradores.",
        );
        showSnackbar(message, "error");
        if (isEdit) navigate("/sales");
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [fetchBuyers, fetchRecentSales, fetchSale, isEdit, navigate, showSnackbar]);

  const handleChange = (field, value) => {
    setFormData((previous) => ({ ...previous, [field]: value }));
  };

  const handleLineChange = (index, field, value) => {
    setFormData((previous) => ({
      ...previous,
      lines: previous.lines.map((line, lineIndex) => (
        lineIndex === index ? { ...line, [field]: value } : line
      )),
    }));
  };

  const addLine = () => {
    setFormData((previous) => ({
      ...previous,
      lines: [...previous.lines, createEmptyLine()],
    }));
  };

  const removeLine = (index) => {
    setFormData((previous) => ({
      ...previous,
      lines: previous.lines.filter((_, lineIndex) => lineIndex !== index),
    }));
  };

  const openReuseDialog = (index) => {
    setConceptLineIndex(index);
    setConceptDialogOpen(true);
  };

  const handleReuseProductDescription = (key) => {
    const option = productDescriptionOptions.find((item) => item.key === key);
    if (!option) return;
    handleLineChange(conceptLineIndex, "product_description", option.description);
    setConceptDialogOpen(false);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!formData.buyer || !formData.invoice_number || !formData.invoice_date) {
      showSnackbar("Completa los datos obligatorios de la factura.", "error");
      return;
    }

    const invalidLine = formData.lines.find((line) => (
      !line.product_description.trim()
      || line.quantity === ""
      || line.unit_price === ""
      || toNumber(line.quantity) <= 0
      || toNumber(line.unit_price) < 0
      || toNumber(line.tax_rate) < 0
    ));
    if (invalidLine) {
      showSnackbar("Revisa la descripcion, cantidad, precio e IVA de todos los conceptos.", "error");
      return;
    }

    try {
      setSubmitting(true);
      const payload = {
        buyer: Number(formData.buyer),
        invoice_number: formData.invoice_number.trim(),
        invoice_date: formData.invoice_date,
        currency: formData.currency,
        notes: formData.notes.trim(),
        lines: formData.lines.map((line) => ({
          product_description: line.product_description.trim(),
          quantity: line.quantity,
          unit: line.unit,
          unit_price: line.unit_price,
          tax_rate: line.tax_rate,
        })),
      };

      const response = isEdit
        ? await api().put(`sales/${encodeURIComponent(saleId)}/`, payload)
        : await api().post("sales/", payload);

      const targetId = response.data?.id || saleId;
      showSnackbar(
        isEdit ? "Venta actualizada correctamente." : "Venta creada y facturada correctamente.",
        "success",
      );
      navigate(targetId ? `/sales/${targetId}` : "/sales");
    } catch (error) {
      const message = handleApiError(
        error,
        isEdit ? "No se pudo actualizar la venta." : "No se pudo crear la venta.",
      );
      showSnackbar(message, "error");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start gap-3 sm:items-center sm:gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate(isEdit && saleId ? `/sales/${saleId}` : "/sales")}
          className="mt-1 shrink-0 sm:mt-0"
          aria-label="Volver"
          title="Volver"
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="min-w-0 flex-1 text-left">
          <h1 className="flex flex-wrap items-center gap-3 text-xl font-bold text-foreground sm:text-2xl lg:text-3xl">
            <Receipt className="h-7 w-7 text-primary" />
            {pageTitle}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground sm:text-base">
            Registra ventas, genera la factura y deja preparado el control economico.
          </p>
        </div>
      </div>

      {loading ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            Cargando formulario...
          </CardContent>
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
            <CardContent>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                <div className="min-w-0 space-y-2">
                  <Label htmlFor="buyer">Comprador *</Label>
                  <Select
                    value={formData.buyer}
                    onValueChange={(value) => handleChange("buyer", value)}
                    disabled={submitting}
                  >
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
                    onChange={(event) => handleChange("invoice_number", event.target.value)}
                    placeholder={invoiceNumberPlaceholder}
                    disabled={submitting}
                  />
                </div>
                <div className="min-w-0 space-y-2">
                  <Label htmlFor="invoice_date">Fecha de factura *</Label>
                  <Input
                    id="invoice_date"
                    type="date"
                    className="min-w-0 max-w-full"
                    value={formData.invoice_date}
                    onChange={(event) => handleChange("invoice_date", event.target.value)}
                    disabled={submitting}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="text-left">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5 text-primary" />
                  Conceptos de venta
                </CardTitle>
                <Button
                  type="button"
                  variant="outline"
                  className="w-full gap-2 sm:w-auto"
                  onClick={addLine}
                  disabled={submitting}
                >
                  <Plus className="h-4 w-4" />
                  Añadir concepto
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-5">
              <div
                className="max-h-[70vh] divide-y divide-border overflow-y-auto overscroll-contain border-y border-border pr-1 sm:max-h-[42rem] sm:pr-2"
                aria-label="Conceptos de la factura"
              >
                {formData.lines.map((line, index) => {
                  const lineTotals = calculateLine(line);
                  return (
                    <section key={index} className="space-y-4 py-5 first:pt-4 last:pb-4">
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div className="min-w-0 text-left">
                          <h3 className="text-base font-semibold text-foreground">
                            Concepto {index + 1}
                          </h3>
                          <p className="text-sm text-muted-foreground">
                            Base: {lineTotals.subtotal.toFixed(2)} {formData.currency}
                          </p>
                        </div>
                        <div className="flex w-full items-center gap-2 sm:w-auto">
                          {productDescriptionOptions.length > 0 && (
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className="min-w-0 flex-1 gap-2 sm:flex-none"
                              disabled={submitting}
                              onClick={() => openReuseDialog(index)}
                            >
                              <FileText className="h-4 w-4 shrink-0" />
                              <span className="truncate">Reusar concepto</span>
                            </Button>
                          )}
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="shrink-0 text-destructive hover:text-destructive"
                            disabled={submitting || formData.lines.length === 1}
                            onClick={() => removeLine(index)}
                            aria-label={`Eliminar concepto ${index + 1}`}
                            title={`Eliminar concepto ${index + 1}`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>

                      <div className="space-y-2 text-left">
                        <Label htmlFor={`product_description_${index}`}>
                          Producto o descripcion *
                        </Label>
                        <Textarea
                          id={`product_description_${index}`}
                          rows={3}
                          value={line.product_description}
                          onChange={(event) => handleLineChange(
                            index,
                            "product_description",
                            event.target.value,
                          )}
                          disabled={submitting}
                        />
                      </div>

                      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                        <div className="min-w-0 space-y-2">
                          <Label htmlFor={`quantity_${index}`}>Cantidad *</Label>
                          <Input
                            id={`quantity_${index}`}
                            type="number"
                            min="0.01"
                            step="0.01"
                            value={line.quantity}
                            onChange={(event) => handleLineChange(index, "quantity", event.target.value)}
                            disabled={submitting}
                          />
                        </div>
                        <div className="min-w-0 space-y-2">
                          <Label htmlFor={`unit_${index}`}>Unidad</Label>
                          <Select
                            value={line.unit}
                            onValueChange={(value) => handleLineChange(index, "unit", value)}
                            disabled={submitting}
                          >
                            <SelectTrigger id={`unit_${index}`}>
                              <SelectValue placeholder="Unidad" />
                            </SelectTrigger>
                            <SelectContent>
                              {UNIT_OPTIONS.map((unit) => (
                                <SelectItem key={unit} value={unit}>{unit}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="min-w-0 space-y-2">
                          <Label htmlFor={`unit_price_${index}`}>Precio unitario *</Label>
                          <Input
                            id={`unit_price_${index}`}
                            type="number"
                            min="0"
                            step="0.0001"
                            value={line.unit_price}
                            onChange={(event) => handleLineChange(index, "unit_price", event.target.value)}
                            disabled={submitting}
                          />
                        </div>
                        <div className="min-w-0 space-y-2">
                          <Label htmlFor={`tax_rate_${index}`}>IVA %</Label>
                          <Input
                            id={`tax_rate_${index}`}
                            type="number"
                            min="0"
                            step="0.01"
                            value={line.tax_rate}
                            onChange={(event) => handleLineChange(index, "tax_rate", event.target.value)}
                            disabled={submitting}
                          />
                        </div>
                      </div>
                    </section>
                  );
                })}
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <div className="min-w-0 space-y-2">
                  <Label htmlFor="currency">Moneda</Label>
                  <Select
                    value={formData.currency}
                    onValueChange={(value) => handleChange("currency", value)}
                    disabled={submitting}
                  >
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
                <div className="rounded-lg border border-border/80 bg-accent/30 p-4 text-left">
                  <p className="text-sm text-muted-foreground">Base imponible</p>
                  <p className="mt-2 text-xl font-semibold text-foreground">
                    {totals.subtotal.toFixed(2)} {formData.currency}
                  </p>
                </div>
                <div className="rounded-lg border border-border/80 bg-accent/30 p-4 text-left">
                  <p className="text-sm text-muted-foreground">IVA</p>
                  <p className="mt-2 text-xl font-semibold text-foreground">
                    {totals.taxAmount.toFixed(2)} {formData.currency}
                  </p>
                </div>
                <div className="rounded-lg border border-primary/20 bg-primary/10 p-4 text-left">
                  <p className="text-sm text-muted-foreground">Total</p>
                  <p className="mt-2 text-xl font-semibold text-primary">
                    {totals.total.toFixed(2)} {formData.currency}
                  </p>
                </div>
              </div>

              <div className="space-y-2 text-left">
                <Label htmlFor="notes">Notas</Label>
                <Textarea
                  id="notes"
                  rows={5}
                  value={formData.notes}
                  onChange={(event) => handleChange("notes", event.target.value)}
                  disabled={submitting}
                />
              </div>

              <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
                <Button
                  type="button"
                  variant="outline"
                  className="w-full sm:w-auto"
                  disabled={submitting}
                  onClick={() => navigate(isEdit && saleId ? `/sales/${saleId}` : "/sales")}
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  className="w-full gap-2 sm:w-auto"
                  disabled={submitting}
                >
                  <Save className="h-4 w-4" />
                  {submitting ? "Guardando..." : submitLabel}
                </Button>
              </div>
            </CardContent>
          </Card>

          <Dialog open={conceptDialogOpen} onOpenChange={setConceptDialogOpen}>
            <DialogContent
              className="max-w-2xl overflow-hidden rounded-lg border border-primary/10 bg-card p-0 shadow-2xl sm:w-[calc(100vw-2rem)]"
              onOpenAutoFocus={(event) => event.preventDefault()}
            >
              <DialogHeader className="border-b border-border/70 px-5 pb-4 pr-12 pt-5 text-left sm:px-6">
                <DialogTitle>Reusar concepto</DialogTitle>
                <DialogDescription>
                  Selecciona una descripcion usada en facturas anteriores.
                </DialogDescription>
              </DialogHeader>
              <div className="max-h-72 space-y-3 overflow-y-auto px-5 py-4 sm:px-6">
                {productDescriptionOptions.map((option) => (
                  <button
                    key={option.key}
                    type="button"
                    className="w-full rounded-lg border border-border/80 bg-background px-4 py-3 text-left transition hover:border-primary/35 hover:bg-primary/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/35"
                    onClick={() => handleReuseProductDescription(option.key)}
                  >
                    <span className="block break-words text-sm font-semibold text-foreground">
                      {option.description}
                    </span>
                  </button>
                ))}
              </div>
            </DialogContent>
          </Dialog>
        </form>
      )}
    </div>
  );
}
