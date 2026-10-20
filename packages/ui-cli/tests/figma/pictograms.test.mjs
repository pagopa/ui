import assert from "node:assert/strict"
import { spawnSync } from "node:child_process"
import fs from "node:fs"
import os from "node:os"
import path from "node:path"
import { test } from "node:test"
import { fileURLToPath } from "node:url"

import { fixtureEnv } from "../../src/lib/paths.ts"

const script = fileURLToPath(new URL("../../src/cli.ts", import.meta.url))

function pictogramArguments(args) {
  if (args[0] === "--export") return ["assets", "pictograms", "export", ...args.slice(1)]
  if (args[0] === "--write") return ["assets", "pictograms", "write", ...args.slice(1)]
  if (args[0] === "--check") return ["assets", "pictograms", "check", ...args.slice(1)]
  return ["assets", "pictograms", ...args]
}

// The device vocabulary every catalogue fixture carries: `normalizeNode`
// resolves a set's variants through it, and the pictogram fixtures declare the
// canonical three so the policy stays valid.
const devicePolicy = {
  axes: [],
  any: ["Any", "Default"],
  devices: {
    mobile: { canonicalWidth: 320, defaultLayoutScope: "viewport", aliases: ["Mobile"] },
    tablet: { canonicalWidth: 600, defaultLayoutScope: "viewport", aliases: ["Tablet"] },
    desktop: { canonicalWidth: 1200, defaultLayoutScope: "viewport", aliases: ["Desktop"] },
  },
}

