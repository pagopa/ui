import type { ComponentType, SVGProps } from "react"

import { cn } from "@/lib/cn"

/** A pinned source drawing: one `SVGProps` component from `generated/`. */
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
  /**
   * Edge of the square the glyph paints in. It is fixed, not type-relative, so
   * a grown root font never pushes the artwork past the control that hosts it
   * (WCAG reflow). @default 24
   */
  size?: number
  /**
   * The pinned drawing to render, imported from `generated/`: a component
   * reference keeps every icon the caller did not import out of its bundle.
   * This is the raw artwork, such as a `variants` entry or a hand-authored
   * component; a published glyph (`@pagopa/ui/icons/*`) is already boxed, so
   * render it as a component instead of passing it here.
   */
  source: IconSource
}

/**
 * What a published glyph accepts: `Icon`'s props without the drawing, which the
 * glyph itself owns. The modules under `generated/` export this shape through
 * the shell, so `@pagopa/ui/icons/<slug>` and `PagoPAIcon` cannot drift.
 */
type GlyphProps = Omit<IconProps, "source">

/**
 * A published glyph, already boxed by the shell. Render it directly: feeding it
 * back to `Icon` as `source` wraps a second box that overrides the props the
 * outer one passes, so the call site's `size` and accessible name are lost.
 */
type Glyph = ComponentType<GlyphProps>

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

  // The glyph box is artwork, not text: a 200% root font must not grow it past
  // the control that hosts it (WCAG reflow), so the size lands in the
  // `width`/`height` presentation attributes, which stay in px because the
  // source artwork ships a `viewBox` and no intrinsic ratio of its own. They
  // are attributes and not inline styles on purpose: a class wins over a
  // presentation attribute, so `className="pui:size-*"` still resizes the icon
  // and `style` reaches the element exactly as the caller wrote it. The
  // `pagopa-icon` class is the hook a host uses to leave library glyphs out of
  // its own `svg:not(.pagopa-icon)` defaults.
  return (
    <Source
      data-slot="icon"
      {...props}
      aria-hidden={decorative || undefined}
      aria-label={decorative ? undefined : label}
      role={decorative ? undefined : "img"}
      className={cn("pagopa-icon pui:inline-block pui:shrink-0 pui:select-none", className)}
      width={size}
      height={size}
    />
  )
}

export { Icon, type Glyph, type GlyphProps, type IconProps, type IconSource }
