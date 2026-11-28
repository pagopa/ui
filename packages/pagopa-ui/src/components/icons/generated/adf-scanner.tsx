// Generated from pinned source geometry by packages/ui-cli/src/figma/icons.ts; do not edit.
import type { SVGProps } from "react"

import { Icon, type GlyphProps } from "../icon"
import type { IconVariantComponents } from "./types"

// `adf_scanner` as inline SVG: one component per pinned variant, so a bundle
// that imports one of them carries no other icon artwork.
/** The `96:628` drawing, in the source coordinate space. */
function DefaultGlyph(props: SVGProps<SVGSVGElement>) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="currentColor" data-figma-node-id="96:628" {...props}><g transform="matrix(1 0 0 1 1.9999998807907104 4)" opacity="1"><path d="M0 14L0 11C0 10.1667 0.291667 9.45833 0.875 8.875C1.45833 8.29167 2.16667 8 3 8L4 8L4 2C4 1.45 4.19583 0.979167 4.5875 0.5875C4.97917 0.195833 5.45 0 6 0L14 0C14.55 0 15.0208 0.195833 15.4125 0.5875C15.8042 0.979167 16 1.45 16 2L16 8L17 8C17.8333 8 18.5417 8.29167 19.125 8.875C19.7083 9.45833 20 10.1667 20 11L20 14C20 14.55 19.8042 15.0208 19.4125 15.4125C19.0208 15.8042 18.55 16 18 16L2 16C1.45 16 0.979167 15.8042 0.5875 15.4125C0.195833 15.0208 0 14.55 0 14ZM6 8L14 8L14 2L6 2L6 8ZM2 14L18 14L18 11C18 10.7167 17.9042 10.4792 17.7125 10.2875C17.5208 10.0958 17.2833 10 17 10L3 10C2.71667 10 2.47917 10.0958 2.2875 10.2875C2.09583 10.4792 2 10.7167 2 11L2 14ZM16 13C16.2833 13 16.5208 12.9042 16.7125 12.7125C16.9042 12.5208 17 12.2833 17 12C17 11.7167 16.9042 11.4792 16.7125 11.2875C16.5208 11.0958 16.2833 11 16 11C15.7167 11 15.4792 11.0958 15.2875 11.2875C15.0958 11.4792 15 11.7167 15 12C15 12.2833 15.0958 12.5208 15.2875 12.7125C15.4792 12.9042 15.7167 13 16 13Z" fill="currentColor" fillOpacity="1" fillRule="nonzero" /></g></svg>
  )
}

/** `adf_scanner`: the default variant, in the shared icon box. */
export function Default(props: GlyphProps) {
  return <Icon {...props} source={DefaultGlyph} />
}

/**
 * Every pinned variant of `adf_scanner`, keyed by source node id. The registry
 * resolves a runtime name to one of these drawings, which `Icon` owns the box
 * for; the exports above are the same drawings with that box already applied.
 */
export const variants: IconVariantComponents = {
  "96:628": DefaultGlyph,
}

export default Default
