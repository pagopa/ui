"use client"

import { mergeProps } from "@base-ui/react/merge-props"
import { useRender } from "@base-ui/react/use-render"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/cn"

import type { ElementProps } from "./props"

const badgeVariants = cva(
  "group/badge pui:inline-flex pui:h-5 pui:w-fit pui:shrink-0 pui:items-center pui:justify-center pui:gap-1 pui:overflow-hidden pui:rounded-4xl pui:border pui:border-transparent pui:px-2 pui:py-0.5 pui:text-caption-sb pui:whitespace-nowrap pui:transition-all pui:focus-visible:border-ring pui:focus-visible:ring-3 pui:focus-visible:ring-ring/50 pui:has-data-[icon=inline-end]:pr-1.5 pui:has-data-[icon=inline-start]:pl-1.5 pui:aria-invalid:border-destructive pui:aria-invalid:ring-destructive/20 pui:[&>svg:not(.pagopa-icon)]:pointer-events-none pui:[&>svg:not(.pagopa-icon)]:size-3!",
  {
    variants: {
      variant: {
        default: "pui:bg-primary pui:text-primary-foreground pui:[a]:hover:bg-primary/80",
        secondary: "pui:bg-secondary pui:text-secondary-foreground pui:[a]:hover:bg-secondary/80",
        destructive:
          "pui:bg-destructive/10 pui:text-error-foreground pui:focus-visible:ring-destructive/20 pui:[a]:hover:bg-destructive/20",
        outline:
          "pui:border-border pui:text-foreground pui:[a]:hover:bg-muted pui:[a]:hover:text-muted-foreground",
        ghost: "pui:hover:bg-muted pui:hover:text-muted-foreground",
        link: "pui:text-primary pui:underline-offset-4 pui:hover:underline",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
)

type BadgeDisplay = "label" | "numbered" | "plain" | "sidenav-icon"
type BadgeBackground = "transparent" | "white" | "muted" | "primary"

type BadgeProps = ElementProps<"span"> &
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
  white: "pui:ring-2 pui:ring-background",
  muted: "pui:ring-2 pui:ring-muted",
  primary: "pui:ring-2 pui:ring-selection-soft",
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
      ? "pui:forced-colors:ring-2 pui:forced-colors:ring-[Canvas]"
      : badgeBackgroundRings[resolvedBackground]
  const indicatorClassName = cn(
    "pui:size-2.5 pui:shrink-0 pui:rounded-full pui:bg-primary pui:ring-offset-0 pui:forced-colors:forced-color-adjust-none pui:forced-colors:bg-[Highlight] pui:forced-colors:ring-[Canvas]",
    ringClass,
  )
  const isDecorative = display === "plain" || display === "sidenav-icon"
  const content =
    display === "label" ? (
      children
    ) : display === "numbered" ? (
      <span
        data-slot="badge-indicator"
        className="pui:inline-flex pui:h-5 pui:min-w-5 pui:items-center pui:justify-center pui:rounded-full pui:bg-primary pui:px-1.5 pui:text-label-mini-sb pui:whitespace-nowrap pui:text-primary-foreground pui:forced-colors:forced-color-adjust-none pui:forced-colors:bg-[Highlight] pui:forced-colors:text-[HighlightText]"
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
            "pui:inline-flex pui:size-6 pui:shrink-0 pui:items-center pui:justify-center",
            selected ? "pui:text-primary" : "pui:text-foreground",
            "pui:forced-colors:text-[CanvasText]",
          )}
        >
          {children}
        </span>
        <span
          data-slot="badge-indicator"
          className={cn("pui:absolute pui:-top-1.5 pui:-right-1.5", indicatorClassName)}
        />
      </>
    )
  const renderProps =
    display === "label"
      ? mergeProps<"span">(
          {
            ...{ "data-slot": "badge" },
            className: cn(badgeVariants({ variant }), className),
          },
          props,
        )
      : {
          ...elementProps,
          className: cn(
            "pui:relative pui:inline-flex pui:shrink-0 pui:items-center pui:justify-center pui:overflow-visible",
            display === "plain" &&
              (resolvedBackground === "transparent" ? "pui:size-6" : "pui:size-3.5"),
            display === "numbered" && "pui:size-6",
            display === "sidenav-icon" && "pui:size-6",
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
export type { BadgeBackground, BadgeDisplay, BadgeProps }
