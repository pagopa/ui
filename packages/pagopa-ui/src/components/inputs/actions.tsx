"use client"

import * as React from "react"
import { cn } from "@/lib/cn"
import { useMessages } from "@/lib/ui-provider"

/** Props of {@link ButtonGroup}. */
type ButtonGroupProps = React.ComponentProps<"div"> & {
  /** Layout of the action list. @default "horizontal" */
  orientation?: "horizontal" | "vertical"
}

function ButtonGroup({
  className,
  orientation = "horizontal",
  "aria-label": ariaLabelProp,
  children,
  ...props
}: ButtonGroupProps) {
  const t = useMessages("buttonGroup")
  const ariaLabel = ariaLabelProp ?? t.ariaLabel

  return (
    <div
      data-slot="button-group"
      role="group"
      aria-label={ariaLabel}
      data-orientation={orientation}
      className={cn(
        "pui:flex pui:w-fit pui:max-w-full pui:gap-2",
        "pui:data-[orientation=vertical]:flex-col",
        "pui:data-[orientation=horizontal]:flex-row pui:data-[orientation=horizontal]:flex-wrap",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  )
}

/** One segment of the {@link SegmentedControl}. */
interface SegmentedControlItem<T extends string> {
  /** Value emitted when the segment is chosen. */
  value: T
  /** Visible label of the segment. */
  label: string
}

/**
 * Props of {@link SegmentedControl}. The controlled (`value`) and uncontrolled
 * (`defaultValue`) modes share one lifecycle; `ref`, `className` and the
 * standard HTML attributes of a `div` land on the group.
 */
interface SegmentedControlProps<T extends string> extends Omit<
  React.ComponentProps<"div">,
  "aria-label" | "children" | "className"
> {
  /** Segments, in order. */
  items: SegmentedControlItem<T>[]
  /** Selected value, when the page owns the selection. */
  value?: T
  /** Segment selected at mount, when `value` is omitted. */
  defaultValue?: T
  /** Called with the value of the pressed segment. */
  onValueChange?: (value: T) => void
  /** Accessible name of the group. @default messages.segmentedControl.ariaLabel */
  "aria-label"?: string
  /** Classes of the group, merged with the group's own. */
  className?: string
}

function SegmentedControl<T extends string>({
  items,
  value,
  defaultValue,
  onValueChange,
  "aria-label": ariaLabelProp,
  className,
  ...props
}: SegmentedControlProps<T>) {
  const t = useMessages("segmentedControl")
  const ariaLabel = ariaLabelProp ?? t.ariaLabel
  const [internalValue, setInternalValue] = React.useState<T | null>(defaultValue ?? null)
  const currentValue = value === undefined ? internalValue : value
  const select = (next: T) => {
    if (value === undefined) setInternalValue(next)
    onValueChange?.(next)
  }

  return (
    <div
      data-slot="segmented-control"
      role="group"
      aria-label={ariaLabel}
      className={cn(
        // The source pill's radius is half its minimum height; cap it there when rows wrap.
        "pui:inline-flex pui:max-w-full pui:min-h-16 pui:flex-wrap pui:items-center pui:gap-2 pui:rounded-[var(--spacing-8)] pui:border pui:bg-muted pui:p-2",
        className,
      )}
      {...props}
    >
      {items.map((item) => {
        const selected = item.value === currentValue
        return (
          <button
            key={item.value}
            type="button"
            aria-pressed={selected}
            onClick={() => select(item.value)}
            className={cn(
              "pui:min-h-12 pui:min-w-0 pui:max-w-full pui:basis-[min-content] pui:grow pui:rounded-full pui:px-6 pui:max-tablet:px-4 pui:text-label-sb pui:whitespace-normal pui:break-words pui:transition-colors pui:focus-visible:outline-2 pui:focus-visible:outline-offset-2 pui:focus-visible:outline-ring",
              selected
                ? "pui:bg-primary pui:text-primary-foreground"
                : "pui:text-foreground pui:hover:bg-foreground/5",
            )}
          >
            {item.label}
          </button>
        )
      })}
    </div>
  )
}

/** Props of {@link StickyButtonBar}. */
type StickyButtonBarProps = React.ComponentProps<"div"> & {
  /** Edge the bar sticks to. @default "bottom" */
  position?: "top" | "bottom"
  /** "fade" renders the source `.CTASticky` overlay form. @default "bar" */
  variant?: "bar" | "fade"
}

function StickyButtonBar({
  className,
  children,
  position = "bottom",
  variant = "bar",
  "aria-label": ariaLabelProp,
  ...props
}: StickyButtonBarProps) {
  const t = useMessages("stickyButtonBar")
  const ariaLabel = ariaLabelProp ?? t.ariaLabel

  const fade = variant === "fade"
  return (
    <div
      data-slot="sticky-button-bar"
      role="region"
      aria-label={ariaLabel}
      data-position={position}
      data-variant={variant}
      className={cn(
        "pui:sticky pui:z-30 pui:-mx-4 pui:px-6",
        fade
          ? "pui:gap-2 pui:bg-linear-to-b pui:from-transparent pui:to-background pui:pt-0 pui:pb-6"
          : "pui:bg-background pui:py-6",
        !fade && "pui:data-[position=bottom]:bottom-0 pui:data-[position=bottom]:border-t",
        !fade && "pui:data-[position=top]:top-0 pui:data-[position=top]:border-b",
        fade && "pui:data-[position=bottom]:bottom-0 pui:data-[position=top]:top-0",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  )
}

export {
  ButtonGroup,
  SegmentedControl,
  StickyButtonBar,
  type ButtonGroupProps,
  type SegmentedControlItem,
  type SegmentedControlProps,
  type StickyButtonBarProps,
}
