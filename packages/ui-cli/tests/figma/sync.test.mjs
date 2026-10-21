import assert from "node:assert/strict"
import { spawnSync } from "node:child_process"
import fs from "node:fs"
import os from "node:os"
import path from "node:path"
import { test } from "node:test"
import { fileURLToPath } from "node:url"

import { fixtureEnv } from "../../src/lib/paths.ts"

const script = fileURLToPath(new URL("../../src/cli.ts", import.meta.url))
const exportScript = fileURLToPath(new URL("../../src/cli.ts", import.meta.url))
const node = {
  nodeId: "1:1",
  name: "Control",
  type: "COMPONENT_SET",
  pageId: "1:0",
  pageName: "Controls",
  properties: {
    Size: { type: "VARIANT", defaultValue: "Small", variantOptions: ["Small", "Large"] },
  },
  dependencies: [],
}

// The device vocabulary of the fixtures. `axes` stays empty on purpose: the
// default fixture sets declare no device axis, and a policy that names an axis
// no fixture uses is an error (the check reads the inventory, never a list).
// A fixture that wants devices overrides the file.
const devicePolicy = {
  axes: [],
  any: ["Any", "Default"],
  devices: {
    mobile: {
      canonicalWidth: 320,
      defaultLayoutScope: "viewport",
      aliases: ["Mobile", "XS Mobile", "XSMobile"],
    },
    tablet: {
      canonicalWidth: 600,
      defaultLayoutScope: "viewport",
      aliases: ["Tablet", "SM Tablet", "SMTablet", "SM Table", "MD Tablet", "MDTablet"],
    },
    desktop: {
      canonicalWidth: 1200,
      defaultLayoutScope: "viewport",
      aliases: [
        "Desktop",
        "Descktop",
        "LG Desktop",
        "MD Desktop",
        "XL Desktop",
        "XXL Desktop",
        "Device5",
      ],
    },
  },
}

function fixture(run, overrides = {}) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "pagopa-figma-"))
  const files = {
    "src/catalog/figma/inventory.json": JSON.stringify({
      fileKey: "fixture",
      syncedAt: new Date().toISOString().slice(0, 10),
      components: [node],
    }),
    "src/catalog/figma/registry.json": JSON.stringify({
      bulkRules: [],
      entries: { "1:1": { status: "excluded", reason: "Fixture-only control" } },
    }),
    "src/catalog/figma/file.ts":
      'export const FIGMA_FILE_KEY = "fixture"\nexport function figmaEmbedUrl(nodeId) {\n  return "https://www.figma.com/design/fixture/?node-id=" + nodeId\n}',
    "src/catalog/figma/evidence-exceptions.json": '{"storyEvidence":{}}',
    "src/catalog/figma/api-exceptions.json": '{"modulePatterns":{},"exports":{}}',
    "src/catalog/figma/device-policy.json": JSON.stringify(devicePolicy),
    "src/components/icons/figma-inventory.ts":
      "export const figmaIconNames = [] as const\nexport const figmaPictogramNames = [] as const",
    "src/stories/Fixture.stories.tsx": "export default { title: 'Fixture' }",
    "src/pagopa-ui.ts": "",
    "live.json": JSON.stringify([node]),
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
      check: (...args) =>
        spawnSync(process.execPath, [script, "figma", "sync", ...args], {
          cwd: root,
          encoding: "utf8",
          env: fixtureEnv(root, { PAGOPA_UI_STORIES_ROOT: "src/stories" }),
        }),
      read: (file) => fs.readFileSync(path.join(root, file), "utf8"),
      write: (file, source) => fs.writeFileSync(path.join(root, file), source),
      exportLive: (...args) =>
        spawnSync(
          process.execPath,
          [
            "--import",
            path.join(root, "api-fixture.mjs"),
            exportScript,
            "figma",
            "export",
            ...args,
          ],
          {
            cwd: root,
            encoding: "utf8",
            env: fixtureEnv(root, {
              PAGOPA_UI_STORIES_ROOT: "src/stories",
              FIGMA_TOKEN: "fixture-token",
            }),
          },
        ),
    })
  } finally {
    fs.rmSync(root, { recursive: true, force: true })
  }
}

test("a malformed case fails the catalogue gate with its id", () => {
  fixture(
    ({ check }) => {
      const result = check()
      assert.equal(result.status, 1)
      assert.match(result.stderr, /cases: bad-case: device "watch" is not a device key/)
    },
    {
      "src/catalog/figma/parity-cases.json": JSON.stringify([
        { id: "bad-case", nodeId: "1:1", export: "Control", device: "watch" },
      ]),
    },
  )
})

test("adding a variant to an existing identity is reported as changed", () => {
  fixture(
    ({ check }) => {
      const result = check("--input", "live.json")
      assert.equal(result.status, 1)
      assert.match(result.stderr, /CHANGED.*1:1/s)
    },
    {
      "live.json": JSON.stringify([
        {
          ...node,
          properties: {
            Size: {
              type: "VARIANT",
              defaultValue: "Small",
              variantOptions: ["Small", "Large", "Compact"],
            },
          },
        },
      ]),
    },
  )
})

test("a type-only story import is not rendered implementation evidence", () => {
  fixture(
    ({ check }) => {
      const result = check()
      assert.equal(result.status, 1)
      assert.match(result.stderr, /no story renders "Control"/i)
    },
    {
      "src/catalog/figma/registry.json": JSON.stringify({
        bulkRules: [],
        entries: {
          "1:1": {
            status: "implemented",
            target: {
              module: "src/components/primitives/control.tsx",
              export: "Control",
              story: "src/stories/Fixture.stories.tsx",
            },
          },
        },
      }),
      "src/components/primitives/control.tsx":
        "export function Control() { return <button>Control</button> }",
      "src/stories/Fixture.stories.tsx":
        'import type { Control } from "@/components/primitives/control"\nexport default { title: "Fixture" }\nexport const Example = { render: () => null }',
    },
  )
})

test("nested stories provide evidence only when they render the mapped implementation", () => {
  fixture(
    ({ check, write }) => {
      const rendered = check()
      assert.equal(rendered.status, 0, rendered.stderr)

      write(
        "src/stories/alignment/inputs/Control.stories.tsx",
        'import { Control } from "@/components/primitives/control"\nexport default { title: "Fixture" }\nexport const Example = { render: () => null }',
      )
      const unrendered = check()
      assert.equal(unrendered.status, 1)
      assert.match(unrendered.stderr, /story export "Example" does not render/i)
      assert.match(unrendered.stderr, /no story renders "Control"/i)
    },
    {
      "src/catalog/figma/registry.json": JSON.stringify({
        bulkRules: [],
        entries: {
          "1:1": {
            status: "implemented",
            target: {
              module: "src/components/primitives/control.tsx",
              export: "Control",
              story: "src/stories/alignment/inputs/Control.stories.tsx",
              storyExports: ["Example"],
            },
          },
        },
      }),
      "src/components/primitives/control.tsx":
        "export function Control() { return <button>Control</button> }",
      "src/stories/alignment/inputs/Control.stories.tsx":
        'import { Control } from "@/components/primitives/control"\nimport { figmaEmbedUrl } from "@/catalog/figma/file"\nexport default { title: "Fixture", parameters: { design: { type: "figma", url: figmaEmbedUrl("1:1") } } }\nexport const Example = { render: () => <Control /> }',
    },
  )
})

test("the story titles map follows the stories the registry links", () => {
  fixture(
    ({ root, check, write }) => {
      const stories = (...args) =>
        spawnSync(process.execPath, [script, "figma", "stories", ...args], {
          cwd: root,
          encoding: "utf8",
          env: fixtureEnv(root, { PAGOPA_UI_STORIES_ROOT: "src/stories" }),
        })
      const missing = stories()
      assert.equal(missing.status, 1)
      assert.match(missing.stderr, /missing src\/catalog\/figma\/story-titles\.json/)
      const written = stories("--write")
      assert.equal(written.status, 0, written.stderr)
      assert.deepEqual(
        JSON.parse(fs.readFileSync(path.join(root, "src/catalog/figma/story-titles.json"), "utf8")),
        { "src/stories/Fixture.stories.tsx": "Fixture" },
      )
      assert.equal(stories().status, 0)
      write(
        "src/stories/Fixture.stories.tsx",
        'import { Control } from "@/components/primitives/control"\nexport default { title: "Renamed" }\nexport const Example = { render: () => <Control /> }',
      )
      const stale = check()
      assert.equal(stale.status, 1)
      assert.match(stale.stderr, /stale title for src\/stories\/Fixture\.stories\.tsx/)
    },
    {
      "src/catalog/figma/registry.json": JSON.stringify({
        bulkRules: [],
        entries: {
          "1:1": {
            status: "implemented",
            target: {
              module: "src/components/primitives/control.tsx",
              export: "Control",
              story: "src/stories/Fixture.stories.tsx",
            },
          },
        },
      }),
      "src/components/primitives/control.tsx":
        "export function Control() { return <button>Control</button> }",
      "src/stories/Fixture.stories.tsx":
        'import { Control } from "@/components/primitives/control"\nexport default { title: "Fixture" }\nexport const Example = { render: () => <Control /> }',
    },
  )
})

