import assert from "node:assert/strict"
import { EventEmitter } from "node:events"
import * as fs from "node:fs"
import { dirname, isAbsolute, join, relative, sep } from "node:path"
import { test } from "node:test"
import { fileURLToPath } from "node:url"

import {
  assessVerification,
  collectVerification,
  contextSignature,
  isVerificationPath,
  reverifyStaleResults,
  VERIFICATION_FILES,
  VERIFICATION_TREES,
} from "../../../../.github/extensions/figma-align/verification-context.mjs"

const nodeId = "1:2"
const passing = { nodeId, pass: true, cases: [], findings: [] }

function context(files) {
  return contextSignature([...files.entries()].filter(([path]) => isVerificationPath(path)))
}

async function proof(files, verify = () => passing) {
  return {
    nodeId,
    alignment: { nodeId, status: "implemented" },
    ...(await collectVerification({ readContext: () => context(files), verify })),
    finalContext: context(files),
  }
}

function sources() {
  return new Map([
    ["packages/pagopa-ui/src/index.css", "shared style"],
    ["packages/pagopa-ui/src/catalog/figma/parity-cases.json", "reviewed case"],
  ])
}

test("an unchanged verification context can pass", async () => {
  assert.deepEqual(assessVerification(await proof(sources())), { verified: true, findings: [] })
})

test("a later writer changing a shared dependency or case invalidates a pass", async () => {
  for (const file of [
    "packages/pagopa-ui/src/index.css",
    "packages/pagopa-ui/src/catalog/figma/parity-cases.json",
    "packages/ui-cli/tests/fixtures/library-rsc-consumer/app/page.tsx",
  ]) {
    const files = sources()
    const result = await proof(files)
    files.set(file, "changed by a later writer")
    result.finalContext = context(files)
    const verdict = assessVerification(result)
    assert.equal(verdict.verified, false, file)
    assert.match(verdict.findings.join(" "), /changed after verification/i)
  }
})

test("a changed, missing, or failed verification cannot pass silently", async () => {
  const files = sources()
  const changing = await proof(files, () => {
    files.set("packages/pagopa-ui/src/index.css", "changed during verification")
    return passing
  })
  const stale = assessVerification(changing)
  assert.equal(stale.verified, false)
  assert.match(stale.findings.join(" "), /changed during verification/i)

  const missing = assessVerification(await proof(sources(), () => null))
  assert.equal(missing.verified, false)
  assert.match(missing.findings.join(" "), /verifier.*no result/i)

  const missingWriter = assessVerification({
    ...(await proof(sources())),
    writerFailure: "The fix writer returned no result.",
  })
  assert.equal(missingWriter.verified, false)
  assert.match(missingWriter.findings.join(" "), /fix writer returned no result/i)

  const failed = assessVerification({
    ...(await proof(sources())),
    verification: { ...passing, pass: false, findings: ["Case did not match"] },
  })
  assert.equal(failed.verified, false)
  assert.deepEqual(failed.findings, ["Case did not match"])

  const unexplainedFailure = assessVerification({
    ...(await proof(sources())),
    verification: { ...passing, pass: false },
  })
  assert.equal(unexplainedFailure.verified, false)
  assert.match(unexplainedFailure.findings.join(" "), /did not pass.*no findings/i)

  const wrongNode = assessVerification({
    ...(await proof(sources())),
    verification: { ...passing, nodeId: "9:9" },
  })
  assert.equal(wrongNode.verified, false)
  assert.match(wrongNode.findings.join(" "), /different node/i)

  const unreadable = assessVerification({
    ...(await proof(sources())),
    finalContext: null,
    contextError: "snapshot unavailable",
  })
  assert.equal(unreadable.verified, false)
  assert.match(unreadable.findings.join(" "), /snapshot unavailable/i)
})

test("an unavailable context fails closed without invoking the verifier", async () => {
  let invoked = false
  const result = await collectVerification({
    readContext: () => {
      throw new Error("snapshot unavailable")
    },
    verify: () => {
      invoked = true
      return passing
    },
  })
  assert.equal(invoked, false)
  const verdict = assessVerification({ ...result, nodeId, alignment: { nodeId } })
  assert.equal(verdict.verified, false)
  assert.match(verdict.findings.join(" "), /snapshot unavailable/i)
})

