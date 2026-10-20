import * as React from "react"

import { TableCell, TableHead, TableRow } from "@/components/primitives/table"

function TableCellRow({
  cells,
  header,
  className,
}: {
  cells: React.ReactNode[]
  header?: React.ReactNode
  className?: string
}) {
  return (
    <TableRow className={className}>
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
