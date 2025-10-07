import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, ChevronDown } from "lucide-react";
import { useState } from "react";

const COLS_MAP = {
  1: "sm:grid-cols-1",
  2: "sm:grid-cols-1 md:grid-cols-2",
  3: "sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3",
  4: "sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-4",
  5: "sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5",
  6: "sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6",
};

/**
 * Layout flexible para listados con header, búsqueda, filtros, contadores, contenido y paginación.
 * Si se pasa `layout="list"`, no usará el grid por defecto, permitiendo tablas o listados personalizados.
 */
export default function PaginatedScaffold({
  // Header
  title,
  subtitle,
  rightAction,

  // Search
  searchPlaceholder = "Buscar...",
  searchValue,
  onSearchChange,
  renderSearch,
  searchClassName = "",

  // Filtros
  filters = [],
  selectedFilter,
  onFilterChange,
  renderFilter,
  filtersClassName = "",

  // Contadores
  counts,
  countDefs = [],
  countsWrapperClassName = "",
  renderCountCard,
  countsCols,

  // Contenido
  children,
  contentClassName = "grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6",
  layout = "grid",

  // Loading & Empty
  loading = false,
  loadingNode,
  emptyNode,
  emptyText = "No hay resultados con los criterios seleccionados",
  showDefaultEmpty = true,

  // Paginación
  total = 0,
  page = 1,
  totalPages = 1,
  onPrevPage,
  onNextPage,
  paginationClassName = "",

  // Wrapper general
  className = "space-y-4 md:space-y-6",
}) {
  const [isCountsOpen, setIsCountsOpen] = useState(false);

  // --- Distribución de contadores ---
  const getResponsiveColumns = () => {
    const numCounts = countDefs.length;
    if (countsCols) return Math.max(1, Math.min(countsCols, 6));
    if (numCounts <= 2) return 2;
    if (numCounts <= 3) return 3;
    if (numCounts <= 4) return 4;
    if (numCounts <= 6) return Math.min(numCounts, 6);
    return 4;
  };

  const colsNumber = getResponsiveColumns();
  const responsiveColsClass =
    COLS_MAP[colsNumber] || "sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-4";

  const defaultSearch = (
    <div className="flex-1 relative min-w-0">
      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
      <Input
        placeholder={searchPlaceholder}
        value={searchValue}
        onChange={(e) => onSearchChange?.(e.target.value)}
        className="pl-10 w-full"
      />
    </div>
  );

  const defaultFilter = (opt, isActive, onClick) => (
    <Button
      key={opt}
      variant={isActive ? "default" : "outline"}
      size="sm"
      onClick={onClick}
      className={`text-xs sm:text-sm h-8 px-3 justify-center ${
        isActive
          ? "bg-primary text-primary-foreground hover:bg-primary/90"
          : "hover:bg-muted"
      }`}
    >
      <span className="truncate">{opt}</span>
    </Button>
  );

  const defaultCountCard = (def, value) => (
    <Card key={def.key} className="hover:shadow-md transition-shadow">
      <CardContent className="pt-4 pb-4 px-4 text-center">
        <div
          className={`text-xl sm:text-2xl font-bold leading-tight ${
            def.className || "text-primary"
          }`}
        >
          {typeof value === "number"
            ? value.toLocaleString()
            : value ?? 0}
        </div>
        <p className="text-xs sm:text-sm text-muted-foreground mt-1 leading-tight">
          {def.label}
        </p>
      </CardContent>
    </Card>
  );

  // --- Render principal ---
  return (
    <div className={className}>
      {/* Header */}
      {(title || rightAction) && (
        <div className="flex flex-col gap-4 sm:gap-3 lg:flex-row lg:justify-between lg:items-start">
          <div className="min-w-0 flex-1 space-y-1 sm:space-y-2">
            {!!title && (
              <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-foreground flex flex-wrap items-center gap-2 lg:gap-3 leading-tight">
                {title}
              </h1>
            )}
            {!!subtitle && (
              <p className="text-sm sm:text-base text-muted-foreground leading-relaxed max-w-2xl text-left">
                {subtitle}
              </p>
            )}
          </div>

          {!!rightAction && (
            <div className="flex justify-start sm:justify-end lg:justify-start">
              <Button
                className={`gap-2 text-sm font-medium shadow-sm transition-all hover:shadow-md ${rightAction.className || ""}`}
                onClick={rightAction.onClick}
                size="sm"
              >
                {rightAction.icon && (
                  <span className="flex-shrink-0">{rightAction.icon}</span>
                )}
                <span className="hidden xs:inline sm:hidden md:inline">
                  {rightAction.label}
                </span>
                <span className="xs:hidden sm:inline md:hidden">
                  {rightAction.shortLabel ||
                    rightAction.label?.split(" ")[0] ||
                    rightAction.label}
                </span>
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Search + Filtros */}
      <Card>
        <CardContent className="pt-4 pb-4 px-4 md:pt-6 md:pb-6 md:px-6">
          <div className={`space-y-4 ${searchClassName}`}>
            <div className="w-full">
              {renderSearch ? renderSearch(defaultSearch) : defaultSearch}
            </div>

            {filters.length > 0 && (
              <div className="space-y-2">
                <div
                  className={`grid grid-cols-2 sm:grid-cols-3 md:flex md:flex-wrap gap-2 ${filtersClassName}`}
                >
                  {filters.map((opt) => {
                    const isActive = selectedFilter === opt;
                    const onClick = () => onFilterChange?.(opt);
                    return renderFilter
                      ? renderFilter(opt, isActive, onClick)
                      : defaultFilter(opt, isActive, onClick);
                  })}
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Contadores */}
      {counts && countDefs.length > 0 && (
        <>
          {/* móvil */}
          <div className="md:hidden">
            <Card>
              <CardContent className="p-0">
                <button
                  onClick={() => setIsCountsOpen(!isCountsOpen)}
                  className="w-full flex items-center justify-between p-4 hover:bg-muted/50 transition-colors"
                >
                  <span className="text-sm font-medium">Ver contadores</span>
                  <ChevronDown
                    className={`w-5 h-5 text-muted-foreground transition-transform ${
                      isCountsOpen ? "rotate-180" : ""
                    }`}
                  />
                </button>

                {isCountsOpen && (
                  <div className="border-t p-4 space-y-3">
                    {countDefs.map((def) => (
                      <div
                        key={def.key}
                        className="flex items-center justify-between py-2 border-b last:border-b-0"
                      >
                        <span className="text-sm text-muted-foreground">
                          {def.label}
                        </span>
                        <span
                          className={`text-lg font-bold ${
                            def.className || "text-primary"
                          }`}
                        >
                          {typeof counts[def.key] === "number"
                            ? counts[def.key].toLocaleString()
                            : counts[def.key] ?? 0}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* escritorio */}
          <div
            className={`hidden md:grid ${
              countsWrapperClassName ||
              `grid-cols-1 ${responsiveColsClass} gap-3 md:gap-4`
            }`}
          >
            {countDefs.map((def) =>
              renderCountCard
                ? renderCountCard(def, counts[def.key])
                : defaultCountCard(def, counts[def.key])
            )}
          </div>
        </>
      )}

      {/* Contenido */}
      <div
        className={
          layout === "list" ? "w-full space-y-4" : contentClassName
        }
      >
        {loading ? (
          loadingNode || (
            <Card className="col-span-full">
              <CardContent className="text-center py-8 md:py-12">
                <div className="animate-pulse">
                  <div className="text-sm md:text-base text-muted-foreground">
                    Cargando...
                  </div>
                </div>
              </CardContent>
            </Card>
          )
        ) : (
          children
        )}
      </div>

      {/* Paginación */}
      {!loading && totalPages > 1 && (
        <Card>
          <CardContent className="pt-4 pb-4 px-4 md:pt-6 md:pb-6 md:px-6">
            <div
              className={`flex flex-col sm:flex-row items-center justify-between gap-3 ${paginationClassName}`}
            >
              <span className="text-xs sm:text-sm text-muted-foreground order-2 sm:order-1">
                <span className="hidden sm:inline">
                  {total.toLocaleString()} resultado
                  {total === 1 ? "" : "s"} · Página {page} de {totalPages}
                </span>
                <span className="sm:hidden">
                  {page} de {totalPages} ({total.toLocaleString()})
                </span>
              </span>

              <div className="flex items-center gap-2 order-1 sm:order-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page <= 1}
                  onClick={onPrevPage}
                  className="text-xs sm:text-sm"
                >
                  <span className="hidden sm:inline">Anterior</span>
                  <span className="sm:hidden">Ant.</span>
                </Button>
                <span className="text-xs sm:text-sm text-muted-foreground px-2">
                  {page}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= totalPages}
                  onClick={onNextPage}
                  className="text-xs sm:text-sm"
                >
                  <span className="hidden sm:inline">Siguiente</span>
                  <span className="sm:hidden">Sig.</span>
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Vacío */}
      {!loading && total === 0 && showDefaultEmpty && (
        emptyNode || (
          <Card>
            <CardContent className="text-center py-8 md:py-12">
              <div className="max-w-md mx-auto space-y-3">
                <div className="text-4xl md:text-5xl opacity-20">📭</div>
                <p className="text-sm md:text-base text-muted-foreground leading-relaxed">
                  {emptyText}
                </p>
              </div>
            </CardContent>
          </Card>
        )
      )}
    </div>
  );
}
