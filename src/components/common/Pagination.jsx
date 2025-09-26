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
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      const start = Math.max(1, currentPage - 2);
      const end = Math.min(totalPages, start + MAX_VISIBLE - 1);

      for (let i = start; i <= end; i++) pages.push(i);

      while (pages.length < MAX_VISIBLE && pages[0] > 1) {
        pages.unshift(pages[0] - 1);
      }
    }

    return pages;
  };

  const pages = getVisiblePages();

  return (
    <div className={`flex flex-col md:flex-row items-center justify-between gap-4 ${className}`}>
      <div className="flex items-center gap-2">
        <span className="text-sm">Elementos por página:</span>
        <Select value={String(pageSize)} onValueChange={(val) => onPageSizeChange(Number(val))}>
          <SelectTrigger className="w-[80px] h-8">
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

      <div className="flex items-center gap-2 flex-wrap">
        <Button
          size="sm"
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
          disabled={isLoading || currentPage === totalPages}
          onClick={() => onPageChange(currentPage + 1)}
        >
          Siguiente
        </Button>

        {isLoading && <Loader2 className="animate-spin ml-2 w-4 h-4" size={16} />}
      </div>
    </div>
  );
}
