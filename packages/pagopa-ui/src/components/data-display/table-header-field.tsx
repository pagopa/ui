"use client"

import * as React from "react"

import { useMessages } from "@/lib/ui-provider"
import { Down as ArrowDownIcon, Up as ArrowUpIcon } from "@/components/icons/generated/arrow"
import { Default as UnfoldIcon } from "@/components/icons/generated/unfold"
import { TableHead } from "@/components/primitives/table"

interface TableSort {
  direction: "ascending" | "descending" | "none"
  onChange: () => void
}

type TableHeaderFieldProps = React.ComponentProps<"th"> & {
  sort?: TableSort
}

function TableHeaderField({ children, sort, ...props }: TableHeaderFieldProps) {
  const t = useMessages("table")
  const SortGlyph = sort?.direction === "ascending" ? ArrowUpIcon : ArrowDownIcon
  return (
    <TableHead data-slot="table-header-field" scope="col" aria-sort={sort?.direction} {...props}>
      {sort ? (
        <button
          type="button"
          aria-label={typeof children === "string" ? t.sortLabel(children) : undefined}
          onClick={sort.onChange}
          className="pui:inline-flex pui:min-h-11 pui:items-center pui:gap-2 pui:rounded-sm pui:text-left pui:whitespace-normal pui:focus-visible:outline-2 pui:focus-visible:outline-offset-2 pui:focus-visible:outline-ring"
        >
          {children}
          {sort.direction === "none" ? (
            <UnfoldIcon className="pui:size-6 pui:shrink-0" />
          ) : (
            <SortGlyph />
          )}
        </button>
      ) : (
        children
      )}
    </TableHead>
  )
}

export { TableHeaderField }
export type { TableHeaderFieldProps, TableSort }
