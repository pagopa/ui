// Generated from pinned source geometry by packages/ui-cli/src/figma/icons.ts; do not edit.
import type { SVGProps } from "react"

import { Icon, type GlyphProps } from "../icon"
import type { IconVariantComponents } from "./types"

// `health_and_safety` as inline SVG: one component per pinned variant, so a bundle
// that imports one of them carries no other icon artwork.
/** The `15901:18592` drawing, in the source coordinate space. */
function DefaultGlyph(props: SVGProps<SVGSVGElement>) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="currentColor" data-figma-node-id="15901:18592" {...props}><g transform="matrix(1 0 0 1 4 2.1484375)" opacity="1"><path d="M6.5 10.85L6.5 12.35C6.5 12.6333 6.59583 12.8708 6.7875 13.0625C6.97917 13.2542 7.21667 13.35 7.5 13.35L8.5 13.35C8.78333 13.35 9.02083 13.2542 9.2125 13.0625C9.40417 12.8708 9.5 12.6333 9.5 12.35L9.5 10.85L11 10.85C11.2833 10.85 11.5208 10.7542 11.7125 10.5625C11.9042 10.3708 12 10.1333 12 9.85L12 8.85C12 8.56667 11.9042 8.32917 11.7125 8.1375C11.5208 7.94583 11.2833 7.85 11 7.85L9.5 7.85L9.5 6.35C9.5 6.06667 9.40417 5.82917 9.2125 5.6375C9.02083 5.44583 8.78333 5.35 8.5 5.35L7.5 5.35C7.21667 5.35 6.97917 5.44583 6.7875 5.6375C6.59583 5.82917 6.5 6.06667 6.5 6.35L6.5 7.85L5 7.85C4.71667 7.85 4.47917 7.94583 4.2875 8.1375C4.09583 8.32917 4 8.56667 4 8.85L4 9.85C4 10.1333 4.09583 10.3708 4.2875 10.5625C4.47917 10.7542 4.71667 10.85 5 10.85L6.5 10.85ZM7.675 19.725C7.575 19.7083 7.475 19.6833 7.375 19.65C5.125 18.9 3.33333 17.5125 2 15.4875C0.666667 13.4625 0 11.2833 0 8.95L0 4.225C0 3.80833 0.120833 3.43333 0.3625 3.1C0.604167 2.76667 0.916667 2.525 1.3 2.375L7.3 0.125C7.53333 0.0416667 7.76667 0 8 0C8.23333 0 8.46667 0.0416667 8.7 0.125L14.7 2.375C15.0833 2.525 15.3958 2.76667 15.6375 3.1C15.8792 3.43333 16 3.80833 16 4.225L16 8.95C16 11.2833 15.3333 13.4625 14 15.4875C12.6667 17.5125 10.875 18.9 8.625 19.65C8.525 19.6833 8.425 19.7083 8.325 19.725C8.225 19.7417 8.11667 19.75 8 19.75C7.88333 19.75 7.775 19.7417 7.675 19.725ZM8 17.75C9.73333 17.2 11.1667 16.1 12.3 14.45C13.4333 12.8 14 10.9667 14 8.95L14 4.225L8 1.975L2 4.225L2 8.95C2 10.9667 2.56667 12.8 3.7 14.45C4.83333 16.1 6.26667 17.2 8 17.75Z" fill="currentColor" fillOpacity="1" fillRule="nonzero" /></g></svg>
  )
}

/** `health_and_safety`: the default variant, in the shared icon box. */
export function Default(props: GlyphProps) {
  return <Icon {...props} source={DefaultGlyph} />
}

/**
 * Every pinned variant of `health_and_safety`, keyed by source node id. The registry
 * resolves a runtime name to one of these drawings, which `Icon` owns the box
 * for; the exports above are the same drawings with that box already applied.
 */
export const variants: IconVariantComponents = {
  "15901:18592": DefaultGlyph,
}

export default Default
