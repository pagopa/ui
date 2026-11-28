// Generated from pinned source geometry by packages/ui-cli/src/figma/icons.ts; do not edit.
import type { SVGProps } from "react"

import { Icon, type GlyphProps } from "../icon"
import type { IconVariantComponents } from "./types"

// `mail_off` as inline SVG: one component per pinned variant, so a bundle
// that imports one of them carries no other icon artwork.
/** The `9790:9527` drawing, in the source coordinate space. */
function DefaultGlyph(props: SVGProps<SVGSVGElement>) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="currentColor" data-figma-node-id="9790:9527" {...props}><g transform="matrix(1 0 0 1 1.7749998569488525 3.1999998092651367)" opacity="1"><path d="M17.3 18.7L15.375 16.8L2.225 16.8C1.675 16.8 1.20417 16.6042 0.8125 16.2125C0.420833 15.8208 0.225 15.35 0.225 14.8L0.225 2.8C0.225 2.25 0.420833 1.77917 0.8125 1.3875C1.20417 0.995833 1.675 0.8 2.225 0.8L4.225 2.8L2.225 2.8L2.225 14.8L13.375 14.8L0.3 1.725C0.1 1.525 0 1.2875 0 1.0125C0 0.7375 0.1 0.5 0.3 0.3C0.5 0.1 0.7375 0 1.0125 0C1.2875 0 1.525 0.1 1.725 0.3L18.725 17.3C18.925 17.5 19.025 17.7333 19.025 18C19.025 18.2667 18.925 18.5 18.725 18.7C18.525 18.9 18.2875 19 18.0125 19C17.7375 19 17.5 18.9 17.3 18.7ZM20.225 2.8L20.225 13.55C20.225 13.8833 20.1208 14.1333 19.9125 14.3C19.7042 14.4667 19.475 14.55 19.225 14.55C18.975 14.55 18.7458 14.4625 18.5375 14.2875C18.3292 14.1125 18.225 13.8583 18.225 13.525L18.225 4.8L13.175 7.975C12.9417 8.125 12.7167 8.1625 12.5 8.0875C12.2833 8.0125 12.1167 7.88333 12 7.7C11.8833 7.51667 11.8417 7.3125 11.875 7.0875C11.9083 6.8625 12.0417 6.675 12.275 6.525L18.225 2.8L7.5 2.8C7.16667 2.8 6.91667 2.69583 6.75 2.4875C6.58333 2.27917 6.5 2.05 6.5 1.8C6.5 1.55 6.58333 1.32083 6.75 1.1125C6.91667 0.904167 7.16667 0.8 7.5 0.8L18.225 0.8C18.775 0.8 19.2458 0.995833 19.6375 1.3875C20.0292 1.77917 20.225 2.25 20.225 2.8Z" fill="currentColor" fillOpacity="1" fillRule="nonzero" /></g></svg>
  )
}

/** `mail_off`: the default variant, in the shared icon box. */
export function Default(props: GlyphProps) {
  return <Icon {...props} source={DefaultGlyph} />
}

/**
 * Every pinned variant of `mail_off`, keyed by source node id. The registry
 * resolves a runtime name to one of these drawings, which `Icon` owns the box
 * for; the exports above are the same drawings with that box already applied.
 */
export const variants: IconVariantComponents = {
  "9790:9527": DefaultGlyph,
}

export default Default
