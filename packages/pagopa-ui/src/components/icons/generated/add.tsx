// Generated from pinned source geometry by packages/ui-cli/src/figma/icons.ts; do not edit.
import type { SVGProps } from "react"

import { Icon, type GlyphProps } from "../icon"
import type { IconVariantComponents } from "./types"

// `add` as inline SVG: one component per pinned variant, so a bundle
// that imports one of them carries no other icon artwork.
/** The `98:688` drawing, in the source coordinate space. */
function SmallGlyph(props: SVGProps<SVGSVGElement>) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="currentColor" data-figma-node-id="98:688" {...props}><g transform="matrix(1 0 0 1 5 5)" opacity="1"><path d="M6 8L1 8C0.716667 8 0.479167 7.90417 0.2875 7.7125C0.0958333 7.52083 0 7.28333 0 7C0 6.71667 0.0958333 6.47917 0.2875 6.2875C0.479167 6.09583 0.716667 6 1 6L6 6L6 1C6 0.716667 6.09583 0.479167 6.2875 0.2875C6.47917 0.0958333 6.71667 0 7 0C7.28333 0 7.52083 0.0958333 7.7125 0.2875C7.90417 0.479167 8 0.716667 8 1L8 6L13 6C13.2833 6 13.5208 6.09583 13.7125 6.2875C13.9042 6.47917 14 6.71667 14 7C14 7.28333 13.9042 7.52083 13.7125 7.7125C13.5208 7.90417 13.2833 8 13 8L8 8L8 13C8 13.2833 7.90417 13.5208 7.7125 13.7125C7.52083 13.9042 7.28333 14 7 14C6.71667 14 6.47917 13.9042 6.2875 13.7125C6.09583 13.5208 6 13.2833 6 13L6 8Z" fill="currentColor" fillOpacity="1" fillRule="nonzero" /></g></svg>
  )
}

/** `add`: the `small` variant, in the shared icon box. */
export function Small(props: GlyphProps) {
  return <Icon {...props} source={SmallGlyph} />
}

/** The `98:689` drawing, in the source coordinate space. */
function DefaultGlyph(props: SVGProps<SVGSVGElement>) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="currentColor" data-figma-node-id="98:689" {...props}><g transform="matrix(1 0 0 1 2.999999761581421 2.999999761581421)" opacity="1"><path d="M9 18C8.71667 18 8.47917 17.9042 8.2875 17.7125C8.09583 17.5208 8 17.2833 8 17L8 10L1 10C0.716667 10 0.479167 9.90417 0.2875 9.7125C0.0958333 9.52083 0 9.28333 0 9C0 8.71667 0.0958333 8.47917 0.2875 8.2875C0.479167 8.09583 0.716667 8 1 8L8 8L8 1C8 0.716667 8.09583 0.479167 8.2875 0.2875C8.47917 0.0958333 8.71667 0 9 0C9.28333 0 9.52083 0.0958333 9.7125 0.2875C9.90417 0.479167 10 0.716667 10 1L10 8L17 8C17.2833 8 17.5208 8.09583 17.7125 8.2875C17.9042 8.47917 18 8.71667 18 9C18 9.28333 17.9042 9.52083 17.7125 9.7125C17.5208 9.90417 17.2833 10 17 10L10 10L10 17C10 17.2833 9.90417 17.5208 9.7125 17.7125C9.52083 17.9042 9.28333 18 9 18Z" fill="currentColor" fillOpacity="1" fillRule="nonzero" /></g></svg>
  )
}

/** `add`: the `big` variant, in the shared icon box. */
export function Default(props: GlyphProps) {
  return <Icon {...props} source={DefaultGlyph} />
}

/**
 * Every pinned variant of `add`, keyed by source node id. The registry
 * resolves a runtime name to one of these drawings, which `Icon` owns the box
 * for; the exports above are the same drawings with that box already applied.
 */
export const variants: IconVariantComponents = {
  "98:688": SmallGlyph,
  "98:689": DefaultGlyph,
}

export default Default
