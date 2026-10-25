import assert from "node:assert/strict"
import { spawnSync } from "node:child_process"
import fs from "node:fs"
import os from "node:os"
import path from "node:path"
import { test } from "node:test"
import { fileURLToPath } from "node:url"

import { fixtureEnv } from "../../src/lib/paths.ts"

import { TYPOGRAPHY_ALIASES } from "../../src/figma/tokens.ts"

const script = fileURLToPath(new URL("../../src/cli.ts", import.meta.url))

function tokensArguments(cli, args) {
  if (args[0] === "--write") return [cli, "tokens", "write", ...args.slice(1)]
  return [cli, "tokens", "check"]
}

// The fixture must cover every alias of the policy, like the production
// manifest does; Hero keeps real values for the emission assertions.
const typographyVariables = Object.fromEntries(
  Object.keys(TYPOGRAPHY_ALIASES).map((name) => [
    name,
    'Font(family: "Titillio", style: Semibold, size: 16, weight: 500, lineHeight: 22, letterSpacing: 0)',
  ]),
)

const foundationsData = {
  schemaVersion: 1,
  entries: {
    "spacing-12": {
      name: "Foundations/spacing-12",
      type: "FLOAT",
      value: 12,
      category: "spacing",
      origin: "local-extension",
      source: { kind: "snapshot", note: "padding: 12px recurs in the fixture" },
      reason: "no published variable — requested to design",
      theme: { namespace: "spacing", key: "3" },
    },
    "breakpoint-sm": {
      name: "Foundations/breakpoint-sm",
      type: "FLOAT",
      value: 600,
      category: "breakpoint",
      origin: "figma-asset",
      source: { kind: "variable", ref: "device-sm", note: "Device/SM Tablet 600" },
      theme: { namespace: "breakpoint", key: "sm" },
    },
    "shadow-16": {
      name: "Shadow 16",
      type: "EFFECT",
      value: [
        {
          type: "DROP_SHADOW",
          color: "#0e0f131a",
          offset: { x: 0, y: 4 },
          radius: 16,
          spread: 0,
        },
      ],
      category: "shadow",
      origin: "figma-asset",
      source: { kind: "style", ref: "style-shadow-16", note: "Shadow 16 effect style" },
    },
  },
}

const blueId = { kind: "variable", library: "fixture library", key: "key-blue-500" }
const heroId = { kind: "style", library: "fixture library", key: "key-hero" }

const snapshotData = {
  fileKey: "fixture",
  syncedAt: "2026-01-01",
  source: { method: "fixture" },
  ids: { "Color/Blue/Blue 500": blueId, "Headings/Hero": heroId },
  variables: {
    ...typographyVariables,
    "Headings/Hero":
      'Font(family: "Titillio", style: Semibold, size: 32, weight: 500, lineHeight: 48, letterSpacing: 0)',
    "Color/Blue/Blue 500": "#0b3ee3",
    "Color/Neutrals/Grey 100": "#e8ebf1",
    "Foundations/radius-8": "8",
    "Elevation/1":
      "Effect(type: DROP_SHADOW, color: #002B551A, offset: (0, 1), radius: 3, spread: 0)",
    "Text/Primary": "#17324D",
  },
}

function fixture(run, overrides = {}) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "pagopa-tokens-"))
  const files = {
    "src/catalog/figma/file.ts": 'export const FIGMA_FILE_KEY = "fixture"\n',
    "src/index.css": [
      '@import "pagopa-ui-tokens/figma.generated.css";',
      ":root {",
      "  --primary: var(--figma-color-blue-500);",
      "  --border: var(--figma-color-neutrals-grey-100);",
      "  --shadow-16: var(--figma-shadow-16);",
      "  --spacing-3: var(--figma-spacing-12);",
      "}",
      "",
    ].join("\n"),
    "src/foundations.json": JSON.stringify(foundationsData),
    "snapshot.json": JSON.stringify(snapshotData),
    ...overrides,
  }
  try {
    for (const [file, source] of Object.entries(files)) {
      const target = path.join(root, file)
      fs.mkdirSync(path.dirname(target), { recursive: true })
      fs.writeFileSync(target, source)
    }
    return run({
      root,
      tokens: (...args) =>
        spawnSync(process.execPath, tokensArguments(script, args), {
          cwd: root,
          encoding: "utf8",
          env: fixtureEnv(root),
        }),
      read: (file) => fs.readFileSync(path.join(root, file), "utf8"),
      write: (file, source) => {
        const target = path.join(root, file)
        fs.mkdirSync(path.dirname(target), { recursive: true })
        fs.writeFileSync(target, source)
      },
      snapshot: (variables, rest = {}) => JSON.stringify({ ...snapshotData, variables, ...rest }),
      foundations: (entries) =>
        JSON.stringify({ ...foundationsData, entries: { ...foundationsData.entries, ...entries } }),
    })
  } finally {
    fs.rmSync(root, { recursive: true, force: true })
  }
}