test("a package re-export resolves as an identity instead of failing the walk", () => {
  fixture(
    ({ check }) => {
      const result = check()
      assert.equal(result.status, 0, result.stderr)
    },
    {
      "src/catalog/figma/registry.json": JSON.stringify({
        bulkRules: [],
        entries: {
          "1:1": {
            status: "implemented",
            target: {
              module: "src/components/primitives/control.tsx",
              export: "Control",
              story: "src/stories/Fixture.stories.tsx",
            },
          },
        },
      }),
      "src/components/primitives/control.tsx":
        'export { Loader } from "icon-package"\nexport function Control() { return <button>Control</button> }',
      "src/stories/Fixture.stories.tsx":
        'import { Control } from "@/components/primitives/control"\nexport default { title: "Fixture" }\nexport const Example = { render: () => <Control /> }',
    },
  )
})

test("an implementation split across modules is accepted through additionalTargets", () => {
  fixture(
    ({ check }) => {
      const result = check()
      assert.equal(result.status, 0, result.stderr)
    },
    {
      "src/catalog/figma/registry.json": JSON.stringify({
        bulkRules: [],
        entries: {
          "1:1": {
            status: "implemented",
            target: {
              module: "src/components/primitives/control.tsx",
              export: "Control",
              additionalTargets: [
                { module: "src/components/primitives/control-group.tsx", export: "ControlGroup" },
              ],
              story: "src/stories/Fixture.stories.tsx",
              storyExports: ["Example"],
            },
          },
        },
      }),
      "src/components/primitives/control.tsx":
        "export function Control() { return <button>Control</button> }",
      "src/components/primitives/control-group.tsx":
        "export function ControlGroup() { return <fieldset>Group</fieldset> }",
      "src/stories/Fixture.stories.tsx":
        'import { Control } from "@/components/primitives/control"\nimport { ControlGroup } from "@/components/primitives/control-group"\nimport { figmaEmbedUrl } from "@/catalog/figma/file"\nexport default { title: "Fixture", parameters: { design: { type: "figma", url: figmaEmbedUrl("1:1") } } }\nexport const Example = { render: () => <><Control /><ControlGroup /></> }',
    },
  )
})

test("additionalTargets must resolve to real modules and exports", () => {
  fixture(
    ({ check }) => {
      const result = check()
      assert.equal(result.status, 1)
      assert.match(result.stderr, /export "Missing" not found in .*control-group\.tsx/)
    },
    {
      "src/catalog/figma/registry.json": JSON.stringify({
        bulkRules: [],
        entries: {
          "1:1": {
            status: "implemented",
            target: {
              module: "src/components/primitives/control.tsx",
              export: "Control",
              additionalTargets: [
                { module: "src/components/primitives/control-group.tsx", export: "Missing" },
              ],
              story: "src/stories/Fixture.stories.tsx",
              storyExports: ["Example"],
            },
          },
        },
      }),
      "src/components/primitives/control.tsx":
        "export function Control() { return <button>Control</button> }",
      "src/components/primitives/control-group.tsx":
        "export function ControlGroup() { return <fieldset>Group</fieldset> }",
      "src/stories/Fixture.stories.tsx":
        'import { Control } from "@/components/primitives/control"\nexport default { title: "Fixture" }\nexport const Example = { render: () => <Control /> }',
    },
  )
})

test("an unused runtime import cannot approve a component", () => {
  fixture(
    ({ check }) => {
      const result = check()
      assert.equal(result.status, 1)
      assert.match(result.stderr, /no story.*Control/i)
    },
    {
      "src/catalog/figma/registry.json": JSON.stringify({
        bulkRules: [],
        entries: {
          "1:1": {
            status: "implemented",
            target: {
              module: "src/components/primitives/control.tsx",
              export: "Control",
              story: "src/stories/Fixture.stories.tsx",
            },
          },
        },
      }),
      "src/components/primitives/control.tsx":
        "export function Control() { return <button>Control</button> }",
      "src/stories/Fixture.stories.tsx":
        'import { Control } from "@/components/primitives/control"\nexport default { title: "Fixture" }\nexport const Example = { render: () => null }',
    },
  )
})

test("a rendered namesake from another module is not evidence for the mapped export", () => {
  fixture(
    ({ check }) => {
      const result = check()
      assert.equal(result.status, 1)
      assert.match(result.stderr, /no story.*Control/i)
    },
    {
      "src/catalog/figma/registry.json": JSON.stringify({
        bulkRules: [],
        entries: {
          "1:1": {
            status: "implemented",
            target: {
              module: "src/components/primitives/control.tsx",
              export: "Control",
              story: "src/stories/Fixture.stories.tsx",
            },
          },
        },
      }),
      "src/components/primitives/control.tsx":
        "export function Control() { return <button>Control</button> }",
      "src/components/primitives/decoy.tsx":
        "export function Control() { return <span>Decoy</span> }",
      "src/stories/Fixture.stories.tsx":
        'import { Control } from "@/components/primitives/decoy"\nexport default { title: "Fixture" }\nexport const Example = { render: () => <Control /> }',
    },
  )
})

test("barrel aliases preserve the declaring component identity for stories and public coverage", () => {
  fixture(
    ({ check }) => {
      const result = check()
      assert.equal(result.status, 0, result.stderr)
    },
    {
      "src/catalog/figma/registry.json": JSON.stringify({
        bulkRules: [],
        entries: {
          "1:1": {
            status: "implemented",
            target: {
              module: "src/components/primitives/control.tsx",
              export: "Control",
              story: "src/stories/Fixture.stories.tsx",
            },
          },
        },
      }),
      "src/components/primitives/control.tsx":
        "export function Control() { return <button>Control</button> }",
      "src/components/primitives/index.ts": 'export { Control as PublicControl } from "./control"',
      "src/pagopa-ui.ts": 'export * from "./components/primitives"',
      "src/stories/Fixture.stories.tsx":
        'import { PublicControl as ExampleControl } from "@/components/primitives"\nexport default { title: "Fixture", component: ExampleControl }\nexport const Example = {}',
    },
  )
})

test("a public namesake cannot reuse another component's Figma mapping", () => {
  fixture(
    ({ check }) => {
      const result = check()
      assert.equal(result.status, 1)
      assert.match(result.stderr, /public exports without a Figma mapping.*Control/s)
    },
    {
      "src/catalog/figma/registry.json": JSON.stringify({
        bulkRules: [],
        entries: {
          "1:1": {
            status: "implemented",
            target: {
              module: "src/components/primitives/control.tsx",
              export: "Control",
              story: "src/stories/Fixture.stories.tsx",
            },
          },
        },
      }),
      "src/components/primitives/control.tsx":
        "export function Control() { return <button>Control</button> }",
      "src/components/primitives/decoy.tsx":
        "export function Control() { return <span>Decoy</span> }",
      "src/pagopa-ui.ts": 'export { Control } from "./components/primitives/decoy"',
      "src/stories/Fixture.stories.tsx":
        'import { Control } from "@/components/primitives/control"\nimport { figmaEmbedUrl } from "@/catalog/figma/file"\nexport default { title: "Fixture", component: Control, parameters: { design: { type: "figma", url: figmaEmbedUrl("1:1") } } }\nexport const Example = {}',
    },
  )
})

