"use client"

import * as React from "react"
import { cn } from "@/lib/cn"
import { useMessages } from "@/lib/ui-provider"

// The visible dot is the source box (16x4 active, 8x8 inactive); the pointer
// target comes from an invisible ::after expansion, so the row keeps the source
// 8px height instead of inflating to the target. The 16px gap between dots puts
// their centres 24px apart, which is exactly what a 24px-wide expansion on each
// control needs to abut its neighbour without overlapping it.
const indicator =
  "pui:relative pui:shrink-0 pui:rounded-2xl pui:transition-[width,height,background-color] pui:motion-reduce:transition-none pui:after:absolute pui:after:-inset-x-2 pui:after:-inset-y-5 pui:focus-visible:outline-2 pui:focus-visible:outline-offset-2 pui:focus-visible:outline-ring"

export interface CarouselStepperProps extends Omit<
  React.ComponentProps<"div">,
  "children" | "onChange"
> {
  count: number
  activeIndex: number
  onChange: (index: number) => void
  /** Accessible name of the whole control. @default messages.carouselStepper.label */
  label?: string
  /**
   * Accessible name of one position control. The caller receives the index and
   * the count and returns the whole sentence, so it owns plurals and word
   * order.
   * @default messages.carouselStepper.getControlLabel
   */
  getControlLabel?: (index: number, count: number) => string
}

function CarouselStepper({
  count,
  activeIndex,
  onChange,
  label: labelProp,
  getControlLabel: getControlLabelProp,
  className,
  ref,
  ...props
}: CarouselStepperProps) {
  const t = useMessages("carouselStepper")
  const label = labelProp ?? t.label
  const getControlLabel = getControlLabelProp ?? t.getControlLabel

  const refs = React.useRef<(HTMLButtonElement | null)[]>([])
  const move = (index: number) => {
    const next = (index + count) % count
    onChange(next)
    refs.current[next]?.focus()
  }
  return (
    <div
      data-slot="carousel-stepper"
      ref={ref}
      role="group"
      aria-label={label}
      className={cn("pui:flex pui:items-center pui:justify-center pui:gap-4", className)}
      {...props}
    >
      {Array.from({ length: count }, (_, index) => (
        <button
          key={index}
          ref={(node) => {
            refs.current[index] = node
          }}
          type="button"
          aria-current={index === activeIndex ? "true" : undefined}
          aria-label={getControlLabel(index, count)}
          tabIndex={index === activeIndex ? 0 : -1}
          onClick={() => onChange(index)}
          onKeyDown={(event) => {
            if (event.key === "ArrowRight") {
              event.preventDefault()
              move(index + 1)
            }
            if (event.key === "ArrowLeft") {
              event.preventDefault()
              move(index - 1)
            }
            if (event.key === "Home") {
              event.preventDefault()
              move(0)
            }
            if (event.key === "End") {
              event.preventDefault()
              move(count - 1)
            }
          }}
          className={cn(
            indicator,
            index === activeIndex
              ? "pui:h-1 pui:w-4 pui:bg-primary"
              : "pui:size-2 pui:border pui:border-input",
          )}
        />
      ))}
    </div>
  )
}

export { CarouselStepper }
