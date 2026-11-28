// Generated from pinned source geometry by packages/ui-cli/src/figma/icons.ts; do not edit.
import type { SVGProps } from "react"

import { Icon, type GlyphProps } from "../icon"
import type { IconVariantComponents } from "./types"

// `ios_share` as inline SVG: one component per pinned variant, so a bundle
// that imports one of them carries no other icon artwork.
/** The `98:973` drawing, in the source coordinate space. */
function DefaultGlyph(props: SVGProps<SVGSVGElement>) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="currentColor" data-figma-node-id="98:973" {...props}><g transform="matrix(1 0 0 1 4 1.3999998569488525)" opacity="1"><path d="M2 21.6C1.45 21.6 0.979167 21.4042 0.5875 21.0125C0.195833 20.6208 0 20.15 0 19.6L0 8.6C0 8.05 0.195833 7.57917 0.5875 7.1875C0.979167 6.79583 1.45 6.6 2 6.6L4 6.6C4.28333 6.6 4.52083 6.69583 4.7125 6.8875C4.90417 7.07917 5 7.31667 5 7.6C5 7.88333 4.90417 8.12083 4.7125 8.3125C4.52083 8.50417 4.28333 8.6 4 8.6L2 8.6L2 19.6L14 19.6L14 8.6L12 8.6C11.7167 8.6 11.4792 8.50417 11.2875 8.3125C11.0958 8.12083 11 7.88333 11 7.6C11 7.31667 11.0958 7.07917 11.2875 6.8875C11.4792 6.69583 11.7167 6.6 12 6.6L14 6.6C14.55 6.6 15.0208 6.79583 15.4125 7.1875C15.8042 7.57917 16 8.05 16 8.6L16 19.6C16 20.15 15.8042 20.6208 15.4125 21.0125C15.0208 21.4042 14.55 21.6 14 21.6L2 21.6ZM7 3.425L6.1 4.325C5.9 4.525 5.66667 4.62083 5.4 4.6125C5.13333 4.60417 4.9 4.5 4.7 4.3C4.51667 4.1 4.42083 3.86667 4.4125 3.6C4.40417 3.33333 4.5 3.1 4.7 2.9L7.3 0.3C7.5 0.1 7.73333 0 8 0C8.26667 0 8.5 0.1 8.7 0.3L11.3 2.9C11.4833 3.08333 11.575 3.3125 11.575 3.5875C11.575 3.8625 11.4833 4.1 11.3 4.3C11.1 4.5 10.8625 4.6 10.5875 4.6C10.3125 4.6 10.075 4.5 9.875 4.3L9 3.425L9 13.6C9 13.8833 8.90417 14.1208 8.7125 14.3125C8.52083 14.5042 8.28333 14.6 8 14.6C7.71667 14.6 7.47917 14.5042 7.2875 14.3125C7.09583 14.1208 7 13.8833 7 13.6L7 3.425Z" fill="currentColor" fillOpacity="1" fillRule="nonzero" /></g></svg>
  )
}

/** `ios_share`: the default variant, in the shared icon box. */
export function Default(props: GlyphProps) {
  return <Icon {...props} source={DefaultGlyph} />
}

/**
 * Every pinned variant of `ios_share`, keyed by source node id. The registry
 * resolves a runtime name to one of these drawings, which `Icon` owns the box
 * for; the exports above are the same drawings with that box already applied.
 */
export const variants: IconVariantComponents = {
  "98:973": DefaultGlyph,
}

export default Default
