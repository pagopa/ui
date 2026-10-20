import { cn } from "@/lib/cn"

import { type FigmaPictogramName, pictogramAssetsByName } from "pagopa-ui-artwork"

// O(1) public-name index; Map.get keeps the explicit error for untyped callers.
const assetsByName = new Map(Object.entries(pictogramAssetsByName))

/**
 * Props of the source pictogram. Pictograms are decorative illustrations: the
 * accessible copy always lives in the caller's content.
 */
interface PagoPAPictogramProps {
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
}: PagoPAPictogramProps) {
  const asset = assetsByName.get(name)
  if (!asset) throw new Error(`Pictogram "${name}" has no Figma asset mapping`)

  return (
    <figure className={cn("inline-grid justify-items-center gap-2 text-center", className)}>
      <img
        src={asset[background].url}
        data-figma-node-id={asset[background].nodeId}
        // Pictograms are decorative illustrations: the meaningful copy lives in the
        // caller's heading/paragraph or in the optional visible caption. The asset
        // name is an internal identifier, never a text alternative.
        alt=""
        style={typeof size === "number" ? { width: size, height: size } : undefined}
        className={cn(
          "object-contain",
          size === "sm" && "size-12",
          size === "md" && "size-20",
          size === "lg" && "size-28",
        )}
      />
      {label ? <figcaption className="text-label-mini-sb">{label}</figcaption> : null}
    </figure>
  )
}

export { PagoPAPictogram, type PagoPAPictogramProps }
