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
import useCompanyFeatures from "@/hooks/useCompanyFeatures";
import {
  buildDateRangeParams,
  buildMonthlyRows,
  EMPTY_DATE_RANGE,
  formatCurrency,
  formatQuantity,
  getChartContainerClass,
  getDateRangeError,
  getDateRangeLabel,
  getHeight,
  getUnitSuffix,
  STATS_MESSAGES,
  toNumber,
  UNIT_OPTIONS,
} from "./statsUtils";

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
  const { features } = useCompanyFeatures();

  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState(null);
  const [buyersCount, setBuyersCount] = useState(0);
  const [salesCount, setSalesCount] = useState(0);
  const [confirmedCollectionsCount, setConfirmedCollectionsCount] = useState(0);
  const [bulkCollectionsCount, setBulkCollectionsCount] = useState(0);
  const [dateRange, setDateRange] = useState(EMPTY_DATE_RANGE);
  const [appliedDateRange, setAppliedDateRange] = useState(EMPTY_DATE_RANGE);
  const [isCountersOpen, setIsCountersOpen] = useState(false);
  const [selectedUnit, setSelectedUnit] = useState("KG");

  const dateRangeParams = useMemo(() => buildDateRangeParams(appliedDateRange), [appliedDateRange]);
  const appliedDateRangeLabel = useMemo(() => getDateRangeLabel(appliedDateRange), [appliedDateRange]);
  const hasAppliedDateRange = Boolean(appliedDateRange.startDate && appliedDateRange.endDate);
  const hasPendingDateChanges = dateRange.startDate !== appliedDateRange.startDate || dateRange.endDate !== appliedDateRange.endDate;

  const fetchStatsData = useCallback(async () => {
    try {
      setLoading(true);
      const [summaryRes, buyersRes, salesRes, collectionsRes, bulkCollectionsRes] = await Promise.all([
        api().get("sales/economic-summary/", { params: dateRangeParams }),
        api().get("buyers/", { params: { page: 1, page_size: 1 } }),
        api().get("sales/", { params: { page: 1, page_size: 1, ...dateRangeParams } }),
        features.collections_enabled
          ? api().get("collections", { params: { page: 1, page_size: 1, status: "CONFIRMED", billable: true, ...dateRangeParams } })
          : Promise.resolve({ data: { count: 0 } }),
        features.bulk_collections_enabled
          ? api().get("bulk-collections/", { params: { page: 1, page_size: 1, billable: true, ...dateRangeParams } })
          : Promise.resolve({ data: { count: 0 } }),
      ]);

      setSummary(summaryRes.data || null);
      setBuyersCount(Number(buyersRes.data?.count || 0));
      setSalesCount(Number(salesRes.data?.count || 0));
      setConfirmedCollectionsCount(Number(collectionsRes.data?.count || 0));
      setBulkCollectionsCount(Number(bulkCollectionsRes.data?.count || 0));
    } catch (e) {
      const msg = handleApiError(e, STATS_MESSAGES.loadError);
      showSnackbar(msg, "error");
    } finally {
      setLoading(false);
    }
  }, [api, dateRangeParams, features.bulk_collections_enabled, features.collections_enabled, showSnackbar]);

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
    const error = getDateRangeError(dateRange);
    if (error) {
      showSnackbar(error, "error");
      return;
    }
    setAppliedDateRange({ ...dateRange });
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
    const boughtQuantity = toNumber(summary?.bought_quantities?.[selectedUnit]);
    const soldQuantity = toNumber(summary?.sold_quantities?.[selectedUnit]);
    const margin = totalIncome > 0 ? (netProfit / totalIncome) * 100 : 0;

    return {
      totalIncome,
      totalCost,
      netProfit,
      boughtQuantity,
      soldQuantity,
      margin,
    };
  }, [selectedUnit, summary]);

  const maxFinance = useMemo(() => Math.max(1, ...monthlyData.flatMap((item) => [item.income, item.cost, Math.abs(item.profit)])), [monthlyData]);
  const maxQuantity = useMemo(() => Math.max(1, ...monthlyData.flatMap((item) => [item.bought_quantities[selectedUnit], item.sold_quantities[selectedUnit]])), [monthlyData, selectedUnit]);

  const kpiCards = useMemo(
    () => [
      { title: "Ingresos", value: formatCurrency(totals.totalIncome), icon: TrendingUp, className: "text-emerald-600" },
      { title: "Coste invertido", value: formatCurrency(totals.totalCost), icon: TrendingDown, className: "text-red-600" },
      { title: "Beneficio neto", value: formatCurrency(totals.netProfit), icon: Wallet, className: totals.netProfit >= 0 ? "text-primary" : "text-red-600" },
      { title: "Margen", value: `${totals.margin.toFixed(1)}%`, icon: Euro, className: totals.margin >= 0 ? "text-primary" : "text-red-600" },
      { title: "Cantidad comprada", value: formatQuantity(totals.boughtQuantity, getUnitSuffix(selectedUnit)), icon: Droplets, className: "text-blue-600" },
      { title: "Cantidad vendida", value: formatQuantity(totals.soldQuantity, getUnitSuffix(selectedUnit)), icon: Receipt, className: "text-orange-500" },
    ],
    [selectedUnit, totals.boughtQuantity, totals.margin, totals.netProfit, totals.soldQuantity, totals.totalCost, totals.totalIncome]
  );

  const totalCollectionsCount = (
    (features.collections_enabled ? confirmedCollectionsCount : 0)
    + (features.bulk_collections_enabled ? bulkCollectionsCount : 0)
  );
  const countCards = useMemo(
    () => [
      { title: "Compradores", value: buyersCount, className: "text-primary" },
      { title: "Ventas registradas", value: salesCount, className: "text-foreground" },
      ...((features.collections_enabled || features.bulk_collections_enabled)
        ? [{ title: "Recogidas facturables", value: totalCollectionsCount, className: "text-blue-600" }]
        : []),
    ],
    [buyersCount, features.bulk_collections_enabled, features.collections_enabled, salesCount, totalCollectionsCount]
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
                    <Euro className="h-6 w-6 shrink-0 text-primary sm:h-5 sm:w-5" />
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
                    <Wallet className="h-6 w-6 shrink-0 text-primary sm:h-5 sm:w-5" />
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
                <CardTitle className="flex items-center gap-3">
                  <Droplets className="h-8 w-8 shrink-0 text-primary sm:h-6 sm:w-6" />
                  Cantidad comprada vs vendida
                </CardTitle>
                <div className="flex w-full rounded-lg border border-border bg-muted/40 p-1 sm:w-fit" aria-label="Unidad de la grafica">
                  {UNIT_OPTIONS.map((unit) => (
                    <button key={unit.value} type="button" onClick={() => setSelectedUnit(unit.value)} className={`flex-1 rounded-md px-4 py-2 text-sm font-medium transition-colors sm:flex-none ${selectedUnit === unit.value ? "bg-background text-primary shadow-sm" : "text-muted-foreground hover:text-foreground"}`}>{unit.label}</button>
                  ))}
                </div>
                <p className="text-[11px] leading-4 text-muted-foreground/70">
                  Incluye recogidas, recogidas al por mayor y ventas en litros o kilogramos. Las ventas en unidades no se incluyen. Conversion usada: 1 L = {summary?.conversion?.oil_density_kg_per_liter || "-"} kg.
                </p>
                <ColorLegend
                  items={[
                    { label: "Comprado", color: "#3b82f6" },
                    { label: "Vendido", color: "#f97316" },
                  ]}
                />
              </div>
            </CardHeader>
            <CardContent>
              {monthlyData.length === 0 ? (
                <div className="py-12 text-center text-sm text-muted-foreground">Sin cantidades registradas en esta unidad.</div>
              ) : (
                <div className="overflow-x-auto">
                  <div className={getChartContainerClass("wide")}>
                    {monthlyData.map((item, index) => {
                      const boughtValue = item.bought_quantities[selectedUnit];
                      const soldValue = item.sold_quantities[selectedUnit];
                      const boughtHeight = getHeight(boughtValue, maxQuantity);
                      const soldHeight = getHeight(soldValue, maxQuantity);
                      return (
                        <div key={`${item.year}-${item.month}-volume`} className="flex flex-1 flex-col items-center gap-2">
                          <div className="grid w-full grid-cols-2 gap-2 text-[11px] text-muted-foreground">
                            <span className="text-center">{Math.round(boughtValue)}</span>
                            <span className="text-center">{Math.round(soldValue)}</span>
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
                      <p className="text-xs uppercase tracking-wide text-muted-foreground">Comprado / vendido</p>
                      <p className="font-semibold text-foreground">{formatQuantity(item.bought_quantities[selectedUnit], getUnitSuffix(selectedUnit))} / {formatQuantity(item.sold_quantities[selectedUnit], getUnitSuffix(selectedUnit))}</p>
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