test("a green-chain fix cannot leave its earlier verification passing", async () => {
  const files = sources()
  const result = await proof(files)
  files.set("packages/pagopa-ui/src/index.css", "green fix changed shared style")
  result.finalContext = context(files)
  const verdict = assessVerification(result)
  assert.equal(verdict.verified, false)
  assert.match(verdict.findings.join(" "), /changed after verification/i)

  const failedFix = assessVerification({ ...(await proof(sources())), greenFixFailed: true })
  assert.equal(failedFix.verified, false)
  assert.match(failedFix.findings.join(" "), /green-chain fix writer returned no result/i)
})

test("stale passing nodes get one fail-closed final re-verification", async () => {
  const files = sources()
  const original = await proof(files)
  const prior = {
    node: { nodeId },
    alignment: original.alignment,
    verification: original.verification,
    startContext: original.startContext,
    endContext: original.endContext,
  }
  files.set("packages/pagopa-ui/src/index.css", "the close-out state")
  const finalContext = context(files)
  let calls = 0
  const refreshed = await reverifyStaleResults({
    results: [prior],
    finalContext,
    parallel: (tasks) => Promise.all(tasks.map((task) => task())),
    verify: () =>
      collectVerification({
        readContext: () => context(files),
        verify: () => {
          calls += 1
          return passing
        },
      }),
  })
  assert.equal(refreshed.attempted, 1)
  assert.equal(calls, 1)
  assert.equal(assessVerification({ ...refreshed.results[0], nodeId, finalContext }).verified, true)
  files.set("packages/pagopa-ui/src/index.css", "changed after the retry")
  assert.equal(
    assessVerification({ ...refreshed.results[0], nodeId, finalContext: context(files) }).verified,
    false,
  )

  const failed = await reverifyStaleResults({
    results: [prior],
    finalContext,
    parallel: (tasks) =>
      Promise.all(
        tasks.map(async (task) => {
          try {
            return await task()
          } catch {
            return null
          }
        }),
      ),
    verify: () => {
      throw new Error("verifier unavailable")
    },
  })
  const failedVerdict = assessVerification({ ...failed.results[0], nodeId, finalContext })
  assert.equal(failedVerdict.verified, false)
  assert.match(failedVerdict.findings.join(" "), /verifier returned no result/i)

  const missing = await reverifyStaleResults({
    results: [prior],
    finalContext,
    parallel: (tasks) => Promise.all(tasks.map((task) => task())),
    verify: () => null,
  })
  const missingVerdict = assessVerification({ ...missing.results[0], nodeId, finalContext })
  assert.equal(missingVerdict.verified, false)
  assert.match(missingVerdict.findings.join(" "), /verifier returned no result/i)

  const failedWriter = await reverifyStaleResults({
    results: [{ ...prior, writerFailure: "The writer failed." }],
    finalContext,
    parallel: () => assert.fail("a failed writer must not be reverified"),
  })
  assert.equal(failedWriter.attempted, 0)
  assert.equal(
    assessVerification({ ...failedWriter.results[0], nodeId, finalContext }).verified,
    false,
  )

  const failedGreenFix = await reverifyStaleResults({
    results: [prior],
    finalContext,
    greenFixFailed: true,
    parallel: () => assert.fail("a failed green fix must not be reverified"),
  })
  assert.equal(failedGreenFix.attempted, 0)
  assert.equal(
    assessVerification({
      ...failedGreenFix.results[0],
      nodeId,
      finalContext,
      greenFixFailed: true,
    }).verified,
    false,
  )

  const unchanged = await reverifyStaleResults({
    results: [prior],
    finalContext: prior.endContext,
    parallel: () => assert.fail("an unchanged verification does not need a retry"),
  })
  assert.equal(unchanged.attempted, 0)

  await assert.rejects(
    reverifyStaleResults({
      results: [prior],
      finalContext,
      parallel: () => {
        throw new Error("workflow transport failed")
      },
    }),
    /workflow transport failed/i,
  )

  const changing = await reverifyStaleResults({
    results: [prior],
    finalContext,
    parallel: (tasks) => Promise.all(tasks.map((task) => task())),
    verify: () =>
      collectVerification({
        readContext: () => context(files),
        verify: () => {
          files.set("packages/pagopa-ui/src/index.css", "changed during the retry")
          return passing
        },
      }),
  })
  const changingVerdict = assessVerification({
    ...changing.results[0],
    nodeId,
    finalContext: context(files),
  })
  assert.equal(changingVerdict.verified, false)
  assert.match(changingVerdict.findings.join(" "), /changed during verification/i)
})

