import * as React from "react"

import { ArrowUpDown } from "@/components/primitives/icons"
import { PagoPAIcon } from "@/components/icons/PagoPAIcon"
import { TableHead } from "@/components/primitives/table"

interface TableSort {
  direction: "ascending" | "descending" | "none"
  onChange: () => void
}

function TableHeaderField({
  children,
  sort,
  ...props
}: React.ComponentProps<typeof TableHead> & { sort?: TableSort }) {
  return (
    <TableHead scope="col" aria-sort={sort?.direction} {...props}>
      {sort ? (
        <button
          type="button"
          aria-label={typeof children === "string" ? `Ordina per ${children}` : undefined}
          onClick={sort.onChange}
          className="inline-flex min-h-11 items-center gap-2 rounded-sm text-left whitespace-normal focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        >
          {children}
          {sort.direction === "none" ? (
            <ArrowUpDown aria-hidden="true" className="size-6 shrink-0" />
          ) : (
            <PagoPAIcon name="arrow" variant={sort.direction === "ascending" ? "up" : "down"} />
          )}
        </button>
      ) : (
        children
      )}
    </TableHead>
  )
}

export { TableHeaderField, type TableSort }
