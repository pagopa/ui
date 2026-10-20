import { cn } from "@/lib/cn"

import { ChevronLeft, ChevronRight } from "@/components/primitives/icons"
import { Button } from "@/components/primitives/button"

import { pageRange } from "./pagination-utils"

function Pagination({
  currentPage,
  totalPages,
  onPageChange,
  className,
  label = "Paginazione",
  previousLabel = "Pagina precedente",
  nextLabel = "Pagina successiva",
  pageLabel = (page) => `Pagina ${page}`,
}: {
  currentPage: number
  totalPages: number
  onPageChange: (page: number) => void
  className?: string
  /** Accessible name of the page list. @default "Paginazione" */
  label?: string
  /** Accessible name of the previous-page control. @default "Pagina precedente" */
  previousLabel?: string
  /** Accessible name of the next-page control. @default "Pagina successiva" */
  nextLabel?: string
  /**
   * Accessible name of a page control. The caller owns the phrase, so word
   * order and grammar stay translatable. @default (page) => `Pagina ${page}`
   */
  pageLabel?: (page: number) => string
}) {
  if (!Number.isInteger(totalPages) || totalPages < 0) {
    throw new RangeError("Pagination totalPages must be a non-negative integer")
  }
  const current = Math.min(Math.max(currentPage, 1), Math.max(totalPages, 1))
  return (
    <div className={cn("@container/pagination min-w-0 flex-1", className)}>
      <div className="flex items-center gap-2">
        <nav aria-label={label} className="flex min-w-0 flex-1 items-center justify-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            disabled={current === 1}
            onClick={() => onPageChange(current - 1)}
            aria-label={previousLabel}
            className="border-2 border-border"
          >
            <ChevronLeft aria-hidden="true" />
          </Button>
          {pageRange(current, totalPages).map((page, index) =>
            page === "ellipsis" ? (
              <span
                key={`ellipsis-${index}`}
                aria-hidden="true"
                className="grid size-11 shrink-0 place-items-center @max-narrow/pagination:hidden"
              >
                <span className="flex items-center gap-0.5">
                  {[0, 1, 2].map((dot) => (
                    <span key={dot} className="size-0.5 rounded-full bg-foreground" />
                  ))}
                </span>
              </span>
            ) : (
              <Button
                key={page}
                variant={page === current ? "default" : "ghost"}
                size="icon"
                aria-current={page === current ? "page" : undefined}
                aria-label={pageLabel(page)}
                onClick={() => onPageChange(page)}
                className={cn(page !== current && "text-foreground @max-narrow/pagination:hidden")}
              >
                {page}
              </Button>
            ),
          )}
          <Button
            variant="ghost"
            size="icon"
            disabled={current >= totalPages}
            onClick={() => onPageChange(current + 1)}
            aria-label={nextLabel}
            className="border-2 border-border"
          >
            <ChevronRight aria-hidden="true" />
          </Button>
        </nav>
      </div>
    </div>
  )
}

export { Pagination }
