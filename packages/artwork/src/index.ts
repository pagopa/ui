// The generated artwork of the design system, exported as typed data.
//
// Two consumers read it: the components (`PagoPAIcon`, `PagoPAPictogram`), which
// receive the public name indexes and their variant types, and the catalogue and
// the stories, which read the manifests. No consumer depends on a file path:
// moving an SVG or a generated module changes this package only.
import iconManifestData from "./assets/figma-icons/manifest.json"
import pictogramManifestData from "./assets/figma-pictograms/manifest.json"

export * from "./components/icons/figma-inventory"
export * from "./components/icons/icon-assets"
export * from "./components/icons/pictogram-assets"

/** One artwork identity in a manifest: its public name and its source variants. */
export interface ArtworkManifestEntry {
  name: string
  provenance: {
    provider: string
    origin: string
    license: string
    licenseUrl?: string
    sourceUrl?: string
    attribution?: string
    note?: string
  }
  designFingerprint?: string
  /** The icon families publish one entry per variant. */
  variants?: Record<string, unknown>
  /** The pictogram families publish the two background variants. */
  light?: { nodeId: string; file: string; sha256: string }
  dark?: { nodeId: string; file: string; sha256: string }
  [key: string]: unknown
}

/** The pinned manifest of one artwork family: what the source file published. */
export interface ArtworkManifest {
  fileKey: string
  version: string
  entries: Record<string, ArtworkManifestEntry>
}

// The annotations keep the manifests out of the published declarations: a
// consumer needs their shape, never the 250 KB of pinned source data.
export const iconManifest: ArtworkManifest = iconManifestData
export const pictogramManifest: ArtworkManifest = pictogramManifestData
