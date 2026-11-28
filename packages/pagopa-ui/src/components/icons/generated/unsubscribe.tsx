// Generated from pinned source geometry by packages/ui-cli/src/figma/icons.ts; do not edit.
import type { SVGProps } from "react"

import { Icon, type GlyphProps } from "../icon"
import type { IconVariantComponents } from "./types"

// `unsubscribe` as inline SVG: one component per pinned variant, so a bundle
// that imports one of them carries no other icon artwork.
/** The `9924:27038` drawing, in the source coordinate space. */
function DefaultGlyph(props: SVGProps<SVGSVGElement>) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="currentColor" data-figma-node-id="9924:27038" {...props}><g transform="matrix(1 0 0 1 1.9999998807907104 4)" opacity="1"><path d="M2 16C1.45 16 0.979167 15.8042 0.5875 15.4125C0.195833 15.0208 0 14.55 0 14L0 2C0 1.45 0.195833 0.979167 0.5875 0.5875C0.979167 0.195833 1.45 0 2 0L18 0C18.55 0 19.0208 0.195833 19.4125 0.5875C19.8042 0.979167 20 1.45 20 2L20 6C20 6.28333 19.9042 6.52083 19.7125 6.7125C19.5208 6.90417 19.2833 7 19 7C18.7167 7 18.4792 6.90417 18.2875 6.7125C18.0958 6.52083 18 6.28333 18 6L18 4L10.525 8.675C10.4417 8.725 10.3542 8.7625 10.2625 8.7875C10.1708 8.8125 10.0833 8.825 10 8.825C9.91667 8.825 9.82917 8.8125 9.7375 8.7875C9.64583 8.7625 9.55833 8.725 9.475 8.675L2 4L2 14L9 14C9.28333 14 9.52083 14.0958 9.7125 14.2875C9.90417 14.4792 10 14.7167 10 15C10 15.2833 9.90417 15.5208 9.7125 15.7125C9.52083 15.9042 9.28333 16 9 16L2 16ZM10 7L18 2L2 2L10 7ZM2 14L2 7L2 7.075L2 4L2 4.25L2 2.8C2 2.61667 2 2.61667 2 2.8L2 2.7875L2 4.25L2 4L2 14ZM13.4625 17.5375C12.4875 16.5625 12 15.3833 12 14C12 12.6167 12.4875 11.4375 13.4625 10.4625C14.4375 9.4875 15.6167 9 17 9C18.3833 9 19.5625 9.4875 20.5375 10.4625C21.5125 11.4375 22 12.6167 22 14C22 15.3833 21.5125 16.5625 20.5375 17.5375C19.5625 18.5125 18.3833 19 17 19C15.6167 19 14.4375 18.5125 13.4625 17.5375ZM14.5 14.5L19.5 14.5C19.6333 14.5 19.75 14.45 19.85 14.35C19.95 14.25 20 14.1333 20 14C20 13.8667 19.95 13.75 19.85 13.65C19.75 13.55 19.6333 13.5 19.5 13.5L14.5 13.5C14.3667 13.5 14.25 13.55 14.15 13.65C14.05 13.75 14 13.8667 14 14C14 14.1333 14.05 14.25 14.15 14.35C14.25 14.45 14.3667 14.5 14.5 14.5Z" fill="currentColor" fillOpacity="1" fillRule="nonzero" /></g></svg>
  )
}

/** `unsubscribe`: the default variant, in the shared icon box. */
export function Default(props: GlyphProps) {
  return <Icon {...props} source={DefaultGlyph} />
}

/**
 * Every pinned variant of `unsubscribe`, keyed by source node id. The registry
 * resolves a runtime name to one of these drawings, which `Icon` owns the box
 * for; the exports above are the same drawings with that box already applied.
 */
export const variants: IconVariantComponents = {
  "9924:27038": DefaultGlyph,
}

export default Default
