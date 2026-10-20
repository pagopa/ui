import * as React from "react"
import { cn } from "@/lib/cn"

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "min-h-12 w-full min-w-0 rounded-lg border border-input bg-background px-3 py-3 text-label-sb text-foreground transition-[color,background-color,border-color] outline-none file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-caption-sb file:text-foreground placeholder:text-muted-foreground focus-visible:border-ring focus-visible:outline-2 focus-visible:outline-solid focus-visible:outline-offset-1 focus-visible:outline-ring disabled:pointer-events-none disabled:cursor-not-allowed disabled:bg-muted disabled:text-muted-foreground aria-invalid:border-destructive aria-invalid:outline-destructive",
        className,
      )}
      {...props}
    />
  )
}

export { Input }
