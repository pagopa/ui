import * as React from "react"

import { TableCell } from "@/components/primitives/table"

type TableListFieldProps = React.ComponentProps<"td"> & { label?: string }

function TableListField({ children, label, ...props }: TableListFieldProps) {
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
export type { TableListFieldProps }
