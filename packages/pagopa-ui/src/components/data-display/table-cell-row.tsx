import * as React from "react"

import { TableCell, TableHead, TableRow } from "@/components/primitives/table"

export interface TableCellRowProps {
  cells: React.ReactNode[]
  header?: React.ReactNode
  className?: string
}

function TableCellRow({ cells, header, className }: TableCellRowProps) {
  return (
    <TableRow data-slot="table-cell-row" className={className}>
      {cells.map((cell, index) =>
        index === 0 && header ? (
          <TableHead key={index} scope="row">
            {header}
          </TableHead>
        ) : (
          <TableCell key={index}>{cell}</TableCell>
        ),
      )}
    </TableRow>
  )
}

export { TableCellRow }
