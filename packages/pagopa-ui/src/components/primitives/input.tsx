import * as React from "react"
import { cn } from "@/lib/cn"

export type InputProps = React.ComponentProps<"input">

function Input({ className, type, ...props }: InputProps) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "pui:min-h-12 pui:w-full pui:min-w-0 pui:rounded-lg pui:border pui:border-input pui:bg-background pui:px-3 pui:py-3 pui:text-label-sb pui:text-foreground pui:transition-[color,background-color,border-color] pui:outline-none pui:file:inline-flex pui:file:h-7 pui:file:border-0 pui:file:bg-transparent pui:file:text-caption-sb pui:file:text-foreground pui:placeholder:text-muted-foreground pui:focus-visible:border-ring pui:focus-visible:outline-2 pui:focus-visible:outline-solid pui:focus-visible:outline-offset-1 pui:focus-visible:outline-ring pui:disabled:pointer-events-none pui:disabled:cursor-not-allowed pui:disabled:bg-muted pui:disabled:text-muted-foreground pui:aria-invalid:border-destructive pui:aria-invalid:outline-destructive",
        className,
      )}
      {...props}
    />
  )
}

export { Input }