test("pictogram export renders individual variants at the pinned version using only GET", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "pagopa-pictograms-"))
  const files = {
    "src/catalog/figma/file.ts": 'export const FIGMA_FILE_KEY = "fixture"',
    "src/catalog/figma/device-policy.json": JSON.stringify(devicePolicy),
    "src/catalog/figma/registry.json": JSON.stringify({
      bulkRules: [
        {
          pageId: "1:0",
          namesExport: "figmaPictogramNames",
          assetManifest: "src/assets/figma-pictograms/manifest.json",
          provenance: {
            provider: "Fixture pictograms",
            origin: "flaticon",
            license: "fixture-only",
          },
        },
      ],
    }),
    "live.json": JSON.stringify({
      fileKey: "fixture",
      version: "source-version",
      meta: {
        components: [],
        component_sets: [
          {
            node_id: "1:1",
            name: "Bell",
            containing_frame: { pageId: "1:0", pageName: "Renamed page" },
          },
        ],
      },
      nodes: {
        "1:1": {
          document: {
            id: "1:1",
            name: "Bell",
            type: "COMPONENT_SET",
            children: [
              { id: "1:2", name: "Background=Light", type: "COMPONENT" },
              { id: "1:3", name: "Background=Dark", type: "COMPONENT" },
            ],
          },
          components: {},
          componentSets: {},
        },
      },
    }),
    "api-fixture.mjs": `
      import assert from "node:assert/strict"
      globalThis.fetch = async (input, options) => {
        assert.equal(options.method, "GET")
        const url = new URL(input)
        if (url.hostname === "api.figma.com") {
          assert.equal(options.headers["X-Figma-Token"], "fixture-token")
          assert.equal(url.pathname, "/v1/images/fixture")
          assert.equal(url.searchParams.get("version"), "source-version")
          assert.equal(url.searchParams.get("format"), "svg")
          assert.equal(url.searchParams.get("contents_only"), "true")
          assert.equal(url.searchParams.get("use_absolute_bounds"), "true")
          assert.equal(url.searchParams.get("ids"), "1:2,1:3")
          return { ok: true, json: async () => ({ images: {
            "1:2": "https://assets.figma.test/light.svg",
            "1:3": "https://assets.figma.test/dark.svg",
          } }) }
        }
        assert.equal(options.headers, undefined, "credentials must never be sent to asset hosts")
        return { ok: true, text: async () =>
          '<svg width="120" height="120" xmlns="http://www.w3.org/2000/svg"><path d="M0 0h120v120H0z" fill="blue"/></svg>' }
      }
    `,
  }
  try {
    for (const [file, source] of Object.entries(files)) {
      fs.mkdirSync(path.dirname(path.join(root, file)), { recursive: true })
      fs.writeFileSync(path.join(root, file), source)
    }
    const result = spawnSync(
      process.execPath,
      [
        "--import",
        path.join(root, "api-fixture.mjs"),
        script,
        ...pictogramArguments(["--export", "--input", "live.json"]),
      ],
      { cwd: root, encoding: "utf8", env: fixtureEnv(root, { FIGMA_TOKEN: "fixture-token" }) },
    )
    assert.equal(result.status, 0, result.stderr)
    const manifest = JSON.parse(
      fs.readFileSync(path.join(root, ".figma/pictograms/manifest.json"), "utf8"),
    )
    assert.equal(manifest.fileKey, "fixture")
    assert.equal(manifest.version, "source-version")
    assert.deepEqual(Object.keys(manifest.entries), ["1:1"])
    assert.equal(manifest.entries["1:1"].light.nodeId, "1:2")
    assert.equal(manifest.entries["1:1"].dark.nodeId, "1:3")
    assert.match(manifest.entries["1:1"].light.sha256, /^[a-f0-9]{64}$/)
    for (const variant of ["light", "dark"]) {
      const asset = manifest.entries["1:1"][variant]
      assert.match(
        fs.readFileSync(path.join(root, ".figma/pictograms", asset.file), "utf8"),
        /<svg/,
      )
    }
    assert.doesNotMatch(result.stdout, /https:|fixture-token/)
    const write = spawnSync(
      process.execPath,
      [script, ...pictogramArguments(["--write", "--input", "live.json"])],
      {
        cwd: root,
        encoding: "utf8",
        env: fixtureEnv(root),
      },
    )
    assert.equal(write.status, 0, write.stderr)
    const source = fs.readFileSync(
      path.join(root, "src/components/icons/pictogram-assets.ts"),
      "utf8",
    )
    assert.match(source, /"1:1":/)
    assert.match(source, /1-2\.svg\?no-inline/)
    assert.match(source, /1-3\.svg\?no-inline/)
    assert.doesNotMatch(source, /https:|data:|eager/)
    const check = spawnSync(
      process.execPath,
      [script, ...pictogramArguments(["--check", "--input", "live.json"])],
      {
        cwd: root,
        encoding: "utf8",
        env: fixtureEnv(root),
      },
    )
    assert.equal(check.status, 0, check.stderr)

    const renamedSource = JSON.parse(fs.readFileSync(path.join(root, "live.json"), "utf8"))
    renamedSource.meta.component_sets[0].name = "Renamed source bell"
    renamedSource.nodes["1:1"].document.name = "Renamed source bell"
    renamedSource.version = "renamed-source-version"
    fs.writeFileSync(path.join(root, "live.json"), JSON.stringify(renamedSource))
    const renamed = spawnSync(
      process.execPath,
      [script, ...pictogramArguments(["--check", "--input", "live.json"])],
      {
        cwd: root,
        encoding: "utf8",
        env: fixtureEnv(root),
      },
    )
    assert.equal(renamed.status, 0, renamed.stderr)
    const renamedWrite = spawnSync(
      process.execPath,
      [script, ...pictogramArguments(["--write", "--input", "live.json"])],
      {
        cwd: root,
        encoding: "utf8",
        env: fixtureEnv(root),
      },
    )
    assert.equal(renamedWrite.status, 0, renamedWrite.stderr)
    assert.equal(
      fs.readFileSync(path.join(root, "src/components/icons/pictogram-assets.ts"), "utf8"),
      source,
      "source metadata must not change installed public aliases",
    )
    const retained = JSON.parse(
      fs.readFileSync(path.join(root, "src/assets/figma-pictograms/manifest.json"), "utf8"),
    )
    assert.equal(retained.entries["1:1"].name, "Bell")
    assert.equal(retained.version, "source-version", "retain the actual artwork export provenance")

    renamedSource.meta.component_sets[0].containing_frame = {
      pageId: "2:0",
      pageName: "Moved pictogram page",
    }
    fs.writeFileSync(path.join(root, "live.json"), JSON.stringify(renamedSource))
    const moved = spawnSync(
      process.execPath,
      [script, ...pictogramArguments(["--check", "--input", "live.json"])],
      {
        cwd: root,
        encoding: "utf8",
        env: fixtureEnv(root),
      },
    )
    assert.equal(moved.status, 0, moved.stderr)

    fs.appendFileSync(path.join(root, "src/assets/figma-pictograms/1-2.svg"), "tampered")
    const invalid = spawnSync(
      process.execPath,
      [script, ...pictogramArguments(["--check", "--input", "live.json"])],
      {
        cwd: root,
        encoding: "utf8",
        env: fixtureEnv(root),
      },
    )
    assert.equal(invalid.status, 1)
    assert.match(invalid.stderr, /checksum/i)
  } finally {
    fs.rmSync(root, { recursive: true, force: true })
  }
})
