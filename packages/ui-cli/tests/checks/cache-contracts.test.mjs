import assert from "node:assert/strict"
import { spawnSync } from "node:child_process"
import fs from "node:fs"
import { createRequire } from "node:module"
import path from "node:path"
import { test } from "node:test"
import { fileURLToPath } from "node:url"

const workspace = fileURLToPath(new URL("../../../../", import.meta.url))
const require = createRequire(import.meta.url)
const nxPackage = require.resolve("nx/package.json")
const nx = path.join(path.dirname(nxPackage), JSON.parse(fs.readFileSync(nxPackage, "utf8")).bin.nx)
const env = {
  ...process.env,
  NX_DAEMON: "false",
  NX_TUI: "false",
  NX_INTERACTIVE: "false",
  NX_LOAD_DOT_ENV_FILES: "false",
  NX_NO_CLOUD: "true",
  FORCE_COLOR: "0",
}

function nxRun(root, args, extra = {}) {
  const result = spawnSync(process.execPath, [nx, ...args], {
    cwd: root,
    env: {
      ...env,
      NX_SKIP_NX_CACHE: "false",
      NX_CACHE_DIRECTORY: path.join(root, ".nx/cache"),
      NX_WORKSPACE_DATA_DIRECTORY: path.join(root, ".nx/workspace-data"),
      ...extra,
    },
    encoding: "utf8",
    timeout: 30_000,
  })
  assert.ifError(result.error)
  return result
}

function resolved(project) {
  const result = nxRun(workspace, ["show", "project", project, "--json"])
  assert.equal(result.status, 0, result.stderr)
  return JSON.parse(result.stdout)
}

const library = resolved("pagopa-ui")
const tooling = resolved("pagopa-ui-cli")
const namedInputs = JSON.parse(fs.readFileSync(path.join(workspace, "nx.json"), "utf8")).namedInputs

// Only commands are replaced: the inputs, outputs and cache policy come from
// the resolved targets. An ignored execution log distinguishes cache replay
// from a fresh run without modifying the actual checkout's source data.
function fixture(project, target, files, { artifact = false } = {}) {
  // .cache is already excluded by the workspace's .gitignore, so a parallel
  // graph scan cannot discover the fixture's duplicate project identities.
  const scratch = path.join(workspace, ".cache")
  fs.mkdirSync(scratch, { recursive: true })
  const root = fs.mkdtempSync(path.join(scratch, "nx-contract-"))
  function write(file, source) {
    const absolute = path.join(root, file)
    fs.mkdirSync(path.dirname(absolute), { recursive: true })
    if (/(?:project|package)\.json$/.test(file) && ["valid", "invalid"].includes(source)) {
      source = JSON.stringify({
        name: `fixture-${path.dirname(file).replaceAll("/", "-")}`,
        metadata: { description: source },
      })
    }
    fs.writeFileSync(absolute, source)
  }
  const contract = project.targets[target]
  const output = contract.outputs?.[0]?.replace("{projectRoot}", project.root)
  const targets = {
    [target]: {
      ...contract,
      executor: "nx:run-commands",
      options: {
        cwd: "{workspaceRoot}",
        command: `node probe.cjs ${JSON.stringify(target)}`,
      },
    },
  }
  if (artifact) {
    targets.build = {
      executor: "nx:run-commands",
      cache: false,
      outputs: ["{projectRoot}/dist/types"],
      options: { cwd: "{workspaceRoot}", command: "node build.cjs" },
    }
    write(".runs/artifact", "valid")
    write(
      "build.cjs",
      `const fs = require("node:fs");
fs.mkdirSync("packages/pagopa-ui/dist/types", { recursive: true });
fs.writeFileSync("packages/pagopa-ui/dist/types/probe.d.ts", fs.readFileSync(".runs/artifact"));
`,
    )
  }
  write(".gitignore", "node_modules/\n.nx/\n.runs/\ndist/\n")
  write("package.json", '{"private":true}')
  write("pnpm-workspace.yaml", "packages:\n  - packages/*\n")
  write("nx.json", JSON.stringify({ namedInputs, neverConnectToCloud: true, plugins: [] }))
  write(`${project.root}/project.json`, JSON.stringify({ name: project.name, targets }))
  for (const [file, source] of Object.entries(files)) write(file, source)
  write(
    "probe.cjs",
    `const fs = require("node:fs");
const files = ${JSON.stringify(Object.keys(files))};
${artifact ? 'files.push("packages/pagopa-ui/dist/types/probe.d.ts");' : ""}
fs.mkdirSync(".runs", { recursive: true });
fs.appendFileSync(".runs/executions", process.argv[2] + "\\n");
if (files.some(file => fs.readFileSync(file, "utf8").includes("invalid")) ||
    process.env.LIBRARY_ENGINES === "webkit") {
  console.error("fixture contract rejected");
  process.exit(1);
}
${output ? `fs.mkdirSync(${JSON.stringify(output)}, { recursive: true }); fs.writeFileSync(${JSON.stringify(`${output}/report.md`)}, "verified");` : ""}
console.log("fixture contract verified");
`,
  )
  fs.symlinkSync(path.join(workspace, "node_modules"), path.join(root, "node_modules"), "dir")
  return {
    root,
    write,
    run: (extra) =>
      nxRun(root, ["run", `${project.name}:${target}`, "--outputStyle=static"], extra),
    executions: () =>
      fs.readFileSync(path.join(root, ".runs/executions"), "utf8").trim().split("\n").length,
    close: () => fs.rmSync(root, { recursive: true, force: true }),
  }
}

