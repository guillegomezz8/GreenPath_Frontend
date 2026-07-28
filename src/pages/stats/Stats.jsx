import { useCallback, useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { BarChart3, Building2, CalendarRange, ChevronDown, Droplets, Euro, Receipt, TrendingDown, TrendingUp, Wallet } from "lucide-react";
import { useAuth } from "@/context/AuthProvider";
import { useSnackbar } from "@/context/SnackbarProvider";
import { handleApiError } from "@/components/Utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const EMPTY_DATE_RANGE = { startDate: "", endDate: "" };

function toNumber(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function formatCurrency(value) {
  return new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" }).format(toNumber(value));
}

function formatLiters(value) {
  return `${Math.round(toNumber(value)).toLocaleString("es-ES")} L`;
}

function formatBusinessDate(value) {
  if (!value) return "";
  const parsed = new Date(`${value}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleDateString("es-ES");
}

function getDateRangeLabel(dateRange = EMPTY_DATE_RANGE) {
  if (dateRange.startDate && dateRange.endDate) {
    return `${formatBusinessDate(dateRange.startDate)} - ${formatBusinessDate(dateRange.endDate)}`;
  }
  return "Todo el historico";
}

function buildDateRangeParams(dateRange = EMPTY_DATE_RANGE) {
  if (!dateRange.startDate || !dateRange.endDate) {
    return {};
  }
  return {
    start_date: dateRange.startDate,
    end_date: dateRange.endDate,
  };
}

function buildMonthlyRows(rawRows = []) {
  return rawRows.map((row) => {
    const referenceDate = new Date(row.year, (row.month || 1) - 1, 1);
    const monthLabel = new Intl.DateTimeFormat("es-ES", { month: "short" }).format(referenceDate).replace(".", "");
    return {
      ...row,
      label: monthLabel,
      income: toNumber(row.income),
      cost: toNumber(row.cost),
      profit: toNumber(row.profit),
      sold_volume: toNumber(row.sold_volume),
      bought_volume: toNumber(row.bought_volume),
    };
  });
}

function getHeight(value, maxValue, minPercent = 6) {
  if (maxValue <= 0 || value <= 0) return 0;
  return Math.max(minPercent, Math.min(100, (value / maxValue) * 100));
}

function getChartContainerClass(size = "compact") {
  const minWidthClass = size === "wide" ? "min-w-[520px]" : "min-w-[420px]";
  return `flex h-64 ${minWidthClass} items-end gap-3 p-3 sm:h-72 sm:gap-4 sm:p-4 md:min-w-0`;
}

function ColorLegend({ items = [] }) {
  if (!Array.isArray(items) || items.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-2">
      {items.map((item) => (
        <div
          key={`${item.label}-${item.color}`}
          className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-background/80 px-3 py-1 text-xs text-muted-foreground"
        >
          <span
            className="h-2.5 w-2.5 rounded-full"
            style={{ backgroundColor: item.color }}
            aria-hidden="true"
          />
          <span>{item.label}</span>
        </div>
      ))}
    </div>
  );
}

export default function Stats() {
  const { api } = useAuth();
  const showSnackbar = useSnackbar();

  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState(null);
  const [buyersCount, setBuyersCount] = useState(0);
  const [salesCount, setSalesCount] = useState(0);
  const [confirmedCollectionsCount, setConfirmedCollectionsCount] = useState(0);
  const [dateRange, setDateRange] = useState(EMPTY_DATE_RANGE);
  const [appliedDateRange, setAppliedDateRange] = useState(EMPTY_DATE_RANGE);
  const [isCountersOpen, setIsCountersOpen] = useState(false);

  const dateRangeParams = useMemo(() => buildDateRangeParams(appliedDateRange), [appliedDateRange]);
  const appliedDateRangeLabel = useMemo(() => getDateRangeLabel(appliedDateRange), [appliedDateRange]);
  const hasAppliedDateRange = Boolean(appliedDateRange.startDate && appliedDateRange.endDate);
  const hasPendingDateChanges = dateRange.startDate !== appliedDateRange.startDate || dateRange.endDate !== appliedDateRange.endDate;

  const fetchStatsData = useCallback(async () => {
    try {
      setLoading(true);
      const [summaryRes, buyersRes, salesRes, collectionsRes] = await Promise.all([
        api().get("sales/economic-summary/", { params: dateRangeParams }),
        api().get("buyers/", { params: { page: 1, page_size: 1 } }),
        api().get("sales/", { params: { page: 1, page_size: 1, ...dateRangeParams } }),
        api().get("collections", { params: { page: 1, page_size: 1, status: "CONFIRMED", billable: true, ...dateRangeParams } }),
      ]);

      setSummary(summaryRes.data || null);
      setBuyersCount(Number(buyersRes.data?.count || 0));
      setSalesCount(Number(salesRes.data?.count || 0));
      setConfirmedCollectionsCount(Number(collectionsRes.data?.count || 0));
    } catch (e) {
      const msg = handleApiError(e, "No se pudieron cargar las estadisticas economicas.");
      showSnackbar(msg, "error");
    } finally {
      setLoading(false);
    }
  }, [api, dateRangeParams, showSnackbar]);

  useEffect(() => {
    fetchStatsData();
  }, [fetchStatsData]);

  const handleDateRangeChange = useCallback((field) => (event) => {
    const { value } = event.target;
    setDateRange((prev) => ({
      ...prev,
      [field]: value,
    }));
  }, []);

  const applyDateRange = useCallback(() => {
    const { startDate, endDate } = dateRange;

    if ((startDate && !endDate) || (!startDate && endDate)) {
      showSnackbar("Debes indicar fecha inicial y fecha final.", "error");
      return;
    }

    if (startDate && endDate && startDate > endDate) {
      showSnackbar("La fecha inicial no puede ser posterior a la final.", "error");
      return;
    }

    setAppliedDateRange({ startDate, endDate });
  }, [dateRange, showSnackbar]);

  const clearDateRange = useCallback(() => {
    setDateRange(EMPTY_DATE_RANGE);
    setAppliedDateRange(EMPTY_DATE_RANGE);
  }, []);

  const monthlyData = useMemo(() => buildMonthlyRows(summary?.monthly || []), [summary?.monthly]);
  const totals = useMemo(() => {
    const totalIncome = toNumber(summary?.total_income);
    const totalCost = toNumber(summary?.total_cost);
    const netProfit = toNumber(summary?.net_profit);
    const boughtVolume = toNumber(summary?.total_bought_volume);
    const soldVolume = toNumber(summary?.total_sold_volume);
    const margin = totalIncome > 0 ? (netProfit / totalIncome) * 100 : 0;

    return {
      totalIncome,
      totalCost,
      netProfit,
      boughtVolume,
      soldVolume,
      margin,
    };
  }, [summary]);

  const maxFinance = useMemo(() => Math.max(1, ...monthlyData.flatMap((item) => [item.income, item.cost, Math.abs(item.profit)])), [monthlyData]);
  const maxVolume = useMemo(() => Math.max(1, ...monthlyData.flatMap((item) => [item.bought_volume, item.sold_volume])), [monthlyData]);

  const kpiCards = useMemo(
    () => [
      { title: "Ingresos", value: formatCurrency(totals.totalIncome), icon: TrendingUp, className: "text-emerald-600" },
      { title: "Coste invertido", value: formatCurrency(totals.totalCost), icon: TrendingDown, className: "text-red-600" },
      { title: "Beneficio neto", value: formatCurrency(totals.netProfit), icon: Wallet, className: totals.netProfit >= 0 ? "text-primary" : "text-red-600" },
      { title: "Margen", value: `${totals.margin.toFixed(1)}%`, icon: Euro, className: totals.margin >= 0 ? "text-primary" : "text-red-600" },
      { title: "Volumen comprado", value: formatLiters(totals.boughtVolume), icon: Droplets, className: "text-blue-600" },
      { title: "Volumen vendido", value: formatLiters(totals.soldVolume), icon: Receipt, className: "text-orange-500" },
    ],
    [totals.boughtVolume, totals.margin, totals.netProfit, totals.soldVolume, totals.totalCost, totals.totalIncome]
  );

  const countCards = useMemo(
    () => [
      { title: "Compradores", value: buyersCount, className: "text-primary" },
      { title: "Ventas registradas", value: salesCount, className: "text-foreground" },
      { title: "Compras facturables", value: confirmedCollectionsCount, className: "text-blue-600" },
    ],
    [buyersCount, confirmedCollectionsCount, salesCount]
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="min-w-0 text-left">
          <h1 className="flex items-center gap-3 text-2xl font-bold text-foreground sm:text-3xl">
            <BarChart3 className="h-7 w-7 text-primary sm:h-8 sm:w-8" />
            Estadisticas
          </h1>
        </div>
        <div className="flex flex-wrap gap-2">
          <Badge variant="outline" className="w-fit border-border/70 bg-background/80 text-muted-foreground">
            Resumen economico
          </Badge>
          <Badge variant="outline" className="w-fit border-border/70 bg-background/80 text-muted-foreground">
            Periodo: {appliedDateRangeLabel}
          </Badge>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-4 text-left">
          <CardTitle className="flex items-center gap-2 text-base">
            <CalendarRange className="h-5 w-5 text-primary" />
            Filtrar por rango de fechas
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]">
            <div className="space-y-2">
              <Label htmlFor="stats-start-date">Fecha inicial</Label>
              <Input
                id="stats-start-date"
                type="date"
                value={dateRange.startDate}
                onChange={handleDateRangeChange("startDate")}
                max={dateRange.endDate || undefined}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="stats-end-date">Fecha final</Label>
              <Input
                id="stats-end-date"
                type="date"
                value={dateRange.endDate}
                onChange={handleDateRangeChange("endDate")}
                min={dateRange.startDate || undefined}
              />
            </div>

            <div className="flex flex-col gap-2 xl:self-end">
              <Button type="button" onClick={applyDateRange} disabled={loading || !hasPendingDateChanges}>
                Aplicar rango
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={clearDateRange}
                disabled={loading || (!hasAppliedDateRange && !hasPendingDateChanges)}
              >
                Limpiar
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {loading ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">Cargando estadisticas...</CardContent>
        </Card>
      ) : (
        <>
          <div className="md:hidden">
            <Card>
              <CardContent className="p-0">
                <button
                  type="button"
                  onClick={() => setIsCountersOpen((prev) => !prev)}
                  className="flex w-full items-center justify-between p-4 text-left transition-colors hover:bg-muted/40"
                >
                  <span className="text-sm font-medium text-foreground">Ver contadores</span>
                  <ChevronDown className={`h-5 w-5 text-muted-foreground transition-transform ${isCountersOpen ? "rotate-180" : ""}`} />
                </button>

                {isCountersOpen && (
                  <div className="space-y-3 border-t px-4 py-3">
                    {[...kpiCards, ...countCards].map((card) => (
                      <div key={card.title} className="flex items-center justify-between gap-3 border-b pb-2 last:border-b-0 last:pb-0">
                        <span className="text-sm text-muted-foreground">{card.title}</span>
                        <span className={`min-w-0 max-w-[60%] break-words text-right text-lg font-bold leading-tight [overflow-wrap:anywhere] ${card.className}`}>
                          {card.value}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="hidden grid-cols-1 gap-4 md:grid md:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-6">
            {kpiCards.map((card) => (
              <Card key={card.title} className="min-w-0 transition-shadow hover:shadow-elegant">
                <CardContent className="min-w-0 pt-6 text-left">
                  <div className="mb-3 flex items-center justify-between">
                    <card.icon className={`h-5 w-5 ${card.className}`} />
                  </div>
                  <div className={`min-w-0 break-words text-xl font-bold leading-tight [overflow-wrap:anywhere] 2xl:text-2xl ${card.className}`}>
                    {card.value}
                  </div>
                  <p className="text-xs text-muted-foreground">{card.title}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="hidden grid-cols-1 gap-4 md:grid xl:grid-cols-3">
            {countCards.map((card) => (
              <Card key={card.title}>
                <CardContent className="pt-6 text-center">
                  <div className={`text-2xl font-bold ${card.className}`}>{card.value}</div>
                  <p className="text-sm text-muted-foreground">{card.title}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
            <Card>
              <CardHeader className="text-left">
                <div className="flex flex-col gap-3">
                  <CardTitle className="flex items-center gap-2">
                    <Euro className="h-5 w-5 text-primary" />
                    Ingresos vs costes
                  </CardTitle>
                  <ColorLegend
                    items={[
                      { label: "Ingresos", color: "#10b981" },
                      { label: "Costes", color: "#ef4444" },
                    ]}
                  />
                </div>
              </CardHeader>
              <CardContent>
                {monthlyData.length === 0 ? (
                  <div className="py-12 text-center text-sm text-muted-foreground">Sin movimientos economicos en el periodo seleccionado.</div>
                ) : (
                  <div className="overflow-x-auto">
                    <div className={getChartContainerClass()}>
                      {monthlyData.map((item, index) => {
                        const incomeHeight = getHeight(item.income, maxFinance);
                        const costHeight = getHeight(item.cost, maxFinance);
                        return (
                          <div key={`${item.year}-${item.month}`} className="flex flex-1 flex-col items-center gap-2">
                            <div className="grid w-full grid-cols-2 gap-2 text-[11px] text-muted-foreground">
                              <span className="text-center">{item.income.toFixed(0)}</span>
                              <span className="text-center">{item.cost.toFixed(0)}</span>
                            </div>
                            <div className="flex h-44 w-full items-end gap-2">
                              <motion.div
                                initial={{ height: 0 }}
                                animate={{ height: `${incomeHeight}%` }}
                                transition={{ duration: 0.45, delay: index * 0.04 }}
                                className="w-full rounded-t-md bg-emerald-500"
                              />
                              <motion.div
                                initial={{ height: 0 }}
                                animate={{ height: `${costHeight}%` }}
                                transition={{ duration: 0.45, delay: index * 0.04 + 0.03 }}
                                className="w-full rounded-t-md bg-red-500"
                              />
                            </div>
                            <div className="text-xs font-medium text-foreground">{item.label}</div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="text-left">
                <div className="flex flex-col gap-3">
                  <CardTitle className="flex items-center gap-2">
                    <Wallet className="h-5 w-5 text-primary" />
                    Beneficio mensual
                  </CardTitle>
                  <ColorLegend
                    items={[
                      { label: "Beneficio positivo", color: "#22c55e" },
                      { label: "Beneficio negativo", color: "#ef4444" },
                    ]}
                  />
                </div>
              </CardHeader>
              <CardContent>
                {monthlyData.length === 0 ? (
                  <div className="py-12 text-center text-sm text-muted-foreground">Sin beneficios ni costes registrados en el periodo seleccionado.</div>
                ) : (
                  <div className="overflow-x-auto">
                    <div className={getChartContainerClass()}>
                      {monthlyData.map((item, index) => {
                        const profitHeight = getHeight(Math.abs(item.profit), maxFinance);
                        const barClass = item.profit >= 0 ? "bg-primary" : "bg-red-500";
                        return (
                          <div key={`${item.year}-${item.month}-profit`} className="flex flex-1 flex-col items-center gap-2">
                            <div className="text-xs text-muted-foreground">{item.profit.toFixed(0)}</div>
                            <div className="flex h-44 w-full items-end">
                              <motion.div
                                initial={{ height: 0 }}
                                animate={{ height: `${profitHeight}%` }}
                                transition={{ duration: 0.45, delay: index * 0.04 }}
                                className={`w-full rounded-t-md ${barClass}`}
                              />
                            </div>
                            <div className="text-xs font-medium text-foreground">{item.label}</div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader className="text-left">
              <div className="flex flex-col gap-3">
                <CardTitle className="flex items-center gap-2">
                  <Droplets className="h-5 w-5 text-primary" />
                  Volumen comprado vs vendido
                </CardTitle>
                <ColorLegend
                  items={[
                    { label: "Volumen comprado", color: "#3b82f6" },
                    { label: "Volumen vendido", color: "#f97316" },
                  ]}
                />
              </div>
            </CardHeader>
            <CardContent>
              {monthlyData.length === 0 ? (
                <div className="py-12 text-center text-sm text-muted-foreground">Sin volumen registrado en el periodo seleccionado.</div>
              ) : (
                <div className="overflow-x-auto">
                  <div className={getChartContainerClass("wide")}>
                    {monthlyData.map((item, index) => {
                      const boughtHeight = getHeight(item.bought_volume, maxVolume);
                      const soldHeight = getHeight(item.sold_volume, maxVolume);
                      return (
                        <div key={`${item.year}-${item.month}-volume`} className="flex flex-1 flex-col items-center gap-2">
                          <div className="grid w-full grid-cols-2 gap-2 text-[11px] text-muted-foreground">
                            <span className="text-center">{Math.round(item.bought_volume)}</span>
                            <span className="text-center">{Math.round(item.sold_volume)}</span>
                          </div>
                          <div className="flex h-44 w-full items-end gap-2">
                            <motion.div
                              initial={{ height: 0 }}
                              animate={{ height: `${boughtHeight}%` }}
                              transition={{ duration: 0.45, delay: index * 0.04 }}
                              className="w-full rounded-t-md bg-blue-500"
                            />
                            <motion.div
                              initial={{ height: 0 }}
                              animate={{ height: `${soldHeight}%` }}
                              transition={{ duration: 0.45, delay: index * 0.04 + 0.03 }}
                              className="w-full rounded-t-md bg-orange-500"
                            />
                          </div>
                          <div className="text-xs font-medium text-foreground">{item.label}</div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="text-left">
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5 text-primary" />
                Evolucion mensual
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {monthlyData.length === 0 ? (
                <p className="text-sm text-muted-foreground">Sin movimientos economicos registrados.</p>
              ) : (
                monthlyData.map((item) => (
                  <div key={`${item.year}-${item.month}-row`} className="grid grid-cols-1 gap-3 rounded-xl border border-border/80 p-4 text-left sm:grid-cols-2 xl:grid-cols-5">
                    <div>
                      <p className="text-xs uppercase tracking-wide text-muted-foreground">Mes</p>
                      <p className="font-semibold text-foreground">{item.label} {item.year}</p>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-wide text-muted-foreground">Ingresos</p>
                      <p className="font-semibold text-emerald-600">{formatCurrency(item.income)}</p>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-wide text-muted-foreground">Costes</p>
                      <p className="font-semibold text-red-600">{formatCurrency(item.cost)}</p>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-wide text-muted-foreground">Beneficio</p>
                      <p className={`font-semibold ${item.profit >= 0 ? "text-primary" : "text-red-600"}`}>{formatCurrency(item.profit)}</p>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-wide text-muted-foreground">Volumen</p>
                      <p className="font-semibold text-foreground">{Math.round(item.bought_volume)}L / {Math.round(item.sold_volume)}L</p>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
