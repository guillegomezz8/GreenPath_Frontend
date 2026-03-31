import { useCallback, useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { BarChart3, Building2, Droplets, Euro, Receipt, TrendingDown, TrendingUp, Wallet } from "lucide-react";
import { useAuth } from "@/context/AuthProvider";
import { useSnackbar } from "@/context/SnackbarProvider";
import { handleApiError } from "@/components/Utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

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

export default function Stats() {
  const { api } = useAuth();
  const showSnackbar = useSnackbar();

  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState(null);
  const [buyersCount, setBuyersCount] = useState(0);
  const [salesCount, setSalesCount] = useState(0);
  const [confirmedCollectionsCount, setConfirmedCollectionsCount] = useState(0);

  const fetchStatsData = useCallback(async () => {
    try {
      setLoading(true);
      const [summaryRes, buyersRes, salesRes, collectionsRes] = await Promise.all([
        api().get("sales/economic-summary/"),
        api().get("buyers/", { params: { page: 1, page_size: 1 } }),
        api().get("sales/", { params: { page: 1, page_size: 1 } }),
        api().get("collections", { params: { page: 1, page_size: 1, status: "CONFIRMED", billable: true } }),
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
  }, [api, showSnackbar]);

  useEffect(() => {
    fetchStatsData();
  }, [fetchStatsData]);

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

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="min-w-0 text-left">
          <h1 className="flex items-center gap-3 text-2xl font-bold text-foreground sm:text-3xl">
            <BarChart3 className="h-7 w-7 text-primary sm:h-8 sm:w-8" />
            Estadisticas
          </h1>
        </div>
        <Badge variant="outline" className="w-fit border-border/70 bg-background/80 text-muted-foreground">
          Resumen economico
        </Badge>
      </div>

      {loading ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">Cargando estadisticas...</CardContent>
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
            {kpiCards.map((card) => (
              <Card key={card.title} className="transition-shadow hover:shadow-elegant">
                <CardContent className="pt-6 text-left">
                  <div className="mb-3 flex items-center justify-between">
                    <card.icon className={`h-5 w-5 ${card.className}`} />
                  </div>
                  <div className={`text-2xl font-bold ${card.className}`}>{card.value}</div>
                  <p className="text-xs text-muted-foreground">{card.title}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
            <Card>
              <CardContent className="pt-6 text-center">
                <div className="text-2xl font-bold text-primary">{buyersCount}</div>
                <p className="text-sm text-muted-foreground">Compradores</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6 text-center">
                <div className="text-2xl font-bold text-foreground">{salesCount}</div>
                <p className="text-sm text-muted-foreground">Ventas registradas</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6 text-center">
                <div className="text-2xl font-bold text-blue-600">{confirmedCollectionsCount}</div>
                <p className="text-sm text-muted-foreground">Compras facturables</p>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
            <Card>
              <CardHeader className="text-left">
                <CardTitle className="flex items-center gap-2">
                  <Euro className="h-5 w-5 text-primary" />
                  Ingresos vs costes
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <div className="flex h-72 min-w-[560px] items-end gap-4 p-4 sm:min-w-0">
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
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="text-left">
                <CardTitle className="flex items-center gap-2">
                  <Wallet className="h-5 w-5 text-primary" />
                  Beneficio mensual
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <div className="flex h-72 min-w-[560px] items-end gap-4 p-4 sm:min-w-0">
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
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader className="text-left">
              <CardTitle className="flex items-center gap-2">
                <Droplets className="h-5 w-5 text-primary" />
                Volumen comprado vs vendido
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <div className="flex h-72 min-w-[720px] items-end gap-4 p-4 sm:min-w-0">
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
                  <div key={`${item.year}-${item.month}-row`} className="grid grid-cols-1 gap-3 rounded-xl border border-border/80 p-4 text-left md:grid-cols-5">
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