test("a queued delta node needs no review attestation", () => {
  fixture(
    ({ check, read }) => {
      const refresh = check("--triage", "--input", "live.json")
      assert.equal(refresh.status, 0, refresh.stderr)
      const entry = JSON.parse(read("src/catalog/figma/registry.json")).entries["1:1"]
      assert.equal(entry.status, "pending")
      assert.equal("reviewRequired" in entry, false)
      assert.equal("reviewedFingerprint" in entry, false)
      const hermetic = check()
      assert.equal(hermetic.status, 0, hermetic.stderr)
    },
    {
      "src/catalog/figma/registry.json": JSON.stringify({
        bulkRules: [],
        entries: {
          "1:1": {
            status: "implemented",
            target: {
              module: "src/components/primitives/control.tsx",
              export: "Control",
              story: "src/stories/Fixture.stories.tsx",
              storyExports: ["Example"],
            },
          },
        },
      }),
      "src/components/primitives/control.tsx":
        "export function Control() { return <button>Control</button> }",
      "src/stories/Fixture.stories.tsx":
        'import { Control } from "@/components/primitives/control"\nimport { figmaEmbedUrl } from "@/catalog/figma/file"\nexport default { title: "Fixture", component: Control, parameters: { design: { type: "figma", url: figmaEmbedUrl("1:1") } } }\nexport const Example = {}',
      "live.json": JSON.stringify([
        {
          ...node,
          properties: {
            Size: { type: "VARIANT", defaultValue: "Large", variantOptions: ["Small", "Large"] },
          },
        },
      ]),
    },
  )
})

test("explicit story evidence must cover every implementation of a component set", () => {
  fixture(
    ({ check, read, write }) => {
      const result = check()
      assert.equal(result.status, 1)
      assert.match(result.stderr, /declared story exports.*MultiControl/i)
      const registry = JSON.parse(read("src/catalog/figma/registry.json"))
      registry.entries["1:1"].target.storyExports.push("Multiple")
      write("src/catalog/figma/registry.json", JSON.stringify(registry))
      const complete = check()
      assert.equal(complete.status, 0, complete.stderr)
    },
    {
      "src/catalog/figma/registry.json": JSON.stringify({
        bulkRules: [],
        entries: {
          "1:1": {
            status: "implemented",
            target: {
              module: "src/components/primitives/control.tsx",
              export: "Control",
              additionalExports: ["MultiControl"],
              story: "src/stories/Fixture.stories.tsx",
              storyExports: ["Single"],
            },
          },
        },
      }),
      "src/components/primitives/control.tsx":
        "export function Control() { return <button>Single</button> }\nexport function MultiControl() { return <button>Multiple</button> }",
      "src/stories/Fixture.stories.tsx":
        'import * as Controls from "@/components/primitives/control"\nimport { figmaEmbedUrl } from "@/catalog/figma/file"\nexport default { title: "Fixture", parameters: { design: { type: "figma", url: figmaEmbedUrl("1:1") } } }\nexport const Single = { render: () => <Controls.Control /> }\nexport const Multiple = { render: () => <Controls.MultiControl /> }',
    },
  )
})

test("an implemented single-node story export must show its node in parameters.design", () => {
  const story = (design) =>
    'import { Control } from "@/components/primitives/control"\nimport { figmaEmbedUrl } from "@/catalog/figma/file"\nexport default { title: "Fixture", component: Control }\n' +
    (design
      ? `export const Example = { parameters: { design: { type: "figma", url: figmaEmbedUrl("${design}") } } }`
      : "export const Example = {}")
  fixture(
    ({ check, write }) => {
      const missing = check()
      assert.equal(missing.status, 1)
      assert.match(
        missing.stderr,
        /story export "Example".*must show the node in parameters\.design/,
      )

      write("src/stories/Fixture.stories.tsx", story("1:2"))
      const wrong = check()
      assert.equal(wrong.status, 1)
      assert.match(wrong.stderr, /must show the node in parameters\.design/)

      write("src/stories/Fixture.stories.tsx", story("1:1"))
      const done = check()
      assert.equal(done.status, 0, done.stderr)
    },
    {
      "src/catalog/figma/registry.json": JSON.stringify({
        bulkRules: [],
        entries: {
          "1:1": {
            status: "implemented",
            target: {
              module: "src/components/primitives/control.tsx",
              export: "Control",
              story: "src/stories/Fixture.stories.tsx",
              storyExports: ["Example"],
            },
          },
        },
      }),
      "src/components/primitives/control.tsx":
        "export function Control() { return <button>Control</button> }",
      "src/stories/Fixture.stories.tsx": story(),
    },
  )
})

test("multi-node exports and the pending queue are not enforced by the design check", () => {
  fixture(
    ({ check }) => {
      const result = check()
      assert.equal(result.status, 0, result.stderr)
    },
    {
      "src/catalog/figma/inventory.json": JSON.stringify({
        fileKey: "fixture",
        syncedAt: new Date().toISOString().slice(0, 10),
        components: [
          { ...node, nodeId: "1:1", name: "Control" },
          { ...node, nodeId: "1:2", name: "Control glyph" },
          { ...node, nodeId: "1:3", name: "Control queued" },
        ],
      }),
      "src/catalog/figma/registry.json": JSON.stringify({
        bulkRules: [],
        entries: {
          "1:1": {
            status: "implemented",
            target: {
              module: "src/components/primitives/control.tsx",
              export: "Control",
              story: "src/stories/Fixture.stories.tsx",
              storyExports: ["Example"],
            },
          },
          "1:2": {
            status: "implemented",
            target: {
              module: "src/components/primitives/control.tsx",
              export: "Control",
              story: "src/stories/Fixture.stories.tsx",
              storyExports: ["Example"],
            },
          },
          "1:3": {
            status: "pending",
            target: {
              module: "src/components/primitives/control.tsx",
              export: "Control",
              story: "src/stories/Fixture.stories.tsx",
              storyExports: ["Queued"],
            },
          },
        },
      }),
      "src/components/primitives/control.tsx":
        "export function Control() { return <button>Control</button> }",
      "src/stories/Fixture.stories.tsx":
        'import { Control } from "@/components/primitives/control"\nexport default { title: "Fixture", component: Control }\nexport const Example = {}\nexport const Queued = {}',
    },
  )
})

test("a removed historical identity is not listed for source review", () => {
  const control = { ...node, designFingerprint: "a".repeat(64) }
  const preserved = { ...node, nodeId: "1:2", name: "Preserved", designFingerprint: "b".repeat(64) }
  fixture(
    ({ check }) => {
      const result = check("--input", "live.json", "--plan")
      assert.equal(result.status, 1, result.stderr)
      const plan = JSON.parse(result.stdout)
      assert.deepEqual(plan.removed, ["1:1"])
      assert.deepEqual(plan.implementationOrder, [])
    },
    {
      "src/catalog/figma/inventory.json": JSON.stringify({
        fileKey: "fixture",
        syncedAt: new Date().toISOString().slice(0, 10),
        components: [control, preserved],
      }),
      "src/catalog/figma/registry.json": JSON.stringify({
        bulkRules: [],
        entries: {
          "1:1": {
            status: "implemented",
            target: {
              module: "src/components/primitives/control.tsx",
              export: "Control",
              story: "src/stories/Fixture.stories.tsx",
            },
          },
          "1:2": { status: "excluded", reason: "Preserved fixture artwork" },
        },
      }),
      "src/components/primitives/control.tsx":
        "export function Control() { return <button>Control</button> }",
      "src/stories/Fixture.stories.tsx":
        'import { Control } from "@/components/primitives/control"\nimport { figmaEmbedUrl } from "@/catalog/figma/file"\nexport default { title: "Fixture", component: Control, parameters: { design: { type: "figma", url: figmaEmbedUrl("1:1") } } }\nexport const Example = {}',
      "live.json": JSON.stringify([preserved]),
    },
  )
})

