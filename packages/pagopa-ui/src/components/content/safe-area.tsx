import * as React from "react"
import { cn } from "@/lib/cn"

export type SafeAreaProps = React.ComponentProps<"div">

function SafeArea({ className, ...props }: SafeAreaProps) {
  return (
    <div
      data-slot="safe-area"
      className={cn(
        "pui:mx-auto pui:w-full pui:max-w-7xl pui:px-4 pui:tablet:px-6 pui:desktop:px-8",
        className,
      )}
      {...props}
    />
  )
}

export { SafeArea }
