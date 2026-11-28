import type { SVGProps } from "react"

import { type FigmaIconName, iconAssetsByName, type IconVariantsByName } from "pagopa-ui-artwork"

import { Icon } from "./icon"
import { iconVariantsByName } from "./generated/registry"

// O(1) public-name indices; Map.get keeps the explicit fallback for untyped
// callers (plain JS consumers can still pass a name outside the union).
const assetsByName = new Map(Object.entries(iconAssetsByName))
const componentsByName = new Map(Object.entries(iconVariantsByName))

// The library build folds `import.meta.env.DEV` to `false`, so the published
// package would resolve a runtime name that misses the catalogue silently.
// `process.env.NODE_ENV` is the form a consumer bundler still resolves:
// development keeps the diagnostics, production drops the branch. It is
// declared here because the package types carry no Node globals.
declare const process: { env: { NODE_ENV?: string } }

const isDevelopment = process.env.NODE_ENV !== "production"

/**
 * The runtime icon resolver: `name` selects the pinned artwork at render time.
 *
 * Shipped components do not use it: each imports the glyph modules it renders,
 * so a bundle carries its glyphs and nothing else. The registry this resolver
 * needs is therefore paid for only by a surface that enumerates the catalogue
 * by name, such as the Storybook gallery.
 *
 * Its two diagnostics — a `decorative={false}` call with no `label`, and a
 * `name` outside the published catalogue — speak in development only, and the
 * name one renders nothing rather than failing the surface that hosts it. The
 * guard reads `process.env.NODE_ENV` rather than `import.meta.env.DEV`, because
 * the library build folds the latter to `false`: the published package would
 * then never warn, while a consumer bundler still resolves the former and drops
 * the branch it builds for production. An unsupported `variant` is a typed
 * misuse and throws, as `library:check` pins for the packed package.
 *
 * It carries the `Icon` surface: `className`, `ref`, `style` and every other
 * `<svg>` attribute reach the rendered element, so a caller can size, style or
 * measure the icon the way it would any other glyph.
 */
interface PagoPAIconProps<Name extends FigmaIconName = FigmaIconName> extends Omit<
  SVGProps<SVGSVGElement>,
  "children" | "height" | "width"
> {
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
  /**
   * Edge of the square the glyph paints in. It is fixed, not type-relative, so
   * a grown root font never pushes the artwork past the control that hosts it
   * (WCAG reflow). @default 24
   */
  size?: number
  /** Source variant; only the variants published for this identity are allowed. */
  variant?: IconVariantsByName[Name]
}

function PagoPAIcon<Name extends FigmaIconName>({
  decorative = true,
  filled,
  label,
  name,
  size = 24,
  variant,
  ...props
}: PagoPAIconProps<Name>) {
  if (!decorative && !label) {
    if (isDevelopment) {
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
    if (isDevelopment) {
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
      data-slot="pago-pa-icon"
      {...props}
      decorative={decorative}
      label={label ?? name}
      size={size}
      source={SourceIcon}
    />
  )
}

export { PagoPAIcon, type PagoPAIconProps }
