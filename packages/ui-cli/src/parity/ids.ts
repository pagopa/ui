// Storybook identity of a registry target.
//
// A story id is the slug of the story title plus the export name in words
// (`SourceFrame` -> `source-frame`), not the raw identifier: it is the identity
// the iframe URL needs (`components-inputs-textfield--playground`), so it is
// derived here once and read by every command that has to open a story.

export function slug(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
}

export function exportSlug(name: string): string {
  return slug(name.replace(/([a-z0-9])([A-Z])/g, "$1 $2").replace(/([A-Z]+)([A-Z][a-z])/g, "$1 $2"))
}

export function storyId(title: string, exportName: string): string {
  return `${slug(title)}--${exportSlug(exportName)}`
}
