// Generated from pinned source geometry by packages/ui-cli/src/figma/icons.ts; do not edit.
import type { SVGProps } from "react"

import { Icon, type GlyphProps } from "../icon"
import type { IconVariantComponents } from "./types"

// `edit` as inline SVG: one component per pinned variant, so a bundle
// that imports one of them carries no other icon artwork.
/** The `95:1620` drawing, in the source coordinate space. */
function DefaultGlyph(props: SVGProps<SVGSVGElement>) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="currentColor" data-figma-node-id="95:1620" {...props}><g transform="matrix(1 0 0 1 2.999999761581421 2.999999761581421)" opacity="1"><path d="M2 16L3.425 16L13.2 6.225L11.775 4.8L2 14.575L2 16ZM1 18C0.716667 18 0.479167 17.9042 0.2875 17.7125C0.0958333 17.5208 0 17.2833 0 17L0 14.575C0 14.3083 0.05 14.0542 0.15 13.8125C0.25 13.5708 0.391667 13.3583 0.575 13.175L13.2 0.575C13.4 0.391667 13.6208 0.25 13.8625 0.15C14.1042 0.05 14.3583 0 14.625 0C14.8917 0 15.15 0.05 15.4 0.15C15.65 0.25 15.8667 0.4 16.05 0.6L17.425 2C17.625 2.18333 17.7708 2.4 17.8625 2.65C17.9542 2.9 18 3.15 18 3.4C18 3.66667 17.9542 3.92083 17.8625 4.1625C17.7708 4.40417 17.625 4.625 17.425 4.825L4.825 17.425C4.64167 17.6083 4.42917 17.75 4.1875 17.85C3.94583 17.95 3.69167 18 3.425 18L1 18ZM12.475 5.525L11.775 4.8L13.2 6.225L12.475 5.525Z" fill="currentColor" fillOpacity="1" fillRule="nonzero" /></g></svg>
  )
}

/** `edit`: the default variant, in the shared icon box. */
export function Default(props: GlyphProps) {
  return <Icon {...props} source={DefaultGlyph} />
}

/**
 * Every pinned variant of `edit`, keyed by source node id. The registry
 * resolves a runtime name to one of these drawings, which `Icon` owns the box
 * for; the exports above are the same drawings with that box already applied.
 */
export const variants: IconVariantComponents = {
  "95:1620": DefaultGlyph,
}

export default Default
