// Single source for the Figma file identity used by stories and tooling.
// The file key is an address, not a credential: reading the file still
// requires Figma permissions. The secret used by scripts is FIGMA_TOKEN.
export const FIGMA_FILE_KEY = "pvhsJpPGQbEwNLiyP7BOIw"

export const FIGMA_DESIGN_URL = `https://www.figma.com/design/${FIGMA_FILE_KEY}`

export function figmaNodeUrl(nodeId: string) {
  return `${FIGMA_DESIGN_URL}?node-id=${nodeId.replace(":", "-")}`
}

// Figma URL for the Storybook design panel (`@storybook/addon-designs`).
//
// The addon rewrites a Figma URL to its `embed.figma.com` form only when a
// path segment follows the file key: a bare `?node-id=` query falls back to a
// plain iframe, and the Figma app refuses to be framed. The trailing slash
// keeps the URL name-free — names change, `nodeId` is the identity — while
// matching the addon's pattern.
export function figmaEmbedUrl(nodeId: string) {
  return `${FIGMA_DESIGN_URL}/?node-id=${nodeId.replace(":", "-")}`
}
