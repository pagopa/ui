import type * as React from "react"

import { cn } from "@/lib/cn"

import type { PictogramAsset } from "pagopa-ui-artwork/pictogram-asset"

/**
 * Props of the illustration figure. Pictograms are decorative illustrations: the
 * accessible copy always lives in the caller's content.
 */
interface PictogramFigureProps extends Omit<React.ComponentProps<"figure">, "children"> {
  /** Resolved artwork of the illustration. */
  asset: PictogramAsset
  /** ClassName applied to the figure. */
  className?: string
  /** Optional visible caption. */
  label?: string
  /** Named size step or exact pixel size. @default "md" */
  size?: "sm" | "md" | "lg" | number
  /** Source artwork variant for the surrounding surface. @default "light" */
  background?: "light" | "dark"
}

/**
 * The figure a pictogram renders. Internal on purpose: the built-in states and
 * tables resolve their own artwork from a single per-pictogram module, so
 * importing a component never reaches the whole published set.
 */
function PictogramFigure({
  asset,
  className,
  label,
  size = "md",
  background = "light",
  ref,
  ...props
}: PictogramFigureProps) {
  return (
    <figure
      ref={ref}
      data-slot="pago-pa-pictogram"
      className={cn(
        "pui:inline-grid pui:justify-items-center pui:gap-2 pui:text-center",
        className,
      )}
      {...props}
    >
      <img
        src={asset[background].url}
        data-figma-node-id={asset[background].nodeId}
        // Pictograms are decorative illustrations: the meaningful copy lives in the
        // caller's heading/paragraph or in the optional visible caption. The asset
        // name is an internal identifier, never a text alternative.
        alt=""
        style={typeof size === "number" ? { width: size, height: size } : undefined}
        className={cn(
          "pui:object-contain",
          size === "sm" && "pui:size-12",
          size === "md" && "pui:size-20",
          size === "lg" && "pui:size-28",
        )}
      />
      {label ? <figcaption className="pui:text-label-mini-sb">{label}</figcaption> : null}
    </figure>
  )
}

export { PictogramFigure, type PictogramFigureProps }