test("changed workflow instructions or green-chain configuration stale a pass", async () => {
  for (const path of ["AGENTS.md", "CONTRIBUTING.md", "tools/workspace/project.json"]) {
    const files = sources()
    files.set(path, "instructions or configuration")
    const result = await proof(files)
    files.set(path, "changed")
    result.finalContext = context(files)
    const verdict = assessVerification(result)
    assert.equal(verdict.verified, false, path)
    assert.match(verdict.findings.join(" "), /changed after verification/i)
  }
})

test("the context includes relevant inputs but never environment or credential files", () => {
  for (const path of [
    "packages/pagopa-ui/src/new-component.tsx",
    "packages/pagopa-ui/src/catalog/figma/parity-cases.json",
    "packages/pagopa-ui/.figma/comments.json",
    "packages/tokens/src/manifest.json",
    "packages/artwork/src/new-icon.svg",
    "apps/storybook/src/Button.stories.tsx",
    "docs/figma-parity/references/button.png",
  ]) {
    assert.equal(isVerificationPath(path), true, path)
  }
  for (const path of [
    ".env",
    "packages/pagopa-ui/src/.env.local",
    "packages/pagopa-ui/src/credentials.json",
    "packages/pagopa-ui/src/client-secret.key",
    "packages/pagopa-ui/src/access-token.json",
    "packages/pagopa-ui/src/passwords.yaml",
    "packages/pagopa-ui/.figma/parity/capture.png",
    "packages/pagopa-ui/src/../../../../.env",
    "node_modules/example/index.js",
  ]) {
    assert.equal(isVerificationPath(path), false, path)
  }
  const files = sources()
  const original = context(files)
  files.set("packages/pagopa-ui/src/untracked.tsx", "new source")
  const withUntracked = context(files)
  assert.notEqual(withUntracked, original)
  files.set("packages/pagopa-ui/src/.env.local", "never hashed")
  assert.equal(context(files), withUntracked)
})

function virtualWorkspace(root) {
  const nodes = new Map()
  const workspacePath = (path) => {
    const name = relative(root, isAbsolute(path) ? path : join(root, path))
      .split(sep)
      .join("/")
    assert.ok(name !== ".." && !name.startsWith("../"), `outside workspace: ${path}`)
    return name
  }
  const parentOf = (path) => path.split("/").slice(0, -1).join("/")
  const ensureDirectory = (path) => {
    if (!path || nodes.has(path)) return
    ensureDirectory(parentOf(path))
    nodes.set(path, { type: "directory" })
  }
  const write = (path, content) => {
    const name = workspacePath(path)
    ensureDirectory(parentOf(name))
    nodes.set(name, { type: "file", content: Buffer.from(content) })
  }
  const createDirectory = (path) => ensureDirectory(workspacePath(path))
  const remove = (path) => {
    const name = workspacePath(path)
    assert.ok(name)
    for (const candidate of [...nodes.keys()]) {
      if (candidate === name || candidate.startsWith(`${name}/`)) nodes.delete(candidate)
    }
  }
  const read = (path) => {
    const name = workspacePath(path)
    const entry = nodes.get(name)
    if (!entry) {
      const error = new Error(`ENOENT: no such file, '${name}'`)
      error.code = "ENOENT"
      throw error
    }
    assert.equal(entry.type, "file", name)
    return entry
  }
  nodes.set("", { type: "directory" })
  const mock = {
    ...fs,
    existsSync: (path) => nodes.has(workspacePath(path)),
    readdirSync: (path) => {
      const directory = workspacePath(path)
      assert.equal(nodes.get(directory)?.type, "directory", directory)
      return [...nodes]
        .filter(([name]) => name && parentOf(name) === directory)
        .map(([name, entry]) => ({
          name: name.slice(directory ? directory.length + 1 : 0),
          isFile: () => entry.type === "file",
          isDirectory: () => entry.type === "directory",
        }))
    },
    readFileSync: (path, encoding) => {
      // The fixture reads the real config first, then serves the virtual tree.
      if (!nodes.has(workspacePath(path))) return fs.readFileSync(path, encoding)
      const entry = read(path)
      return encoding ? entry.content.toString(encoding) : entry.content
    },
    mkdirSync: (path) => createDirectory(path),
    writeFileSync: (path, content) => write(path, content),
  }
  return { mock, createDirectory, remove, write }
}

