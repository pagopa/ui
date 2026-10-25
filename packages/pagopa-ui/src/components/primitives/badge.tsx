import { mergeProps } from "@base-ui/react/merge-props"
import { useRender } from "@base-ui/react/use-render"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/cn"

const badgeVariants = cva(
  "group/badge inline-flex h-5 w-fit shrink-0 items-center justify-center gap-1 overflow-hidden rounded-4xl border border-transparent px-2 py-0.5 text-caption-sb whitespace-nowrap transition-all focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 aria-invalid:border-destructive aria-invalid:ring-destructive/20 [&>svg]:pointer-events-none [&>svg]:size-3!",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground [a]:hover:bg-primary/80",
        secondary: "bg-secondary text-secondary-foreground [a]:hover:bg-secondary/80",
        destructive:
          "bg-destructive/10 text-error-foreground focus-visible:ring-destructive/20 [a]:hover:bg-destructive/20",
        outline: "border-border text-foreground [a]:hover:bg-muted [a]:hover:text-muted-foreground",
        ghost: "hover:bg-muted hover:text-muted-foreground",
        link: "text-primary underline-offset-4 hover:underline",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
)

type BadgeDisplay = "label" | "numbered" | "plain" | "sidenav-icon"
type BadgeBackground = "transparent" | "white" | "muted" | "primary"

type BadgeProps = useRender.ComponentProps<"span"> &
  VariantProps<typeof badgeVariants> & {
    /** Separates the indicator from the surrounding surface. */
    background?: BadgeBackground
    /**
     * Source appearance: `label` is a short text, `numbered` a count, `plain`
     * and `sidenav-icon` the indicator forms. @default "label"
     */
    display?: BadgeDisplay
    /** `sidenav-icon` selected state. @default false */
    selected?: boolean
  }

const badgeBackgroundRings: Record<BadgeBackground, string> = {
  transparent: "",
  white: "ring-2 ring-background",
  muted: "ring-2 ring-muted",
  primary: "ring-2 ring-selection-soft",
}

function Badge({
  className,
  variant = "default",
  render,
  display = "label",
  background,
  selected = false,
  ...props
}: BadgeProps) {
  const { children, ...elementProps } = props
  const resolvedBackground =
    background ?? (display === "sidenav-icon" ? (selected ? "primary" : "white") : "transparent")
  const ringClass =
    resolvedBackground === "transparent"
      ? "forced-colors:ring-2 forced-colors:ring-[Canvas]"
      : badgeBackgroundRings[resolvedBackground]
  const indicatorClassName = cn(
    "size-2.5 shrink-0 rounded-full bg-primary ring-offset-0 forced-colors:forced-color-adjust-none forced-colors:bg-[Highlight] forced-colors:ring-[Canvas]",
    ringClass,
  )
  const isDecorative = display === "plain" || display === "sidenav-icon"
  const content =
    display === "label" ? (
      children
    ) : display === "numbered" ? (
      <span
        data-slot="badge-indicator"
        className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-label-mini-sb whitespace-nowrap text-primary-foreground forced-colors:forced-color-adjust-none forced-colors:bg-[Highlight] forced-colors:text-[HighlightText]"
      >
        <span data-slot="badge-count">{children}</span>
      </span>
    ) : display === "plain" ? (
      <span data-slot="badge-indicator" className={indicatorClassName} />
    ) : (
      <>
        <span
          data-slot="badge-icon-art"
          className={cn(
            "inline-flex size-6 shrink-0 items-center justify-center",
            selected ? "text-primary" : "text-foreground",
            "forced-colors:text-[CanvasText]",
          )}
        >
          {children}
        </span>
        <span
          data-slot="badge-indicator"
          className={cn("absolute -top-1.5 -right-1.5", indicatorClassName)}
        />
      </>
    )
  const renderProps =
    display === "label"
      ? mergeProps<"span">(
          {
            className: cn(badgeVariants({ variant }), className),
          },
          props,
        )
      : {
          ...elementProps,
          className: cn(
            "relative inline-flex shrink-0 items-center justify-center overflow-visible",
            display === "plain" && (resolvedBackground === "transparent" ? "size-6" : "size-3.5"),
            display === "numbered" && "size-6",
            display === "sidenav-icon" && "size-6",
            className,
          ),
          "aria-hidden": isDecorative
            ? (elementProps["aria-hidden"] ?? true)
            : elementProps["aria-hidden"],
          "data-background": resolvedBackground,
          "data-display": display,
          "data-selected": display === "sidenav-icon" ? selected : undefined,
          "data-slot": "badge",
          children: content,
        }

  return useRender({
    defaultTagName: "span",
    props: renderProps,
    render,
    state:
      display === "label"
        ? {
            slot: "badge",
            variant,
          }
        : {
            slot: "badge",
            variant,
            display,
            background: resolvedBackground,
            selected,
          },
  })
}

export { Badge, badgeVariants }
