import assert from "node:assert/strict"
import { spawnSync } from "node:child_process"
import { createHash } from "node:crypto"
import fs from "node:fs"
import os from "node:os"
import path from "node:path"
import { test } from "node:test"
import { fileURLToPath } from "node:url"
import sharp from "sharp"

import { fixtureEnv, toolingPath } from "../../src/lib/paths.ts"

const script = fileURLToPath(new URL("../../src/cli.ts", import.meta.url))

function iconsArguments(args) {
  if (args[0] === "--write") return ["assets", "icons", "write", ...args.slice(1)]
  if (args[0] === "--check") return ["assets", "icons", "check", ...args.slice(1)]
  return ["assets", "icons", ...args]
}
const blue = { r: 11 / 255, g: 62 / 255, b: 227 / 255, a: 1 }

// The device vocabulary every catalogue fixture carries: `normalizeNode`
// resolves a set's variants through it, and an icon fixture declares no device
// axis, so the minimal vocabulary is enough.
const devicePolicy = {
  axes: [],
  any: ["Any", "Default"],
  devices: {
    mobile: { canonicalWidth: 320, defaultLayoutScope: "viewport", aliases: ["Mobile"] },
    tablet: { canonicalWidth: 600, defaultLayoutScope: "viewport", aliases: ["Tablet"] },
    desktop: { canonicalWidth: 1200, defaultLayoutScope: "viewport", aliases: ["Desktop"] },
  },
}
const square = {
  id: "1:2",
  name: "Source shape",
  type: "VECTOR",
  size: { x: 8, y: 8 },
  relativeTransform: [
    [1, 0, 2],
    [0, 1, 3],
  ],
  fills: [{ type: "SOLID", color: blue }],
  strokes: [],
  fillGeometry: [{ windingRule: "NONZERO", path: "M0 0H8V8H0Z" }],
  strokeGeometry: [],
}

function fixture(t, document, localAsset = { rendering: "image" }, components = {}) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "pagopa-icons-"))
  t.after(() => fs.rmSync(root, { recursive: true, force: true }))
  const files = {
    "src/catalog/figma/file.ts": 'export const FIGMA_FILE_KEY = "fixture"',
    "src/catalog/figma/device-policy.json": JSON.stringify(devicePolicy),
    "src/catalog/figma/registry.json": JSON.stringify({
      bulkRules: [
        {
          pageId: "1:0",
          namesExport: "figmaIconNames",
          assetManifest: "src/assets/figma-icons/manifest.json",
          provenance: { provider: "Fixture source", origin: "custom", license: "fixture-only" },
        },
      ],
      entries: {
        [document.id]: {
          status: "pending",
          localAsset,
          target: { module: "src/components/icons/PagoPAIcon.tsx", export: "PagoPAIcon" },
        },
      },
    }),
    "live.json": JSON.stringify({
      fileKey: "fixture",
      version: "source-version",
      meta: {
        components:
          document.type === "COMPONENT"
            ? [
                {
                  node_id: document.id,
                  name: document.name,
                  containing_frame: { pageId: "1:0", pageName: "Renamed icon page" },
                },
              ]
            : [],
        component_sets:
          document.type === "COMPONENT_SET"
            ? [
                {
                  node_id: document.id,
                  name: document.name,
                  containing_frame: { pageId: "1:0", pageName: "Renamed icon page" },
                },
              ]
            : [],
      },
      nodes: {
        [document.id]: { document, components, componentSets: {} },
      },
    }),
    "no-network.mjs": 'globalThis.fetch = () => { throw new Error("Unexpected network access") }',
  }
  for (const [file, source] of Object.entries(files)) {
    fs.mkdirSync(path.dirname(path.join(root, file)), { recursive: true })
    fs.writeFileSync(path.join(root, file), source)
  }
  return {
    root,
    run: (...args) =>
      spawnSync(
        process.execPath,
        ["--import", path.join(root, "no-network.mjs"), script, ...iconsArguments(args)],
        { cwd: root, encoding: "utf8", env: fixtureEnv(root) },
      ),
  }
}

