// Generated from pinned source geometry by packages/ui-cli/src/figma/icons.ts; do not edit.
import type { SVGProps } from "react"

import { Icon, type GlyphProps } from "../icon"
import type { IconVariantComponents } from "./types"

// `hourglass_top` as inline SVG: one component per pinned variant, so a bundle
// that imports one of them carries no other icon artwork.
/** The `99:2068` drawing, in the source coordinate space. */
function DefaultGlyph(props: SVGProps<SVGSVGElement>) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="currentColor" data-figma-node-id="99:2068" {...props}><g transform="matrix(1 0 0 1 4 1.9999998807907104)" opacity="1"><path d="M4 18L12 18L12 15C12 13.9 11.6083 12.9583 10.825 12.175C10.0417 11.3917 9.1 11 8 11C6.9 11 5.95833 11.3917 5.175 12.175C4.39167 12.9583 4 13.9 4 15L4 18ZM1 20C0.716667 20 0.479167 19.9042 0.2875 19.7125C0.0958333 19.5208 0 19.2833 0 19C0 18.7167 0.0958333 18.4792 0.2875 18.2875C0.479167 18.0958 0.716667 18 1 18L2 18L2 15C2 13.9833 2.2375 13.0292 2.7125 12.1375C3.1875 11.2458 3.85 10.5333 4.7 10C3.85 9.46667 3.1875 8.75417 2.7125 7.8625C2.2375 6.97083 2 6.01667 2 5L2 2L1 2C0.716667 2 0.479167 1.90417 0.2875 1.7125C0.0958333 1.52083 0 1.28333 0 1C0 0.716667 0.0958333 0.479167 0.2875 0.2875C0.479167 0.0958333 0.716667 0 1 0L15 0C15.2833 0 15.5208 0.0958333 15.7125 0.2875C15.9042 0.479167 16 0.716667 16 1C16 1.28333 15.9042 1.52083 15.7125 1.7125C15.5208 1.90417 15.2833 2 15 2L14 2L14 5C14 6.01667 13.7625 6.97083 13.2875 7.8625C12.8125 8.75417 12.15 9.46667 11.3 10C12.15 10.5333 12.8125 11.2458 13.2875 12.1375C13.7625 13.0292 14 13.9833 14 15L14 18L15 18C15.2833 18 15.5208 18.0958 15.7125 18.2875C15.9042 18.4792 16 18.7167 16 19C16 19.2833 15.9042 19.5208 15.7125 19.7125C15.5208 19.9042 15.2833 20 15 20L1 20Z" fill="currentColor" fillOpacity="1" fillRule="nonzero" /></g></svg>
  )
}

/** `hourglass_top`: the default variant, in the shared icon box. */
export function Default(props: GlyphProps) {
  return <Icon {...props} source={DefaultGlyph} />
}

/**
 * Every pinned variant of `hourglass_top`, keyed by source node id. The registry
 * resolves a runtime name to one of these drawings, which `Icon` owns the box
 * for; the exports above are the same drawings with that box already applied.
 */
export const variants: IconVariantComponents = {
  "99:2068": DefaultGlyph,
}

export default Default
