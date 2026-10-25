import assert from "node:assert/strict"
import fs from "node:fs"
import path from "node:path"
import { test } from "node:test"

import { storyTitle } from "../../src/lib/source-modules.ts"
import { resolveStoriesRoot, rootPath } from "../../src/lib/paths.ts"

const root = rootPath()
const storiesRoot = resolveStoriesRoot()

// Storybook documents the design system: library stories live under
// `Foundations/*` (tokens, icon/pictogram catalogues and the inventory) and
// `Components/<section>/<Component>`. Prototype or product-surface demos and
// internal fidelity fixtures do not belong in the taxonomy: the `Screens/*`,
// `Templates/*` and `Alignment/*` sections were retired on 2026-10-15 (the
// definition of done of the pagopa-ui-standards skill keeps them retired).
// A new section is a deliberate decision: add it here with its reason.
//
// `Reviews/<slug>` is the documented exception: one review story per open
// design question, its title after the section. Review stories live only on the
// long-lived `feedback/previews` branch, never merge, and are deleted when the
// question closes; the exception keeps that branch's story suite green.
const FOUNDATIONS = new Set(["Tokens", "Icons and pictograms", "Figma inventory"])
const COMPONENT_SECTIONS = new Set([
  // The accessibility contract per component type: text overrides and the
  // conditions the shared checks impose (flusso D).
  "Accessibility",
  "Alert",
  "Badge",
  "Button",
  "Card",
  "Checkbox",
  "Composites",
  "Content",
  "Data display",
  "Feedback",
  "Inputs",
  "Navigation",
  "Overlays",
  "Separator",
  "Tabs",
  // Page-level Figma templates (`◆ KEY TEMPLATE`): the source sets are full
  // pages, not components, and they are implemented as Storybook templates.
  "Templates",
])

function storyFiles(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(directory, entry.name)
    if (entry.isDirectory()) return storyFiles(full)
    return /\.stories\.(ts|tsx)$/.test(entry.name) ? [full] : []
  })
}

test("every story title stays inside the documented taxonomy", () => {
  const stories = storyFiles(storiesRoot)
  assert.ok(stories.length > 0, "expected story files under apps/storybook/src")

  const offenders = []
  for (const file of stories) {
    const relative = path.relative(storiesRoot, file)
    const title = storyTitle(file)
    if (typeof title !== "string" || !title) {
      offenders.push(`${relative}: missing a meta title`)
      continue
    }
    const [top, section] = title.split("/")
    if (top === "Reviews") {
      if (!section) offenders.push(`${relative}: "Reviews" needs a question slug`)
      continue
    }
    const allowed =
      top === "Foundations" ? FOUNDATIONS : top === "Components" ? COMPONENT_SECTIONS : null
    if (!allowed || !allowed.has(section))
      offenders.push(`${relative}: "${title}" is outside the taxonomy`)
  }

  assert.deepEqual(offenders, [])
})

test("the retired demo and fidelity sections stay retired", () => {
  const retired = ["alignment", "Screens", "Templates"].flatMap((name) =>
    fs.readdirSync(storiesRoot).filter((file) => file.startsWith(name)),
  )
  assert.deepEqual(retired, [])
  assert.equal(fs.existsSync(path.join(root, "src/components/screens")), false)
})
