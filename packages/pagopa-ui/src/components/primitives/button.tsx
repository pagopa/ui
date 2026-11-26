"use client"

import { Button as ButtonPrimitive } from "@base-ui/react/button"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/cn"
import { SpinnerIndicator } from "./spinner-indicator"

// Outlined strokes are inset rings so they sit inside the padding like the
// source's inside stroke. Forced colors drops box shadows, so a real border
// keeps every button's edge visible there.
const buttonVariants = cva(
  "group/button pui:inline-flex pui:min-w-0 pui:max-w-full pui:shrink-0 pui:items-center pui:justify-center pui:rounded-lg pui:border-transparent pui:bg-clip-padding pui:text-button pui:whitespace-normal pui:[overflow-wrap:anywhere] pui:transition-[color,background-color,border-color] pui:outline-none pui:select-none pui:focus-visible:outline-2 pui:focus-visible:outline-solid pui:focus-visible:outline-offset-2 pui:focus-visible:outline-ring pui:disabled:pointer-events-none pui:disabled:opacity-50 pui:aria-invalid:border-destructive pui:aria-invalid:inset-ring-destructive pui:forced-colors:border pui:[&_svg]:pointer-events-none pui:[&_svg]:shrink-0 pui:[&_svg:not([class*='size-'])]:size-5",
  {
    variants: {
      variant: {
        default:
          "pui:bg-primary pui:px-6 pui:text-primary-foreground pui:hover:bg-primary-hover pui:active:bg-primary-active pui:aria-invalid:inset-ring",
        outline:
          "pui:bg-transparent pui:px-6 pui:text-primary pui:inset-ring-2 pui:inset-ring-primary pui:hover:bg-accent pui:active:bg-accent-active pui:forced-colors:border-2",
        secondary:
          "pui:border pui:bg-secondary pui:px-4 pui:text-secondary-foreground pui:hover:bg-secondary-hover",
        ghost:
          "pui:border pui:px-4 pui:text-primary pui:hover:bg-accent pui:active:bg-accent-active",
        destructive:
          "pui:bg-destructive pui:px-6 pui:text-destructive-foreground pui:hover:bg-destructive-hover pui:focus-visible:outline-destructive pui:aria-invalid:inset-ring",
        "outline-destructive":
          "pui:bg-transparent pui:px-6 pui:text-destructive pui:inset-ring-2 pui:inset-ring-destructive pui:hover:bg-error-soft pui:focus-visible:outline-destructive pui:forced-colors:border-2",
        "ghost-destructive":
          "pui:border pui:bg-transparent pui:px-4 pui:text-destructive pui:hover:bg-error-soft pui:focus-visible:outline-destructive",
        contrast:
          "pui:bg-contrast pui:px-6 pui:text-contrast-foreground pui:hover:bg-accent pui:active:bg-accent-active pui:aria-invalid:inset-ring",
        "outline-contrast":
          "pui:bg-transparent pui:px-6 pui:text-contrast pui:inset-ring-2 pui:inset-ring-contrast pui:hover:bg-contrast/10 pui:active:bg-contrast/20 pui:focus-visible:outline-contrast pui:forced-colors:border-2",
        "ghost-contrast":
          "pui:border pui:bg-transparent pui:px-4 pui:text-contrast pui:hover:bg-contrast/10 pui:active:bg-contrast/20 pui:focus-visible:outline-contrast",
        link: "pui:border pui:px-4 pui:text-primary pui:underline-offset-4 pui:hover:underline",
      },
      size: {
        default: "pui:min-h-12 pui:gap-2 pui:[&_svg:not([class*='size-'])]:size-6",
        xs: "pui:min-h-8 pui:gap-1 pui:px-3 pui:text-label-mini-sb",
        sm: "pui:min-h-10 pui:gap-1.5 pui:px-3.5 pui:text-label-mini-sb",
        lg: "pui:min-h-12 pui:gap-2 pui:px-6 pui:text-body-big-sb",
        icon: "pui:size-11 pui:p-0 pui:[&_svg:not([class*='size-'])]:size-6",
        "icon-xs":
          "pui:size-6 pui:rounded-md pui:in-data-[slot=button-group]:rounded-lg pui:[&_svg:not([class*='size-'])]:size-3",
        "icon-sm": "pui:size-7 pui:rounded-md pui:in-data-[slot=button-group]:rounded-lg",
        "icon-lg": "pui:size-12",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
)

function Button({
  className,
  variant = "default",
  size = "default",
  children,
  disabled,
  loading = false,
  skeleton = false,
  ...props
}: ButtonPrimitive.Props &
  VariantProps<typeof buttonVariants> & {
    loading?: boolean
    skeleton?: boolean
  }) {
  const busy = loading || skeleton
  return (
    <ButtonPrimitive
      aria-busy={busy || undefined}
      data-slot="button"
      data-variant={variant}
      data-size={size}
      disabled={disabled || busy}
      // A busy action keeps its place in the tab order and announces its state:
      // dropping the focus would strand keyboard and screen reader users.
      focusableWhenDisabled={!disabled && busy}
      className={cn(
        buttonVariants({ variant, size, className }),
        busy && "pui:pointer-events-none",
      )}
      {...props}
    >
      {loading ? (
        <SpinnerIndicator
          dataSlot="button-loading-spinner"
          className="pui:size-6 pui:text-current"
        />
      ) : null}
      {skeleton ? (
        <>
          <span className="pui:sr-only">{children}</span>
          <span
            data-slot="button-skeleton"
            aria-hidden="true"
            className="pui:h-4 pui:w-23 pui:rounded-full pui:bg-skeleton-strong pui:opacity-30 pui:forced-colors:forced-color-adjust-none pui:forced-colors:bg-[CanvasText]"
          />
        </>
      ) : loading ? (
        <span className="pui:sr-only">{children}</span>
      ) : (
        children
      )}
    </ButtonPrimitive>
  )
}

export { Button, buttonVariants }
