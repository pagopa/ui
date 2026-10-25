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
      role="group"
      aria-label={ariaLabel}
      data-orientation={orientation}
      className={cn(
        "flex w-fit max-w-full gap-2",
        "data-[orientation=vertical]:flex-col",
        "data-[orientation=horizontal]:flex-row data-[orientation=horizontal]:flex-wrap",
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

/** Props of {@link SegmentedControl}. */
interface SegmentedControlProps<T extends string> {
  /** Segments, in order. */
  items: SegmentedControlItem<T>[]
  /** Selected value (controlled only). */
  value: T
  /** Called with the value of the pressed segment. */
  onValueChange: (value: T) => void
  /** Accessible name of the group. @default messages.segmentedControl.ariaLabel */
  "aria-label"?: string
  className?: string
}

function SegmentedControl<T extends string>({
  items,
  value,
  onValueChange,
  "aria-label": ariaLabelProp,
  className,
}: SegmentedControlProps<T>) {
  const t = useMessages("segmentedControl")
  const ariaLabel = ariaLabelProp ?? t.ariaLabel

  return (
    <div
      role="group"
      aria-label={ariaLabel}
      className={cn(
        // The source pill is 64/48 tall with 24px insets; on a 320 viewport the
        // three source segments need 323px, so the 16px inset (a 4px step on the
        // same scale) keeps the labels intact instead of clipping the group.
        "inline-flex max-w-full min-h-16 items-center gap-2 rounded-full border bg-muted p-2",
        className,
      )}
    >
      {items.map((item) => {
        const selected = item.value === value
        return (
          <button
            key={item.value}
            type="button"
            aria-pressed={selected}
            onClick={() => onValueChange(item.value)}
            className={cn(
              "min-h-12 min-w-0 truncate rounded-full px-6 max-sm:px-4 text-label-sb transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
              selected
                ? "bg-primary text-primary-foreground"
                : "text-foreground hover:bg-foreground/5",
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
      role="region"
      aria-label={ariaLabel}
      data-position={position}
      data-variant={variant}
      className={cn(
        "sticky z-30 -mx-4 px-6",
        fade
          ? "gap-2 bg-linear-to-b from-transparent to-background pt-0 pb-6"
          : "bg-background py-6",
        !fade && "data-[position=bottom]:bottom-0 data-[position=bottom]:border-t",
        !fade && "data-[position=top]:top-0 data-[position=top]:border-b",
        fade && "data-[position=bottom]:bottom-0 data-[position=top]:top-0",
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
