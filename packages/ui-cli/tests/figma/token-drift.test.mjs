import assert from "node:assert/strict"
import { test } from "node:test"

import { fetchLocalVariables } from "../../src/figma/rest.ts"
import { compareTokenDrift, formatTokenDrift } from "../../src/figma/tokens.ts"

async function withFigmaFetch(implementation, callback, token = "fixture-token") {
  const originalFetch = globalThis.fetch
  const previousToken = process.env.FIGMA_TOKEN
  process.env.FIGMA_TOKEN = token
  globalThis.fetch = implementation
  try {
    return await callback()
  } finally {
    globalThis.fetch = originalFetch
    if (previousToken === undefined) delete process.env.FIGMA_TOKEN
    else process.env.FIGMA_TOKEN = previousToken
  }
}

function jsonResponse(value, status = 200) {
  return new Response(JSON.stringify(value), { status })
}

const collections = {
  "VariableCollectionId:1": {
    id: "VariableCollectionId:1",
    name: "MUI Italia Next",
    key: "collection-key",
    modes: [{ modeId: "1:0", name: "Default" }],
    defaultModeId: "1:0",
    remote: false,
  },
}

const variables = {
  "VariableID:1": {
    id: "VariableID:1",
    name: "Color/Icon/Primary",
    key: "published-primary-key",
    variableCollectionId: "VariableCollectionId:1",
    resolvedType: "COLOR",
    valuesByMode: { "1:0": { r: 0, g: 0.2, b: 1, a: 1 } },
  },
  "VariableID:2": {
    id: "VariableID:2",
    name: "Color/Icon/Alias",
    variableCollectionId: "VariableCollectionId:1",
    resolvedType: "COLOR",
    valuesByMode: { "1:0": { type: "VARIABLE_ALIAS", id: "VariableID:1" } },
  },
  "VariableID:3": {
    id: "VariableID:3",
    name: "Foundations/radius-4",
    variableCollectionId: "VariableCollectionId:1",
    resolvedType: "FLOAT",
    valuesByMode: { "1:0": 4 },
  },
  "VariableID:4": {
    id: "VariableID:4",
    name: "Color/Icon/Veil",
    variableCollectionId: "VariableCollectionId:1",
    resolvedType: "COLOR",
    valuesByMode: { "1:0": { r: 0, g: 0, b: 0, a: 0.5 } },
  },
  // Text and boolean variables are not design tokens: the manifest has no
  // value form for them, so the read leaves them out.
  "VariableID:5": {
    id: "VariableID:5",
    name: "Copy/Label",
    variableCollectionId: "VariableCollectionId:1",
    resolvedType: "STRING",
    valuesByMode: { "1:0": "Continue" },
  },
  "VariableID:6": {
    id: "VariableID:6",
    name: "Foundations/flag",
    variableCollectionId: "VariableCollectionId:1",
    resolvedType: "BOOLEAN",
    valuesByMode: { "1:0": true },
  },
}

test("the local variable read is the pinned snapshot the token manifest is compared with", async () => {
  await withFigmaFetch(
    async (url, options) => {
      const request = new URL(url)
      assert.equal(request.pathname, "/v1/files/fixture-file/variables/local")
      assert.equal(options.method, "GET")
      assert.equal(options.headers["X-Figma-Token"], "fixture-token")
      return jsonResponse({
        status: 200,
        error: false,
        meta: { variableCollections: collections, variables },
      })
    },
    async () => {
      assert.deepEqual(await fetchLocalVariables("fixture-file", "fixture-token"), {
        fileKey: "fixture-file",
        variables: {
          "Color/Icon/Alias": "#0033ff",
          "Color/Icon/Primary": "#0033ff",
          "Color/Icon/Veil": "#00000080",
          "Foundations/radius-4": "4",
        },
        ids: {
          // An unpublished variable has no published key: it keeps the local
          // identity the manifest already records for it.
          "Color/Icon/Alias": "local:Color/Icon/Alias",
          "Color/Icon/Primary": { key: "published-primary-key", kind: "variable" },
          "Color/Icon/Veil": "local:Color/Icon/Veil",
          "Foundations/radius-4": "local:Foundations/radius-4",
        },
      })
    },
  )
})

// A committed manifest of four curated variables; the live read that follows
// adds one, changes one, renames one, drops one, and brings a namespace the
// curation does not know.
const committedManifest = {
  schemaVersion: 2,
  fileKey: "fixture",
  syncedAt: "2025-01-01",
  source: { method: "fixture" },
  variables: {
    "key-primary": {
      id: "key-primary",
      idKind: "variable",
      name: "Color/Icon/Primary",
      type: "COLOR",
      value: "#0033ff",
      cssName: "figma-color-icon-primary",
    },
    "key-changed": {
      id: "key-changed",
      idKind: "variable",
      name: "Color/Icon/Changed",
      type: "COLOR",
      value: "#0033ff",
      cssName: "figma-color-icon-changed",
    },
    "key-renamed": {
      id: "key-renamed",
      idKind: "variable",
      name: "Color/Icon/Old",
      type: "COLOR",
      value: "#111111",
      cssName: "figma-color-icon-old",
    },
    "key-removed": {
      id: "key-removed",
      idKind: "variable",
      name: "Color/Icon/Gone",
      type: "COLOR",
      value: "#ff0000",
      cssName: "figma-color-icon-gone",
    },
  },
  foundations: {},
  excluded: {},
}

