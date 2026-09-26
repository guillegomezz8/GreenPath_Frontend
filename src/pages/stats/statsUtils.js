export const EMPTY_DATE_RANGE = { startDate: "", endDate: "" };

export const UNIT_OPTIONS = [
  { value: "L", label: "Litros", suffix: "L" },
  { value: "KG", label: "Kg", suffix: "kg" },
];

export const STATS_MESSAGES = {
  loadError: "No se pudieron cargar las estadisticas economicas.",
  incompleteDateRange: "Debes indicar fecha inicial y fecha final.",
  invalidDateOrder: "La fecha inicial no puede ser posterior a la final.",
};

export function toNumber(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function formatCurrency(value) {
  return new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" }).format(toNumber(value));
}

export function formatQuantity(value, suffix) {
  return `${toNumber(value).toLocaleString("es-ES", { maximumFractionDigits: 2 })} ${suffix}`;
}

function formatBusinessDate(value) {
  if (!value) return "";
  const parsed = new Date(`${value}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleDateString("es-ES");
}

export function getDateRangeLabel(dateRange = EMPTY_DATE_RANGE) {
  if (!dateRange.startDate || !dateRange.endDate) return "Todo el historico";
  return `${formatBusinessDate(dateRange.startDate)} - ${formatBusinessDate(dateRange.endDate)}`;
}

export function buildDateRangeParams(dateRange = EMPTY_DATE_RANGE) {
  if (!dateRange.startDate || !dateRange.endDate) return {};
  return { start_date: dateRange.startDate, end_date: dateRange.endDate };
}

export function getDateRangeError({ startDate, endDate }) {
  if (Boolean(startDate) !== Boolean(endDate)) return STATS_MESSAGES.incompleteDateRange;
  if (startDate && startDate > endDate) return STATS_MESSAGES.invalidDateOrder;
  return null;
}

export function buildMonthlyRows(rawRows = []) {
  return rawRows.map((row) => {
    const referenceDate = new Date(row.year, (row.month || 1) - 1, 1);
    const label = new Intl.DateTimeFormat("es-ES", { month: "short" })
      .format(referenceDate)
      .replace(".", "");
    return {
      ...row,
      label,
      income: toNumber(row.income),
      cost: toNumber(row.cost),
      profit: toNumber(row.profit),
      sold_quantities: {
        L: toNumber(row.sold_quantities?.L ?? row.sold_volume),
        KG: toNumber(row.sold_quantities?.KG),
      },
      bought_quantities: {
        L: toNumber(row.bought_quantities?.L ?? row.bought_volume),
        KG: toNumber(row.bought_quantities?.KG),
      },
    };
  });
}

export function getHeight(value, maxValue, minPercent = 6) {
  if (maxValue <= 0 || value <= 0) return 0;
  return Math.max(minPercent, Math.min(100, (value / maxValue) * 100));
}

export function getChartContainerClass(size = "compact") {
  const minWidthClass = size === "wide" ? "min-w-[520px]" : "min-w-[420px]";
  return `flex h-64 ${minWidthClass} items-end gap-3 p-3 sm:h-72 sm:gap-4 sm:p-4 md:min-w-0`;
}

export function getUnitSuffix(unit) {
  return UNIT_OPTIONS.find((option) => option.value === unit)?.suffix || unit;
}