test("cache-contract: sibling reads invalidate cached checks without widening every task", () => {
  const cases = [
    [
      library,
      "a11y:conformance:check",
      ["apps/storybook/src/a11y/conformance.json", "apps/storybook/src/guides/accessibility.md"],
    ],
    [
      library,
      "foundation:check",
      [
        "packages/tokens/src/manifest.json",
        "packages/tokens/src/foundation-baseline.json",
        "packages/tokens/src/foundation-exceptions.json",
        "apps/storybook/src/templates/probe.tsx",
      ],
    ],
    [
      library,
      "tokens:public:check",
      ["packages/tokens/src/tokens.generated.css", "packages/tokens/src/figma-tokens.generated.ts"],
    ],
    [
      library,
      "check:catalogue",
      [
        "packages/artwork/src/assets/figma-icons/manifest.json",
        "packages/artwork/src/assets/figma-pictograms/manifest.json",
        "packages/artwork/src/components/icons/icon-assets.ts",
      ],
    ],
    [
      library,
      "docs",
      [
        "apps/storybook/src/guides/probe.md",
        "packages/tokens/src/manifest.json",
        "packages/artwork/src/assets/figma-icons/manifest.json",
        "apps/storybook/package.json",
        "tools/workspace/project.json",
      ],
    ],
    [
      tooling,
      "test",
      [
        "apps/storybook/src/Probe.stories.tsx",
        "packages/tokens/src/tokens.generated.css",
        "packages/artwork/src/assets/figma-icons/manifest.json",
        "packages/pagopa-ui/project.json",
        "docs/figma-parity/manifest.json",
        ".github/extensions/figma-align/verification-context.mjs",
        ".github/extensions/figma-align/extension.mjs",
      ],
    ],
  ]
  for (const [project, target, files] of cases) {
    const tree = fixture(project, target, Object.fromEntries(files.map((file) => [file, "valid"])))
    try {
      assert.equal(tree.run().status, 0, `${target}: initial success`)
      const executions = tree.executions()
      assert.equal(tree.run().status, 0, `${target}: cached success`)
      assert.equal(tree.executions(), executions, `${target}: unchanged inputs must reuse success`)
      for (const [index, file] of files.entries()) {
        tree.write(file, "invalid")
        assert.equal(tree.run().status, 1, `${target}: ${file} must invalidate success`)
        assert.equal(
          tree.executions(),
          executions + index + 1,
          `${target}: changed input must execute`,
        )
        tree.write(file, "valid")
      }
      tree.write("apps/unrelated/src/probe.ts", "invalid")
      assert.equal(tree.run().status, 0)
      assert.equal(
        tree.executions(),
        executions + files.length,
        `${target}: restored inputs must reuse success`,
      )
      tree.write("apps/unrelated/src/probe.ts", "changed")
      assert.equal(tree.run().status, 0)
      assert.equal(
        tree.executions(),
        executions + files.length,
        `${target}: unrelated source must not invalidate`,
      )
    } finally {
      tree.close()
    }
  }
})

test("cache-contract: library engines and the current built artifact invalidate success", () => {
  const tree = fixture(
    library,
    "library:check",
    {
      "packages/artwork/src/assets/figma-icons/manifest.json": "valid",
    },
    { artifact: true },
  )
  try {
    assert.equal(tree.run({ LIBRARY_ENGINES: "chromium" }).status, 0)
    assert.equal(tree.run({ LIBRARY_ENGINES: "chromium" }).status, 0)
    assert.equal(tree.executions(), 1)
    assert.equal(tree.run({ LIBRARY_ENGINES: "webkit" }).status, 1)
    assert.equal(tree.executions(), 2, "another engine must not reuse Chromium's success")
    tree.write(".runs/artifact", "invalid")
    assert.equal(tree.run({ LIBRARY_ENGINES: "chromium" }).status, 1)
    assert.equal(
      tree.executions(),
      3,
      "a rebuilt artifact must not reuse the previous artifact's success",
    )
  } finally {
    tree.close()
  }
})

test("cache-contract: API checks restore their report and reject changed declarations", () => {
  const tree = fixture(library, "api:check", {}, { artifact: true })
  try {
    assert.equal(tree.run().status, 0)
    fs.rmSync(path.join(tree.root, "packages/pagopa-ui/dist/api"), { recursive: true })
    assert.equal(tree.run().status, 0)
    assert.equal(tree.executions(), 1, "a cache hit should restore the generated report")
    assert.equal(
      fs.readFileSync(path.join(tree.root, "packages/pagopa-ui/dist/api/report.md"), "utf8"),
      "verified",
    )
    tree.write(".runs/artifact", "invalid")
    assert.equal(tree.run().status, 1)
    assert.equal(tree.executions(), 2, "changed declarations must re-run API extraction")
  } finally {
    tree.close()
  }
})
