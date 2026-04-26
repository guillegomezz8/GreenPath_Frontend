import { useMemo, useState } from "react";
import { Check, ChevronsUpDown, Search } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/components/Utils";

export function mergeById(currentItems, incomingItems) {
  const byId = new Map();

  (incomingItems || []).forEach((item) => {
    if (item?.id !== undefined && item?.id !== null) {
      byId.set(String(item.id), item);
    }
  });

  (currentItems || []).forEach((item) => {
    const key = String(item?.id);
    if (item?.id !== undefined && item?.id !== null && !byId.has(key)) {
      byId.set(key, item);
    }
  });

  return Array.from(byId.values());
}

export function getWorkerLabel(worker) {
  if (!worker) return "";
  return worker.display_name || `${worker.name || ""} ${worker.surname || ""}`.trim() || worker.username || `Trabajador #${worker.id}`;
}

export default function SearchableEntitySelect({
  value,
  items,
  placeholder,
  searchPlaceholder,
  emptyMessage,
  loading,
  disabled,
  searchValue,
  onSearchChange,
  onValueChange,
  getLabel,
  getSearchText,
  getDescription,
  allowEmpty = false,
  emptyLabel = "Sin seleccionar",
}) {
  const [open, setOpen] = useState(false);
  const normalizedSearch = (searchValue || "").trim().toLowerCase();

  const selectedItem = useMemo(
    () => items.find((item) => String(item.id) === String(value)),
    [items, value],
  );
  const selectedLabel = selectedItem ? getLabel(selectedItem) : "";

  const visibleItems = useMemo(() => {
    if (!normalizedSearch) return items;
    return items.filter((item) => getSearchText(item).toLowerCase().includes(normalizedSearch));
  }, [getSearchText, items, normalizedSearch]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className="h-10 w-full justify-between rounded-md border-input bg-background px-3 text-left font-normal shadow-sm hover:bg-background"
        >
          <span className={cn("min-w-0 flex-1 truncate", !selectedLabel && "text-muted-foreground")}>
            {selectedLabel || placeholder}
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 flex-shrink-0 opacity-55" />
        </Button>
      </PopoverTrigger>

      <PopoverContent align="start" className="w-[--radix-popover-trigger-width] overflow-hidden rounded-md p-0 shadow-lg">
        <div className="flex h-11 items-center gap-2 border-b border-border/70 bg-background px-3">
          <Search className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
          <Input
            value={searchValue}
            onChange={(event) => onSearchChange?.(event.target.value)}
            placeholder={searchPlaceholder}
            className="h-10 border-0 bg-transparent px-0 shadow-none focus-visible:ring-0"
            aria-label={searchPlaceholder}
          />
        </div>

        <div role="listbox" className="max-h-72 overflow-y-auto p-1">
          {allowEmpty && (
            <button
              type="button"
              role="option"
              aria-selected={!value}
              className="flex min-h-10 w-full items-center justify-between gap-3 rounded-md px-3 py-2 text-left text-sm hover:bg-accent hover:text-accent-foreground"
              onClick={() => {
                onValueChange?.("");
                setOpen(false);
              }}
            >
              <span className="min-w-0 truncate text-muted-foreground">{emptyLabel}</span>
              <Check className={cn("h-4 w-4 flex-shrink-0", value ? "opacity-0" : "opacity-100")} />
            </button>
          )}

          {visibleItems.map((item) => {
            const itemValue = String(item.id);
            const isSelected = itemValue === String(value);
            const description = getDescription?.(item);

            return (
              <button
                key={itemValue}
                type="button"
                role="option"
                aria-selected={isSelected}
                className="flex min-h-10 w-full items-center justify-between gap-3 rounded-md px-3 py-2 text-left text-sm hover:bg-accent hover:text-accent-foreground"
                onClick={() => {
                  onValueChange?.(itemValue, item);
                  setOpen(false);
                }}
              >
                <span className="min-w-0">
                  <span className="block truncate">{getLabel(item)}</span>
                  {description ? <span className="block truncate text-xs text-muted-foreground">{description}</span> : null}
                </span>
                <Check className={cn("h-4 w-4 flex-shrink-0", isSelected ? "opacity-100" : "opacity-0")} />
              </button>
            );
          })}

          {visibleItems.length === 0 && (
            <div className="px-3 py-6 text-center text-sm text-muted-foreground">
              {loading ? "Buscando..." : emptyMessage}
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
