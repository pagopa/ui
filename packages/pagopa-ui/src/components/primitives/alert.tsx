"use client"

import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/cn"

const alertVariants = cva(
  "@container/alert group/alert relative grid w-full min-w-0 grid-cols-1 gap-1 rounded-lg border p-4 text-left text-body has-[>svg]:grid-cols-[auto_minmax(0,1fr)] has-[>svg]:gap-x-2 has-[>[data-slot=alert-icon]]:grid-cols-[auto_minmax(0,1fr)] has-[>[data-slot=alert-icon]]:gap-x-2 *:[svg]:row-span-2 *:[svg]:translate-y-0.5 *:[svg]:text-current *:[svg:not([class*='size-'])]:size-6 [&>[data-slot=alert-action]]:mt-3",
  {
    variants: {
      variant: {
        default: "border-info-border bg-info-soft text-info-foreground",
        info: "border-info-border bg-info-soft text-info-foreground",
        success: "border-success-border bg-success-soft text-success-foreground",
        warning: "border-warning-border bg-warning-soft text-warning-foreground",
        destructive: "border-error-border bg-error-soft text-error-foreground",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
)

type AlertDirection = "vertical" | "horizontal"

const alertDirectionContext = React.createContext<AlertDirection>("vertical")

const alertContentVariants = cva(
  "group/alert-content grid min-w-0 [&>[data-slot=alert-action]]:mt-0",
  {
    variants: {
      direction: {
        vertical: "grid-cols-1 gap-y-4",
        horizontal:
          "grid-cols-1 gap-y-4 @md/alert:grid-cols-[minmax(0,1fr)_auto] @md/alert:items-center @md/alert:gap-x-16 @md/alert:gap-y-0",
      },
    },
    defaultVariants: {
      direction: "vertical",
    },
  },
)

function Alert({
  className,
  variant,
  direction = "vertical",
  ...props
}: React.ComponentProps<"div"> &
  VariantProps<typeof alertVariants> & {
    /**
     * `horizontal` places the action beside the copy.
     * @default "vertical"
     */
    direction?: AlertDirection
  }) {
  return (
    <alertDirectionContext.Provider value={direction}>
      <div
        data-slot="alert"
        data-variant={variant ?? "default"}
        data-direction={direction}
        className={cn(alertVariants({ variant }), className)}
        {...props}
      />
    </alertDirectionContext.Provider>
  )
}

function AlertIcon({ className, ...props }: React.ComponentProps<"span">) {
  return (
    <span
      data-slot="alert-icon"
      className={cn("grid size-6 shrink-0 place-items-center text-current", className)}
      {...props}
    />
  )
}

function AlertContent({ className, ...props }: React.ComponentProps<"div">) {
  const direction = React.useContext(alertDirectionContext)
  return (
    <div
      data-slot="alert-content"
      data-direction={direction}
      className={cn(alertContentVariants({ direction }), className)}
      {...props}
    />
  )
}

function AlertCopy({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="alert-copy"
      className={cn("grid min-w-0 grid-cols-1 gap-y-1", className)}
      {...props}
    />
  )
}

function AlertTitle({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="alert-title"
      className={cn(
        "min-w-0 text-body-big-sb group-has-[>svg]/alert:col-start-2 [&_a]:underline [&_a]:underline-offset-3",
        className,
      )}
      {...props}
    />
  )
}

function AlertDescription({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="alert-description"
      className={cn(
        "min-w-0 text-body text-current [&_a]:underline [&_a]:underline-offset-3 [&_p:not(:last-child)]:mb-4",
        className,
      )}
      {...props}
    />
  )
}

function AlertAction({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="alert-action"
      className={cn(
        "flex min-w-0 max-w-full flex-wrap items-center gap-2 group-has-[>svg]/alert:col-start-2",
        className,
      )}
      {...props}
    />
  )
}

export { Alert, AlertIcon, AlertContent, AlertCopy, AlertTitle, AlertDescription, AlertAction }
