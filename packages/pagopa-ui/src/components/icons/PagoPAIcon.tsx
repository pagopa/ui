import { cn } from "@/lib/cn"

import { type FigmaIconName, iconAssetsByName, type IconVariantsByName } from "pagopa-ui-artwork"

// O(1) public-name index; Map.get keeps the explicit error for untyped callers
// (plain JS consumers can still pass a name outside the union).
const assetsByName = new Map(Object.entries(iconAssetsByName))

/**
 * Props of the source icon. `name` selects the pinned artwork and narrows
 * `variant` to the variants that identity actually publishes.
 */
interface PagoPAIconProps<Name extends FigmaIconName = FigmaIconName> {
  /** ClassName merged onto the rendered icon. */
  className?: string
  /**
   * Renders the icon as decoration (`aria-hidden`) so an adjacent label owns
   * the accessible name. Set `false` with `label` when the icon is meaningful.
   * @default true
   */
  decorative?: boolean
  /**
   * @deprecated choose `variant="filled"` (or `variant="outlined"`) on the
   * identities that publish both source variants.
   */
  filled?: boolean
  /** Accessible name used when `decorative` is false; falls back to `name`. */
  label?: string
  /** Source icon name. */
  name: Name
  /** Rendered width and height in px. @default 24 */
  size?: number
  /** Source variant; only the variants published for this identity are allowed. */
  variant?: IconVariantsByName[Name]
}

function PagoPAIcon<Name extends FigmaIconName>({
  className,
  decorative = true,
  filled,
  label,
  name,
  size = 24,
  variant,
}: PagoPAIconProps<Name>) {
  if (!decorative && !label) {
    if (import.meta.env.DEV) {
      console.warn(
        "PagoPAIcon: pass `label` when `decorative` is false; falling back to the icon name.",
      )
    }
  }

  const asset = assetsByName.get(name)
  if (!asset) throw new Error(`Icon "${name}" has no published source artwork`)
  if (filled !== undefined && variant !== undefined) {
    throw new Error(`Icon "${name}": choose filled or variant, not both`)
  }
  if (filled !== undefined && (!asset.aliases.filled || !asset.aliases.outlined)) {
    throw new Error(`Icon "${name}" does not publish filled and outlined source variants`)
  }
  const selection = filled === undefined ? variant : filled ? "filled" : "outlined"
  const variantId = selection === undefined ? asset.defaultVariantNodeId : asset.aliases[selection]
  const source = variantId ? asset.variants[variantId] : undefined
  if (!source)
    throw new Error(`Icon "${name}" has no source asset for variant "${selection ?? "default"}"`)
  if (asset.rendering === "image") {
    return (
      <img
        src={source.url}
        data-figma-node-id={source.nodeId}
        alt={decorative ? "" : (label ?? name)}
        aria-hidden={decorative || undefined}
        className={cn("inline-block shrink-0 select-none object-contain", className)}
        style={{ width: size, height: size }}
      />
    )
  }

  return (
    <span
      data-figma-node-id={source.nodeId}
      aria-hidden={decorative || undefined}
      aria-label={decorative ? undefined : (label ?? name)}
      role={decorative ? undefined : "img"}
      className={cn("pagopa-icon-mask inline-block shrink-0 select-none", className)}
      style={{
        width: size,
        height: size,
        backgroundColor: "currentColor",
        forcedColorAdjust: "preserve-parent-color",
        maskImage: `url("${source.url}")`,
        maskPosition: "center",
        maskRepeat: "no-repeat",
        maskSize: "contain",
      }}
    />
  )
}

export { PagoPAIcon, type PagoPAIconProps }