test("write keys the manifest by the published id and emits the foundation theme", () => {
  fixture(({ tokens, read }) => {
    const write = tokens("--write", "--input", "snapshot.json")
    assert.equal(write.status, 0, write.stderr)
    const manifest = JSON.parse(read("src/manifest.json"))
    assert.equal(manifest.schemaVersion, 2)
    const blue = manifest.variables["key-blue-500"]
    assert.equal(blue.name, "Color/Blue/Blue 500")
    assert.equal(blue.idKind, "variable")
    assert.equal(blue.idLibrary, "fixture library")
    assert.equal(blue.value, "#0b3ee3")
    assert.equal(blue.cssName, "figma-color-blue-500")
    assert.equal(manifest.variables["key-hero"].alias, "hero")
    assert.equal(manifest.variables["local:Foundations/radius-8"].type, "FLOAT")
    assert.equal(manifest.foundations["spacing-12"].value, 12)
    assert.match(manifest.excluded["Text/Primary"], /legacy MUI Italia/)
    const css = read("src/figma.generated.css")
    assert.match(css, /--figma-color-blue-500: #0b3ee3;/)
    assert.match(css, /--figma-spacing-12: 12px;/)
    assert.match(css, /--figma-shadow-16: 0px 4px 16px 0px #0e0f131a;/)
    assert.match(css, /--spacing-3: 0.75rem;/)
    assert.match(css, /--breakpoint-sm: 37.5rem;/)
    assert.match(css, /--text-hero--line-height: 3rem;/)
    assert.match(css, /--radius-8: var\(--figma-radius-8\);/)
    assert.match(read("src/figma-text-classes.generated.ts"), /figmaTextClasses/)
    const inventory = read("src/figma-tokens.generated.ts")
    assert.match(inventory, /id: "key-blue-500"/)
    assert.match(inventory, /category: "spacing"/)
    const check = tokens("--check")
    assert.equal(check.status, 0, check.stderr)
    assert.match(check.stdout, /tokens check: 34 variables/)
    assert.match(check.stdout, /\+ 3 foundations/)
  })
})

test("a rename keeps the id, the css name and the alias", () => {
  fixture(({ tokens, read, write }) => {
    assert.equal(tokens("--write", "--input", "snapshot.json").status, 0)
    const renamed = Object.fromEntries(
      Object.entries(snapshotData.variables).map(([name, value]) => [
        name === "Color/Blue/Blue 500" ? "Color/Blue/Blue 500 · vivid" : name,
        name === "Color/Blue/Blue 500" ? "#0b3ee3" : value,
      ]),
    )
    renamed["Headings/Hero · renamed"] = renamed["Headings/Hero"]
    delete renamed["Headings/Hero"]
    write(
      "snapshot.json",
      JSON.stringify({
        ...snapshotData,
        variables: renamed,
        ids: {
          "Color/Blue/Blue 500 · vivid": blueId,
          "Headings/Hero · renamed": heroId,
        },
      }),
    )
    const second = tokens("--write", "--input", "snapshot.json")
    assert.equal(second.status, 0, second.stderr)
    assert.match(second.stdout, /renamed Color\/Blue\/Blue 500 -> Color\/Blue\/Blue 500 · vivid/)
    assert.match(second.stdout, /renamed Headings\/Hero -> Headings\/Hero · renamed/)
    const manifest = JSON.parse(read("src/manifest.json"))
    assert.equal(manifest.variables["key-blue-500"].name, "Color/Blue/Blue 500 · vivid")
    assert.equal(manifest.variables["key-blue-500"].cssName, "figma-color-blue-500")
    assert.equal(manifest.variables["key-hero"].alias, "hero")
    const css = read("src/figma.generated.css")
    assert.match(css, /--figma-color-blue-500: #0b3ee3;/)
    assert.match(css, /--text-hero: 2rem;/)
    assert.equal(tokens("--check").status, 0)
  })
})

test("a snapshot without ids carries the previous ids over by name", () => {
  fixture(({ tokens, read, write }) => {
    assert.equal(tokens("--write", "--input", "snapshot.json").status, 0)
    const withoutIds = { ...snapshotData }
    delete withoutIds.ids
    write("snapshot.json", JSON.stringify(withoutIds))
    const second = tokens("--write", "--input", "snapshot.json")
    assert.equal(second.status, 0, second.stderr)
    assert.match(second.stdout, /ids carried over by name/)
    const manifest = JSON.parse(read("src/manifest.json"))
    assert.equal(manifest.variables["key-blue-500"].name, "Color/Blue/Blue 500")
    assert.equal(manifest.variables["local:Color/Neutrals/Grey 100"].idKind, "name")
  })
})

test("unresolved variables are disposed by policy or fail loudly", () => {
  fixture(
    ({ tokens, read }) => {
      const write = tokens("--write", "--input", "snapshot.json")
      assert.equal(write.status, 0, write.stderr)
      assert.match(write.stdout, /unresolved 0/)
      const manifest = JSON.parse(read("src/manifest.json"))
      assert.match(manifest.excluded["spacing/timeline-indentation"], /component-specific float/)
      assert.match(manifest.excluded["Color/Opacity/Grey 850 20"], /App IO library opacity/)
    },
    {
      "snapshot.json": JSON.stringify({
        ...snapshotData,
        unresolved: {
          "spacing/timeline-indentation": "float without a CSS consumer yet",
          "Color/Opacity/Grey 850 20":
            "present in the library search, not bound by the captured nodes",
        },
      }),
    },
  )
  fixture(
    ({ tokens }) => {
      const write = tokens("--write", "--input", "snapshot.json")
      assert.equal(write.status, 1)
      assert.match(write.stderr, /Unresolved variables without a curation policy/)
    },
    {
      "snapshot.json": JSON.stringify({
        ...snapshotData,
        unresolved: { "Color/Blue/Blue 999": "not bound to a reachable node" },
      }),
    },
  )
})

test("check fails when the generated css is tampered with", () => {
  fixture(({ tokens, read, write }) => {
    assert.equal(tokens("--write", "--input", "snapshot.json").status, 0)
    write("src/figma.generated.css", read("src/figma.generated.css") + "\n")
    const check = tokens("--check")
    assert.notEqual(check.status, 0)
    assert.match(check.stderr, /does not match the manifest/)
  })
})

test("check fails when a semantic reference has no generated variable", () => {
  fixture(({ tokens, write }) => {
    write(
      "src/index.css",
      '@import "pagopa-ui-tokens/figma.generated.css";\n:root { --broken: var(--figma-color-missing-100); }\n',
    )
    assert.equal(tokens("--write", "--input", "snapshot.json").status, 0)
    const check = tokens("--check")
    assert.notEqual(check.status, 0)
    assert.match(check.stderr, /--figma-color-missing-100/)
  })
})

test("check fails when a foundation reference has no generated variable", () => {
  fixture(({ tokens, write }) => {
    write(
      "src/index.css",
      '@import "pagopa-ui-tokens/figma.generated.css";\n:root { --shadow-16: var(--figma-shadow-missing); }\n',
    )
    assert.equal(tokens("--write", "--input", "snapshot.json").status, 0)
    const check = tokens("--check")
    assert.notEqual(check.status, 0)
    assert.match(check.stderr, /--figma-shadow-missing/)
  })
})

test("check fails when the stylesheet does not import the generated layer", () => {
  fixture(({ tokens, write }) => {
    write("src/index.css", ":root { --primary: var(--figma-color-blue-500); }\n")
    assert.equal(tokens("--write", "--input", "snapshot.json").status, 0)
    const check = tokens("--check")
    assert.notEqual(check.status, 0)
    assert.match(check.stderr, /missing the generated tokens import/)
  })
})

test("an unknown namespace fails the refresh instead of being dropped", () => {
  fixture(({ tokens, snapshot, write }) => {
    write("snapshot.json", snapshot({ ...snapshotData.variables, "Mystery/Thing 1": "#000000" }))
    const result = tokens("--write", "--input", "snapshot.json")
    assert.notEqual(result.status, 0)
    assert.match(result.stderr, /Mystery\/Thing 1/)
    assert.match(result.stderr, /Unmapped variable namespaces/)
  })
})

test("typography without a text alias and unmapped weights fail loudly", () => {
  fixture(({ tokens, snapshot, write }) => {
    write(
      "snapshot.json",
      snapshot({
        "Body/New Style":
          'Font(family: "Titillio", style: Regular, size: 16, weight: 400, lineHeight: 22, letterSpacing: 0)',
      }),
    )
    const alias = tokens("--write", "--input", "snapshot.json")
    assert.notEqual(alias.status, 0)
    assert.match(alias.stderr, /Body\/New Style: missing text-\* alias/)
    write(
      "snapshot.json",
      snapshot({
        "Headings/Hero":
          'Font(family: "Titillio", style: Light, size: 32, weight: 300, lineHeight: 48, letterSpacing: 0)',
      }),
    )
    const weight = tokens("--write", "--input", "snapshot.json")
    assert.notEqual(weight.status, 0)
    assert.match(weight.stderr, /map the Figma weight 300/)
  })
})

test("css name collisions and unsupported values fail loudly", () => {
  fixture(({ tokens, snapshot, write }) => {
    write(
      "snapshot.json",
      snapshot({ ...snapshotData.variables, "Color/Blue/Blue/Blue 500": "#0b3ee3" }),
    )
    const collision = tokens("--write", "--input", "snapshot.json")
    assert.notEqual(collision.status, 0)
    assert.match(collision.stderr, /Duplicate css name/)
    write(
      "snapshot.json",
      snapshot({ ...snapshotData.variables, "Color/Blue/Blue 500": "rgb(11, 62, 227)" }),
    )
    const value = tokens("--write", "--input", "snapshot.json")
    assert.notEqual(value.status, 0)
    assert.match(value.stderr, /unsupported variable value rgb\(11, 62, 227\)/)
  })
})

test("a snapshot from another Figma file cannot replace the manifest", () => {
  fixture(({ tokens, snapshot, write }) => {
    write("snapshot.json", snapshot(snapshotData.variables, { fileKey: "other" }))
    const result = tokens("--write", "--input", "snapshot.json")
    assert.notEqual(result.status, 0)
    assert.match(result.stderr, /different Figma file/)
  })
})

test("foundation entries without a source note or reason fail the refresh", () => {
  fixture(
    ({ tokens }) => {
      const result = tokens("--write", "--input", "snapshot.json")
      assert.notEqual(result.status, 0)
      assert.match(result.stderr, /a local extension requires a reason/)
    },
    {
      "src/foundations.json": JSON.stringify({
        schemaVersion: 1,
        entries: {
          "spacing-12": {
            name: "Foundations/spacing-12",
            type: "FLOAT",
            value: 12,
            category: "spacing",
            origin: "local-extension",
            source: { kind: "snapshot", note: "padding: 12px recurs in the fixture" },
            theme: { namespace: "spacing", key: "3" },
          },
        },
      }),
    },
  )
  fixture(
    ({ tokens }) => {
      const result = tokens("--write", "--input", "snapshot.json")
      assert.notEqual(result.status, 0)
      assert.match(result.stderr, /the source requires a note/)
    },
    {
      "src/foundations.json": JSON.stringify({
        schemaVersion: 1,
        entries: {
          "spacing-12": {
            name: "Foundations/spacing-12",
            type: "FLOAT",
            value: 12,
            category: "spacing",
            origin: "local-extension",
            source: { kind: "snapshot" },
            reason: "no published variable",
            theme: { namespace: "spacing", key: "3" },
          },
        },
      }),
    },
  )
})
