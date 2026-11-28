// Generated from pinned source geometry by packages/ui-cli/src/figma/icons.ts; do not edit.
import type { SVGProps } from "react"

import { Icon, type GlyphProps } from "../icon"
import type { IconVariantComponents } from "./types"

// `toggle_off` as inline SVG: one component per pinned variant, so a bundle
// that imports one of them carries no other icon artwork.
/** The `9977:23980` drawing, in the source coordinate space. */
function DefaultGlyph(props: SVGProps<SVGSVGElement>) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="currentColor" data-figma-node-id="9977:23980" {...props}><g transform="matrix(1 0 0 1 0.9999998211860657 6)" opacity="1"><path d="M6 12C4.33333 12 2.91667 11.4167 1.75 10.25C0.583333 9.08333 0 7.66667 0 6C0 4.33333 0.583333 2.91667 1.75 1.75C2.91667 0.583333 4.33333 0 6 0L16 0C17.6667 0 19.0833 0.583333 20.25 1.75C21.4167 2.91667 22 4.33333 22 6C22 7.66667 21.4167 9.08333 20.25 10.25C19.0833 11.4167 17.6667 12 16 12L6 12ZM6 10L16 10C17.1 10 18.0417 9.60833 18.825 8.825C19.6083 8.04167 20 7.1 20 6C20 4.9 19.6083 3.95833 18.825 3.175C18.0417 2.39167 17.1 2 16 2L6 2C4.9 2 3.95833 2.39167 3.175 3.175C2.39167 3.95833 2 4.9 2 6C2 7.1 2.39167 8.04167 3.175 8.825C3.95833 9.60833 4.9 10 6 10ZM8.125 8.125C8.70833 7.54167 9 6.83333 9 6C9 5.16667 8.70833 4.45833 8.125 3.875C7.54167 3.29167 6.83333 3 6 3C5.16667 3 4.45833 3.29167 3.875 3.875C3.29167 4.45833 3 5.16667 3 6C3 6.83333 3.29167 7.54167 3.875 8.125C4.45833 8.70833 5.16667 9 6 9C6.83333 9 7.54167 8.70833 8.125 8.125Z" fill="currentColor" fillOpacity="1" fillRule="nonzero" /></g></svg>
  )
}

/** `toggle_off`: the default variant, in the shared icon box. */
export function Default(props: GlyphProps) {
  return <Icon {...props} source={DefaultGlyph} />
}

/**
 * Every pinned variant of `toggle_off`, keyed by source node id. The registry
 * resolves a runtime name to one of these drawings, which `Icon` owns the box
 * for; the exports above are the same drawings with that box already applied.
 */
export const variants: IconVariantComponents = {
  "9977:23980": DefaultGlyph,
}

export default Default
