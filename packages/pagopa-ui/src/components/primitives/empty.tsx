import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/cn"

function Empty({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="empty"
      className={cn(
        "pui:flex pui:w-full pui:min-w-0 pui:flex-1 pui:flex-col pui:items-center pui:justify-center pui:gap-4 pui:bg-background pui:p-6 pui:text-center pui:text-balance",
        className,
      )}
      {...props}
    />
  )
}

function EmptyHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="empty-header"
      className={cn("pui:flex pui:w-full pui:flex-col pui:items-center pui:gap-2", className)}
      {...props}
    />
  )
}

const emptyMediaVariants = cva(
  "pui:flex pui:shrink-0 pui:items-center pui:justify-center pui:[&_svg]:pointer-events-none pui:[&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "pui:bg-transparent",
        icon: "pui:flex pui:size-8 pui:shrink-0 pui:items-center pui:justify-center pui:rounded-lg pui:bg-muted pui:text-foreground pui:[&_svg:not(.pagopa-icon)]:size-4",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
)

function EmptyMedia({
  className,
  variant = "default",
  ...props
}: React.ComponentProps<"div"> & VariantProps<typeof emptyMediaVariants>) {
  return (
    <div
      data-slot="empty-icon"
      data-variant={variant}
      className={cn(emptyMediaVariants({ variant, className }))}
      {...props}
    />
  )
}

function EmptyTitle({ className, ...props }: React.ComponentProps<"p">) {
  return (
    <p
      data-slot="empty-title"
      className={cn("pui:text-label-sb pui:text-muted-foreground", className)}
      {...props}
    />
  )
}

function EmptyDescription({ className, ...props }: React.ComponentProps<"p">) {
  return (
    <p
      data-slot="empty-description"
      className={cn(
        "pui:text-caption pui:text-muted-foreground pui:[&>a]:underline pui:[&>a]:underline-offset-4 pui:[&>a:hover]:text-primary",
        className,
      )}
      {...props}
    />
  )
}

function EmptyContent({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="empty-content"
      className={cn(
        "pui:flex pui:w-full pui:max-w-sm pui:min-w-0 pui:flex-col pui:items-center pui:gap-2.5 pui:text-caption pui:text-balance",
        className,
      )}
      {...props}
    />
  )
}

export { Empty, EmptyHeader, EmptyTitle, EmptyDescription, EmptyContent, EmptyMedia }
