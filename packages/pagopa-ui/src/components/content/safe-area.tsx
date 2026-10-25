import * as React from "react"
import { cn } from "@/lib/cn"

function SafeArea({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      className={cn("mx-auto w-full max-w-7xl px-4 tablet:px-6 desktop:px-8", className)}
      {...props}
    />
  )
}

export { SafeArea }
