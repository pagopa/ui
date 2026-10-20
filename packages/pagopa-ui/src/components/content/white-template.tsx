import * as React from "react"
import { cn } from "@/lib/cn"

function WhiteTemplate({ className, ...props }: React.ComponentProps<"section">) {
  return (
    <section
      data-slot="white-template"
      className={cn("min-h-(--artboard-height) bg-background text-foreground", className)}
      {...props}
    />
  )
}

export { WhiteTemplate }
