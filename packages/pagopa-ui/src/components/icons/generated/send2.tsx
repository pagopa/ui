// Generated from pinned source geometry by packages/ui-cli/src/figma/icons.ts; do not edit.
import type { SVGProps } from "react"

import { Icon, type GlyphProps } from "../icon"
import type { IconVariantComponents } from "./types"

// `send` as inline SVG: one component per pinned variant, so a bundle
// that imports one of them carries no other icon artwork.
/** The `9584:66408` drawing, in the source coordinate space. */
function DefaultGlyph(props: SVGProps<SVGSVGElement>) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="currentColor" data-figma-node-id="9584:66408" {...props}><g transform="matrix(1 0 0 1 2.999999761581421 4.49294900894165)" opacity="1"><path d="M1.4 14.9321C1.06667 15.0654 0.75 15.0362 0.45 14.8446C0.15 14.6529 0 14.3737 0 14.0071L0 9.50705L8 7.50705L0 5.50705L0 1.00705C0 0.640385 0.15 0.361218 0.45 0.169551C0.75 -0.0221154 1.06667 -0.0512821 1.4 0.0820513L16.8 6.58205C17.2167 6.76538 17.425 7.07372 17.425 7.50705C17.425 7.94038 17.2167 8.24872 16.8 8.43205L1.4 14.9321Z" fill="currentColor" fillOpacity="1" fillRule="nonzero" /></g></svg>
  )
}

/** `send`: the `filled` variant, in the shared icon box. */
export function Default(props: GlyphProps) {
  return <Icon {...props} source={DefaultGlyph} />
}

/** The `9584:66411` drawing, in the source coordinate space. */
function OutlinedGlyph(props: SVGProps<SVGSVGElement>) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="currentColor" data-figma-node-id="9584:66411" {...props}><g transform="matrix(1 0 0 1 2.999999761581421 4.49294900894165)" opacity="1"><path d="M16.8 8.43205L1.4 14.9321C1.06667 15.0654 0.75 15.0362 0.45 14.8446C0.15 14.6529 0 14.3737 0 14.0071L0 1.00705C0 0.640385 0.15 0.361218 0.45 0.169551C0.75 -0.0221154 1.06667 -0.0512821 1.4 0.0820513L16.8 6.58205C17.2167 6.76538 17.425 7.07372 17.425 7.50705C17.425 7.94038 17.2167 8.24872 16.8 8.43205ZM2 12.5071L13.85 7.50705L2 2.50705L2 6.00705L8 7.50705L2 9.00705L2 12.5071Z" fill="currentColor" fillOpacity="1" fillRule="nonzero" /></g></svg>
  )
}

/** `send`: the `outlined` variant, in the shared icon box. */
export function Outlined(props: GlyphProps) {
  return <Icon {...props} source={OutlinedGlyph} />
}

/**
 * Every pinned variant of `send`, keyed by source node id. The registry
 * resolves a runtime name to one of these drawings, which `Icon` owns the box
 * for; the exports above are the same drawings with that box already applied.
 */
export const variants: IconVariantComponents = {
  "9584:66408": DefaultGlyph,
  "9584:66411": OutlinedGlyph,
}

export default Default
