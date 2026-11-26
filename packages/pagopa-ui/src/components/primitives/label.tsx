import * as React from "react"
import { cn } from "@/lib/cn"

export type LabelProps = React.ComponentProps<"label">

function Label({ className, ...props }: LabelProps) {
  return (
    // Generic wrapper: association is the caller's responsibility (htmlFor or
    // wrapping the control). Base UI has no Label primitive; see .migration/label.md.
    // oxlint-disable-next-line jsx-a11y/label-has-associated-control
    <label
      data-slot="label"
      className={cn(
        "pui:flex pui:items-center pui:gap-2 pui:text-label-sb pui:select-none pui:group-data-[disabled=true]:pointer-events-none pui:group-data-[disabled=true]:opacity-50 pui:peer-disabled:cursor-not-allowed pui:peer-disabled:opacity-50",
        className,
      )}
      {...props}
    />
  )
}

export { Label }