const liveVariables = {
  fileKey: "fixture",
  variables: {
    "Color/Icon/Primary": "#0033ff",
    "Color/Icon/Changed": "#000000",
    "Color/Icon/NewName": "#111111",
    "Color/Icon/New": "#00ff00",
    "Legacy/Whatever": "#123456",
    "Color/Icon/Broken": "not a colour",
  },
  ids: {
    "Color/Icon/Primary": { key: "key-primary", kind: "variable" },
    "Color/Icon/Changed": { key: "key-changed", kind: "variable" },
    "Color/Icon/NewName": { key: "key-renamed", kind: "variable" },
    "Color/Icon/New": { key: "key-new", kind: "variable" },
    "Legacy/Whatever": "local:Legacy/Whatever",
    "Color/Icon/Broken": "local:Color/Icon/Broken",
  },
}

test("a live read is reported against the committed manifest variable by variable", () => {
  const drift = compareTokenDrift(committedManifest, liveVariables)
  assert.deepEqual(
    drift.added.map((entry) => [entry.id, entry.name]),
    [["key-new", "Color/Icon/New"]],
  )
  assert.deepEqual(drift.changed, [
    { id: "key-changed", name: "Color/Icon/Changed", from: "#0033ff", to: "#000000" },
  ])
  // The id survives the rename, so the entry is a rename and not a removal
  // followed by an addition.
  assert.deepEqual(drift.renamed, [
    { id: "key-renamed", from: "Color/Icon/Old", to: "Color/Icon/NewName" },
  ])
  assert.deepEqual(drift.removed, [{ id: "key-removed", name: "Color/Icon/Gone" }])
  assert.deepEqual(drift.unmapped, ["Legacy/Whatever"])
  assert.match(drift.unreadable.join("\n"), /^Color\/Icon\/Broken: /)
})

test("a live read that matches the manifest is no drift at all", () => {
  const same = {
    fileKey: "fixture",
    variables: Object.fromEntries(
      Object.values(committedManifest.variables).map((entry) => [entry.name, entry.value]),
    ),
    ids: Object.fromEntries(
      Object.values(committedManifest.variables).map((entry) => [
        entry.name,
        { key: entry.id, kind: "variable" },
      ]),
    ),
  }
  assert.deepEqual(compareTokenDrift(committedManifest, same), {
    added: [],
    changed: [],
    renamed: [],
    removed: [],
    unmapped: [],
    unreadable: [],
  })
  assert.deepEqual(formatTokenDrift(compareTokenDrift(committedManifest, same)), [
    "token drift: none — the variables match the committed manifest",
  ])
})