let virtualExtensionNumber = 0

async function loadVirtualExtension(mock) {
  const extension = new URL(
    "../../../../.github/extensions/figma-align/extension.mjs",
    import.meta.url,
  )
  const helper = new URL(
    "../../../../.github/extensions/figma-align/verification-context.mjs",
    import.meta.url,
  )
  const dataUrl = (source) => `data:text/javascript,${encodeURIComponent(source)}`
  const fsUrl = dataUrl(`
    // Independent mocked module ${virtualExtensionNumber++}.
    const fake = globalThis.__figmaAlignVirtualFs;
    export const {
      createWriteStream, existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync
    } = fake;
  `)
  const sdkUrl = dataUrl(`
    export const defineWorkflow = (definition) => definition;
    export const joinSession = async () => {};
  `)
  const source = `${fs
    .readFileSync(extension, "utf8")
    .replace('from "node:fs"', `from "${fsUrl}"`)
    .replace('from "@github/copilot-sdk/extension"', `from "${sdkUrl}"`)
    .replace('from "./verification-context.mjs"', `from "${helper.href}"`)
    .replace("fileURLToPath(import.meta.url)", `fileURLToPath(${JSON.stringify(extension.href)})`)}
    export { prepareCloseoutOutputs, readConfig, resolveConfigPath, verificationContext };
  `
  globalThis.__figmaAlignVirtualFs = mock
  try {
    return await import(dataUrl(source))
  } finally {
    delete globalThis.__figmaAlignVirtualFs
  }
}

async function realConfigFixture() {
  const root = fileURLToPath(new URL("../../../../", import.meta.url))
  const workspace = virtualWorkspace(root)
  const extension = await loadVirtualExtension(workspace.mock)
  const config = extension.readConfig()
  const configuredPath = (path) =>
    /^(apps|packages)\//.test(path) ? path : `packages/pagopa-ui/${path}`
  for (const tree of VERIFICATION_TREES) workspace.createDirectory(tree)
  for (const path of VERIFICATION_FILES) workspace.write(path, `fixture:${path}`)
  for (const path of [
    config.figma.fileModule,
    config.figma.snapshot,
    config.figma.mcpInventory,
    config.figma.variables,
    ...Object.values(config.catalog),
    ...Object.values(config.tokens),
    ...Object.values(config.artwork),
    config.code.publicEntry,
  ]) {
    workspace.write(configuredPath(path), `fixture:${path}`)
  }
  for (const path of [config.code.components, config.code.stories, config.code.guides]) {
    workspace.createDirectory(configuredPath(path))
  }
  workspace.write(
    "packages/pagopa-ui/figma-to-code.yaml",
    fs.readFileSync(join(root, "packages/pagopa-ui/figma-to-code.yaml")),
  )
  workspace.write("packages/pagopa-ui/src/.env.mock", "must never be opened")
  workspace.write("packages/pagopa-ui/src/.env.local", "must never be opened")
  workspace.write("docs/figma-parity/source.json.br", Buffer.from([0x00, 0x81, 0xff]))
  const signal = new AbortController().signal
  const snapshot = () => extension.verificationContext(config, signal)
  return { root, workspace, extension, config, snapshot }
}