const component = {
  id: "1:1",
  name: "Fixture mark",
  type: "COMPONENT",
  size: { x: 24, y: 24 },
  relativeTransform: [
    [1, 0, 1000],
    [0, 1, 2000],
  ],
  fills: [],
  strokes: [],
  fillGeometry: [],
  strokeGeometry: [],
  children: [square],
}

test("local icon write preserves pinned source paths, paints and placement without network access", async (t) => {
  const { root, run } = fixture(t, component)
  const result = run("--write", "--input", "live.json")
  assert.equal(result.status, 0, result.stderr)
  const directory = path.join(root, "src/assets/figma-icons")
  const manifest = JSON.parse(fs.readFileSync(path.join(directory, "manifest.json"), "utf8"))
  assert.equal(manifest.fileKey, "fixture")
  assert.equal(manifest.version, "source-version")
  assert.deepEqual(Object.keys(manifest.entries), ["1:1"])
  const entry = manifest.entries["1:1"]
  assert.equal(entry.defaultVariantNodeId, "1:1")
  assert.match(entry.designFingerprint, /^[a-f0-9]{64}$/)
  const variant = entry.variants["1:1"]
  assert.equal(variant.nodeId, "1:1")
  assert.equal(variant.file, "1-1.svg")
  assert.match(variant.sha256, /^[a-f0-9]{64}$/)
  const { data, info } = await sharp(path.join(directory, variant.file))
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true })
  assert.equal(info.width, 24)
  assert.equal(info.height, 24)
  assert.deepEqual([...data.subarray((3 * 24 + 2) * 4, (3 * 24 + 2) * 4 + 4)], [11, 62, 227, 255])
  assert.equal(data[(3 * 24 + 1) * 4 + 3], 0, "do not paint the source's ambient canvas")
  assert.equal(data[(3 * 24 + 10) * 4 + 3], 0, "retain the source shape bounds")
  assert.match(
    fs.readFileSync(path.join(root, "src/components/icons/icon-assets.ts"), "utf8"),
    /1-1\.svg\?no-inline/,
  )
  const check = run("--check", "--input", "live.json")
  assert.equal(check.status, 0, check.stderr)
  fs.appendFileSync(path.join(directory, variant.file), "tampered")
  const invalid = run("--check", "--input", "live.json")
  assert.equal(invalid.status, 1)
  assert.match(invalid.stderr, /checksum/i)
  assert.doesNotMatch(result.stdout, /https:|token/i)
})

test("artwork provenance is required and a per-node override replaces the family default", (t) => {
  const { root, run } = fixture(t, component)
  const registryPath = path.join(root, "src/catalog/figma/registry.json")
  const registry = JSON.parse(fs.readFileSync(registryPath, "utf8"))
  const rule = registry.bulkRules[0]
  const withoutProvenance = { ...rule }
  delete withoutProvenance.provenance
  fs.writeFileSync(
    registryPath,
    JSON.stringify({ bulkRules: [withoutProvenance], entries: registry.entries }),
  )
  const missing = run("--write", "--input", "live.json")
  assert.equal(missing.status, 1)
  assert.match(missing.stderr, /provenance/i)

  rule.provenance = {
    provider: "Family source",
    origin: "material-symbols",
    license: "family-only",
    licenseUrl: "https://example.test/license",
  }
  rule.provenanceOverrides = {
    "1:1": { provider: "Override brand", origin: "brand", license: "brand-only" },
  }
  fs.writeFileSync(registryPath, JSON.stringify({ bulkRules: [rule], entries: registry.entries }))
  const written = run("--write", "--input", "live.json")
  assert.equal(written.status, 0, written.stderr)
  const manifest = JSON.parse(
    fs.readFileSync(path.join(root, "src/assets/figma-icons/manifest.json"), "utf8"),
  )
  assert.deepEqual(manifest.entries["1:1"].provenance, {
    provider: "Override brand",
    origin: "brand",
    license: "brand-only",
  })
  assert.equal(manifest.entries["1:1"].kind, "logo")
  const check = run("--check", "--input", "live.json")
  assert.equal(check.status, 0, check.stderr)
})

