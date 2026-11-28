import assert from "node:assert/strict"
import { spawnSync } from "node:child_process"
import fs from "node:fs"
import path from "node:path"
import { test } from "node:test"
import { fileURLToPath } from "node:url"

import { fixtureEnvironment, fixtureTree } from "../helpers/cli.mjs"

import { TYPOGRAPHY_ALIASES } from "../../src/figma/tokens.ts"

const script = fileURLToPath(new URL("../../src/cli.ts", import.meta.url))
const workspace = fileURLToPath(new URL("../../../../", import.meta.url))

const readWorkspace = (file) => fs.readFileSync(path.join(workspace, file), "utf8")

function tokensArguments(cli, args) {
  if (args[0] === "--write") return [cli, "update", "tokens", ...args.slice(1)]
  return [cli, "check", "tokens"]
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

const contractOf = (css) => css.slice(0, css.indexOf("/* Internal Figma primitives"))

function fixture(run, overrides = {}) {
  const tree = fixtureTree({}, "pagopa-tokens-")
  const root = tree.root
  const files = {
    "src/catalog/figma/file.ts": 'export const FIGMA_FILE_KEY = "fixture"\n',
    "src/index.css": [
      '@import "pagopa-ui-tokens/figma.generated.css";',
      ".pagopa-ui-root {",
      "  --pui-primary: var(--figma-color-blue-500);",
      "  --pui-border: var(--figma-color-neutrals-grey-100);",
      "  --pui-shadow: var(--figma-shadow-16);",
      "  --pui-gutter: var(--figma-spacing-12);",
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
          env: fixtureEnvironment(root),
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
    tree.dispose()
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
    const reset = css.indexOf("--breakpoint-*: initial;")
    assert.ok(reset >= 0, "the theme resets the Tailwind breakpoints")
    assert.ok(reset < css.indexOf("--breakpoint-sm:"), "the reset precedes the Figma breakpoints")
    assert.match(css, /--text-hero--line-height: 3rem;/)
    assert.match(css, /--radius-8: var\(--figma-radius-8\);/)
    assert.match(read("src/figma-text-classes.generated.ts"), /figmaTextClasses/)
    const rootCss = read("src/tokens.generated.css")
    assert.doesNotMatch(rootCss, /@theme/, "the Tailwind theme stays out of the public tokens")
    assert.doesNotMatch(
      rootCss.slice(0, rootCss.indexOf("/* Internal Figma primitives")),
      /--figma-/,
      "the public contract names no Figma token",
    )
    const inventory = read("src/figma-tokens.generated.ts")
    assert.match(inventory, /id: "key-blue-500"/)
    assert.match(inventory, /category: "spacing"/)
    const check = tokens("--check")
    assert.equal(check.status, 0, check.stderr)
    assert.match(check.stdout, /check tokens: 34 variables/)
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

test("the public semantic contract is emitted on :root, typed and as DTCG", () => {
  fixture(({ tokens, read }) => {
    const write = tokens("--write", "--input", "snapshot.json")
    assert.equal(write.status, 0, write.stderr)
    const rootCss = read("src/tokens.generated.css")
    assert.match(rootCss, /^:root \{\n {2}--pui-primary: #0b3ee3;$/m)
    assert.match(rootCss, /^ {2}--pui-border: #e8ebf1;$/m)
    assert.match(rootCss, /^ {2}--pui-shadow: 0px 4px 16px 0px #0e0f131a;$/m)
    const contract = rootCss.slice(0, rootCss.indexOf("/* Internal Figma primitives"))
    assert.doesNotMatch(contract, /--figma-/, "the contract resolves the primitive layer")
    const inventory = read("src/pui-tokens.generated.ts")
    assert.match(inventory, /cssName: "--pui-primary"/)
    assert.match(inventory, /type: "color"/)
    const dtcg = JSON.parse(read("src/tokens.dtcg.generated.json"))
    // The projection carries the value the CSS publishes, never an alias into
    // the build-time primitive layer (ADR-0013 RD1, RD2).
    assert.deepEqual(dtcg.pui.primary, { $type: "color", $value: "#0b3ee3" })
    assert.deepEqual(dtcg.pui.border, { $type: "color", $value: "#e8ebf1" })
    assert.deepEqual(dtcg.pui.gutter, { $type: "dimension", $value: "12px" })
    assert.equal(dtcg.primitives, undefined, "the build-time layer is not published")
    for (const value of Object.values(dtcg.pui)) assert.doesNotMatch(value.$value, /^\{/)
    assert.equal(tokens("--check").status, 0)
  })
})

test("the semantic contract is read from the layered, :where()-wrapped root", () => {
  fixture(({ tokens, read, write }) => {
    assert.equal(tokens("--write", "--input", "snapshot.json").status, 0)
    const contract = contractOf(read("src/tokens.generated.css"))
    write(
      "src/index.css",
      [
        '@import "pagopa-ui-tokens/figma.generated.css";',
        "@layer pagopa-ui.base {",
        "  :where(.pagopa-ui-root) {",
        "    --pui-primary: var(--figma-color-blue-500);",
        "    --pui-border: var(--figma-color-neutrals-grey-100);",
        "    --pui-shadow: var(--figma-shadow-16);",
        "    --pui-gutter: var(--figma-spacing-12);",
        "  }",
        "}",
        "",
      ].join("\n"),
    )
    const check = tokens("--check")
    assert.equal(check.status, 0, check.stderr)
    assert.equal(contractOf(read("src/tokens.generated.css")), contract)
  })
})

test("a Figma rename changes no public semantic name or value", () => {
  fixture(({ tokens, read, write }) => {
    assert.equal(tokens("--write", "--input", "snapshot.json").status, 0)
    const before = {
      css: read("src/tokens.generated.css"),
      inventory: read("src/pui-tokens.generated.ts"),
      dtcg: read("src/tokens.dtcg.generated.json"),
    }
    const renamed = { ...snapshotData.variables, "Color/Blue/Blue 500 · vivid": "#0b3ee3" }
    delete renamed["Color/Blue/Blue 500"]
    write(
      "snapshot.json",
      JSON.stringify({
        ...snapshotData,
        variables: renamed,
        ids: { "Color/Blue/Blue 500 · vivid": blueId, "Headings/Hero": heroId },
      }),
    )
    const second = tokens("--write", "--input", "snapshot.json")
    assert.equal(second.status, 0, second.stderr)
    assert.equal(contractOf(read("src/tokens.generated.css")), contractOf(before.css))
    assert.equal(read("src/pui-tokens.generated.ts"), before.inventory)
    assert.equal(read("src/tokens.dtcg.generated.json"), before.dtcg)
    assert.equal(tokens("--check").status, 0)
  })
})

test("a declaration outside the public namespace fails the refresh", () => {
  fixture(({ tokens, read, write }) => {
    assert.equal(tokens("--write", "--input", "snapshot.json").status, 0)
    write(
      "src/index.css",
      read("src/index.css").replace(
        "  --pui-primary:",
        "  --mystery: var(--figma-color-blue-500);\n  --pui-primary:",
      ),
    )
    const result = tokens("--check")
    assert.notEqual(result.status, 0)
    assert.match(result.stderr, /--mystery/)
    assert.match(result.stderr, /--pui-\* only/)
  })
})

test("a color-mix is published as the colour it computes", () => {
  fixture(({ tokens, read, write }) => {
    write(
      "src/index.css",
      read("src/index.css").replace(
        "  --pui-primary:",
        "  --pui-accent: color-mix(in srgb, var(--figma-color-blue-500) 8%, #ffffff);\n  --pui-primary:",
      ),
    )
    const write2 = tokens("--write", "--input", "snapshot.json")
    assert.equal(write2.status, 0, write2.stderr)
    // 8% of #0b3ee3 over white, composited in gamma-encoded sRGB.
    assert.match(read("src/tokens.generated.css"), /^ {2}--pui-accent: #ebf0fd;$/m)
    const dtcg = JSON.parse(read("src/tokens.dtcg.generated.json"))
    assert.deepEqual(dtcg.pui.accent, { $type: "color", $value: "#ebf0fd" })
    assert.equal(tokens("--check").status, 0)
  })
})

test("a mix of two Figma references resolves each side before it composites", () => {
  fixture(({ tokens, read, write }) => {
    write(
      "src/index.css",
      read("src/index.css").replace(
        "  --pui-primary:",
        "  --pui-pressed: color-mix(in srgb, var(--figma-color-blue-500) 50%, var(--figma-color-neutrals-grey-100));\n  --pui-primary:",
      ),
    )
    const written = tokens("--write", "--input", "snapshot.json")
    assert.equal(written.status, 0, written.stderr)
    // #0b3ee3 and #e8ebf1 meet halfway: both endpoints are published colours,
    // so the contract carries the value the mix computes and no reference.
    assert.match(read("src/tokens.generated.css"), /^ {2}--pui-pressed: #7a95ea;$/m)
    const dtcg = JSON.parse(read("src/tokens.dtcg.generated.json"))
    assert.deepEqual(dtcg.pui.pressed, { $type: "color", $value: "#7a95ea" })
    assert.equal(tokens("--check").status, 0)
  })
})

test("the shipped state steps are derived from their endpoints, not literal hexes", () => {
  const stylesheet = readWorkspace("packages/pagopa-ui/src/index.css")
  for (const name of ["destructive-hover", "primary-active"]) {
    const derivation = new RegExp(
      `--pui-${name}: color-mix\\(\\s*in srgb,\\s*` +
        "var\\(--figma-color-[a-z0-9-]+\\) \\d+%,\\s*var\\(--figma-color-[a-z0-9-]+\\)\\s*\\)",
    )
    assert.match(
      stylesheet,
      derivation,
      `--pui-${name} names the two published steps it derives from (design defaults 2)`,
    )
  }
  // A state surface never introduces a new hex value: the derivation is how the
  // value is computed, the contract publishes the resolved colour.
  const contract = readWorkspace("packages/tokens/src/tokens.generated.css")
  for (const name of ["destructive-hover", "primary-active"]) {
    assert.match(contract, new RegExp(`^ {2}--pui-${name}: #[0-9a-f]{6};$`, "m"))
  }
})

test("a mix of an operand the generator cannot resolve fails the refresh", () => {
  fixture(({ tokens, read, write }) => {
    write(
      "src/index.css",
      read("src/index.css").replace(
        "  --pui-primary:",
        "  --pui-accent: color-mix(in srgb, white 8%, #ffffff);\n  --pui-primary:",
      ),
    )
    const result = tokens("--write", "--input", "snapshot.json")
    assert.notEqual(result.status, 0)
    assert.match(
      result.stderr,
      /--pui-accent: only an opaque hex colour composites in srgb, not "white 8%"/,
    )
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
  fixture(({ tokens, read, write }) => {
    assert.equal(tokens("--write", "--input", "snapshot.json").status, 0)
    write(
      "src/index.css",
      read("src/index.css").replace(
        "  --pui-primary:",
        "  --pui-broken: var(--figma-color-missing-100);\n  --pui-primary:",
      ),
    )
    const check = tokens("--check")
    assert.notEqual(check.status, 0)
    assert.match(check.stderr, /--figma-color-missing-100/)
  })
})

test("check fails when a foundation reference has no generated variable", () => {
  fixture(({ tokens, write }) => {
    write(
      "src/index.css",
      '@import "pagopa-ui-tokens/figma.generated.css";\n.pagopa-ui-root { --pui-primary: var(--figma-color-blue-500); }\n:root { --shadow-16: var(--figma-shadow-missing); }\n',
    )
    assert.equal(tokens("--write", "--input", "snapshot.json").status, 0)
    const check = tokens("--check")
    assert.notEqual(check.status, 0)
    assert.match(check.stderr, /--figma-shadow-missing/)
  })
})

test("check fails when the stylesheet does not import the generated layer", () => {
  fixture(({ tokens, read, write }) => {
    write("src/index.css", read("src/index.css").replace(/^@import .*\n/, ""))
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

test("typography and effect parsers accept decimals, negative letterSpacing and INNER_SHADOW", () => {
  fixture(({ tokens, read, snapshot, write }) => {
    write(
      "snapshot.json",
      snapshot({
        ...snapshotData.variables,
        "Headings/Hero":
          'Font(family: "Titillio", style: Semibold, size: 32.5, weight: 500, lineHeight: 48.5, letterSpacing: -0.25)',
        "Elevation/Inner":
          "Effect(type: INNER_SHADOW, color: #002B551A, offset: (0, -1.5), radius: 2.5, spread: 0.5)",
      }),
    )
    const written = tokens("--write", "--input", "snapshot.json")
    assert.equal(written.status, 0, written.stderr)
    const css = read("src/figma.generated.css")
    assert.match(css, /--text-hero--letter-spacing: -0.25px;/)
    assert.match(css, /--figma-elevation-inner: inset 0px -1.5px 2.5px 0.5px #002b551a;/)
    assert.equal(tokens("--check").status, 0)
  })
})
