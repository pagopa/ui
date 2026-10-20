import { cn } from "@/lib/cn"

// Source `237:1307`: a component set of seven invisible spacers (`Dimensione`),
// each a 320×N rectangle with no fill and no stroke. The step is the only API:
// the block paints nothing, carries no role and is hidden from assistive tech.
// Every step is the spacing-scale utility of the same pixel height, so a
// recurring value can only enter through `packages/tokens/src/manifest.json`.
const sizeClasses = {
  4: "h-1",
  8: "h-2",
  16: "h-4",
  24: "h-6",
  32: "h-8",
  40: "h-10",
  48: "h-12",
} as const

type SpacingSize = keyof typeof sizeClasses

function Spacing({ size = 4, className }: { size?: SpacingSize; className?: string }) {
  return <div aria-hidden="true" data-slot="spacing" className={cn(sizeClasses[size], className)} />
}

export { Spacing }
export type { SpacingSize }