test("source metadata changes keep installed icon aliases during check and regeneration", (t) => {
  const { root, run } = fixture(t, component)
  const initial = run("--write", "--input", "live.json")
  assert.equal(initial.status, 0, initial.stderr)
  const sourceFile = path.join(root, "src/components/icons/icon-assets.ts")
  const originalSource = fs.readFileSync(sourceFile, "utf8")
  const assetFile = path.join(root, "src/assets/figma-icons/1-1.svg")
  const originalArtwork = fs.readFileSync(assetFile, "utf8")
  const live = JSON.parse(fs.readFileSync(path.join(root, "live.json"), "utf8"))
  live.meta.components[0].name = "Renamed source mark"
  live.nodes["1:1"].document.name = "Renamed source mark"
  live.version = "renamed-source-version"
  fs.writeFileSync(path.join(root, "live.json"), JSON.stringify(live))

  const check = run("--check", "--input", "live.json")
  assert.equal(check.status, 0, check.stderr)
  const regenerated = run("--write", "--input", "live.json")
  assert.equal(regenerated.status, 0, regenerated.stderr)
  const manifest = JSON.parse(
    fs.readFileSync(path.join(root, "src/assets/figma-icons/manifest.json"), "utf8"),
  )
  assert.equal(manifest.entries["1:1"].name, "Fixture mark")
  assert.equal(manifest.version, "renamed-source-version")
  assert.equal(fs.readFileSync(sourceFile, "utf8"), originalSource)
  assert.equal(fs.readFileSync(assetFile, "utf8"), originalArtwork)
  const afterWrite = run("--check", "--input", "live.json")
  assert.equal(afterWrite.status, 0, afterWrite.stderr)

  live.meta.components[0].containing_frame = { pageId: "2:0", pageName: "Moved icon page" }
  live.version = "moved-source-version"
  fs.writeFileSync(path.join(root, "live.json"), JSON.stringify(live))
  const moved = run("--check", "--input", "live.json")
  assert.equal(moved.status, 0, moved.stderr)
  const movedWrite = run("--write", "--input", "live.json")
  assert.equal(movedWrite.status, 0, movedWrite.stderr)
  assert.equal(fs.readFileSync(sourceFile, "utf8"), originalSource)
  assert.equal(fs.readFileSync(assetFile, "utf8"), originalArtwork)

  const registryFile = path.join(root, "src/catalog/figma/registry.json")
  const registry = JSON.parse(fs.readFileSync(registryFile, "utf8"))
  registry.bulkRules.push({
    pageId: "2:0",
    namesExport: "figmaPictogramNames",
    assetManifest: "src/assets/figma-pictograms/manifest.json",
  })
  fs.writeFileSync(registryFile, JSON.stringify(registry))
  fs.mkdirSync(path.join(root, "src/assets/figma-pictograms"))
  fs.writeFileSync(
    path.join(root, "src/assets/figma-pictograms/manifest.json"),
    JSON.stringify({
      fileKey: "fixture",
      version: "source-version",
      entries: { "2:1": { name: "Fixture pictogram" } },
    }),
  )
  live.meta.components.push({
    node_id: "2:1",
    name: "Fixture pictogram",
    containing_frame: { pageId: "1:0", pageName: "Original icon page" },
  })
  live.nodes["2:1"] = { document: { ...component, id: "2:1" }, components: {}, componentSets: {} }
  fs.writeFileSync(path.join(root, "live.json"), JSON.stringify(live))
  const exchanged = run("--check", "--input", "live.json")
  assert.equal(exchanged.status, 0, exchanged.stderr)
})