test("an icon rename preserves its node-keyed public alias and source approval", () => {
  const glyph = { ...node, name: "square", designFingerprint: "a".repeat(64) }
  fixture(
    ({ check, read, write }) => {
      assert.equal(check().status, 0)

      const renamed = check("--triage", "--input", "live.json", "--plan")
      assert.equal(renamed.status, 0, renamed.stderr)
      const plan = JSON.parse(renamed.stdout)
      assert.deepEqual(plan.renamed, ["1:1"])
      assert.deepEqual(plan.changed, [])
      assert.deepEqual(plan.implementationOrder, [])
      const entry = JSON.parse(read("src/catalog/figma/registry.json")).entries["1:1"]
      assert.equal(entry.status, "implemented")
      assert.equal(entry.target.export, "Control")
      assert.match(read("src/components/icons/figma-inventory.ts"), /\["square"\]/)
      assert.equal(check().status, 0)

      write(
        "live.json",
        JSON.stringify([
          { ...glyph, name: "Renamed source glyph", pageId: "2:0", pageName: "Moved catalogue" },
        ]),
      )
      const moved = check("--triage", "--input", "live.json", "--plan")
      assert.equal(moved.status, 0, moved.stderr)
      assert.deepEqual(JSON.parse(moved.stdout).moved, ["1:1"])
      assert.deepEqual(JSON.parse(moved.stdout).implementationOrder, [])
      const preserved = JSON.parse(read("src/catalog/figma/registry.json")).entries["1:1"]
      assert.equal(preserved.status, "implemented")
      assert.equal(preserved.target.export, "Control")
    },
    {
      "src/catalog/figma/inventory.json": JSON.stringify({
        fileKey: "fixture",
        syncedAt: new Date().toISOString().slice(0, 10),
        components: [glyph],
      }),
      "src/catalog/figma/registry.json": JSON.stringify({
        bulkRules: [
          {
            pageId: "1:0",
            page: "Icons",
            status: "implemented",
            namesExport: "figmaIconNames",
            assetManifest: "src/assets/figma-icons/manifest.json",
          },
        ],
        entries: {
          "1:1": {
            status: "implemented",
            target: {
              module: "src/components/primitives/control.tsx",
              export: "Control",
              story: "src/stories/Fixture.stories.tsx",
              storyExports: ["Example"],
            },
          },
        },
      }),
      "src/assets/figma-icons/manifest.json": JSON.stringify({
        fileKey: "fixture",
        version: "source-version",
        entries: { "1:1": { name: "square", designFingerprint: glyph.designFingerprint } },
      }),
      "src/components/icons/figma-inventory.ts":
        'export const figmaIconNames = ["square"] as const\nexport const figmaPictogramNames = [] as const',
      "src/components/primitives/control.tsx":
        "export function Control() { return <button>Control</button> }",
      "src/stories/Fixture.stories.tsx":
        'import { Control } from "@/components/primitives/control"\nimport { figmaEmbedUrl } from "@/catalog/figma/file"\nexport default { title: "Fixture", component: Control, parameters: { design: { type: "figma", url: figmaEmbedUrl("1:1") } } }\nexport const Example = {}',
      "live.json": JSON.stringify([{ ...glyph, name: "Renamed source glyph" }]),
    },
  )
})

test("an internal design dependency change is detected and queues the dependent node", () => {
  const control = {
    ...node,
    designFingerprint: "a".repeat(64),
    dependencies: [{ external: false, nodeId: "1:2" }],
  }
  const dependency = { ...node, nodeId: "1:2", name: "Glyph", designFingerprint: "b".repeat(64) }
  fixture(
    ({ check, read }) => {
      assert.equal(check().status, 0)

      const refresh = check("--triage", "--input", "live.json")
      assert.equal(refresh.status, 0, refresh.stderr)
      const queued = JSON.parse(read("src/catalog/figma/registry.json"))
      assert.equal(queued.entries["1:1"].status, "pending")
      assert.equal("reviewRequired" in queued.entries["1:1"], false)
      assert.equal(check().status, 0)
    },
    {
      "src/catalog/figma/inventory.json": JSON.stringify({
        fileKey: "fixture",
        syncedAt: new Date().toISOString().slice(0, 10),
        components: [control, dependency],
      }),
      "src/catalog/figma/registry.json": JSON.stringify({
        bulkRules: [],
        entries: {
          "1:1": {
            status: "implemented",
            target: {
              module: "src/components/primitives/control.tsx",
              export: "Control",
              story: "src/stories/Fixture.stories.tsx",
              storyExports: ["Example"],
            },
          },
          "1:2": { status: "excluded", reason: "Internal fixture artwork" },
        },
      }),
      "src/components/primitives/control.tsx":
        "export function Control() { return <button>Control</button> }",
      "src/stories/Fixture.stories.tsx":
        'import { Control } from "@/components/primitives/control"\nimport { figmaEmbedUrl } from "@/catalog/figma/file"\nexport default { title: "Fixture", component: Control, parameters: { design: { type: "figma", url: figmaEmbedUrl("1:1") } } }\nexport const Example = {}',
      "live.json": JSON.stringify([control, { ...dependency, designFingerprint: "c".repeat(64) }]),
    },
  )
})

test("a delta plan schedules a component set with internal variant references once", () => {
  fixture(
    ({ check }) => {
      const result = check("--plan")
      assert.equal(result.status, 0, result.stderr)
      assert.deepEqual(JSON.parse(result.stdout).implementationOrder, ["1:1"])
    },
    {
      "src/catalog/figma/inventory.json": JSON.stringify({
        fileKey: "fixture",
        syncedAt: new Date().toISOString().slice(0, 10),
        components: [{ ...node, dependencies: [{ external: false, nodeId: "1:1" }] }],
      }),
      "src/catalog/figma/registry.json": JSON.stringify({
        bulkRules: [],
        entries: { "1:1": { status: "pending", note: "Review the composed variants" } },
      }),
    },
  )
})

test("the REST adapter preserves component sets, defaults and design evidence", () => {
  fixture(
    ({ check, read }) => {
      const result = check("--write", "--input", "live.json")
      assert.equal(result.status, 0, result.stderr)
      const snapshot = JSON.parse(read("src/catalog/figma/inventory.json"))
      assert.equal(snapshot.components.length, 1)
      assert.equal(snapshot.components[0].type, "COMPONENT_SET")
      assert.deepEqual(snapshot.components[0].properties.Size, {
        type: "VARIANT",
        defaultValue: "Small",
        variantOptions: ["Large", "Small"],
      })
      assert.match(snapshot.components[0].designFingerprint, /^[a-f0-9]{64}$/)
    },
    {
      "live.json": JSON.stringify({
        fileKey: "fixture",
        meta: {
          components: [],
          component_sets: [
            {
              node_id: "1:1",
              name: "Control",
              containing_frame: { pageId: "1:0", pageName: "Controls" },
            },
          ],
        },
        nodes: {
          "1:1": {
            document: {
              id: "1:1",
              type: "COMPONENT_SET",
              name: "Control",
              componentPropertyDefinitions: {
                Size: {
                  type: "VARIANT",
                  defaultValue: "Small",
                  variantOptions: ["Small", "Large"],
                },
              },
              children: [],
            },
            components: {},
            componentSets: {},
            styles: {},
          },
        },
      }),
    },
  )
})

test("invalid or duplicate live nodes fail without changing either committed file", () => {
  for (const live of [[node, { ...node, name: "Duplicate" }], [{ ...node, name: "" }]]) {
    fixture(
      ({ check, read }) => {
        const inventory = read("src/catalog/figma/inventory.json")
        const registry = read("src/catalog/figma/registry.json")
        const result = check("--triage", "--input", "live.json")
        assert.equal(result.status, 1)
        assert.match(result.stderr, /duplicate|invalid/)
        assert.equal(read("src/catalog/figma/inventory.json"), inventory)
        assert.equal(read("src/catalog/figma/registry.json"), registry)
      },
      { "live.json": JSON.stringify(live) },
    )
  }
})

test("a registry validation failure never persists a proposed triage", () => {
  fixture(
    ({ check, read }) => {
      const inventory = read("src/catalog/figma/inventory.json")
      const registry = read("src/catalog/figma/registry.json")
      const result = check("--triage", "--input", "live.json")
      assert.equal(result.status, 1)
      assert.match(result.stderr, /invalid status/)
      assert.equal(read("src/catalog/figma/inventory.json"), inventory)
      assert.equal(read("src/catalog/figma/registry.json"), registry)
    },
    {
      "src/catalog/figma/registry.json": JSON.stringify({
        entries: { "1:1": { status: "unknown" } },
        bulkRules: [],
      }),
      "live.json": JSON.stringify([node, { ...node, nodeId: "1:2", name: "New Control" }]),
    },
  )
})

