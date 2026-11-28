// Generated from pinned source geometry by packages/ui-cli/src/figma/icons.ts; do not edit.
import type { SVGProps } from "react"

import { Icon, type GlyphProps } from "../icon"
import type { IconVariantComponents } from "./types"

// `feedback` as inline SVG: one component per pinned variant, so a bundle
// that imports one of them carries no other icon artwork.
/** The `98:1297` drawing, in the source coordinate space. */
function DefaultGlyph(props: SVGProps<SVGSVGElement>) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="currentColor" data-figma-node-id="98:1297" {...props}><g transform="matrix(1 0 0 1 1.9999998807907104 1.9999998807907104)" opacity="1"><path d="M10 13C10.2833 13 10.5208 12.9042 10.7125 12.7125C10.9042 12.5208 11 12.2833 11 12C11 11.7167 10.9042 11.4792 10.7125 11.2875C10.5208 11.0958 10.2833 11 10 11C9.71667 11 9.47917 11.0958 9.2875 11.2875C9.09583 11.4792 9 11.7167 9 12C9 12.2833 9.09583 12.5208 9.2875 12.7125C9.47917 12.9042 9.71667 13 10 13ZM10 9C10.2833 9 10.5208 8.90417 10.7125 8.7125C10.9042 8.52083 11 8.28333 11 8L11 4C11 3.71667 10.9042 3.47917 10.7125 3.2875C10.5208 3.09583 10.2833 3 10 3C9.71667 3 9.47917 3.09583 9.2875 3.2875C9.09583 3.47917 9 3.71667 9 4L9 8C9 8.28333 9.09583 8.52083 9.2875 8.7125C9.47917 8.90417 9.71667 9 10 9ZM4 16L1.7 18.3C1.38333 18.6167 1.02083 18.6875 0.6125 18.5125C0.204167 18.3375 0 18.025 0 17.575L0 2C0 1.45 0.195833 0.979167 0.5875 0.5875C0.979167 0.195833 1.45 0 2 0L18 0C18.55 0 19.0208 0.195833 19.4125 0.5875C19.8042 0.979167 20 1.45 20 2L20 14C20 14.55 19.8042 15.0208 19.4125 15.4125C19.0208 15.8042 18.55 16 18 16L4 16ZM3.15 14L18 14L18 2L2 2L2 15.125L3.15 14Z" fill="currentColor" fillOpacity="1" fillRule="nonzero" /></g></svg>
  )
}

/** `feedback`: the default variant, in the shared icon box. */
export function Default(props: GlyphProps) {
  return <Icon {...props} source={DefaultGlyph} />
}

/**
 * Every pinned variant of `feedback`, keyed by source node id. The registry
 * resolves a runtime name to one of these drawings, which `Icon` owns the box
 * for; the exports above are the same drawings with that box already applied.
 */
export const variants: IconVariantComponents = {
  "98:1297": DefaultGlyph,
}

export default Default
