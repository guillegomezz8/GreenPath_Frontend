import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search as SearchIcon } from "lucide-react";

const COLS_MAP = {
  1: "md:grid-cols-1",
  2: "md:grid-cols-2",
  3: "md:grid-cols-3",
  4: "md:grid-cols-4",
  5: "md:grid-cols-5",
  6: "md:grid-cols-6",
};

/**
 * Headless layout para:
 * - Header (title, subtitle, acción derecha)
 * - Search + filtros (chips por defecto, o render personalizada)
 * - Contadores (opcional)
 * - Zona de contenido (children)
 * - Paginación
 *
 * Todo es controlado por props. Sin lógica interna de datos.
 */
export default function PaginatedScaffold({
  // Header
  title,
  subtitle,
  rightAction, // { label, onClick, icon, className }

  // Search
  searchPlaceholder = "Buscar...",
  searchValue,
  onSearchChange,
  renderSearch, // (defaultInput) => ReactNode
  searchClassName = "",

  // Filtros
  filters = [],          // ["Todos", "Cada semana", ...]
  selectedFilter,
  onFilterChange,
  renderFilter,          // (opt, isActive, onClick) => ReactNode
  filtersClassName = "",

  // Contadores
  counts,                // { key: number, ... }
  countDefs = [],        // [{ key, label, className }]
  countsWrapperClassName = "",
  renderCountCard,       // (def, value) => ReactNode (si quieres custom total)
  countsCols,            // número de columnas (1-6) o undefined para auto

  // Contenido
  children,
  contentClassName = "grid grid-cols-1 lg:grid-cols-2 gap-6",

  // Loading & Empty
  loading = false,
  loadingNode,           // ReactNode
  emptyNode,             // ReactNode
  emptyText = "No hay resultados con los criterios seleccionados",

  // Paginación
  total = 0,
  page = 1,
  totalPages = 1,
  onPrevPage,
  onNextPage,
  paginationClassName = "",

  // Wrapper general
  className = "space-y-6",
}) {

  const colsNumber = Math.max(1, Math.min(countsCols ?? countDefs.length, 6));
  const mdColsClass = COLS_MAP[colsNumber] || "md:grid-cols-4";

  const defaultSearch = (
    <div className="flex-1 relative">
      <SearchIcon className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
      <Input
        placeholder={searchPlaceholder}
        value={searchValue}
        onChange={(e) => onSearchChange?.(e.target.value)}
        className="pl-10"
      />
    </div>
  );

  const defaultFilter = (opt, isActive, onClick) => (
    <Button
      key={opt}
      variant={isActive ? "default" : "outline"}
      size="sm"
      onClick={onClick}
    >
      {opt}
    </Button>
  );

  const defaultCountCard = (def, value) => (
    <Card key={def.key}>
      <CardContent className="pt-6 text-center">
        <div className={`text-2xl font-bold ${def.className || ""}`}>
          {value ?? 0}
        </div>
        <p className="text-sm text-muted-foreground">{def.label}</p>
      </CardContent>
    </Card>
  );

  return (
    <div className={className}>
      {/* Header */}
      {(title || rightAction) && (
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 text-left">
          <div>
            {!!title && (
              <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
                {title}
              </h1>
            )}
            {!!subtitle && <p className="text-muted-foreground">{subtitle}</p>}
          </div>

          {!!rightAction && (
            <Button className={`gap-2 ${rightAction.className || ""}`} onClick={rightAction.onClick}>
              {rightAction.icon}
              {rightAction.label}
            </Button>
          )}
        </div>
      )}

      {/* Search + Filtros */}
      <Card>
        <CardContent className="pt-6">
          <div className={`flex flex-col md:flex-row gap-4 ${searchClassName}`}>
            {renderSearch ? renderSearch(defaultSearch) : defaultSearch}

            <div className={`flex gap-2 flex-wrap ${filtersClassName}`}>
              {filters.map((opt) => {
                const isActive = selectedFilter === opt;
                const onClick = () => onFilterChange?.(opt);
                return renderFilter
                  ? renderFilter(opt, isActive, onClick)
                  : defaultFilter(opt, isActive, onClick);
              })}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Contadores */}
      {counts && countDefs.length > 0 && (
        <div
          className={
            countsWrapperClassName ||
            `grid grid-cols-1 ${mdColsClass} gap-4`
          }
        >
          {countDefs.map((def) =>
            renderCountCard
              ? renderCountCard(def, counts[def.key])
              : (
                <Card key={def.key}>
                  <CardContent className="pt-6 text-center">
                    <div className={`text-2xl font-bold ${def.className || ""}`}>
                      {counts[def.key] ?? 0}
                    </div>
                    <p className="text-sm text-muted-foreground">{def.label}</p>
                  </CardContent>
                </Card>
              )
          )}
        </div>
      )}

      {/* Contenido */}
      <div className={contentClassName}>
        {loading ? (
          loadingNode || (
            <Card>
              <CardContent className="text-center py-12">Cargando...</CardContent>
            </Card>
          )
        ) : (
          children
        )}
      </div>

      {/* Paginación */}
      {!loading && totalPages > 1 && (
        <div className={`mt-4 flex items-center justify-between gap-3 ${paginationClassName}`}>
          <span className="text-sm text-muted-foreground">
            {total} resultado{total === 1 ? "" : "s"} · Página {page} de {totalPages}
          </span>

          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" disabled={page <= 1} onClick={onPrevPage}>
              Anterior
            </Button>
            <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={onNextPage}>
              Siguiente
            </Button>
          </div>
        </div>
      )}

      {/* Vacío */}
      {!loading && totalPages <= 1 && (!children || (Array.isArray(children) && children.length === 0)) && (
        emptyNode || (
          <Card>
            <CardContent className="text-center py-12">
              <p className="text-muted-foreground">{emptyText}</p>
            </CardContent>
          </Card>
        )
      )}
    </div>
  );
}
