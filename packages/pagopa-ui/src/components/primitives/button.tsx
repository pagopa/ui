import { Button as ButtonPrimitive } from "@base-ui/react/button"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/cn"
import { SpinnerIndicator } from "./spinner-indicator"

// Outlined strokes are inset rings so they sit inside the padding like the
// source's inside stroke. Forced colors drops box shadows, so a real border
// keeps every button's edge visible there.
const buttonVariants = cva(
  "group/button inline-flex min-w-0 max-w-full shrink-0 items-center justify-center rounded-lg border-transparent bg-clip-padding text-button whitespace-normal [overflow-wrap:anywhere] transition-[color,background-color,border-color] outline-none select-none focus-visible:outline-2 focus-visible:outline-solid focus-visible:outline-offset-2 focus-visible:outline-ring disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-destructive aria-invalid:inset-ring-destructive forced-colors:border [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-5",
  {
    variants: {
      variant: {
        default:
          "bg-primary px-6 text-primary-foreground hover:bg-primary-hover active:bg-primary-active aria-invalid:inset-ring",
        outline:
          "bg-transparent px-6 text-primary inset-ring-2 inset-ring-primary hover:bg-accent active:bg-accent-active forced-colors:border-2",
        secondary: "border bg-secondary px-4 text-secondary-foreground hover:bg-secondary-hover",
        ghost: "border px-4 text-primary hover:bg-accent active:bg-accent-active",
        destructive:
          "bg-destructive px-6 text-destructive-foreground hover:bg-destructive-hover focus-visible:outline-destructive aria-invalid:inset-ring",
        "outline-destructive":
          "bg-transparent px-6 text-destructive inset-ring-2 inset-ring-destructive hover:bg-error-soft focus-visible:outline-destructive forced-colors:border-2",
        "ghost-destructive":
          "border bg-transparent px-4 text-destructive hover:bg-error-soft focus-visible:outline-destructive",
        contrast:
          "bg-contrast px-6 text-contrast-foreground hover:bg-accent active:bg-accent-active aria-invalid:inset-ring",
        "outline-contrast":
          "bg-transparent px-6 text-contrast inset-ring-2 inset-ring-contrast hover:bg-contrast/10 active:bg-contrast/20 focus-visible:outline-contrast forced-colors:border-2",
        "ghost-contrast":
          "border bg-transparent px-4 text-contrast hover:bg-contrast/10 active:bg-contrast/20 focus-visible:outline-contrast",
        link: "border px-4 text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "min-h-12 gap-2 [&_svg:not([class*='size-'])]:size-6",
        xs: "min-h-8 gap-1 px-3 text-label-mini-sb",
        sm: "min-h-10 gap-1.5 px-3.5 text-label-mini-sb",
        lg: "min-h-12 gap-2 px-6 text-body-big-sb",
        icon: "size-11 p-0 [&_svg:not([class*='size-'])]:size-6",
        "icon-xs":
          "size-6 rounded-md in-data-[slot=button-group]:rounded-lg [&_svg:not([class*='size-'])]:size-3",
        "icon-sm": "size-7 rounded-md in-data-[slot=button-group]:rounded-lg",
        "icon-lg": "size-12",
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
      className={cn(buttonVariants({ variant, size, className }), busy && "pointer-events-none")}
      {...props}
    >
      {loading ? (
        <SpinnerIndicator dataSlot="button-loading-spinner" className="size-6 text-current" />
      ) : null}
      {skeleton ? (
        <>
          <span className="sr-only">{children}</span>
          <span
            data-slot="button-skeleton"
            aria-hidden="true"
            className="h-4 w-23 rounded-full bg-skeleton-strong opacity-30 forced-colors:forced-color-adjust-none forced-colors:bg-[CanvasText]"
          />
        </>
      ) : loading ? (
        <span className="sr-only">{children}</span>
      ) : (
        children
      )}
    </ButtonPrimitive>
  )
}

export { Button, buttonVariants }
