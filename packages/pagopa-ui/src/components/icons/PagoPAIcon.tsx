import { type FigmaIconName, iconAssetsByName, type IconVariantsByName } from "pagopa-ui-artwork"

import { Icon } from "./icon"
import { iconVariantsByName } from "./generated/registry"

// O(1) public-name indices; Map.get keeps the explicit fallback for untyped
// callers (plain JS consumers can still pass a name outside the union).
const assetsByName = new Map(Object.entries(iconAssetsByName))
const componentsByName = new Map(Object.entries(iconVariantsByName))

/**
 * The runtime icon resolver: `name` selects the pinned artwork at render time.
 *
 * Shipped components do not use it: each imports the glyph modules it renders,
 * so a bundle carries its glyphs and nothing else. The registry this resolver
 * needs is therefore paid for only by a surface that enumerates the catalogue
 * by name, such as the Storybook gallery.
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
  const components = asset ? componentsByName.get(name) : undefined
  // A name built at runtime may miss the published set: the icon renders
  // nothing rather than failing the whole surface that hosts it.
  if (!asset || !components) {
    if (import.meta.env.DEV) {
      console.warn(
        `PagoPAIcon: "${String(name)}" has no published source artwork; rendering nothing.`,
      )
    }
    return null
  }
  if (filled !== undefined && variant !== undefined) {
    throw new Error(`Icon "${name}": choose filled or variant, not both`)
  }
  if (filled !== undefined && (!asset.aliases.filled || !asset.aliases.outlined)) {
    throw new Error(`Icon "${name}" does not publish filled and outlined source variants`)
  }
  const selection = filled === undefined ? variant : filled ? "filled" : "outlined"
  const variantId = selection === undefined ? asset.defaultVariantNodeId : asset.aliases[selection]
  const SourceIcon = variantId ? components[variantId] : undefined
  if (!variantId || !SourceIcon)
    throw new Error(`Icon "${name}" has no source asset for variant "${selection ?? "default"}"`)
  return (
    <Icon
      source={SourceIcon}
      className={className}
      decorative={decorative}
      label={label ?? name}
      size={size}
    />
  )
}

export { PagoPAIcon, type PagoPAIconProps }
