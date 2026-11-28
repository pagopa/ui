import type * as React from "react"

import { type FigmaPictogramName, pictogramAssetsByName } from "pagopa-ui-artwork"

import { PictogramFigure } from "./pictogram-figure"

// O(1) public-name index; Map.get keeps the explicit error for untyped callers.
const assetsByName = new Map(Object.entries(pictogramAssetsByName))

/**
 * Props of the source pictogram. Pictograms are decorative illustrations: the
 * accessible copy always lives in the caller's content.
 */
interface PagoPAPictogramProps extends Omit<React.ComponentProps<"figure">, "children"> {
  /** ClassName applied to the figure. */
  className?: string
  /** Optional visible caption. */
  label?: string
  /** Source pictogram name. */
  name: FigmaPictogramName
  /** Named size step or exact pixel size. @default "md" */
  size?: "sm" | "md" | "lg" | number
  /** Source artwork variant for the surrounding surface. @default "light" */
  background?: "light" | "dark"
}

function PagoPAPictogram({
  className,
  label,
  name,
  size = "md",
  background = "light",
  ref,
  ...props
}: PagoPAPictogramProps) {
  const asset = assetsByName.get(name)
  if (!asset) throw new Error(`Pictogram "${name}" has no Figma asset mapping`)

  return (
    <PictogramFigure
      {...props}
      asset={asset}
      background={background}
      className={className}
      label={label}
      ref={ref}
      size={size}
    />
  )
}

export { PagoPAPictogram, type PagoPAPictogramProps }
