// Generated from pinned source geometry by packages/ui-cli/src/figma/icons.ts; do not edit.
import type { SVGProps } from "react"

import { Icon, type GlyphProps } from "../icon"
import type { IconVariantComponents } from "./types"

// `keep` as inline SVG: one component per pinned variant, so a bundle
// that imports one of them carries no other icon artwork.
/** The `96:699` drawing, in the source coordinate space. */
function DefaultGlyph(props: SVGProps<SVGSVGElement>) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="currentColor" data-figma-node-id="96:699" {...props}><g transform="matrix(1 0 0 1 6 2.999999761581421)" opacity="1"><path d="M10 2L10 9L11.7 10.7C11.8 10.8 11.875 10.9125 11.925 11.0375C11.975 11.1625 12 11.2917 12 11.425L12 12C12 12.2833 11.9042 12.5208 11.7125 12.7125C11.5208 12.9042 11.2833 13 11 13L7 13L7 18.85C7 19.1333 6.90417 19.3708 6.7125 19.5625C6.52083 19.7542 6.28333 19.85 6 19.85C5.71667 19.85 5.47917 19.7542 5.2875 19.5625C5.09583 19.3708 5 19.1333 5 18.85L5 13L1 13C0.716667 13 0.479167 12.9042 0.2875 12.7125C0.0958333 12.5208 0 12.2833 0 12L0 11.425C0 11.2917 0.025 11.1625 0.075 11.0375C0.125 10.9125 0.2 10.8 0.3 10.7L2 9L2 2C1.71667 2 1.47917 1.90417 1.2875 1.7125C1.09583 1.52083 1 1.28333 1 1C1 0.716667 1.09583 0.479167 1.2875 0.2875C1.47917 0.0958333 1.71667 0 2 0L10 0C10.2833 0 10.5208 0.0958333 10.7125 0.2875C10.9042 0.479167 11 0.716667 11 1C11 1.28333 10.9042 1.52083 10.7125 1.7125C10.5208 1.90417 10.2833 2 10 2ZM2.85 11L9.15 11L8 9.85L8 2L4 2L4 9.85L2.85 11Z" fill="currentColor" fillOpacity="1" fillRule="nonzero" /></g></svg>
  )
}

/** `keep`: the `pinned` variant, in the shared icon box. */
export function Default(props: GlyphProps) {
  return <Icon {...props} source={DefaultGlyph} />
}

/** The `96:715` drawing, in the source coordinate space. */
function UnpinnedGlyph(props: SVGProps<SVGSVGElement>) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="currentColor" data-figma-node-id="96:715" {...props}><g transform="matrix(1 0 0 1 1.8119999170303345 2.999999761581421)" opacity="1"><path d="M12.188 2L8.188 2L8.188 4.175L5.438 1.425C5.35467 1.34167 5.29217 1.25 5.2505 1.15C5.20883 1.05 5.188 0.95 5.188 0.85C5.188 0.633333 5.263 0.4375 5.413 0.2625C5.563 0.0875 5.763 0 6.013 0L14.188 0C14.4713 0 14.7088 0.0958333 14.9005 0.2875C15.0922 0.479167 15.188 0.716667 15.188 1C15.188 1.26667 15.0672 1.45417 14.8255 1.5625C14.5838 1.67083 14.3713 1.81667 14.188 2L14.188 8C14.188 8.28333 14.0922 8.52083 13.9005 8.7125C13.7088 8.90417 13.4713 9 13.188 9C12.9047 9 12.6672 8.90417 12.4755 8.7125C12.2838 8.52083 12.188 8.28333 12.188 8L12.188 2ZM9.188 19L9.188 13L5.588 13C5.17133 13 4.838 12.8542 4.588 12.5625C4.338 12.2708 4.213 11.9417 4.213 11.575C4.213 11.3917 4.2505 11.2083 4.3255 11.025C4.4005 10.8417 4.52133 10.6667 4.688 10.5L6.188 9L6.188 7.85L0.288 1.9C0.104667 1.71667 0.00883333 1.4875 0.0005 1.2125C-0.00783333 0.9375 0.088 0.7 0.288 0.5C0.471333 0.316667 0.704667 0.225 0.988 0.225C1.27133 0.225 1.50467 0.316667 1.688 0.5L18.663 17.475C18.863 17.675 18.9588 17.9125 18.9505 18.1875C18.9422 18.4625 18.838 18.7 18.638 18.9C18.438 19.0833 18.2047 19.1792 17.938 19.1875C17.6713 19.1958 17.438 19.1 17.238 18.9L11.338 13L11.188 13L11.188 19C11.188 19.2833 11.0922 19.5208 10.9005 19.7125C10.7088 19.9042 10.4713 20 10.188 20C9.90467 20 9.66717 19.9042 9.4755 19.7125C9.28383 19.5208 9.188 19.2833 9.188 19ZM7.038 11L9.338 11L8.188 9.85L7.038 11Z" fill="currentColor" fillOpacity="1" fillRule="nonzero" /></g></svg>
  )
}

/** `keep`: the `unpinned` variant, in the shared icon box. */
export function Unpinned(props: GlyphProps) {
  return <Icon {...props} source={UnpinnedGlyph} />
}

/**
 * Every pinned variant of `keep`, keyed by source node id. The registry
 * resolves a runtime name to one of these drawings, which `Icon` owns the box
 * for; the exports above are the same drawings with that box already applied.
 */
export const variants: IconVariantComponents = {
  "96:699": DefaultGlyph,
  "96:715": UnpinnedGlyph,
}

export default Default