test("the token drift report names every vector and its before and after", () => {
  const lines = formatTokenDrift(compareTokenDrift(committedManifest, liveVariables)).join("\n")
  assert.match(lines, /token drift: 1 added, 1 changed, 1 renamed, 1 removed/)
  assert.match(lines, /added Color\/Icon\/New \(key-new\) = #00ff00/)
  assert.match(lines, /changed Color\/Icon\/Changed: #0033ff -> #000000/)
  assert.match(lines, /renamed Color\/Icon\/Old -> Color\/Icon\/NewName \(key-renamed\)/)
  assert.match(lines, /removed Color\/Icon\/Gone \(key-removed\)/)
  assert.match(lines, /unmapped: Legacy\/Whatever/)
  assert.match(lines, /unreadable: Color\/Icon\/Broken/)
})

import fs from "node:fs"
import path from "node:path"

import { fixtureTree, workspaceAt } from "../helpers/cli.mjs"
import { syncCatalogue } from "../../src/figma/catalogue/index.ts"

const TOKEN_DRIFT_PATH = "docs/figma-drift/token-drift.json"

const devicePolicy = {
  axes: [],
  any: ["Any", "Default"],
  devices: {
    mobile: {
      canonicalWidth: 320,
      defaultLayoutScope: "viewport",
      aliases: ["Mobile", "XS Mobile", "XSMobile"],
    },
  },
}

// A catalogue with no component and no drift of its own: whatever the run
// reports here comes from the variables.
function catalogueFixture() {
  const tree = fixtureTree(
    {
      "src/catalog/figma/inventory.json": JSON.stringify({
        fileKey: "fixture",
        syncedAt: "2025-01-01",
        components: [],
      }),
      "src/catalog/figma/registry.json": JSON.stringify({ bulkRules: [], entries: {} }),
      "src/catalog/figma/file.ts": 'export const FIGMA_FILE_KEY = "fixture"\n',
      "src/catalog/figma/evidence-exceptions.json": '{"storyEvidence":{}}',
      "src/catalog/figma/api-exceptions.json": '{"modulePatterns":{},"exports":{}}',
      "src/catalog/figma/device-policy.json": JSON.stringify(devicePolicy),
      "src/catalog/figma/page-surface.json": JSON.stringify({
        fileKey: "fixture",
        readAt: "2025-01-01",
        note: "Fixture census: no page is censused here.",
        pages: [],
      }),
      "src/components/icons/figma-inventory.ts":
        "export const figmaIconNames = [] as const\nexport const figmaPictogramNames = [] as const",
      "src/stories/Fixture.stories.tsx": "export default { title: 'Fixture' }",
      "src/pagopa-ui.ts": "",
      "live.json": JSON.stringify([]),
      "packages/tokens/package.json": '{ "name": "pagopa-ui-tokens" }\n',
      "packages/tokens/src/manifest.json": JSON.stringify(committedManifest),
    },
    "pagopa-token-drift-",
  )
  const workspace = workspaceAt(tree.root, {
    PAGOPA_UI_TOKENS_ROOT: "packages/tokens",
    PAGOPA_UI_STORIES_ROOT: "src/stories",
  })
  return { tree, workspace }
}

function localVariables(entries) {
  return {
    status: 200,
    error: false,
    meta: {
      variableCollections: {
        "VariableCollectionId:1": { defaultModeId: "1:0" },
      },
      variables: Object.fromEntries(
        entries.map(({ id, name, key, color }) => [
          id,
          {
            id,
            name,
            ...(key ? { key } : {}),
            variableCollectionId: "VariableCollectionId:1",
            resolvedType: "COLOR",
            valuesByMode: { "1:0": color },
          },
        ]),
      ),
    },
  }
}

const blue = { r: 0, g: 0.2, b: 1, a: 1 }
const green = { r: 0, g: 1, b: 0, a: 1 }
const black = { r: 0, g: 0, b: 0, a: 1 }
// 0x11: the committed value of the renamed variable.
const darkGrey = { r: 0x11 / 255, g: 0x11 / 255, b: 0x11 / 255, a: 1 }
const red = { r: 1, g: 0, b: 0, a: 1 }

test("a run that finds only variable drift still opens the review change", async () => {
  const { tree, workspace } = catalogueFixture()
  try {
    const report = await withFigmaFetch(
      async () =>
        jsonResponse(
          localVariables([
            { id: "VariableID:1", name: "Color/Icon/Primary", key: "key-primary", color: blue },
            { id: "VariableID:2", name: "Color/Icon/Changed", key: "key-changed", color: black },
            { id: "VariableID:3", name: "Color/Icon/NewName", key: "key-renamed", color: darkGrey },
            { id: "VariableID:4", name: "Color/Icon/New", key: "key-new", color: green },
          ]),
        ),
      () =>
        syncCatalogue(workspace, {
          input: "live.json",
          token: "fixture-token",
          tokens: true,
          prBody: "pr-body.md",
          tokenDrift: TOKEN_DRIFT_PATH,
        }),
    )
    assert.equal(report.exitCode, 0, report.err.join("\n"))
    assert.match(report.out.join("\n"), /token drift: 1 added, 1 changed, 1 renamed, 1 removed/)
    const body = fs.readFileSync(path.join(tree.root, "pr-body.md"), "utf8")
    assert.match(body, /## Token drift/)
    assert.match(body, /- changed: `Color\/Icon\/Changed` #0033ff → #000000/)
    const record = JSON.parse(fs.readFileSync(path.join(tree.root, TOKEN_DRIFT_PATH), "utf8"))
    assert.deepEqual(record.counts, {
      added: 1,
      changed: 1,
      renamed: 1,
      removed: 1,
      unmapped: 0,
      unreadable: 0,
    })
    assert.deepEqual(
      record.added.map((entry) => entry.name),
      ["Color/Icon/New"],
    )
  } finally {
    tree.dispose()
  }
})

test("a read that matches the manifest leaves no review change behind", async () => {
  const { tree, workspace } = catalogueFixture()
  try {
    fs.mkdirSync(path.join(tree.root, "docs/figma-drift"), { recursive: true })
    fs.writeFileSync(path.join(tree.root, TOKEN_DRIFT_PATH), '{"stale":true}\n')
    const report = await withFigmaFetch(
      async () =>
        jsonResponse(
          localVariables([
            { id: "VariableID:1", name: "Color/Icon/Primary", key: "key-primary", color: blue },
            { id: "VariableID:2", name: "Color/Icon/Changed", key: "key-changed", color: blue },
            { id: "VariableID:3", name: "Color/Icon/Old", key: "key-renamed", color: darkGrey },
            { id: "VariableID:4", name: "Color/Icon/Gone", key: "key-removed", color: red },
          ]),
        ),
      () =>
        syncCatalogue(workspace, {
          input: "live.json",
          token: "fixture-token",
          tokens: true,
          prBody: "pr-body.md",
          tokenDrift: TOKEN_DRIFT_PATH,
        }),
    )
    assert.equal(report.exitCode, 0, report.err.join("\n"))
    assert.match(report.out.join("\n"), /token drift: none/)
    assert.equal(fs.existsSync(path.join(tree.root, "pr-body.md")), false)
    assert.equal(fs.existsSync(path.join(tree.root, TOKEN_DRIFT_PATH)), false)
  } finally {
    tree.dispose()
  }
})
