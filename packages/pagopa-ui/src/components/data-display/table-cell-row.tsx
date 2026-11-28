import * as React from "react"

import { TableCell, TableHead, TableRow } from "@/components/primitives/table"

export interface TableCellRowProps extends Omit<React.ComponentProps<"tr">, "children"> {
  cells: React.ReactNode[]
  header?: React.ReactNode
}

function TableCellRow({ cells, header, className, ref, ...props }: TableCellRowProps) {
  return (
    <TableRow ref={ref} data-slot="table-cell-row" className={className} {...props}>
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
