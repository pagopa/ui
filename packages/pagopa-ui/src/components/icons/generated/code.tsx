// Generated from pinned source geometry by packages/ui-cli/src/figma/icons.ts; do not edit.
import type { SVGProps } from "react"

import { Icon, type GlyphProps } from "../icon"
import type { IconVariantComponents } from "./types"

// `code` as inline SVG: one component per pinned variant, so a bundle
// that imports one of them carries no other icon artwork.
/** The `99:2264` drawing, in the source coordinate space. */
function DefaultGlyph(props: SVGProps<SVGSVGElement>) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="currentColor" data-figma-node-id="99:2264" {...props}><g transform="matrix(1 0 0 1 2.424999952316284 6.400000095367432)" opacity="1"><path d="M2.4 5.625L6.275 9.5C6.45833 9.68333 6.55 9.91667 6.55 10.2C6.55 10.4833 6.45833 10.7167 6.275 10.9C6.09167 11.0833 5.85833 11.175 5.575 11.175C5.29167 11.175 5.05833 11.0833 4.875 10.9L0.275 6.3C0.175 6.2 0.104167 6.09167 0.0625 5.975C0.0208333 5.85833 0 5.73333 0 5.6C0 5.46667 0.0208333 5.34167 0.0625 5.225C0.104167 5.10833 0.175 5 0.275 4.9L4.875 0.3C5.075 0.1 5.3125 0 5.5875 0C5.8625 0 6.1 0.1 6.3 0.3C6.5 0.5 6.6 0.7375 6.6 1.0125C6.6 1.2875 6.5 1.525 6.3 1.725L2.4 5.625ZM16.75 5.575L12.875 1.7C12.6917 1.51667 12.6 1.28333 12.6 1C12.6 0.716667 12.6917 0.483333 12.875 0.3C13.0583 0.116667 13.2917 0.025 13.575 0.025C13.8583 0.025 14.0917 0.116667 14.275 0.3L18.875 4.9C18.975 5 19.0458 5.10833 19.0875 5.225C19.1292 5.34167 19.15 5.46667 19.15 5.6C19.15 5.73333 19.1292 5.85833 19.0875 5.975C19.0458 6.09167 18.975 6.2 18.875 6.3L14.275 10.9C14.075 11.1 13.8417 11.1958 13.575 11.1875C13.3083 11.1792 13.075 11.075 12.875 10.875C12.675 10.675 12.575 10.4375 12.575 10.1625C12.575 9.8875 12.675 9.65 12.875 9.45L16.75 5.575Z" fill="currentColor" fillOpacity="1" fillRule="nonzero" /></g></svg>
  )
}

/** `code`: the default variant, in the shared icon box. */
export function Default(props: GlyphProps) {
  return <Icon {...props} source={DefaultGlyph} />
}

/**
 * Every pinned variant of `code`, keyed by source node id. The registry
 * resolves a runtime name to one of these drawings, which `Icon` owns the box
 * for; the exports above are the same drawings with that box already applied.
 */
export const variants: IconVariantComponents = {
  "99:2264": DefaultGlyph,
}

export default Default
