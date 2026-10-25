"use client"

import { cn } from "@/lib/cn"

// Source marker glyph ("Ellipse 1", PinPoint set 920:7219): a 32×40.67 teardrop
// that grows to 48×61 on the selected state. `viewBox` crops the reference box
// to the drawn shape so width alone drives the scale.
const markerPath =
  "M44 27.3333C44 40.1699 28 52 28 52C28 52 12 40.1699 12 27.3333C12 18.4968 19.1634 11.3333 28 11.3333C36.8366 11.3333 44 18.4968 44 27.3333Z"

function PinPoint({
  label,
  x = 50,
  y = 50,
  active,
  variant = "default",
  children,
  onPressedChange,
}: {
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
}) {
  const isPlaceholder = variant === "placeholder"
  return (
    <button
      type="button"
      data-slot="pin-point"
      aria-label={label}
      aria-pressed={active}
      onClick={() => onPressedChange?.(!active)}
      style={{ left: `${x}%`, top: `${y}%` }}
      className="absolute grid size-11 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full outline-none focus-visible:ring-4 focus-visible:ring-primary/30"
    >
      {variant === "numbered" ? (
        <span
          data-slot="pin-point-numbered"
          className="grid size-8 place-items-center bg-primary text-label-sb text-primary-foreground"
        >
          {children}
        </span>
      ) : (
        <span
          data-slot="pin-point-marker"
          className={cn("relative block", active ? "w-12" : "w-8")}
        >
          <svg
            aria-hidden="true"
            viewBox="12 11.3333 32 40.6667"
            className={cn(
              "block h-auto w-full drop-shadow-elevation-6",
              isPlaceholder ? "fill-destructive stroke-error-foreground" : "fill-primary",
            )}
          >
            <path d={markerPath} />
            {active ? null : (
              <circle
                cx="28"
                cy="27.3333"
                r="5.3333"
                className={isPlaceholder ? "fill-error-foreground" : "fill-primary-foreground"}
              />
            )}
          </svg>
          {active && children ? (
            <span
              data-slot="pin-point-glyph"
              className="absolute inset-x-0 top-0 grid aspect-square place-items-center text-primary-foreground [&_img]:size-7 [&_svg]:size-7"
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