test("alpha masks clip later siblings without becoming visible artwork or dimming by their gray paint", async (t) => {
  const mask = {
    id: "1:3",
    name: "Source mask",
    type: "RECTANGLE",
    isMask: true,
    maskType: "ALPHA",
    size: { x: 4, y: 8 },
    relativeTransform: [
      [1, 0, 4],
      [0, 1, 3],
    ],
    fills: [{ type: "SOLID", color: { r: 0.25, g: 0.25, b: 0.25, a: 1 } }],
    strokes: [],
    fillGeometry: [{ windingRule: "NONZERO", path: "M0 0H4V8H0Z" }],
    strokeGeometry: [],
  }
  const { root, run } = fixture(t, { ...component, children: [mask, square] })
  const result = run("--write", "--input", "live.json")
  assert.equal(result.status, 0, result.stderr)
  const { data } = await sharp(path.join(root, "src/assets/figma-icons/1-1.svg"))
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true })
  assert.deepEqual([...data.subarray((3 * 24 + 4) * 4, (3 * 24 + 4) * 4 + 4)], [11, 62, 227, 255])
  assert.equal(data[(3 * 24 + 3) * 4 + 3], 0, "the glyph must be clipped by the mask")
  assert.equal(data[(3 * 24 + 8) * 4 + 3], 0, "do not render the mask as a background rectangle")
})

test("flattened Boolean geometry is painted once with its source winding and not its construction layers", async (t) => {
  const flattened = {
    ...square,
    id: "1:4",
    type: "BOOLEAN_OPERATION",
    fillGeometry: [{ windingRule: "EVENODD", path: "M0 0H8V8H0Z M2 2H6V6H2Z" }],
    children: [
      {
        ...square,
        id: "1:5",
        relativeTransform: [
          [1, 0, 0],
          [0, 1, 0],
        ],
        fills: [{ type: "SOLID", color: { r: 1, g: 0, b: 0, a: 1 } }],
      },
    ],
  }
  const { root, run } = fixture(t, { ...component, children: [flattened] })
  const result = run("--write", "--input", "live.json")
  assert.equal(result.status, 0, result.stderr)
  const { data } = await sharp(path.join(root, "src/assets/figma-icons/1-1.svg"))
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true })
  assert.deepEqual([...data.subarray((3 * 24 + 2) * 4, (3 * 24 + 2) * 4 + 4)], [11, 62, 227, 255])
  assert.equal(data[(6 * 24 + 5) * 4 + 3], 0, "construction layers must not fill the Boolean hole")
})

test("nested group transforms and frame clipping preserve the source coordinate spaces", async (t) => {
  const frame = {
    id: "1:6",
    type: "FRAME",
    size: { x: 4, y: 6 },
    relativeTransform: [
      [1, 0, 4],
      [0, 1, 5],
    ],
    clipsContent: true,
    fills: [],
    strokes: [],
    children: [square],
  }
  const group = {
    ...component,
    id: "1:7",
    type: "GROUP",
    relativeTransform: [
      [1, 0, 0],
      [0, 1, 0],
    ],
    children: [frame],
  }
  const { root, run } = fixture(t, { ...component, children: [group] })
  const result = run("--write", "--input", "live.json")
  assert.equal(result.status, 0, result.stderr)
  const { data } = await sharp(path.join(root, "src/assets/figma-icons/1-1.svg"))
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true })
  assert.deepEqual([...data.subarray((8 * 24 + 6) * 4, (8 * 24 + 6) * 4 + 4)], [11, 62, 227, 255])
  assert.equal(data[(8 * 24 + 8) * 4 + 3], 0, "do not escape the local frame width")
  assert.equal(data[(11 * 24 + 6) * 4 + 3], 0, "do not escape the local frame height")
})

test("expanded source instances retain their own transform and ignore disabled effects", async (t) => {
  const instance = {
    ...component,
    id: "1:8",
    type: "INSTANCE",
    componentId: "2:1",
    relativeTransform: [
      [1, 0, 4],
      [0, 1, 5],
    ],
    effects: [{ type: "DROP_SHADOW", visible: false }],
  }
  const { root, run } = fixture(t, { ...component, children: [instance] }, undefined, {
    "2:1": { key: "external-source-master", remote: true },
  })
  const result = run("--write", "--input", "live.json")
  assert.equal(result.status, 0, result.stderr)
  const { data } = await sharp(path.join(root, "src/assets/figma-icons/1-1.svg"))
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true })
  assert.deepEqual([...data.subarray((8 * 24 + 6) * 4, (8 * 24 + 6) * 4 + 4)], [11, 62, 227, 255])
  assert.equal(data[(3 * 24 + 2) * 4 + 3], 0, "do not drop the expanded instance transform")
})

