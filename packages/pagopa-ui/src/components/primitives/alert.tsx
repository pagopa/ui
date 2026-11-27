"use client"

import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/cn"

const alertVariants = cva(
  "pui:@container/alert group/alert pui:relative pui:grid pui:w-full pui:min-w-0 pui:grid-cols-1 pui:gap-1 pui:rounded-lg pui:border pui:p-4 pui:text-left pui:text-body pui:has-[>svg]:grid-cols-[auto_minmax(0,1fr)] pui:has-[>svg]:gap-x-2 pui:has-[>[data-slot=alert-icon]]:grid-cols-[auto_minmax(0,1fr)] pui:has-[>[data-slot=alert-icon]]:gap-x-2 pui:*:[svg]:row-span-2 pui:*:[svg]:translate-y-0.5 pui:*:[svg]:text-current pui:*:[svg:not(.pagopa-icon)]:size-6 pui:[&>[data-slot=alert-action]]:mt-3",
  {
    variants: {
      variant: {
        default: "pui:border-info-border pui:bg-info-soft pui:text-info-foreground",
        info: "pui:border-info-border pui:bg-info-soft pui:text-info-foreground",
        success: "pui:border-success-border pui:bg-success-soft pui:text-success-foreground",
        warning: "pui:border-warning-border pui:bg-warning-soft pui:text-warning-foreground",
        destructive: "pui:border-error-border pui:bg-error-soft pui:text-error-foreground",
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
  "group/alert-content pui:grid pui:min-w-0 pui:[&>[data-slot=alert-action]]:mt-0",
  {
    variants: {
      direction: {
        vertical: "pui:grid-cols-1 pui:gap-y-4",
        horizontal:
          "pui:grid-cols-1 pui:gap-y-4 pui:@min-compact/alert:grid-cols-[minmax(0,1fr)_auto] pui:@min-compact/alert:items-center pui:@min-compact/alert:gap-x-16 pui:@min-compact/alert:gap-y-0",
      },
    },
    defaultVariants: {
      direction: "vertical",
    },
  },
)

export type AlertProps = React.ComponentProps<"div"> &
  VariantProps<typeof alertVariants> & {
    /**
     * `horizontal` places the action beside the copy.
     * @default "vertical"
     */
    direction?: AlertDirection
  }

/** Props of the alert icon slot. */
export type AlertIconProps = React.ComponentProps<"span">
/** Props of the alert content slot. */
export type AlertContentProps = React.ComponentProps<"div">
/** Props of the alert copy slot. */
export type AlertCopyProps = React.ComponentProps<"div">
/** Props of the alert title. */
export type AlertTitleProps = React.ComponentProps<"div">
/** Props of the alert description. */
export type AlertDescriptionProps = React.ComponentProps<"div">
/** Props of the alert action slot. */
export type AlertActionProps = React.ComponentProps<"div">

function Alert({ className, variant, direction = "vertical", ...props }: AlertProps) {
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

function AlertIcon({ className, ...props }: AlertIconProps) {
  return (
    <span
      data-slot="alert-icon"
      className={cn(
        "pui:grid pui:size-6 pui:shrink-0 pui:place-items-center pui:text-current",
        className,
      )}
      {...props}
    />
  )
}

function AlertContent({ className, ...props }: AlertContentProps) {
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

function AlertCopy({ className, ...props }: AlertCopyProps) {
  return (
    <div
      data-slot="alert-copy"
      className={cn("pui:grid pui:min-w-0 pui:grid-cols-1 pui:gap-y-1", className)}
      {...props}
    />
  )
}

function AlertTitle({ className, ...props }: AlertTitleProps) {
  return (
    <div
      data-slot="alert-title"
      className={cn(
        "pui:min-w-0 pui:text-body-big-sb pui:group-has-[>svg]/alert:col-start-2 pui:[&_a]:underline pui:[&_a]:underline-offset-3",
        className,
      )}
      {...props}
    />
  )
}

function AlertDescription({ className, ...props }: AlertDescriptionProps) {
  return (
    <div
      data-slot="alert-description"
      className={cn(
        "pui:min-w-0 pui:text-body pui:text-current pui:[&_a]:underline pui:[&_a]:underline-offset-3 pui:[&_p:not(:last-child)]:mb-4",
        className,
      )}
      {...props}
    />
  )
}

function AlertAction({ className, ...props }: AlertActionProps) {
  return (
    <div
      data-slot="alert-action"
      className={cn(
        "pui:flex pui:min-w-0 pui:max-w-full pui:flex-wrap pui:items-center pui:gap-2 pui:group-has-[>svg]/alert:col-start-2",
        className,
      )}
      {...props}
    />
  )
}

export {
  Alert,
  AlertAction,
  AlertContent,
  AlertCopy,
  AlertDescription,
  AlertIcon,
  AlertTitle,
  alertContentVariants,
  alertVariants,
}
export type { AlertDirection }
