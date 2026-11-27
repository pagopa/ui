import type { ComponentType, SVGProps } from "react"

import { cn } from "@/lib/cn"

/** A pinned source glyph: one `SVGProps` component from `generated/`. */
type IconSource = ComponentType<SVGProps<SVGSVGElement>>

type IconProps = Omit<SVGProps<SVGSVGElement>, "children" | "height" | "width"> & {
  /** ClassName merged onto the rendered icon. */
  className?: string
  /**
   * Renders the icon as decoration (`aria-hidden`) so an adjacent label owns
   * the accessible name. Set `false` with `label` when the icon is meaningful.
   * @default true
   */
  decorative?: boolean
  /** Accessible name used when `decorative` is false. */
  label?: string
  /** Rendered width and height in px. @default 24 */
  size?: number
  /**
   * The pinned glyph to render, imported from `generated/`: a component
   * reference keeps every icon the caller did not import out of its bundle.
   */
  source: IconSource
}

/**
 * The shell every library glyph renders through: the shared box, the
 * decoration contract and the accessibility attributes. `PagoPAIcon` resolves a
 * runtime name to a `source` and lands here too.
 */
function Icon({
  className,
  decorative = true,
  label,
  size = 24,
  source: Source,
  ...props
}: IconProps) {
  if (!decorative && !label && import.meta.env.DEV) {
    console.warn("Icon: pass `label` when `decorative` is false.")
  }

  return (
    <Source
      {...props}
      aria-hidden={decorative || undefined}
      aria-label={decorative ? undefined : label}
      role={decorative ? undefined : "img"}
      className={cn("pagopa-icon pui:inline-block pui:shrink-0 pui:select-none", className)}
      width={size}
      height={size}
      // The glyph box is artwork, not text: a 200% root font must not grow it
      // past the control that hosts it, so the size lands in px (WCAG reflow).
      style={{ width: size, height: size }}
    />
  )
}

export { Icon, type IconProps, type IconSource }
