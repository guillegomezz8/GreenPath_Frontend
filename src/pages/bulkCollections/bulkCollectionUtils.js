export const QUANTITY_UNITS = [
  { value: "L", label: "Litros", suffix: "L" },
  { value: "KG", label: "Kilogramos", suffix: "kg" },
  { value: "UD", label: "Unidades", suffix: "uds" },
];

export const CALCULATION_MODES = [
  { value: "TOTAL", label: "Importe final", help: "Introduce cantidad y precio unitario." },
  { value: "UNIT_PRICE", label: "Precio unitario", help: "Introduce cantidad e importe final." },
  { value: "QUANTITY", label: "Cantidad", help: "Introduce precio unitario e importe final." },
];

export function toNumber(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function calculateBulkCollectionValues(values) {
  const quantity = toNumber(values.quantity);
  const unitPrice = toNumber(values.unit_price);
  const totalPrice = toNumber(values.total_price);

  if (values.calculation_mode === "UNIT_PRICE") {
    return { ...values, unit_price: quantity > 0 ? (totalPrice / quantity).toFixed(4) : "" };
  }
  if (values.calculation_mode === "QUANTITY") {
    return { ...values, quantity: unitPrice > 0 ? (totalPrice / unitPrice).toFixed(2) : "" };
  }
  return { ...values, total_price: quantity > 0 && unitPrice > 0 ? (quantity * unitPrice).toFixed(2) : "" };
}

export function formatCurrency(value) {
  return new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" }).format(toNumber(value));
}

export function formatBulkCollectionQuantity(quantity, unit) {
  const suffix = QUANTITY_UNITS.find((item) => item.value === unit)?.suffix || unit || "";
  return `${toNumber(quantity).toLocaleString("es-ES", { maximumFractionDigits: 2 })} ${suffix}`.trim();
}

export function formatDate(value) {
  if (!value) return "-";
  const parsed = new Date(`${value}T00:00:00`);
  return Number.isNaN(parsed.getTime()) ? value : parsed.toLocaleDateString("es-ES");
}
