// Generated from pinned source geometry by packages/ui-cli/src/figma/icons.ts; do not edit.
import type { SVGProps } from "react"

import { Icon, type GlyphProps } from "../icon"
import type { IconVariantComponents } from "./types"

// `content_copy` as inline SVG: one component per pinned variant, so a bundle
// that imports one of them carries no other icon artwork.
/** The `95:680` drawing, in the source coordinate space. */
function DefaultGlyph(props: SVGProps<SVGSVGElement>) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="currentColor" data-figma-node-id="95:680" {...props}><g transform="matrix(1 0 0 1 2.999999761581421 1.9999998807907104)" opacity="1"><path d="M6 16C5.45 16 4.97917 15.8042 4.5875 15.4125C4.19583 15.0208 4 14.55 4 14L4 2C4 1.45 4.19583 0.979167 4.5875 0.5875C4.97917 0.195833 5.45 0 6 0L15 0C15.55 0 16.0208 0.195833 16.4125 0.5875C16.8042 0.979167 17 1.45 17 2L17 14C17 14.55 16.8042 15.0208 16.4125 15.4125C16.0208 15.8042 15.55 16 15 16L6 16ZM6 14L15 14L15 2L6 2L6 14ZM2 20C1.45 20 0.979167 19.8042 0.5875 19.4125C0.195833 19.0208 0 18.55 0 18L0 5C0 4.71667 0.0958333 4.47917 0.2875 4.2875C0.479167 4.09583 0.716667 4 1 4C1.28333 4 1.52083 4.09583 1.7125 4.2875C1.90417 4.47917 2 4.71667 2 5L2 18L12 18C12.2833 18 12.5208 18.0958 12.7125 18.2875C12.9042 18.4792 13 18.7167 13 19C13 19.2833 12.9042 19.5208 12.7125 19.7125C12.5208 19.9042 12.2833 20 12 20L2 20Z" fill="currentColor" fillOpacity="1" fillRule="nonzero" /></g></svg>
  )
}

/** `content_copy`: the default variant, in the shared icon box. */
export function Default(props: GlyphProps) {
  return <Icon {...props} source={DefaultGlyph} />
}

/**
 * Every pinned variant of `content_copy`, keyed by source node id. The registry
 * resolves a runtime name to one of these drawings, which `Icon` owns the box
 * for; the exports above are the same drawings with that box already applied.
 */
export const variants: IconVariantComponents = {
  "95:680": DefaultGlyph,
}

export default Default
