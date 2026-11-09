import assert from "node:assert/strict"
import fs from "node:fs"
import os from "node:os"
import path from "node:path"
import { test } from "node:test"

import { frontmatter, pluginProblems } from "../../src/checks/plugin.ts"

const SCHEMA = "https://agent-plugins.org/schemas/1.0.0/plugin.schema.json"

function skill(name, fields = {}) {
  const lines = [
    `name: ${fields.name ?? name}`,
    `description: ${fields.description ?? "How to read the map."}`,
  ]
  for (const [key, value] of Object.entries(fields))
    if (!["name", "description"].includes(key)) lines.push(`${key}: ${value}`)
  return `---\n${lines.join("\n")}\n---\n\nRead the map.\n`
}

function tree(extra = {}) {
  return {
    "package.json": JSON.stringify({
      name: "@pagopa/ui",
      version: "1.2.3",
      files: ["dist", "cli", "skills", "plugin.json", "figma-map.json", "README.md"],
    }),
    "plugin.json": JSON.stringify({ $schema: SCHEMA, name: "pagopa-ui" }),
    "skills/figma-to-ui/SKILL.md": skill("figma-to-ui"),
    "cli/pagopa-ui-map.mjs": "",
    "figma-map.json": "{}\n",
    ...extra,
  }
}

function problems(files) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "pagopa-plugin-"))
  try {
    for (const [file, source] of Object.entries(files)) {
      const target = path.join(root, file)
      fs.mkdirSync(path.dirname(target), { recursive: true })
      fs.writeFileSync(target, source)
    }
    return pluginProblems(root)
  } finally {
    fs.rmSync(root, { recursive: true, force: true })
  }
}

test("a manifest, a skill and a complete files list agree", () => {
  assert.deepEqual(problems(tree()), [])
})

test("a plugin version restating the package version is a problem", () => {
  const drifted = tree({
    "plugin.json": JSON.stringify({ $schema: SCHEMA, name: "pagopa-ui", version: "1.2.2" }),
  })
  assert.match(problems(drifted).join("\n"), /drop "version" — the package version is the plugin/)
})

test("a shipped file outside the files list is a problem", () => {
  const short = tree({
    "package.json": JSON.stringify({ name: "@pagopa/ui", version: "1.2.3", files: ["dist"] }),
  })
  const found = problems(short).join("\n")
  assert.match(found, /"files" does not ship plugin\.json/)
  assert.match(found, /"files" does not ship figma-map\.json/)
})

test("a skill whose name differs from its folder is a problem", () => {
  const renamed = tree({ "skills/figma-to-ui/SKILL.md": skill("figma-to-ui", { name: "other" }) })
  assert.match(problems(renamed).join("\n"), /declares name "other", which must equal its folder/)
})

test("an unknown frontmatter field and an over-long description are problems", () => {
  const extra = tree({
    "skills/figma-to-ui/SKILL.md": skill("figma-to-ui", {
      description: "x".repeat(1025),
      version: "1",
    }),
  })
  const found = problems(extra).join("\n")
  assert.match(found, /unknown field "version"/)
  assert.match(found, /the description is 1025 characters/)
})

test("a skill without frontmatter is a problem", () => {
  const bare = tree({ "skills/figma-to-ui/SKILL.md": "Read the map.\n" })
  assert.match(problems(bare).join("\n"), /SKILL\.md has no frontmatter/)
})

test("an incomplete manifest is rejected by the plugin schema", () => {
  const missingSchema = tree({ "plugin.json": JSON.stringify({ name: "pagopa-ui" }) })
  assert.match(problems(missingSchema).join("\n"), /\$schema/)
})

test("frontmatter reads the flat fields it ships and ignores a block value", () => {
  const fields = frontmatter(
    '---\nname: x\ndescription: "quoted"\nmetadata:\n  a: b\n---\n\nBody\n',
  )
  assert.equal(fields.get("name"), "x")
  assert.equal(fields.get("description"), "quoted")
  assert.equal(fields.get("metadata"), "")
})