test("the read-only export includes both published roots, omits variants and pins the version", () => {
  fixture(
    ({ exportLive, read }) => {
      const result = exportLive()
      assert.equal(result.status, 0, result.stderr)
      const snapshot = JSON.parse(read(".figma/live-rest.json"))
      assert.equal(snapshot.fileKey, "fixture")
      assert.equal(snapshot.version, "reviewed-version")
      assert.deepEqual(
        snapshot.meta.components.map((item) => item.node_id),
        ["1:3"],
      )
      assert.deepEqual(
        snapshot.meta.component_sets.map((item) => item.node_id),
        ["1:1"],
      )
      assert.deepEqual(Object.keys(snapshot.nodes).sort(), ["1:1", "1:3"])
    },
    {
      "api-fixture.mjs": `
      const page = { pageId: "1:0", pageName: "Controls" }
      const record = (id, name) => ({ node_id: id, name, key: id, containing_frame: page })
      globalThis.fetch = async (input, options) => {
        if (options?.method && options.method !== "GET") throw new Error("Figma is read-only")
        if (options?.headers?.["X-Figma-Token"] !== "fixture-token") throw new Error("missing auth")
        const url = new URL(input)
        let response
        if (url.pathname.endsWith("/component_sets")) {
          response = { meta: { component_sets: [record("1:1", "Control")] } }
        } else if (url.pathname.endsWith("/components")) {
          response = { meta: { components: [record("1:2", "Size=Small"), record("1:3", "Notice")] } }
        } else if (url.pathname.endsWith("/nodes")) {
          if (url.searchParams.get("version") !== "reviewed-version" ||
              url.searchParams.get("geometry") !== "paths") throw new Error("unversioned or incomplete design")
          const nodes = Object.fromEntries(url.searchParams.get("ids").split(",").map(id => [
            id, { document: { id, name: id === "1:1" ? "Control" : "Notice",
              type: id === "1:1" ? "COMPONENT_SET" : "COMPONENT",
              children: id === "1:1" ? [{ id: "1:2", type: "COMPONENT", name: "Size=Small" }] : [] },
              components: {}, componentSets: {}, styles: {} }
          ]))
          response = { nodes }
        } else {
          response = { version: "reviewed-version", document: { children: [
            { id: "1:0", type: "CANVAS", name: "Controls" }
          ] } }
        }
        return Response.json(response)
      }
    `,
    },
  )
})

test("MCP-only identities are captured rather than incorrectly treated as removed", () => {
  fixture(
    ({ exportLive, read }) => {
      const result = exportLive("--input", "mcp.json")
      assert.equal(result.status, 0, result.stderr)
      const snapshot = JSON.parse(read(".figma/live-rest.json"))
      assert.deepEqual(
        snapshot.meta.components.map((item) => item.node_id),
        ["1:4"],
      )
      assert.deepEqual(snapshot.meta.components[0].sources, ["mcp"])
      assert.equal(snapshot.nodes["1:4"].document.id, "1:4")
    },
    {
      "mcp.json": JSON.stringify([{ ...node, nodeId: "1:4", type: "COMPONENT", properties: {} }]),
      "api-fixture.mjs": `
      globalThis.fetch = async (input) => {
        const url = new URL(input)
        if (url.pathname.endsWith("/component_sets")) return Response.json({ meta: { component_sets: [] } })
        if (url.pathname.endsWith("/components")) return Response.json({ meta: { components: [] } })
        if (url.pathname.endsWith("/nodes")) return Response.json({ nodes: {
          "1:4": { document: { id: "1:4", name: "Internal control", type: "COMPONENT" },
                   components: {}, componentSets: {}, styles: {} }
        } })
        return Response.json({ version: "v1", document: { children: [
          { id: "1:0", name: "Controls", type: "CANVAS" }
        ] } })
      }
    `,
    },
  )
})

test("a paint change is detected even when identity and properties are unchanged", () => {
  const baseline = {
    ...node,
    document: {
      id: "1:1",
      type: "COMPONENT_SET",
      name: "Control",
      fills: [{ type: "SOLID", color: { r: 0, g: 0, b: 0 } }],
    },
  }
  fixture(
    ({ check, write }) => {
      const capture = check("--write", "--input", "live.json")
      assert.equal(capture.status, 0, capture.stderr)
      write(
        "live.json",
        JSON.stringify([
          {
            ...baseline,
            document: {
              ...baseline.document,
              fills: [{ type: "SOLID", color: { r: 1, g: 0, b: 0 } }],
            },
          },
        ]),
      )
      const result = check("--input", "live.json")
      assert.equal(result.status, 1)
      assert.match(result.stderr, /CHANGED.*design/s)
    },
    { "live.json": JSON.stringify([baseline]) },
  )
})

test("REST dependency edges resolve variant masters to stable component-set identities", () => {
  fixture(
    ({ check, read }) => {
      const result = check("--write", "--input", "live.json")
      assert.equal(result.status, 0, result.stderr)
      const snapshot = JSON.parse(read("src/catalog/figma/inventory.json"))
      assert.deepEqual(snapshot.components.find((item) => item.nodeId === "1:1").dependencies, [
        { external: false, nodeId: "1:2" },
      ])
    },
    {
      "src/catalog/figma/registry.json": JSON.stringify({
        entries: {
          "1:1": { status: "excluded", reason: "Fixture" },
          "1:2": { status: "excluded", reason: "Fixture dependency" },
        },
        bulkRules: [],
      }),
      "live.json": JSON.stringify({
        meta: {
          components: [],
          component_sets: ["1:1", "1:2"].map((id) => ({
            node_id: id,
            name: id === "1:1" ? "Control" : "Base",
            containing_frame: { pageId: "1:0", pageName: "Controls" },
          })),
        },
        nodes: {
          "1:1": {
            document: {
              id: "1:1",
              name: "Control",
              type: "COMPONENT_SET",
              children: [
                {
                  id: "1:11",
                  type: "COMPONENT",
                  children: [
                    {
                      id: "1:12",
                      type: "INSTANCE",
                      componentId: "1:21",
                      children: [{ id: "1:13", type: "INSTANCE", componentId: "1:31" }],
                    },
                  ],
                },
              ],
            },
            components: {
              "1:21": { key: "variant-key", componentSetId: "1:2", remote: false },
              "1:31": { key: "nested-key", remote: false },
            },
            componentSets: { "1:2": { key: "stable-set-key", remote: false } },
          },
          "1:2": {
            document: { id: "1:2", name: "Base", type: "COMPONENT_SET", children: [] },
            components: {},
            componentSets: {},
          },
        },
      }),
    },
  )
})

test("swappable source instances remain in dependency-aware delta plans", () => {
  const rowId = "610:33732"
  const avatarId = "160:1344"
  const live = {
    meta: {
      components: [],
      component_sets: [rowId, avatarId].map((id) => ({
        node_id: id,
        name: id === rowId ? "Source row" : "Source Avatar",
        containing_frame: { pageId: "1:0", pageName: "Controls" },
      })),
    },
    nodes: {
      [rowId]: {
        document: {
          id: rowId,
          name: "Source row",
          type: "COMPONENT_SET",
          componentPropertyDefinitions: {
            "Avatar#950:9": { type: "INSTANCE_SWAP", defaultValue: "160:1345" },
          },
          children: [
            {
              id: "610:33733",
              type: "COMPONENT",
              children: [
                {
                  id: "610:33735",
                  type: "INSTANCE",
                  componentId: "160:1345",
                  componentPropertyReferences: { mainComponent: "Avatar#950:9" },
                },
              ],
            },
          ],
        },
        components: {
          "160:1345": { key: "avatar-variant", componentSetId: avatarId, remote: false },
        },
        componentSets: { [avatarId]: { key: "avatar-set", remote: false } },
      },
      [avatarId]: {
        document: {
          id: avatarId,
          name: "Source Avatar",
          type: "COMPONENT_SET",
          children: [{ id: "160:1345", type: "COMPONENT", cornerRadius: 8 }],
        },
        components: {},
        componentSets: {},
      },
    },
  }
  fixture(
    ({ check, read, write }) => {
      const baseline = check("--write", "--input", "live.json")
      assert.equal(baseline.status, 0, baseline.stderr)
      const snapshot = JSON.parse(read("src/catalog/figma/inventory.json"))
      assert.deepEqual(snapshot.components.find((item) => item.nodeId === rowId).dependencies, [
        { external: false, nodeId: avatarId },
      ])
      live.nodes[avatarId].document.children[0].cornerRadius = 9
      write("live.json", JSON.stringify(live))
      const result = check("--input", "live.json", "--plan")
      assert.equal(result.status, 1, result.stderr)
      assert.deepEqual(JSON.parse(result.stdout).affected, [rowId])
    },
    {
      "src/catalog/figma/registry.json": JSON.stringify({
        entries: {
          [rowId]: { status: "excluded", reason: "Source-derived row fixture" },
          [avatarId]: { status: "excluded", reason: "Source-derived Avatar fixture" },
        },
        bulkRules: [],
      }),
      "live.json": JSON.stringify(live),
    },
  )
})

