import * as React from "react"
import { cn } from "@/lib/cn"

export type TextareaProps = React.ComponentProps<"textarea">

function Textarea({ className, ...props }: TextareaProps) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "pui:flex pui:field-sizing-content pui:min-h-23 pui:w-full pui:rounded-lg pui:border pui:border-input pui:bg-background pui:px-3 pui:py-3 pui:text-label-sb pui:transition-[color,background-color,border-color] pui:outline-none pui:placeholder:text-muted-foreground pui:focus-visible:border-ring pui:focus-visible:outline-2 pui:focus-visible:outline-solid pui:focus-visible:outline-offset-1 pui:focus-visible:outline-ring pui:disabled:cursor-not-allowed pui:disabled:bg-muted pui:disabled:text-muted-foreground pui:aria-invalid:border-destructive pui:aria-invalid:outline-destructive",
        className,
      )}
      {...props}
    />
  )
}

export { Textarea }