test("component sets export individual variants at their own bounds with the source default identity", async (t) => {
  const light = {
    ...component,
    id: "1:9",
    name: "Color=Light",
    relativeTransform: [
      [1, 0, 20],
      [0, 1, 20],
    ],
    children: [{ ...square, fills: [{ type: "SOLID", color: { r: 1, g: 1, b: 1, a: 1 } }] }],
  }
  const dark = {
    ...component,
    id: "1:10",
    name: "Color=Dark",
    relativeTransform: [
      [1, 0, 60],
      [0, 1, 20],
    ],
  }
  const set = {
    ...component,
    id: "1:11",
    name: "Fixture variants",
    type: "COMPONENT_SET",
    size: { x: 104, y: 64 },
    fills: [{ type: "SOLID", color: { r: 1, g: 0, b: 1, a: 1 } }],
    componentPropertyDefinitions: {
      Color: { type: "VARIANT", defaultValue: "Dark", variantOptions: ["Light", "Dark"] },
    },
    children: [light, dark],
  }
  const { root, run } = fixture(t, set, {
    rendering: "image",
    defaultVariantNodeId: "1:10",
    aliases: { light: "1:9", dark: "1:10" },
  })
  const result = run("--write", "--input", "live.json")
  assert.equal(result.status, 0, result.stderr)
  const directory = path.join(root, "src/assets/figma-icons")
  const entry = JSON.parse(fs.readFileSync(path.join(directory, "manifest.json"), "utf8")).entries[
    "1:11"
  ]
  assert.equal(entry.defaultVariantNodeId, "1:10")
  assert.deepEqual(Object.keys(entry.variants).sort(), ["1:10", "1:9"])
  for (const [file, pixel] of [
    ["1-9.svg", [255, 255, 255, 255]],
    ["1-10.svg", [11, 62, 227, 255]],
  ]) {
    const { data, info } = await sharp(path.join(directory, file))
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true })
    assert.equal(info.width, 24)
    assert.equal(info.height, 24)
    assert.deepEqual([...data.subarray((3 * 24 + 2) * 4, (3 * 24 + 2) * 4 + 4)], pixel)
    assert.equal(data[3], 0, "component-set chrome must not become artwork")
  }
  const check = run("--check", "--input", "live.json")
  assert.equal(check.status, 0, check.stderr)
})

test("a registry policy cannot silently replace the source component-set default", (t) => {
  const set = {
    ...component,
    id: "1:11",
    type: "COMPONENT_SET",
    componentPropertyDefinitions: {
      Color: { type: "VARIANT", defaultValue: "Light", variantOptions: ["Light", "Dark"] },
    },
    children: [
      { ...component, id: "1:9", name: "Color=Light" },
      { ...component, id: "1:10", name: "Color=Dark" },
    ],
  }
  const { root, run } = fixture(t, set, {
    rendering: "image",
    defaultVariantNodeId: "1:10",
    aliases: { light: "1:9", dark: "1:10" },
  })
  const result = run("--write", "--input", "live.json")
  assert.equal(result.status, 1)
  assert.match(result.stderr, /default/i)
  assert.equal(fs.existsSync(path.join(root, "src/assets/figma-icons")), false)
})

test("hermetic checks reject external SVG resources even when the file checksum was updated", (t) => {
  const { root, run } = fixture(t, component)
  const written = run("--write", "--input", "live.json")
  assert.equal(written.status, 0, written.stderr)
  const directory = path.join(root, "src/assets/figma-icons")
  const manifestFile = path.join(directory, "manifest.json")
  const manifest = JSON.parse(fs.readFileSync(manifestFile, "utf8"))
  fs.writeFileSync(
    path.join(root, "src/catalog/figma/inventory.json"),
    JSON.stringify({
      fileKey: "fixture",
      version: "source-version",
      components: [
        {
          nodeId: "1:1",
          name: "Fixture mark",
          type: "COMPONENT",
          pageId: "1:0",
          pageName: "Renamed icon page",
          properties: {},
          dependencies: [],
          designFingerprint: manifest.entries["1:1"].designFingerprint,
        },
      ],
    }),
  )
  const file = path.join(directory, "1-1.svg")
  const source = fs
    .readFileSync(file, "utf8")
    .replace(
      "</svg>",
      '<image href="https://example.invalid/not-an-asset.svg" width="1" height="1"/></svg>',
    )
  fs.writeFileSync(file, source)
  manifest.entries["1:1"].variants["1:1"].sha256 = createHash("sha256").update(source).digest("hex")
  fs.writeFileSync(manifestFile, JSON.stringify(manifest))
  const result = run("--check")
  assert.equal(result.status, 1)
  assert.match(result.stderr, /standalone|external resource/i)
})

