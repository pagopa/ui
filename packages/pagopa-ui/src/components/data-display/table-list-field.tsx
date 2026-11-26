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
            className="pui:hidden pui:text-label-mini pui:text-muted-foreground pui:@max-narrow/table:mb-1 pui:@max-narrow/table:block"
          >
            {label}
          </span>
          <div className="pui:min-w-0 pui:wrap-anywhere pui:whitespace-normal">{children}</div>
        </>
      ) : (
        children
      )}
    </TableCell>
  )
}

export { TableListField }
