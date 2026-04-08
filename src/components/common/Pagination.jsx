import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2 } from "lucide-react";

export function Pagination({
  currentPage,
  totalPages,
  onPageChange,
  pageSize,
  onPageSizeChange,
  isLoading = false,
  className = "",
}) {
  const MAX_VISIBLE = 5;

  const getVisiblePages = () => {
    const pages = [];

    if (totalPages <= MAX_VISIBLE) {
      for (let i = 1; i <= totalPages; i += 1) pages.push(i);
    } else {
      const start = Math.max(1, currentPage - 2);
      const end = Math.min(totalPages, start + MAX_VISIBLE - 1);

      for (let i = start; i <= end; i += 1) pages.push(i);

      while (pages.length < MAX_VISIBLE && pages[0] > 1) {
        pages.unshift(pages[0] - 1);
      }
    }

    return pages;
  };

  const pages = getVisiblePages();

  return (
    <div className={`flex flex-col items-stretch justify-between gap-4 md:flex-row md:items-center ${className}`}>
      <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
        <span className="text-center text-sm sm:text-left">Elementos por pagina:</span>
        <Select value={String(pageSize)} onValueChange={(val) => onPageSizeChange(Number(val))}>
          <SelectTrigger className="h-9 w-full sm:w-[88px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {[5, 10, 20, 50].map((size) => (
              <SelectItem key={size} value={String(size)}>
                {size}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex w-full flex-wrap items-center justify-center gap-2 md:w-auto md:justify-end">
        <Button
          size="sm"
          className="min-w-[96px]"
          disabled={isLoading || currentPage === 1}
          onClick={() => onPageChange(currentPage - 1)}
        >
          Anterior
        </Button>

        {pages[0] > 1 && (
          <>
            <Button size="sm" variant="ghost" onClick={() => onPageChange(1)}>
              1
            </Button>
            <span className="text-sm">...</span>
          </>
        )}

        {pages.map((page) => (
          <Button
            key={page}
            size="sm"
            className="min-w-9"
            variant={page === currentPage ? "default" : "ghost"}
            onClick={() => onPageChange(page)}
            disabled={isLoading}
          >
            {page}
          </Button>
        ))}

        {pages[pages.length - 1] < totalPages && (
          <>
            <span className="text-sm">...</span>
            <Button size="sm" variant="ghost" onClick={() => onPageChange(totalPages)}>
              {totalPages}
            </Button>
          </>
        )}

        <Button
          size="sm"
          className="min-w-[96px]"
          disabled={isLoading || currentPage === totalPages}
          onClick={() => onPageChange(currentPage + 1)}
        >
          Siguiente
        </Button>

        {isLoading ? <Loader2 className="ml-2 h-4 w-4 animate-spin" size={16} /> : null}
      </div>
    </div>
  );
}
