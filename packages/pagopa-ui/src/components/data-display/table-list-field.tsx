import * as React from "react"

import { TableCell } from "@/components/primitives/table"

function TableListField({
  children,
  label,
  ...props
}: React.ComponentProps<typeof TableCell> & { label?: string }) {
  return (
    <TableCell {...props}>
      {label ? (
        <>
          <span
            aria-hidden="true"
            className="hidden text-label-mini text-muted-foreground @max-narrow/table:mb-1 @max-narrow/table:block"
          >
            {label}
          </span>
          <div className="min-w-0 wrap-anywhere whitespace-normal">{children}</div>
        </>
      ) : (
        children
      )}
    </TableCell>
  )
}

export { TableListField }
