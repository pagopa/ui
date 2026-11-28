import * as React from "react"

import { cn } from "@/lib/cn"

// Source `237:1307`: a component set of seven invisible spacers (`Dimensione`),
// each a 320×N rectangle with no fill and no stroke. The step is the only API:
// the block paints nothing, carries no role and is hidden from assistive tech.
// Every step is the spacing-scale utility of the same pixel height, so a
// recurring value can only enter through `packages/tokens/src/manifest.json`.
type SpacerSize = 4 | 8 | 16 | 24 | 32 | 40 | 48

const sizeClasses: Record<SpacerSize, string> = {
  4: "pui:h-1",
  8: "pui:h-2",
  16: "pui:h-4",
  24: "pui:h-6",
  32: "pui:h-8",
  40: "pui:h-10",
  48: "pui:h-12",
}

/** Props of the vertical spacer. */
export interface SpacerProps extends Omit<React.ComponentProps<"div">, "children"> {
  size?: SpacerSize
  className?: string
}

/**
 * Invisible vertical spacer: a step of the spacing scale as an empty block with
 * no role, hidden from assistive technology.
 *
 * Figma: Spacing (node 237:1307)
 */
function Spacer({ size = 4, className, ref, ...props }: SpacerProps) {
  return (
    <div
      aria-hidden="true"
      data-slot="spacer"
      ref={ref}
      {...props}
      className={cn(sizeClasses[size], className)}
    />
  )
}

export { Spacer }
export type { SpacerSize }