test("MCP and REST encode slot defaults and out-of-catalog dependencies identically", () => {
  const metadata = {
    ...node,
    properties: { Slot: { type: "SLOT", defaultValue: "-1:-1" } },
    dependencies: [{ external: true, assetKey: "outside-root" }],
  }
  fixture(
    ({ check, read, write }) => {
      const baseline = check("--write", "--input", "live.json")
      assert.equal(baseline.status, 0, baseline.stderr)
      const expected = JSON.parse(read("src/catalog/figma/inventory.json")).components[0]
        .contractFingerprint
      write(
        "live.json",
        JSON.stringify({
          meta: {
            components: [],
            component_sets: [
              {
                node_id: "1:1",
                name: "Control",
                containing_frame: { pageId: "1:0", pageName: "Controls" },
              },
            ],
          },
          nodes: {
            "1:1": {
              document: {
                id: "1:1",
                name: "Control",
                type: "COMPONENT_SET",
                componentPropertyDefinitions: {
                  Slot: { type: "SLOT", defaultValue: { guid: { sessionID: -1, localID: -1 } } },
                },
                children: [{ id: "1:10", type: "INSTANCE", componentId: "1:4" }],
              },
              components: { "1:4": { remote: false, key: "outside-root" } },
              componentSets: {},
            },
          },
        }),
      )
      const capture = check("--write", "--input", "live.json")
      assert.equal(capture.status, 0, capture.stderr)
      assert.equal(
        JSON.parse(read("src/catalog/figma/inventory.json")).components[0].contractFingerprint,
        expected,
      )
    },
    { "live.json": JSON.stringify([metadata]) },
  )
})

test("triage queues changed nodes, their dependents and new bulk-page nodes in dependency order", () => {
  const dependent = {
    ...node,
    nodeId: "1:2",
    name: "Dependent",
    type: "COMPONENT",
    properties: {},
    dependencies: [{ external: false, nodeId: "1:1" }],
  }
  const target = (name) => ({
    status: "implemented",
    target: {
      module: "src/components/inputs/fixture.tsx",
      export: name,
      story: "src/stories/Fixture.stories.tsx",
    },
  })
  fixture(
    ({ check, read }) => {
      const result = check("--triage", "--input", "live.json")
      assert.equal(result.status, 0, result.stderr)
      const registry = JSON.parse(read("src/catalog/figma/registry.json"))
      for (const id of ["1:1", "1:2", "1:3"]) assert.equal(registry.entries[id]?.status, "pending")
      const plan = check("--plan")
      assert.equal(plan.status, 0, plan.stderr)
      assert.deepEqual(JSON.parse(plan.stdout).implementationOrder, ["1:1", "1:2", "1:3"])
    },
    {
      "src/catalog/figma/inventory.json": JSON.stringify({
        fileKey: "fixture",
        syncedAt: "2026-10-10",
        components: [node, dependent],
      }),
      "src/catalog/figma/registry.json": JSON.stringify({
        entries: { "1:1": target("Control"), "1:2": target("Dependent") },
        bulkRules: [
          {
            pageId: "1:0",
            page: "Controls",
            status: "implemented",
            evidence: "src/components/inputs/fixture.tsx",
          },
        ],
      }),
      "src/components/inputs/fixture.tsx":
        "export const Control = () => <button>Control</button>; export const Dependent = () => <div>Dependent</div>",
      "src/stories/Fixture.stories.tsx":
        'import { Control, Dependent } from "@/components/inputs/fixture"; export default { title: "Fixture" }; export const Default = { render: () => <><Control /><Dependent /></> }',
      "live.json": JSON.stringify([
        {
          ...node,
          properties: {
            Size: {
              type: "VARIANT",
              defaultValue: "Small",
              variantOptions: ["Small", "Large", "Compact"],
            },
          },
        },
        dependent,
        { ...node, nodeId: "1:3", name: "New bulk control", type: "COMPONENT", properties: {} },
      ]),
    },
  )
})

test("refresh preserves mocked demos without queueing them for review", () => {
  const demo = {
    ...node,
    nodeId: "1:2",
    name: "Demo",
    type: "COMPONENT",
    properties: {},
    dependencies: [{ external: false, nodeId: "1:1" }],
  }
  const target = { module: "src/components/templates/demo.tsx", export: "Demo" }
  const note = "Demo shell only; outside production and coverage"
  for (const mode of ["--triage", "--write"]) {
    fixture(
      ({ check, read }) => {
        const refreshed = check(mode, "--input", "live.json", "--plan")
        assert.equal(refreshed.status, 0, refreshed.stderr)
        const entry = JSON.parse(read("src/catalog/figma/registry.json")).entries["1:2"]
        assert.equal(entry.status, "mocked")
        assert.equal(entry.note, note)
        assert.deepEqual(entry.target, target)
        assert.equal("reviewRequired" in entry, false)
        for (const result of [refreshed, check("--plan")]) {
          assert.equal(result.status, 0, result.stderr)
          const plan = JSON.parse(result.stdout)
          assert.ok(!plan.implementationOrder.includes("1:2"))
        }
      },
      {
        "src/catalog/figma/inventory.json": JSON.stringify({
          fileKey: "fixture",
          syncedAt: new Date().toISOString().slice(0, 10),
          components: [node, demo],
        }),
        "src/catalog/figma/registry.json": JSON.stringify({
          entries: {
            "1:1": { status: "excluded", reason: "Policy-only source root" },
            "1:2": { status: "mocked", target, note },
          },
          bulkRules: [],
        }),
        "src/components/templates/demo.tsx": "export const Demo = () => <div>Demo shell</div>",
        "live.json": JSON.stringify([
          {
            ...node,
            properties: {
              Size: {
                type: "VARIANT",
                defaultValue: "Small",
                variantOptions: ["Small", "Large", "Compact"],
              },
            },
          },
          demo,
        ]),
      },
    )
  }
})

