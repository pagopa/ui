"use client"

import { cn } from "@/lib/cn"
import { useMessages } from "@/lib/ui-provider"

import { ChevronLeft, ChevronRight } from "@/components/primitives/icons"
import { Button } from "@/components/primitives/button"

import { pageRange } from "./pagination-utils"

// The source draws 40px page elements: previous and next are 40x40 with a 2px
// stroke, a page hugs its number (padding 12, so 40x46, wider for three digits).
// The ::after expansion keeps every control a 44px target without growing it.
// Below the `tablet-md` container step (900px) the middle pages collapse to
// previous, current and next; the step is the pagination region's own width,
// not the viewport.
const stepControl = "relative size-10 border-2 border-border after:absolute after:-inset-0.5"
const pageControl =
  "relative min-w-10 border-0 p-3 after:absolute after:-inset-x-0.5 after:inset-y-0"

function Pagination({
  currentPage,
  totalPages,
  onPageChange,
  className,
  label: labelProp,
  previousLabel: previousLabelProp,
  nextLabel: nextLabelProp,
  pageLabel: pageLabelProp,
}: {
  currentPage: number
  totalPages: number
  onPageChange: (page: number) => void
  className?: string
  /** Accessible name of the page list. @default messages.pagination.label */
  label?: string
  /** Accessible name of the previous-page control. @default messages.pagination.previousLabel */
  previousLabel?: string
  /** Accessible name of the next-page control. @default messages.pagination.nextLabel */
  nextLabel?: string
  /**
   * Accessible name of a page control. The caller owns the phrase, so word
   * order and grammar stay translatable. @default messages.pagination.pageLabel
   */
  pageLabel?: (page: number) => string
}) {
  const t = useMessages("pagination")
  const label = labelProp ?? t.label
  const previousLabel = previousLabelProp ?? t.previousLabel
  const nextLabel = nextLabelProp ?? t.nextLabel
  const pageLabel = pageLabelProp ?? t.pageLabel

  if (!Number.isInteger(totalPages) || totalPages < 0) {
    throw new RangeError("Pagination totalPages must be a non-negative integer")
  }
  // One page (or none) has nothing to move through: the whole control hides.
  if (totalPages <= 1) return null
  const current = Math.min(Math.max(currentPage, 1), totalPages)
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
            className={stepControl}
          >
            <ChevronLeft aria-hidden="true" />
          </Button>
          {pageRange(current, totalPages).map((page, index) =>
            page === "ellipsis" ? (
              <span
                key={`ellipsis-${index}`}
                aria-hidden="true"
                className="grid size-10 shrink-0 place-items-center @max-tablet-md/pagination:hidden"
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
                size={null}
                aria-current={page === current ? "page" : undefined}
                aria-label={pageLabel(page)}
                onClick={() => onPageChange(page)}
                className={cn(
                  pageControl,
                  page !== current && "text-foreground @max-tablet-md/pagination:hidden",
                )}
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
            className={stepControl}
          >
            <ChevronRight aria-hidden="true" />
          </Button>
        </nav>
      </div>
    </div>
  )
}

export { Pagination }