test("the real config does not let normal parity outputs stale a passing context", async () => {
  const { root, workspace, extension, config, snapshot } = await realConfigFixture()
  assert.equal(
    extension.resolveConfigPath(config.figma.snapshot),
    join(root, "packages/pagopa-ui/.figma/live-rest.json"),
  )
  assert.equal(
    extension.resolveConfigPath(config.catalog.inventoryStory),
    join(root, "apps/storybook/src/FigmaInventory.stories.tsx"),
  )
  assert.equal(
    extension.resolveConfigPath(config.tokens.manifest),
    join(root, "packages/tokens/src/manifest.json"),
  )

  const parityOut = extension.resolveConfigPath(config.figma.parityOut)
  extension.prepareCloseoutOutputs(parityOut)
  const before = snapshot()
  workspace.mock.mkdirSync(join(parityOut, "wave"), { recursive: true })
  workspace.mock.writeFileSync(join(parityOut, "wave/summary.json"), "{}")
  const afterCapture = snapshot()
  const reports = join(root, "packages/pagopa-ui/docs/reports")
  workspace.mock.mkdirSync(reports, { recursive: true })
  workspace.mock.writeFileSync(join(reports, "wave-figma-parity.md"), "# Report")
  const afterReport = snapshot()
  assert.deepEqual(
    { capture: afterCapture === before, report: afterReport === afterCapture },
    { capture: true, report: true },
    "normal close-out artifacts must not stale the verification",
  )
  assert.equal(
    assessVerification({
      nodeId,
      alignment: { nodeId },
      verification: passing,
      startContext: before,
      endContext: afterCapture,
      finalContext: afterReport,
    }).verified,
    true,
  )

  workspace.write("packages/pagopa-ui/src/.env.mock", "still never opened")
  workspace.write("packages/pagopa-ui/src/.env.local", "still never opened")
  assert.equal(snapshot(), afterReport)
  for (const path of [
    "packages/pagopa-ui/src/index.css",
    "packages/pagopa-ui/src/catalog/figma/parity-cases.json",
    "docs/figma-parity/source.json.br",
  ]) {
    const previous = snapshot()
    workspace.write(path, "a real source or case change")
    const verdict = assessVerification({
      nodeId,
      alignment: { nodeId },
      verification: passing,
      startContext: previous,
      endContext: previous,
      finalContext: snapshot(),
    })
    assert.equal(verdict.verified, false, path)
    assert.match(verdict.findings.join(" "), /changed after verification/i)
  }
  const beforeTemporaryFile = snapshot()
  workspace.write("packages/pagopa-ui/src/.DS_Store", "ignored Finder output")
  assert.notEqual(snapshot(), beforeTemporaryFile)
})

test("excluded source inputs cannot silently yield a trusted verification", async () => {
  for (const path of [
    "packages/pagopa-ui/src/credentials.ts",
    "packages/pagopa-ui/src/credentials.json",
    "packages/pagopa-ui/src/auth/session.ts",
    "packages/pagopa-ui/src/.env.ts",
    "packages/pagopa-ui/src/.env/hidden.ts",
  ]) {
    const { workspace, snapshot } = await realConfigFixture()
    workspace.write(path, "original")
    const result = await collectVerification({
      readContext: snapshot,
      verify: () => {
        workspace.write(path, "changed during verification")
        return passing
      },
    })
    const verdict = assessVerification({
      ...result,
      nodeId,
      alignment: { nodeId },
      finalContext: result.endContext,
    })
    assert.equal(verdict.verified, false, path)
    assert.match(verdict.findings.join(" "), /excluded.*cannot.*safely/i)
  }
})

test("green-chain output churn receives a fresh final verification", async () => {
  const { workspace, snapshot } = await realConfigFixture()
  workspace.write("apps/storybook/src/coverage/summary.json", "{}")
  const before = snapshot()
  workspace.remove("apps/storybook/src/coverage")
  workspace.write("packages/ui-cli/src/generated/example.ts", "export {}")
  const after = snapshot()
  assert.notEqual(after, before)

  const refreshed = await reverifyStaleResults({
    results: [
      {
        node: { nodeId },
        alignment: { nodeId },
        verification: passing,
        startContext: before,
        endContext: before,
      },
    ],
    finalContext: after,
    parallel: (tasks) => Promise.all(tasks.map((task) => task())),
    verify: () => collectVerification({ readContext: snapshot, verify: () => passing }),
  })
  assert.equal(refreshed.attempted, 1)
  assert.equal(
    assessVerification({ ...refreshed.results[0], nodeId, finalContext: snapshot() }).verified,
    true,
  )
})