test("--pr-body refreshes the inventory and writes the review body on drift", () => {
  fixture(
    ({ check, read }) => {
      const result = check("--pr-body", "pr-body.md", "--input", "live.json")
      assert.equal(result.status, 0, result.stderr)
      const body = read("pr-body.md")
      assert.match(body, /^# Figma drift — \d{4}-\d{2}-\d{2}/)
      assert.match(body, /- Changed nodes: 1/)
      assert.match(body, /By page: Controls \(1\)/)
      assert.match(body, /### Control/)
      assert.match(body, /`1:1`/)
      assert.match(body, /https:\/\/www\.figma\.com\/design\/fixture\?node-id=1-1/)
      assert.match(body, /class: changed · change: properties or dependencies/)
      assert.match(body, /registry status: `pending`/)
      assert.match(body, /## Instructions — review/)
      assert.match(body, /## Instructions — agent handoff/)
      assert.match(body, /`figma-to-code` skill/)
      assert.match(body, /get_design_context/)
      assert.match(body, /pnpm nx run-many -p pagopa-ui -c=ci/)
      const registry = JSON.parse(read("src/catalog/figma/registry.json"))
      assert.equal(registry.entries["1:1"].status, "pending")
    },
    {
      "src/catalog/figma/registry.json": JSON.stringify({
        bulkRules: [],
        entries: {
          "1:1": {
            status: "implemented",
            target: {
              module: "src/components/primitives/control.tsx",
              export: "Control",
              story: "src/stories/Fixture.stories.tsx",
              storyExports: ["Example"],
            },
          },
        },
      }),
      "src/components/primitives/control.tsx":
        "export function Control() { return <button>Control</button> }",
      "src/stories/Fixture.stories.tsx":
        'import { Control } from "@/components/primitives/control"\nimport { figmaEmbedUrl } from "@/catalog/figma/file"\nexport default { title: "Fixture", component: Control, parameters: { design: { type: "figma", url: figmaEmbedUrl("1:1") } } }\nexport const Example = {}',
      "live.json": JSON.stringify([
        {
          ...node,
          properties: {
            Size: { type: "VARIANT", defaultValue: "Large", variantOptions: ["Small", "Large"] },
          },
        },
      ]),
    },
  )
})

test("--pr-body leaves the tree untouched when there is no drift", () => {
  fixture(({ check, read }) => {
    const inventory = read("src/catalog/figma/inventory.json")
    const registry = read("src/catalog/figma/registry.json")
    const missing = check("--pr-body", "pr-body.md")
    assert.equal(missing.status, 2)
    assert.match(missing.stderr, /need a live source/)
    const result = check("--pr-body", "pr-body.md", "--input", "live.json")
    assert.equal(result.status, 0, result.stderr)
    assert.match(result.stdout, /drift: none/)
    assert.equal(read("src/catalog/figma/inventory.json"), inventory)
    assert.equal(read("src/catalog/figma/registry.json"), registry)
    assert.throws(() => read("pr-body.md"))
  })
})

// RA2: a change inside one variant is a change to that device's composition.
// The synthetic set draws two devices; the only difference between the two
// snapshots is a hidden layer in the mobile variant, which the set-level
// fingerprint sees but cannot name.
const deviceDocument = (labelVisible) => ({
  id: "1:1",
  type: "COMPONENT_SET",
  name: "Control",
  absoluteBoundingBox: { x: 0, y: 0, width: 1200, height: 300 },
  children: [
    {
      id: "1:2",
      name: "Device=Desktop",
      type: "COMPONENT",
      visible: true,
      absoluteBoundingBox: { x: 0, y: 0, width: 1200, height: 100 },
      children: [
        {
          id: "1:4",
          name: "Label",
          type: "TEXT",
          characters: "Control",
          absoluteBoundingBox: { x: 8, y: 8, width: 100, height: 20 },
        },
      ],
    },
    {
      id: "1:3",
      name: "Device=Mobile",
      type: "COMPONENT",
      visible: true,
      absoluteBoundingBox: { x: 0, y: 120, width: 320, height: 100 },
      children: [
        {
          id: "1:5",
          name: "Label",
          type: "TEXT",
          characters: "Control",
          visible: labelVisible,
          absoluteBoundingBox: { x: 8, y: 8, width: 100, height: 20 },
        },
      ],
    },
  ],
})

const deviceNode = (labelVisible) => ({
  ...node,
  properties: {
    Device: { type: "VARIANT", defaultValue: "Desktop", variantOptions: ["Desktop", "Mobile"] },
  },
  document: deviceDocument(labelVisible),
})

test("a hidden layer in one variant is reported as that device's change", () => {
  fixture(
    ({ check, read, write }) => {
      const baseline = check("--write", "--input", "live.json")
      assert.equal(baseline.status, 0, baseline.stderr)
      const inventory = JSON.parse(read("src/catalog/figma/inventory.json"))
      const [committed] = inventory.components
      assert.deepEqual(
        committed.variants.map((variant) => [variant.nodeId, variant.device, variant.box]),
        [
          ["1:2", "desktop", { width: 1200, height: 100 }],
          ["1:3", "mobile", { width: 320, height: 100 }],
        ],
      )
      assert.equal(
        committed.variants.length,
        new Set(committed.variants.map((v) => v.designFingerprint)).size,
      )

      write("live.json", JSON.stringify([deviceNode(false)]))
      const plan = check("--plan", "--input", "live.json")
      // The drift is real, so the run reports it: exit 1 is the point, and the
      // plan JSON is the device-shaped detail.
      assert.equal(plan.status, 1, plan.stderr)
      const parsed = JSON.parse(plan.stdout)
      assert.deepEqual(parsed.changed, ["1:1"])
      assert.deepEqual(parsed.changedVariants, [
        { nodeId: "1:3", device: "mobile", class: "design" },
      ])
      assert.equal(parsed.devices.sets, 1)
      assert.equal(parsed.devices.declared, 2)

      const body = check("--pr-body", "pr-body.md", "--input", "live.json")
      assert.equal(body.status, 0, body.stderr)
      const markdown = read("pr-body.md")
      assert.match(markdown, /- class: changed · change: design/)
      assert.match(markdown, /- devices \(2 declared\):/)
      assert.match(
        markdown,
        /- `desktop` · `1:2` · 1200×100 · \[Device=Desktop\]\(https:\/\/www\.figma\.com\/design\/fixture\?node-id=1-2\) · unchanged/,
      )
      assert.match(
        markdown,
        /- `mobile` · `1:3` · 320×100 · \[Device=Mobile\]\(https:\/\/www\.figma\.com\/design\/fixture\?node-id=1-3\) · changed \(design\)/,
      )
      assert.match(
        markdown,
        /A `Device` axis is part of the contract: inspect and render \*\*every\*\*/,
      )
      assert.match(markdown, /figma-to-code\/references\/devices\.md/)
    },
    {
      "src/catalog/figma/registry.json": JSON.stringify({
        bulkRules: [],
        entries: { "1:1": { status: "excluded", reason: "Fixture-only control" } },
      }),
      "live.json": JSON.stringify([deviceNode(true)]),
    },
  )
})

test("renaming a page never breaks a page-ID exclusion rule", () => {
  const second = { ...node, nodeId: "1:2", name: "Second control" }
  fixture(
    ({ check }) => {
      const result = check("--write", "--input", "live.json")
      assert.equal(result.status, 0, result.stderr)
    },
    {
      "src/catalog/figma/inventory.json": JSON.stringify({
        fileKey: "fixture",
        syncedAt: "2026-10-10",
        components: [node, second],
      }),
      "src/catalog/figma/registry.json": JSON.stringify({
        entries: { "1:1": { status: "excluded", reason: "Fixture" } },
        bulkRules: [
          { pageId: "1:0", page: "Controls", status: "excluded", reason: "Fixture-only page" },
        ],
      }),
      "live.json": JSON.stringify(
        [node, second].map((item) => ({ ...item, pageName: "Renamed page" })),
      ),
    },
  )
})

test("a metadata-only input cannot downgrade a complete design baseline", () => {
  for (const mode of ["--write", "--triage"]) {
    fixture(
      ({ check, read, write }) => {
        const baseline = check("--write", "--input", "live.json")
        assert.equal(baseline.status, 0, baseline.stderr)
        const inventory = read("src/catalog/figma/inventory.json")
        const registry = read("src/catalog/figma/registry.json")
        write("live.json", JSON.stringify([node]))
        const result = check(mode, "--input", "live.json")
        assert.equal(result.status, 1)
        assert.match(result.stderr, /incomplete design/i)
        assert.equal(read("src/catalog/figma/inventory.json"), inventory)
        assert.equal(read("src/catalog/figma/registry.json"), registry)
      },
      {
        "live.json": JSON.stringify([
          { ...node, document: { id: "1:1", type: "COMPONENT_SET", name: "Control" } },
        ]),
      },
    )
  }
})

test("refreshing the inventory cannot silently approve a changed implementation", () => {
  fixture(
    ({ check, read }) => {
      const result = check("--write", "--input", "live.json")
      assert.equal(result.status, 0, result.stderr)
      const registry = JSON.parse(read("src/catalog/figma/registry.json"))
      assert.equal(registry.entries["1:1"].status, "pending")
      assert.equal(registry.entries["1:1"].target.export, "Control")
    },
    {
      "src/catalog/figma/registry.json": JSON.stringify({
        bulkRules: [],
        entries: {
          "1:1": {
            status: "implemented",
            target: {
              module: "src/components/control.tsx",
              export: "Control",
              story: "src/stories/Fixture.stories.tsx",
            },
          },
        },
      }),
      "src/components/control.tsx": "export const Control = () => <button>Control</button>",
      "src/stories/Fixture.stories.tsx":
        'import { Control } from "../components/control"\nexport const Basic = { render: () => <Control /> }',
      "live.json": JSON.stringify([
        {
          ...node,
          properties: { ...node.properties, Required: { type: "BOOLEAN", defaultValue: false } },
        },
      ]),
    },
  )
})

test("an export from a different Figma file cannot replace the inventory", () => {
  fixture(
    ({ check, read }) => {
      const inventory = read("src/catalog/figma/inventory.json")
      const result = check("--triage", "--input", "live.json")
      assert.equal(result.status, 1)
      assert.match(result.stderr, /file key/i)
      assert.equal(read("src/catalog/figma/inventory.json"), inventory)
    },
    { "live.json": JSON.stringify({ fileKey: "other-file", components: [node] }) },
  )
})

test("the hermetic check rejects a tampered canonical contract", () => {
  fixture(({ check, read, write }) => {
    assert.equal(check("--write", "--input", "live.json").status, 0)
    const snapshot = JSON.parse(read("src/catalog/figma/inventory.json"))
    snapshot.components[0].properties.Size.defaultValue = "Large"
    write("src/catalog/figma/inventory.json", JSON.stringify(snapshot))
    const result = check()
    assert.equal(result.status, 1)
    assert.match(result.stderr, /contract fingerprint/i)
  })
})

test("invalid property defaults and dependency identities are never persisted", () => {
  const invalid = [
    { ...node, properties: { Label: { type: "TEXT", defaultValue: false } } },
    { ...node, dependencies: [{ external: false, nodeId: "9:9" }] },
    { ...node, dependencies: [{ external: true, assetKey: "" }] },
    { ...node, designFingerprint: "not-a-design-hash" },
  ]
  for (const item of invalid) {
    fixture(
      ({ check, read }) => {
        const inventory = read("src/catalog/figma/inventory.json")
        const result = check("--triage", "--input", "live.json")
        assert.equal(result.status, 1, JSON.stringify(item))
        assert.equal(read("src/catalog/figma/inventory.json"), inventory)
      },
      { "live.json": JSON.stringify([item]) },
    )
  }
})

// RA4: the device coverage line and the delta-scoped gate. A node in the delta
// cannot stay `implemented` without one case per declared device, or a reasoned
// exception; the historical entries are the work list, not a failure.
const deviceTarget = {
  module: "src/components/primitives/control.tsx",
  export: "Control",
  story: "src/stories/Fixture.stories.tsx",
  storyExports: ["Example"],
}

function deviceFixture(overrides = {}) {
  return {
    "src/catalog/figma/inventory.json": JSON.stringify({
      fileKey: "fixture",
      syncedAt: new Date().toISOString().slice(0, 10),
      components: [],
    }),
    "src/catalog/figma/registry.json": JSON.stringify({
      bulkRules: [],
      entries: { "1:1": { status: "implemented", target: deviceTarget } },
    }),
    "src/components/primitives/control.tsx":
      "export function Control() { return <button>Control</button> }",
    "src/stories/Fixture.stories.tsx":
      'import { Control } from "@/components/primitives/control"\nimport { figmaEmbedUrl } from "@/catalog/figma/file"\nexport default { title: "Fixture", component: Control, parameters: { design: { type: "figma", url: figmaEmbedUrl("1:1") } } }\nexport const Example = {}',
    "live.json": JSON.stringify([deviceNode(true)]),
    ...overrides,
  }
}

const implementedRegistry = (extra = {}) =>
  JSON.stringify({
    bulkRules: [],
    entries: { "1:1": { status: "implemented", target: deviceTarget }, ...extra },
  })

// The baseline the tests start from: the refreshed inventory, the node closed as
// implemented, and the desktop case the review already saved.
function deviceBaseline({ check, write }, cases) {
  const baseline = check("--write", "--input", "live.json")
  assert.equal(baseline.status, 0, baseline.stderr)
  write("src/catalog/figma/registry.json", implementedRegistry())
  if (cases) write("src/catalog/figma/parity-cases.json", JSON.stringify(cases))
  return baseline
}

test("an implemented node in the delta cannot close without its device cases", () => {
  fixture(({ check, read, write }) => {
    deviceBaseline({ check, write }, [
      {
        id: "1-1-desktop",
        nodeId: "1:1",
        export: "Control",
        storyId: "fixture--example",
        state: "Desktop",
        device: "desktop",
      },
    ])
    const inventory = JSON.parse(read("src/catalog/figma/inventory.json"))
    assert.deepEqual(
      inventory.components[0].variants.map((variant) => variant.device),
      ["desktop", "mobile"],
    )

    // The source changes under the node. It is still `implemented` and the
    // mobile composition has no reviewed case: the delta cannot close.
    write("live.json", JSON.stringify([deviceNode(false)]))
    const gated = check("--plan", "--input", "live.json")
    assert.equal(gated.status, 1)
    assert.match(gated.stderr, /device coverage: 1:1 is in the delta/)
    assert.match(gated.stderr, /without a case for mobile/)
    assert.match(gated.stderr, /device-exceptions\.json/)
    assert.deepEqual(JSON.parse(gated.stdout).deviceCoverage, {
      sets: 1,
      covered: 1,
      missing: 1,
      drafts: 0,
      exceptions: 0,
    })

    // A reasoned exception silences the gate (the drift itself still fails
    // the reported run, which is the pre-existing behaviour).
    write("src/catalog/figma/device-exceptions.json", JSON.stringify({ "1:1": "burn-down" }))
    const excepted = check("--plan", "--input", "live.json")
    assert.doesNotMatch(excepted.stderr, /device coverage: 1:1 is in the delta/)
    assert.deepEqual(JSON.parse(excepted.stdout).deviceCoverage, {
      sets: 1,
      covered: 1,
      missing: 1,
      drafts: 0,
      exceptions: 1,
    })
    const reported = check("--input", "live.json")
    assert.match(
      reported.stdout,
      /devices: 1 implemented sets · covered 1 · missing 1 · exceptions 1/,
    )
    assert.match(reported.stdout, /exceptions: story evidence 0 · unmapped exports 0 · device 1/)
  }, deviceFixture())
})

test("the triage queues the node instead: the automation is never blocked", () => {
  fixture(({ check, read, write }) => {
    deviceBaseline({ check, write }, [
      {
        id: "1-1-desktop",
        nodeId: "1:1",
        export: "Control",
        storyId: "fixture--example",
        device: "desktop",
      },
    ])
    write("live.json", JSON.stringify([deviceNode(false)]))
    const triaged = check("--triage", "--input", "live.json")
    assert.equal(triaged.status, 0, triaged.stderr)
    const registry = JSON.parse(read("src/catalog/figma/registry.json"))
    assert.equal(registry.entries["1:1"].status, "pending")
    // The queued node is not an implemented one: the coverage line counts the
    // sets that need cases, not the review queue.
    const hermetic = check("--plan")
    assert.equal(hermetic.status, 0, hermetic.stderr)
    assert.deepEqual(JSON.parse(hermetic.stdout).deviceCoverage, {
      sets: 0,
      covered: 0,
      missing: 0,
      drafts: 0,
      exceptions: 0,
    })
  }, deviceFixture())
})

test("the historical burn-down warns once and never fails the tree", () => {
  fixture(({ check, write }) => {
    deviceBaseline({ check, write })
    const result = check()
    assert.equal(result.status, 0, result.stderr)
    assert.match(
      result.stderr,
      /warn: device coverage: 1 implemented node\(s\) miss 2 device case\(s\)/,
    )
    assert.match(
      result.stdout,
      /devices: 1 implemented sets · covered 0 · missing 2 · exceptions 0/,
    )
  }, deviceFixture())
})

test("the exception list is validated: empty reasons, stale and unknown entries fail", () => {
  const bothCases = [
    {
      id: "1-1-desktop",
      nodeId: "1:1",
      export: "Control",
      storyId: "fixture--example",
      device: "desktop",
    },
    {
      id: "1-1-mobile",
      nodeId: "1:1",
      export: "Control",
      storyId: "fixture--example",
      device: "mobile",
    },
  ]
  const expectations = [
    [{ "1:1": "" }, /1:1 requires a reason/],
    [{ "1:1": "   " }, /1:1 requires a reason/],
    [
      { "1:1": "now covered", "9:9": "unknown node" },
      /9:9 is not a registry entry with a device axis/,
    ],
    [{ "1:1": "now covered" }, /1:1 covers every declared device — remove the exception/],
  ]
  for (const [entries, pattern] of expectations) {
    fixture(({ check, write }) => {
      deviceBaseline({ check, write }, bothCases)
      write("src/catalog/figma/device-exceptions.json", JSON.stringify(entries))
      const result = check()
      assert.equal(result.status, 1, JSON.stringify(entries))
      assert.match(result.stderr, pattern)
    }, deviceFixture())
  }
})
