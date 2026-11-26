"use client"

import { cn } from "@/lib/cn"

// Source marker glyph ("Ellipse 1", PinPoint set 920:7219): a 32×40.67 teardrop
// that grows to 48×61 on the selected state. `viewBox` crops the reference box
// to the drawn shape so width alone drives the scale.
const markerPath =
  "M44 27.3333C44 40.1699 28 52 28 52C28 52 12 40.1699 12 27.3333C12 18.4968 19.1634 11.3333 28 11.3333C36.8366 11.3333 44 18.4968 44 27.3333Z"

export interface PinPointProps {
  /** Accessible name of the marker. */
  label: string
  /** Horizontal position on the map, as a percentage. @default 50 */
  x?: number
  /** Vertical position on the map, as a percentage. @default 50 */
  y?: number
  /** Selected state of the marker. */
  active?: boolean
  /** Source variants of the marker. */
  variant?: "default" | "numbered" | "placeholder"
  /** Label of the numbered marker, or the glyph of the selected one. */
  children?: React.ReactNode
  /** Fired with the next pressed state when the marker is activated. */
  onPressedChange?: (pressed: boolean) => void
}

function PinPoint({
  label,
  x = 50,
  y = 50,
  active,
  variant = "default",
  children,
  onPressedChange,
}: PinPointProps) {
  const isPlaceholder = variant === "placeholder"
  return (
    <button
      type="button"
      data-slot="pin-point"
      aria-label={label}
      aria-pressed={active}
      onClick={() => onPressedChange?.(!active)}
      style={{ left: `${x}%`, top: `${y}%` }}
      className="pui:absolute pui:grid pui:size-11 pui:-translate-x-1/2 pui:-translate-y-1/2 pui:place-items-center pui:rounded-full pui:outline-none pui:focus-visible:ring-4 pui:focus-visible:ring-primary/30"
    >
      {variant === "numbered" ? (
        <span
          data-slot="pin-point-numbered"
          className="pui:grid pui:size-8 pui:place-items-center pui:bg-primary pui:text-label-sb pui:text-primary-foreground"
        >
          {children}
        </span>
      ) : (
        <span
          data-slot="pin-point-marker"
          className={cn("pui:relative pui:block", active ? "pui:w-12" : "pui:w-8")}
        >
          <svg
            aria-hidden="true"
            viewBox="12 11.3333 32 40.6667"
            className={cn(
              "pui:block pui:h-auto pui:w-full pui:drop-shadow-elevation-6",
              isPlaceholder
                ? "pui:fill-destructive pui:stroke-error-foreground"
                : "pui:fill-primary",
            )}
          >
            <path d={markerPath} />
            {active ? null : (
              <circle
                cx="28"
                cy="27.3333"
                r="5.3333"
                className={
                  isPlaceholder ? "pui:fill-error-foreground" : "pui:fill-primary-foreground"
                }
              />
            )}
          </svg>
          {active && children ? (
            <span
              data-slot="pin-point-glyph"
              className="pui:absolute pui:inset-x-0 pui:top-0 pui:grid pui:aspect-square pui:place-items-center pui:text-primary-foreground pui:[&_img]:size-7 pui:[&_svg]:size-7"
            >
              {children}
            </span>
          ) : null}
        </span>
      )}
    </button>
  )
}

export { PinPoint }