test("the snapshot, commands and report fail closed without workflows or secret reads", async () => {
  const extension = new URL(
    "../../../../.github/extensions/figma-align/extension.mjs",
    import.meta.url,
  )
  const helper = new URL(
    "../../../../.github/extensions/figma-align/verification-context.mjs",
    import.meta.url,
  )
  const extensionPath = fileURLToPath(extension)
  const extensionDirectory = dirname(extensionPath)
  // A credential-shaped entry the walk cannot safely inspect must fail closed,
  // not disappear from the snapshot.
  let unsafeEntry = false
  const fakeFs = {
    ...fs,
    readdirSync(path, ...args) {
      const entries = fs.readdirSync(path, ...args)
      if (!unsafeEntry || path !== extensionDirectory) return entries
      return [
        ...entries,
        { name: "credentials.json", isFile: () => true, isDirectory: () => false },
      ]
    },
  }
  const dataUrl = (source) => `data:text/javascript,${encodeURIComponent(source)}`
  const fakeFsUrl = dataUrl(`
    const fake = globalThis.__figmaAlignTestFs;
    export const {
      createWriteStream, existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync
    } = fake;
  `)
  const helperUrl = dataUrl(`
    export {
      assessVerification, collectVerification, contextSignature,
      isIgnorableExcludedEntry, isSafeContextPath, isVerificationPath, reverifyStaleResults
    } from ${JSON.stringify(helper.href)};
    export const VERIFICATION_FILES = [];
    export const VERIFICATION_TREES = [".github/extensions/figma-align"];
  `)
  const sdkUrl = dataUrl(`
    export const defineWorkflow = (definition) => definition;
    export const joinSession = async () => {};
  `)
  const spawnUrl = dataUrl(`
    export const spawn = (...args) => globalThis.__figmaAlignTestSpawn(...args);
    // Config discovery and the keychain lookup run a local command; the test
    // refuses both so no git read or credential lookup can happen here.
    export const execFileSync = () => {
      throw new Error("the workflow must not run a local command in this test");
    };
  `)
  const source = `${fs
    .readFileSync(extension, "utf8")
    .replace('from "node:child_process"', `from "${spawnUrl}"`)
    .replace('from "node:fs"', `from "${fakeFsUrl}"`)
    .replace('from "@github/copilot-sdk/extension"', `from "${sdkUrl}"`)
    .replace('from "./verification-context.mjs"', `from "${helperUrl}"`)
    .replace("fileURLToPath(import.meta.url)", `fileURLToPath(${JSON.stringify(extension.href)})`)}
    export { reportMarkdown, run, verificationContext };
  `
  globalThis.__figmaAlignTestFs = fakeFs
  let loaded
  try {
    loaded = await import(dataUrl(source))
  } finally {
    delete globalThis.__figmaAlignTestFs
  }
  const signal = new AbortController().signal
  const first = loaded.verificationContext({}, signal)
  assert.equal(loaded.verificationContext({}, signal), first)
  unsafeEntry = true
  assert.throws(
    () => loaded.verificationContext({}, signal),
    /Excluded verification input cannot be safely inspected/,
  )
  const report = loaded.reportMarkdown(
    {
      runId: "run",
      branch: "branch",
      wave: "wave",
      skipped: [],
      nodes: [
        {
          nodeId,
          name: "Node",
          status: "implemented",
          decision: "review",
          summary: "Aligned",
          reason: "Changed",
          verified: false,
          findings: ["Relevant source or case context changed after verification; repeat it."],
          cases: [],
          rules: [],
          comments: [],
          designRequest: "",
          preview: "",
          openPoints: [],
          commands: [],
          files: [],
        },
      ],
      commands: [{ label: "parity:capture", code: 1 }],
      attributionWarnings: [],
      delivery: "Not committed",
    },
    { code: 1, tail: "Storybook failed" },
  )
  assert.match(report, /Independent verification: NOT passed/)
  assert.match(report, /context changed after verification/)
  assert.match(report, /\| parity:capture \| 1 \|/)
  assert.match(report, /\| green chain \| 1 \|/)
  assert.match(report, /Storybook failed/)

  const previous = process.env.NX_LOAD_DOT_ENV_FILES
  let inherited
  globalThis.__figmaAlignTestSpawn = (_command, _args, options) => {
    inherited = options.env.NX_LOAD_DOT_ENV_FILES
    const child = new EventEmitter()
    child.stdout = new EventEmitter()
    child.stderr = new EventEmitter()
    child.kill = () => {}
    setImmediate(() => child.emit("close", 0))
    return child
  }
  process.env.NX_LOAD_DOT_ENV_FILES = "true"
  try {
    await loaded.run("pnpm", ["nx", "run", "project:target"])
    assert.equal(inherited, "false")
  } finally {
    if (previous === undefined) delete process.env.NX_LOAD_DOT_ENV_FILES
    else process.env.NX_LOAD_DOT_ENV_FILES = previous
    delete globalThis.__figmaAlignTestSpawn
  }
})