test("hermetic inventory checks retain pinned asset provenance without needing a full REST payload", (t) => {
  const { root, run } = fixture(t, component)
  const written = run("--write", "--input", "live.json")
  assert.equal(written.status, 0, written.stderr)
  const manifestFile = path.join(root, "src/assets/figma-icons/manifest.json")
  const manifest = JSON.parse(fs.readFileSync(manifestFile, "utf8"))
  fs.writeFileSync(
    path.join(root, "src/catalog/figma/inventory.json"),
    JSON.stringify({
      schemaVersion: 2,
      fileKey: "fixture",
      syncedAt: "2026-10-10",
      components: [
        {
          nodeId: "1:1",
          name: "Fixture mark",
          type: "COMPONENT",
          pageId: "1:0",
          pageName: "Renamed icon page",
          properties: {},
          dependencies: [],
          designFingerprint: manifest.entries["1:1"].designFingerprint,
        },
      ],
    }),
  )
  const checked = run("--check")
  assert.equal(checked.status, 0, checked.stderr)
  manifest.version = ""
  fs.writeFileSync(manifestFile, JSON.stringify(manifest))
  const invalid = run("--check")
  assert.equal(invalid.status, 1)
  assert.match(invalid.stderr, /pinned version/i)
})

test("a new published icon cannot silently disappear from local artwork coverage", (t) => {
  const { root, run } = fixture(t, component)
  const file = path.join(root, "live.json")
  const source = JSON.parse(fs.readFileSync(file, "utf8"))
  source.meta.components.push({
    node_id: "2:1",
    name: "New source icon",
    containing_frame: { pageId: "1:0", pageName: "Renamed icon page" },
  })
  source.nodes["2:1"] = {
    document: {
      ...component,
      id: "2:1",
      name: "New source icon",
      children: [{ ...square, id: "2:2" }],
    },
    components: {},
    componentSets: {},
  }
  fs.writeFileSync(file, JSON.stringify(source))
  const result = run("--write", "--input", "live.json")
  assert.equal(result.status, 1)
  assert.match(result.stderr, /every published icon.*local source asset policy/i)
  assert.equal(fs.existsSync(path.join(root, "src/assets/figma-icons")), false)
})

test("formatted variant aliases remain valid evidence, but an alias cannot be rebound to another identity", (t) => {
  const { root, run } = fixture(t, component, {
    rendering: "mask",
    aliases: { mark: "1:1" },
  })
  const written = run("--write", "--input", "live.json")
  assert.equal(written.status, 0, written.stderr)
  const file = path.join(root, "src/components/icons/icon-assets.ts")
  const formatted = spawnSync(toolingPath("node_modules/.bin/oxfmt"), [file], {
    cwd: root,
    encoding: "utf8",
    env: fixtureEnv(root),
  })
  assert.equal(formatted.status, 0, formatted.stderr)
  const checked = run("--check", "--input", "live.json")
  assert.equal(checked.status, 0, checked.stderr)
  const original = fs.readFileSync(file, "utf8")
  const wrongIdentity = original.replace('mark: "1:1"', 'mark: "1:2"')
  assert.notEqual(wrongIdentity, original)
  fs.writeFileSync(file, wrongIdentity)
  const invalid = run("--check", "--input", "live.json")
  assert.equal(invalid.status, 1)
  assert.match(invalid.stderr, /module does not match/i)
})
