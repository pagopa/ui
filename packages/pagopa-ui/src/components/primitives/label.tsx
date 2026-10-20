import * as React from "react"
import { cn } from "@/lib/cn"

function Label({ className, ...props }: React.ComponentProps<"label">) {
  return (
    // Generic wrapper: association is the caller's responsibility (htmlFor or
    // wrapping the control). Base UI has no Label primitive; see .migration/label.md.
    // oxlint-disable-next-line jsx-a11y/label-has-associated-control
    <label
      data-slot="label"
      className={cn(
        "flex items-center gap-2 text-label-sb select-none group-data-[disabled=true]:pointer-events-none group-data-[disabled=true]:opacity-50 peer-disabled:cursor-not-allowed peer-disabled:opacity-50",
        className,
      )}
      {...props}
    />
  )
}

export { Label }
