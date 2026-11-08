// The `figma-align` dynamic workflow: the figma-to-code skill
// (.agents/skills/figma-to-code) and its start procedure
// (.agents/skills/start-figma-to-code) as an orchestration. The skills stay the
// source of every rule; this file only sequences them, runs the deterministic
// commands itself and hands each node to a subagent that loads the skills.
//
// Phases: preflight (config, token, MCP gate, figma:status) → delta (snapshot,
// triage, rules/comments refresh, plan, pending queue, wave) → analyse (brief,
// source, cases, decision; parallel, read-only) → decisions (durable pause) →
// align (one writer at a time, parallel read-only verification) → close (fmt,
// check:catalogue, rules, check parity, one capture/report per node, the visual
// baseline preflight, green chain) → one final re-verification of stale passes
// → report.
//
// The token is the environment first and the macOS `figma-pat` keychain entry
// second, and only its source is ever logged. It clears the live steps and
// nothing else: a run without it reads Figma through the MCP, where the pinned
// snapshot and the committed evidence are the only local sources.
//
// The MCP gate follows it (start step 2, init.md §2): one read proves the route
// answers before the run touches the repository, and a silent tool stops the
// session there.
//
// A visual design request cannot be published by this workflow: it needs the
// review story on `design.preview.branch`, captures of the deployed preview and
// the one review pull request, and the workflow never commits or pushes. The
// writer prepares the question and leaves the preview work in `openPoints`; the
// report states the handoff.
//
// Run it from a Copilot CLI session in this repository, for example:
//   run_dynamic_workflow { name: "figma-align", args: { waveSize: 3 } }
// then edit `packages/pagopa-ui/.figma/align/<runId>/decisions.json` (git-ignored)
// and resume the run.

import { execFileSync, spawn } from "node:child_process"
import { createHash, randomUUID } from "node:crypto"
import {
  createWriteStream,
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  writeFileSync,
} from "node:fs"
import { dirname, join, relative, resolve, sep } from "node:path"
import { fileURLToPath } from "node:url"
import { defineWorkflow, joinSession } from "@github/copilot-sdk/extension"

import {
  assessVerification,
  collectVerification,
  contextSignature,
  isIgnorableExcludedEntry,
  isSafeContextPath,
  isVerificationPath,
  reverifyStaleResults,
  VERIFICATION_FILES,
  VERIFICATION_TREES,
} from "./verification-context.mjs"

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../../..")
// The skill finds the config with `git ls-files '*figma-to-code.yaml'`: one per
// repository, beside the package it describes. Every path in it is relative to
// that folder, so the folder — never a literal — is what the commands root in.
const DEFAULT_CONFIG = "packages/pagopa-ui/figma-to-code.yaml"
let CONFIG_FILE = join(ROOT, DEFAULT_CONFIG)
let PACKAGE_DIR = dirname(CONFIG_FILE)
const DECISIONS = ["implement", "review", "map", "exclude", "design-request", "skip"]

// ---------------------------------------------------------------- helpers

// Nx hides a task's output when stdout is a pipe unless told otherwise; the
// workflow parses that output, so every Nx call asks for the static inlined
// form. The live reads and the writers that refresh a local snapshot must also
// bypass the cache: their inputs do not include the token, the registry note or
// the network, and a cached answer would be a stale one.
const FRESH_TARGETS = new Set([
  "pagopa-ui-cli:figma:status",
  "pagopa-ui-cli:figma:plan",
  "pagopa-ui-cli:figma:export",
  "pagopa-ui-cli:figma:brief",
  "pagopa-ui-cli:parity:align",
  "pagopa-ui-cli:parity:queue",
  "pagopa-ui-cli:update:evidence",
  "pagopa-ui-cli:parity:capture",
  "pagopa-ui-cli:parity:report",
  "pagopa-ui-cli:figma:rules",
  "pagopa-ui-cli:figma:comments",
  "pagopa-ui-cli:figma:triage",
  "pagopa-ui-cli:test:visual",
])

function withNxFlags(args) {
  let next = [...args]
  const insert = (flag) => {
    const name = flag.split("=")[0]
    if (next.some((arg) => arg === name || arg.startsWith(`${name}=`))) return
    const separator = next.indexOf("--")
    next =
      separator >= 0
        ? [...next.slice(0, separator), flag, ...next.slice(separator)]
        : [...next, flag]
  }
  insert("--output-style=static")
  const target = next[0] === "nx" && next[1] === "run" ? next[2] : ""
  if (FRESH_TARGETS.has(target)) insert("--skip-nx-cache")
  return next
}

function run(cmd, args, { signal, allowExit = [0], timeoutMs = 10 * 60_000, logFile } = {}) {
  const commandArgs = cmd === "pnpm" && args[0] === "nx" ? withNxFlags(args) : args
  return new Promise((resolvePromise, reject) => {
    const child = spawn(cmd, commandArgs, {
      cwd: ROOT,
      env: { ...process.env, FORCE_COLOR: "0", NX_TUI: "false", NX_LOAD_DOT_ENV_FILES: "false" },
      stdio: ["ignore", "pipe", "pipe"],
      signal,
    })
    const log = logFile ? createWriteStream(logFile) : null
    let stdout = ""
    let stderr = ""
    child.stdout.on("data", (chunk) => {
      stdout += chunk
      log?.write(chunk)
    })
    child.stderr.on("data", (chunk) => {
      stderr += chunk
      log?.write(chunk)
    })
    const timer = setTimeout(() => child.kill("SIGTERM"), timeoutMs)
    child.on("error", (error) => {
      clearTimeout(timer)
      log?.end()
      reject(error)
    })
    child.on("close", (code) => {
      clearTimeout(timer)
      log?.end()
      const result = { code: code ?? -1, stdout, stderr }
      if (allowExit.includes(result.code)) resolvePromise(result)
      else {
        const error = new Error(
          `${cmd} ${commandArgs.join(" ")} exited ${result.code}\n${tail(stderr || stdout, 40)}`,
        )
        error.result = result
        reject(error)
      }
    })
  })
}

function tail(text, lines = 60) {
  return String(text ?? "")
    .trimEnd()
    .split("\n")
    .slice(-lines)
    .join("\n")
}

// Nx appends its own summary after the task output, so the JSON document is
// taken by balanced scan rather than to the end of the stream.
function parseJsonOutput(text) {
  const start = text.search(/^[[{]/m)
  if (start < 0) throw new Error(`no JSON in output:\n${tail(text, 20)}`)
  const source = text.slice(start)
  const open = source[0]
  const close = open === "{" ? "}" : "]"
  let depth = 0
  let inString = false
  let escaped = false
  for (let index = 0; index < source.length; index += 1) {
    const character = source[index]
    if (inString) {
      if (escaped) escaped = false
      else if (character === "\\") escaped = true
      else if (character === '"') inString = false
      continue
    }
    if (character === '"') inString = true
    else if (character === open) depth += 1
    else if (character === close) {
      depth -= 1
      if (depth === 0) return JSON.parse(source.slice(0, index + 1))
    }
  }
  throw new Error(`unterminated JSON in output:\n${tail(text, 20)}`)
}

// `git ls-files` is the skill's discovery: it sees the committed config, not a
// stale copy beside it, and two of them in one repository is a configuration
// error rather than a choice. A repository without git falls back to the
// documented path so the failure names the file.
function discoverConfig() {
  const override = process.env.FIGMA_ALIGN_CONFIG
  if (override) return resolve(ROOT, override)
  let found
  try {
    found = execFileSync("git", ["ls-files", "--", "*figma-to-code.yaml"], {
      cwd: ROOT,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    })
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean)
  } catch {
    return join(ROOT, DEFAULT_CONFIG)
  }
  if (found.length === 1) return join(ROOT, found[0])
  if (found.length > 1) {
    throw new Error(
      `One figma-to-code.yaml per repository: found ${found.length} — ${found.join(", ")}`,
    )
  }
  throw new Error(
    `No figma-to-code.yaml: run the init procedure (.agents/skills/figma-to-code/references/init.md) and write ${DEFAULT_CONFIG}`,
  )
}

// The start skill's token preflight: the environment first, then — only where a
// keychain exists — the `figma-pat` entry. The value is exported into this
// process so every child command inherits it, and it is never logged: the
// report names the source, never the secret.
function tokenPreflight() {
  const fromEnv = (process.env.FIGMA_TOKEN ?? "").trim()
  if (fromEnv) return { present: true, source: "FIGMA_TOKEN from the environment" }
  try {
    const stored = execFileSync("security", ["find-generic-password", "-s", "figma-pat", "-w"], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim()
    if (stored) {
      process.env.FIGMA_TOKEN = stored
      return { present: true, source: "the macOS keychain entry figma-pat" }
    }
  } catch {
    // No `security` (a Linux runner has no keychain) or no readable entry: the
    // route below is the offline one.
  }
  return {
    present: false,
    source: "none: no FIGMA_TOKEN and no readable figma-pat keychain entry",
  }
}

// The config is YAML the repository owns. This parser covers the shape the
// skill documents — nested maps and the one list of design owners — so the
// workflow reads the same keys without a YAML dependency.
function readConfig() {
  CONFIG_FILE = discoverConfig()
  PACKAGE_DIR = dirname(CONFIG_FILE)
  const lines = readFileSync(CONFIG_FILE, "utf8")
    .split("\n")
    .map((raw) => ({
      indent: raw.length - raw.trimStart().length,
      text: raw
        .trim()
        .replace(/\s+#(?=\s|$).*$/, "")
        .trim(),
    }))
    .filter((line) => line.text && !line.text.startsWith("#"))

  const unquote = (value) => value.replace(/^["']|["']$/g, "")

  const parseBlock = (start, indent) => {
    const isList = lines[start].text.startsWith("- ")
    const value = isList ? [] : {}
    let index = start
    while (index < lines.length) {
      const line = lines[index]
      if (line.indent < indent) break
      if (line.indent > indent) {
        throw new Error(`figma-to-code.yaml: unexpected indentation at '${line.text}'`)
      }
      if (isList) {
        if (!line.text.startsWith("- ")) break
        value.push(unquote(line.text.slice(2).trim()))
        index += 1
        continue
      }
      if (line.text.startsWith("- ")) break
      const pair = line.text.match(/^([A-Za-z][\w-]*):(?:\s*(.*))?$/)
      if (!pair) throw new Error(`figma-to-code.yaml: '${line.text}' is not a key`)
      const [, key, raw = ""] = pair
      if (raw) {
        value[key] = unquote(raw)
        index += 1
        continue
      }
      const next = lines[index + 1]
      if (!next || next.indent <= indent) {
        value[key] = ""
        index += 1
        continue
      }
      const [child, after] = parseBlock(index + 1, next.indent)
      value[key] = child
      index = after
    }
    return [value, index]
  }

  return parseBlock(0, lines[0]?.indent ?? 0)[0]
}

// The design-request flow is configured, never hardcoded: owner handles, the
// one long-lived review pull request and the branch its review stories live on.
function designConfig(config) {
  const design = config.design ?? {}
  const preview = design.preview ?? {}
  const owners = Array.isArray(design.owners) ? design.owners : design.owners ? [design.owners] : []
  return {
    owners,
    requests: design.requests ?? "docs/design-requests",
    preview: {
      url: typeof preview.url === "string" ? preview.url : "",
      pr: typeof preview.pr === "string" ? preview.pr : "",
      branch: typeof preview.branch === "string" ? preview.branch : "",
    },
  }
}

// The ui-cli roots itself in the design-system package, so the `.figma/`
// exports are package-relative; `design.requests` lives at the workspace root.
// Take whichever exists, the package first.
function resolveConfigPath(relative) {
  const atRoot = join(ROOT, relative)
  const inPackage = join(PACKAGE_DIR, relative)
  if (existsSync(inPackage)) return inPackage
  if (existsSync(atRoot)) return atRoot
  return inPackage
}

// The green chain is owned by CONTRIBUTING.md: read it, never copy it here.
function readGreenChain() {
  const text = readFileSync(join(ROOT, "CONTRIBUTING.md"), "utf8")
  const section = text.slice(text.indexOf("## The green chain"))
  const block = section.match(/```bash\n([\s\S]*?)```/)
  if (!block) throw new Error("CONTRIBUTING.md: no bash block under 'The green chain'")
  return block[1].replace(/\\\n/g, " ").replace(/\s+/g, " ").trim()
}

// The MCP gate needs a node of the file to read, and the committed inventory is
// the one list that exists before any command has run.
function readInventory(config) {
  try {
    return (
      JSON.parse(readFileSync(resolveConfigPath(config.catalog.inventory), "utf8")).components ?? []
    )
  } catch {
    return []
  }
}

function firstInventoryNode(config) {
  const [node] = readInventory(config)
  if (!node?.nodeId) return null
  return { nodeId: node.nodeId, name: node.name ?? "", pageName: node.pageName ?? "" }
}

// The page a node sits on is not in the registry: the export records it in the
// inventory, and the census is keyed by page.
function inventoryPages(config) {
  const pages = new Map()
  for (const node of readInventory(config)) {
    if (node?.nodeId) {
      pages.set(node.nodeId, { pageId: node.pageId ?? "", pageName: node.pageName ?? "" })
    }
  }
  return pages
}

// A path the prompt and the log can quote: repository-relative with forward
// slashes, so a Windows checkout names the same file a skill does.
function repoPath(absolute) {
  return relative(ROOT, resolve(absolute)).split(sep).join("/")
}

function contextPath(absolute) {
  const path = repoPath(absolute)
  if (!isSafeContextPath(path)) {
    throw new Error("A configured context path is unsafe or outside the repository")
  }
  return path
}

function configuredContextFile(absolute) {
  const path = contextPath(absolute)
  if (!isVerificationPath(path) && !/^packages\/pagopa-ui\/\.figma\/[^/]+\.json$/.test(path)) {
    throw new Error(`Configured verification file is outside the declared source scope: ${path}`)
  }
  return path
}

function configuredContextTree(absolute, requests = false) {
  const path = contextPath(absolute)
  const withinTree = VERIFICATION_TREES.some((root) => path === root || path.startsWith(`${root}/`))
  if (!withinTree && !(requests && path.startsWith("docs/"))) {
    throw new Error(
      `Configured verification directory is outside the declared source scope: ${path}`,
    )
  }
  return path
}

// The verifier reads shared source and case inputs — including untracked files —
// but never walks the workspace or reads a credential: the path filter belongs
// to `isSafeContextPath`, and a file's content is what a passing result depends on.
function contextFile(path) {
  try {
    return `file:${createHash("sha256")
      .update(readFileSync(join(ROOT, path)))
      .digest("hex")}`
  } catch (error) {
    if (error.code === "ENOENT") return "missing"
    throw error
  }
}

function verificationContext(config, signal) {
  const entries = new Map()
  const files = new Set(VERIFICATION_FILES)
  const trees = new Set(VERIFICATION_TREES)
  const configuredFiles = [
    config.figma?.fileModule,
    config.figma?.snapshot,
    config.figma?.mcpInventory,
    config.figma?.variables,
    ...Object.values(config.catalog ?? {}),
    ...Object.values(config.tokens ?? {}),
    ...Object.values(config.artwork ?? {}),
    config.code?.publicEntry,
  ]
  for (const path of configuredFiles) {
    if (typeof path === "string" && path) files.add(configuredContextFile(resolveConfigPath(path)))
  }
  for (const path of [config.code?.components, config.code?.stories, config.code?.guides]) {
    if (typeof path === "string" && path) trees.add(configuredContextTree(resolveConfigPath(path)))
  }
  if (config.design?.requests) {
    trees.add(configuredContextTree(resolve(ROOT, config.design.requests), true))
  }

  const recordFile = (path) => {
    entries.set(path, contextFile(path))
  }
  const walk = (path) => {
    if (signal?.aborted) throw signal.reason ?? new Error("Aborted")
    if (!isSafeContextPath(path)) throw new Error("Unsafe verification context path")
    let directory
    try {
      directory = readdirSync(join(ROOT, path), { withFileTypes: true })
    } catch (error) {
      if (error.code === "ENOENT") return
      throw error
    }
    for (const entry of directory) {
      const child = `${path}/${entry.name}`
      if (!isSafeContextPath(child)) {
        if (isIgnorableExcludedEntry(child, entry)) continue
        throw new Error(`Excluded verification input cannot be safely inspected: ${child}`)
      }
      if (entry.isDirectory()) walk(child)
      else if (entry.isFile()) recordFile(child)
      else throw new Error(`Unsafe context entry: ${child}`)
    }
  }
  const orderedTrees = [...trees].sort((left, right) => left.length - right.length)
  const roots = []
  for (const tree of orderedTrees) {
    if (!roots.some((root) => tree === root || tree.startsWith(`${root}/`))) roots.push(tree)
  }
  for (const tree of roots) walk(tree)
  for (const path of files) {
    if (signal?.aborted) throw signal.reason ?? new Error("Aborted")
    if (!isSafeContextPath(path)) throw new Error("Unsafe verification context file")
    if (!entries.has(path)) recordFile(path)
  }
  return contextSignature(entries)
}

function prepareCloseoutOutputs(parityOut) {
  mkdirSync(parityOut, { recursive: true })
  mkdirSync(join(PACKAGE_DIR, "docs/reports"), { recursive: true })
}

// Attribute only relevant modified/untracked files; never read environment or
// credential files, even when Git lists them as modified.
async function worktreeHashes(signal, onError) {
  const { stdout } = await run(
    "git",
    [
      "ls-files",
      "-m",
      "-o",
      "--exclude-standard",
      "-z",
      "--",
      ...VERIFICATION_TREES,
      ...VERIFICATION_FILES,
    ],
    { signal },
  )
  const hashes = {}
  for (const file of stdout.split("\0").filter(Boolean)) {
    if (!isVerificationPath(file)) continue
    try {
      hashes[file] = contextFile(file)
    } catch (error) {
      if (signal.aborted) throw error
      onError(`Could not hash ${file} for attribution: ${String(error?.message ?? error)}`)
      hashes[file] = "unreadable"
    }
  }
  return hashes
}

function changedBetween(before, after) {
  const files = new Set([...Object.keys(before), ...Object.keys(after)])
  return [...files].filter((file) => before[file] !== after[file]).sort()
}

async function storybookAnswers(url) {
  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(3000) })
    return response.ok
  } catch {
    return false
  }
}

// ---------------------------------------------------------------- schemas

const strings = { type: "array", items: { type: "string" } }

// The `.Regole` boxes are outside the design fingerprint: a rule can change
// without producing drift, so the workflow carries the ledger explicitly.
const ruleSchema = {
  type: "object",
  additionalProperties: false,
  required: ["card", "disposition", "title", "action"],
  properties: {
    card: { type: "string" },
    disposition: {
      type: "string",
      enum: [
        "imported",
        "recorded",
        "duplicate",
        "out-of-scope",
        "deferred",
        "conflict",
        "pending",
        "stale",
      ],
    },
    title: { type: "string" },
    action: { type: "string" },
  },
}

const analysisSchema = {
  type: "object",
  additionalProperties: false,
  required: [
    "nodeId",
    "name",
    "decision",
    "reason",
    "devices",
    "dependencies",
    "existingCases",
    "rules",
    "comments",
    "deltas",
    "plan",
    "openQuestions",
  ],
  properties: {
    nodeId: { type: "string" },
    name: { type: "string" },
    decision: { type: "string", enum: DECISIONS.filter((d) => d !== "skip") },
    reason: { type: "string" },
    devices: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["device", "variantId", "width", "height", "composition"],
        properties: {
          device: { type: "string" },
          variantId: { type: "string" },
          width: { type: "number" },
          height: { type: "number" },
          composition: { type: "string" },
        },
      },
    },
    dependencies: strings,
    existingCases: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["caseId", "exit", "summary"],
        properties: {
          caseId: { type: "string" },
          exit: { type: "integer" },
          summary: { type: "string" },
        },
      },
    },
    rules: { type: "array", items: ruleSchema },
    comments: strings,
    deltas: strings,
    plan: { type: "string" },
    openQuestions: strings,
  },
}

const caseSchema = {
  type: "object",
  additionalProperties: false,
  required: ["caseId", "device", "verdict", "residues"],
  properties: {
    caseId: { type: "string" },
    device: { type: "string" },
    verdict: { type: "string", enum: ["verified", "fixed", "review-required", "missing"] },
    residues: strings,
  },
}

const alignmentSchema = {
  type: "object",
  additionalProperties: false,
  required: [
    "nodeId",
    "status",
    "decision",
    "summary",
    "cases",
    "rules",
    "comments",
    "designRequest",
    "openPoints",
    "commands",
  ],
  properties: {
    nodeId: { type: "string" },
    status: { type: "string", enum: ["implemented", "pending", "excluded"] },
    decision: { type: "string" },
    summary: { type: "string" },
    cases: { type: "array", items: caseSchema },
    rules: { type: "array", items: ruleSchema },
    comments: strings,
    designRequest: { type: "string" },
    preview: { type: "string" },
    openPoints: strings,
    commands: strings,
  },
}

const verificationSchema = {
  type: "object",
  additionalProperties: false,
  required: ["nodeId", "pass", "cases", "findings"],
  properties: {
    nodeId: { type: "string" },
    pass: { type: "boolean" },
    cases: { type: "array", items: caseSchema },
    findings: strings,
  },
}

const refreshSchema = {
  type: "object",
  additionalProperties: false,
  required: ["ok", "message"],
  properties: { ok: { type: "boolean" }, message: { type: "string" } },
}

// One read call answers the MCP gate; `call` names the tool that answered or
// stayed silent, so the report can quote it.
const gateSchema = {
  type: "object",
  additionalProperties: false,
  required: ["ok", "call", "message"],
  properties: { ok: { type: "boolean" }, call: { type: "string" }, message: { type: "string" } },
}

// ---------------------------------------------------------------- prompts

function preamble(config) {
  const design = designConfig(config)
  const configRel = repoPath(CONFIG_FILE)
  const packageRel = repoPath(PACKAGE_DIR)
  const localDir = repoPath(dirname(resolveConfigPath(config.figma.snapshot)))
  const stylesheetRel = repoPath(resolveConfigPath(config.tokens.stylesheet))
  return `You work in the pagopa-ui monorepo at ${ROOT}; run every command from there.
First load the \`figma-to-code\` skill and the \`pagopa-ui-standards\` skill and follow them: they own every rule, this prompt only scopes your part. The skill config is ${configRel} (paths in it are relative to ${packageRel}, except \`design.requests\` which is ${design.requests} at the workspace root; the local \`.figma/\` exports live in ${localDir}).
Design owner(s): ${design.owners.join(", ") || "(not configured)"} · review pull request #${design.preview.pr || "(not configured)"} on ${design.preview.branch || "(not configured)"} · preview ${design.preview.url || "(not configured)"}.

Hard rules for this run:
- Never read, source or load \`.env\`; never print FIGMA_TOKEN. Prefix every Nx command with \`NX_LOAD_DOT_ENV_FILES=false\` so Nx does not load environment files.
- Figma is read-only: use only get_design_context, get_screenshot, get_metadata, get_variable_defs and list_file_components_for_code_connect. Never use_figma or any tool that writes to Figma or publishes Code Connect.
- Never commit, push, switch branches or open pull requests: the person delivers. Creating a design-question issue is allowed only as the design-request flow below says.
- The working tree is shared with the person and other writers. Never revert, delete, stash, \`git checkout\` or \`git restore\` a change you did not make in this task, even if it looks unrelated or breaks a check: report it in openPoints instead.
- Storybook already runs at ${config.storybook.url}. Prefix every command that renders it (\`parity:check\`, \`parity:capture\`) with \`STORYBOOK_URL=${config.storybook.url}\`. Never start, restart or kill it. A file created now enters the Tailwind scan only after \`touch ${stylesheetRel}\`.
- Run project targets as \`pnpm nx run <project>:<target> [flags]\` (the ui-cli changes directory to ${packageRel}, so pass absolute paths or package-relative ones). The two subcommands without a target run from the repository root as \`node packages/ui-cli/src/cli.ts parity source <nodeId> [flags]\` and \`node packages/ui-cli/src/cli.ts parity render [flags]\`.
- Code, comments and docs in English; Italian only for rendered component and story copy.
- Parity is the render: never claim a match from reading code. Pass \`--skip-nx-cache\` to every parity check or capture: a cached render is not evidence.
- The \`.Regole\` cards and the node comments are source too. Read the node's \`figma:brief\` before touching it, and leave no rule that targets it \`pending\` or \`stale\`.
- The page tree is source as well: \`${config.catalog.pageSurface}\` censuses what the file draws. A page no entry covers is read once with get_metadata on the page node and written there; a page the census already covers is not re-read on its behalf, and publishing a node on a page whose tree was not re-read leaves the census short.`
}

// The gate is one read call: the workflow cannot call an MCP tool itself, so an
// agent proves the route works before the run touches the repository.
function mcpGatePrompt(config, node) {
  const target = node
    ? `Read node ${node.nodeId}${node.name ? ` (${node.name})` : ""}${
        node.pageName ? ` on page ${node.pageName}` : ""
      }`
    : "Read any node of the file the config names"
  return `${preamble(config)}

TASK: answer the MCP gate (start-figma-to-code step 2, init.md §2). One read call, and nothing else: do not create, edit or delete any file.
${target} with get_metadata — get_screenshot only when get_metadata is unavailable. Any readable answer proves the Figma MCP route works for this session.
A tool that is missing, not connected or returns nothing is a failure, not a puzzle: return ok=false with the error verbatim in message. Never guess a node, never substitute a local file read, and never report success from what the repository already contains.
The workflow stops when the gate fails, before anything is written; that state must stay untouched.
Return ok=true with call = the tool that answered, message = one line naming what it returned (the node and its page, never a token).`
}

// The MCP component list is the only read that sees roots the REST export
// cannot; the agent performs it and the workflow turns it into the snapshot.
function mcpInventoryPrompt(config, mcpInventory) {
  const fileModule = repoPath(resolveConfigPath(config.figma.fileModule))
  return `${preamble(config)}

TASK: discover the file's roots for the snapshot (figma-to-code delta.md step 1). One read call, then one write.
1. Call list_file_components_for_code_connect with FIGMA_FILE_KEY from ${fileModule}.
2. Write the response verbatim, unmodified, to ${mcpInventory} (create the folder if it is missing). The workflow then runs \`figma:export --input\` on it, which keeps the MCP-only roots.
When the connected server does not expose that tool, write nothing and return ok=false with the reason in message: the workflow reads the file over REST instead. Return ok=true with the component count in message.`
}

// `figma:brief --json` is the offline read that closes the fingerprint gap.
function briefSummary(brief) {
  if (!brief) return "not read"
  const rules = brief.rules ?? []
  const pending = rules.filter((rule) =>
    ["pending", "stale", "conflict"].includes(rule.disposition),
  )
  const comments = brief.openComments ?? []
  const ruleText = rules.length
    ? `${rules.length} (${pending.length} pending/stale/conflict): ${rules
        .map(
          (rule) =>
            `${rule.card} ${rule.disposition} "${rule.title ?? rule.titleSource ?? "(untitled)"}"`,
        )
        .join("; ")}`
    : "none"
  const commentText = comments.length
    ? comments
        .map(
          (thread) =>
            `${thread.author || "unknown"}: ${String(thread.message ?? "")
              .replace(/\s+/g, " ")
              .slice(0, 180)}`,
        )
        .join(" | ")
    : "none"
  return `rules: ${ruleText}
- open comments: ${commentText}
- design requests: ${(brief.designRequests ?? []).join(", ") || "none"}`
}

function nodeContext(node) {
  return `Node ${node.nodeId} — ${node.name}
- registry status: ${node.status}
- registry note: ${node.note || "(none)"}
- Figma page: ${node.pageName || "(not in the inventory)"}
- target: ${JSON.stringify(node.target)}
- story ids: ${JSON.stringify(node.storyIds)}
- delta classes in the current plan: ${node.classes.length ? node.classes.join(", ") : "none (queued pending)"}
- brief (${node.brief ? "figma:brief" : "not read"}): ${briefSummary(node.brief)}`
}

function analysePrompt(config, node) {
  return `${preamble(config)}

TASK: analyse ONE node and propose its decision (figma-to-code delta.md step 3, rules.md). This is a READ-ONLY step: do not edit, create or delete any repository file; never pass --save-case. Parity captures under .figma/ are allowed.

${nodeContext(node)}

Do:
1. Read the brief yourself: \`pnpm nx run pagopa-ui-cli:figma:brief --node ${node.nodeId}\` prints the registry entry and note, every rule that targets the node, the open comments and the design requests that cite it. The note is binding. Read the target component, its story and its guide under apps/storybook/src/guides too. A \`pending\`, \`stale\` or \`conflict\` card is work, not a pass; an open comment the source answers is a decision, one it cannot answer is a design request.
2. Read the source of EVERY declared device: start with \`pnpm ui-cli parity align --node ${node.nodeId}\` (the work order), then \`node packages/ui-cli/src/cli.ts parity source ${node.nodeId} --depth 1\` (variants, device, box) and \`--compact --depth 3\` per device variant; \`--png\` or get_screenshot read-only when the anatomy is unclear. List each rendered dependency (instance-swap defaults included).
3. List the committed cases with \`pnpm ui-cli parity capture --saved --node ${node.nodeId} --dry-run\` — it prints \`<caseId> <nodeId> <storyId>\` per saved case, and \`no saved cases\` is the answer when there are none — then reproduce each with \`pnpm ui-cli parity check --case <caseId>\`; for a device axis also \`--node ${node.nodeId} --devices\`. Record each exit code and the deltas. A draft case or a warning is not coverage. (\`parity:queue --node ${node.nodeId} --json\` lists registry targets per node, not case ids: never read it as the case list.)
4. Pick exactly one decision:
   - implement: no real implementation covers the node yet (new-from-figma.md);
   - review: it is implemented and the change reaches it, or its cases fail (node-review.md);
   - map: an existing implementation covers its whole contract, every device included (node-review.md);
   - exclude: out of scope, with the reason; dispose its rule cards (out-of-scope or duplicate) too;
   - design-request: the source leaves a question only the design owner can answer, or a rule conflicts with the drawing or an accessibility contract (design-request.md); an open request already named above keeps the node there unless its answer is recorded. For a visual question, add the preview work the flow needs (slug, options, captures, review PR index) to the plan.
   "It matches the desktop frame" is not a decision for a node with a device axis.
5. The census is read-only here: read \`${config.catalog.pageSurface}\` and report in openQuestions whether it covers "${node.pageName || "(the node's page)"}" — the page, its drawn identities and their statuses. Do not re-read the page tree and do not write the census; the writer owns that.

Return the JSON: devices = one entry per declared device (device "any" when there is no axis) with the variant node id, its box and what its composition shows; rules = every card that targets the node with its current disposition and the action the writer must take; comments = the open threads and how the source answers them or why they become a design request; deltas = what the render must change (empty when the cases pass); plan = the concrete steps the writer will take; openQuestions = what only the design owner can answer, and whether the census covers the node's page.`
}

const DECISION_GUIDANCE = {
  implement:
    "Follow references/new-from-figma.md end to end: implement, story at the exact source width with parameters.design = figmaEmbedUrl, guide whose first block is the consumer rules, the visual-parity loop per variant and per declared device, one saved case each, then the registry entry. Mark every rule that targets the node with figma:rules mark and leave none pending or stale.",
  review:
    "Follow references/node-review.md: re-read the brief, re-run every committed case, capture the missing ones per device, fix the component and its story where they must change (token ladder), re-run, dispose the rule cards, then record the decision in the registry.",
  map: "Follow references/node-review.md for a mapping: prove the existing implementation covers the node's whole contract on every declared device with saved cases, dispose the rule cards, then point the registry target at it.",
  exclude:
    "Set the registry entry to excluded with a self-contained reason in its note. Dispose every rule card that targets it (out-of-scope or duplicate, with the reason). Change nothing else.",
  "design-request":
    "Follow references/design-request.md and references/rules.md. Decide whether the question is visual or dev-only, then act within this run's limits. An open record already listed for the node is never duplicated: keep it, keep the node pending, and report in openPoints what is still missing (an answer, a preview capture, a link). A dev-only question gets its issue (gh issue create with .github/ISSUE_TEMPLATE/dev-decision.md, labels type/dev-decision and status/needs-answer, every handle in design.owners assigned), its record under design.requests carrying the issue URL, the conflicting card pointed at it with figma:rules mark --request, and the node stays pending with the record named in its note. A visual question needs a review story on design.preview.branch, captures of the deployed preview and the one review pull request index: you cannot commit, push or switch branches, so never fabricate them. Prepare the question, every option, the recommendation and the exact preview work (slug, story id, captures, branch, review PR index) in openPoints, keep the node pending with a note naming design.preview.branch and the review pull request, and change nothing else. Never open a visual issue without its captures and option links.",
}

function alignPrompt(config, node, decision) {
  return `${preamble(config)}

TASK: align ONE node with its approved decision. You are the only writer in the repository right now; touch only what this node needs.

${nodeContext(node)}

Approved decision: ${decision.decision}
Reason: ${decision.reason}
Devices: ${JSON.stringify(decision.devices)}
Dependencies: ${JSON.stringify(decision.dependencies)}
Rules from the analysis: ${JSON.stringify(decision.rules ?? [])}
Comments from the analysis: ${JSON.stringify(decision.comments ?? [])}
Known deltas: ${JSON.stringify(decision.deltas)}
Plan from the analysis: ${decision.plan}
Open questions: ${JSON.stringify(decision.openQuestions)}
${decision.instructions ? `Instructions from the person (binding): ${decision.instructions}\n` : ""}
How: ${DECISION_GUIDANCE[decision.decision]}

Start by re-reading \`pnpm nx run pagopa-ui-cli:figma:brief --node ${node.nodeId}\`: the rules and the open comments are source, and a node is not finished while a rule that targets it is \`pending\` or \`stale\`. Mark each card from the snapshot with \`figma:rules mark\`; an \`imported\` card becomes a bullet in the guide's first block (\`<!-- component-rules:start -->\` … \`<!-- component-rules:end -->\`, under \`## Component Rules\`, no source reference). Never reply to or resolve a Figma comment.

Limits: three fix passes per case, then a residue with its reason or a written blocker. The case corpus is written only by \`parity:check --save-case\` (with --note "reviewed: …"); never hand-edit it and never leave a draft as coverage. Set status implemented only after you inspected the source and the render of every declared device; otherwise leave it pending with the blocker in the note. A design request keeps the node pending, names its record in the note, and never invents an issue URL, a capture or a preview link. Do not edit registry entries of other nodes. Finish with \`pnpm nx run pagopa-ui:check:catalogue\` and fix what this node broke; a stale Storybook title is fixed with \`pnpm nx run pagopa-ui:update:stories\` (the generator owns that map), never by hand-editing it. Do not run the full green chain: the workflow runs it once for the whole wave.

Census: \`${config.catalog.pageSurface}\` is the record of what the node's Figma page draws. When this node's work touches a page no entry covers, or the source gained a published identity on it, read the page tree once with get_metadata on the page node and write the census; when the entry exists and nothing was published, leave it alone (a re-read that adds nothing is not work). \`check:catalogue\` enforces it, so a short census is a broken node.

Return the JSON: status = the registry status you left; cases = one per saved or re-run case with its device, verdict and residues ("path=reason"); rules = every card that targets the node with the disposition you recorded and its guide or reason; comments = each open thread and how you answered or promoted it; designRequest = the record path or ""; preview = the preview links, or the handoff that still needs design.preview.branch, or ""; openPoints = what stays open and why; commands = each command you ran with its exit code.`
}

function verifyPrompt(config, node, alignment) {
  return `${preamble(config)}

TASK: independently verify ONE node's alignment. READ-ONLY: do not edit any repository file and never pass --save-case. Another node's writer may change shared files while you verify; judge only this node, and the workflow re-checks the context hash before trusting the result.

${nodeContext(node)}

The writer reported: ${JSON.stringify(alignment)}

Check (references/definition-of-done.md, visual-parity.md and rules.md):
1. \`pnpm nx run pagopa-ui-cli:figma:brief --node ${node.nodeId}\` closes the rules and comments: no rule that targets the node is \`pending\` or \`stale\`; every imported rule is in the guide's first block under \`## Component Rules\`; each open comment is answered by the source or points at a design request. A design request has its record, issue URL, owner handles, preview links or a stated handoff for the preview work, and the conflicting card points at the record.
2. \`pnpm ui-cli parity check --case <caseId>\` reproduces every case the node has — list them with \`pnpm ui-cli parity capture --saved --node ${node.nodeId} --dry-run\`, which prints \`<caseId> <nodeId> <storyId>\`; for a device axis \`--node ${node.nodeId} --devices\` shows a reviewed passing case per declared device or a reasoned device exception.
3. Every residue has a reason; no inline [Npx] values or off-token colours in the touched component (token ladder); the story is framed at the source width with parameters.design = figmaEmbedUrl; the guide records the source mapping; props follow prop-conventions.md or the departure is in the note.
4. The registry entry is consistent with the outcome: implemented has target.module/export/story/storyExports; pending names its blocker or design request; excluded has a reason.
Skip the checks that do not apply to the decision (an exclusion has no render to verify; a design request stops at its record and handoff).

Return pass=true only when nothing is left to fix; findings = each concrete defect with its file and measurement.`
}

function fixPrompt(config, node, alignment, verification) {
  return `${preamble(config)}

TASK: fix the findings of an independent verification for ONE node. You are the only writer now; touch only this node's files.

${nodeContext(node)}

Writer report: ${JSON.stringify(alignment)}
Verification findings: ${JSON.stringify(verification.findings)}
Case verdicts: ${JSON.stringify(verification.cases)}

Fix each finding with the token ladder, re-run and re-save the affected cases (--save-case --note "reviewed: …"), re-read the brief and close any rule or comment finding through \`figma:rules mark\`, keep the registry consistent, then \`pnpm nx run pagopa-ui:check:catalogue\`. A finding you cannot close becomes a residue with its reason or a blocker in the registry note, never a silent pass.

Return the same JSON shape as the writer, updated.`
}

function greenFixPrompt(config, wave, logTail) {
  return `${preamble(config)}

TASK: the green chain failed after the alignment of ${wave.map((n) => `${n.nodeId} (${n.name})`).join(", ")}. Fix the failures this wave caused; you are the only writer.

Failing output (tail):
\`\`\`
${logTail}
\`\`\`

Rules: fix the cause; never weaken a check, add a lint disable without the reason the standards require, or hand-edit a generated file (run its generator). When a failure predates the wave or needs a browser that cannot start, change nothing for it and say so. Re-run only the targets that failed to confirm the fix.

Reply with what you fixed, what remains and why.`
}

// ---------------------------------------------------------------- markdown

function decisionsMarkdown(runId, proposals) {
  const cell = (text) => String(text).replace(/\|/g, "\\|").replace(/\n/g, " ")
  const rows = proposals.map(
    (p) =>
      `| \`${p.nodeId}\` | ${p.name} | **${p.decision}** | ${cell(p.reason)} | ${
        p.devices.map((d) => `${d.device} ${d.width}×${d.height}`).join(", ") || "—"
      } | ${p.rules.length} | ${p.comments.length} | ${p.openQuestions.length} |`,
  )
  const details = proposals
    .map(
      (p) => `## ${p.name} (\`${p.nodeId}\`) — ${p.decision}

${p.reason}

- Dependencies: ${p.dependencies.join(", ") || "none"}
- Existing cases: ${p.existingCases.map((c) => `${c.caseId} (exit ${c.exit}): ${c.summary}`).join("; ") || "none"}
- Rules: ${p.rules.map((r) => `${r.card} ${r.disposition} "${r.title}" → ${r.action}`).join("; ") || "none"}
- Open comments: ${p.comments.join("; ") || "none"}
- Deltas: ${p.deltas.join("; ") || "none"}
- Plan: ${p.plan || "—"}
- Open questions: ${p.openQuestions.join("; ") || "none"}`,
    )
    .join("\n\n")
  return `# figma-align decisions — run ${runId}

Edit \`decisions.json\` beside this file: set \`decision\` to one of
${DECISIONS.map((d) => `\`${d}\``).join(", ")} and add \`instructions\` to steer
the writer. Then resume the run (\`run_dynamic_workflow { resumeFromRunId: "${runId}" }\`).

| Node | Name | Decision | Reason | Devices | Rules | Comments | Open questions |
| --- | --- | --- | --- | --- | --- | --- | --- |
${rows.join("\n")}

${details}
`
}

function reportMarkdown(report, green) {
  const nodes = report.nodes
    .map((n) => {
      if (n.status === "failed") {
        return `## ${n.name} (\`${n.nodeId}\`) — the pipeline dropped it

- Independent verification: NOT passed
  - The pipeline failed before a verification result was available.`
      }
      const cases = n.cases
        .map(
          (c) =>
            `| ${c.caseId} | ${c.device} | ${c.verdict} | ${
              c.residues.map((residue) => String(residue).replace(/\|/g, "\\|")).join("<br>") || "—"
            } |`,
        )
        .join("\n")
      return `## ${n.name} (\`${n.nodeId}\`) — ${n.decision} → ${n.status}

${n.summary}

- Reason: ${n.reason}
- Independent verification: ${n.verified ? "pass" : "NOT passed"}${
        n.findings.length ? `\n  - ${n.findings.join("\n  - ")}` : ""
      }${
        n.verified
          ? ""
          : "\n- Case verdicts below are reported history, not a current verified result."
      }
- Rules: ${
        n.rules
          .map((r) => `${r.card} ${r.disposition}${r.guide ? ` (${r.guide})` : ""}`)
          .join("; ") || "none"
      }
- Comments: ${n.comments.join("; ") || "none"}
- Design request: ${n.designRequest || "none"}
- Preview: ${n.preview || "none"}
- Open: ${n.openPoints.join("; ") || "nothing"}
- Commands: ${n.commands.join("; ") || "none"}
- Files (Git-visible verification inputs only): ${n.files.join(", ") || "none"}

| Case | Device | Verdict | Residues |
| --- | --- | --- | --- |
${cases || "| — | — | — | — |"}`
    })
    .join("\n\n")
  const commandRows = report.commands.map((c) => `| ${c.label} | ${c.code} |`).join("\n")
  const greenTail =
    green && green.code !== 0
      ? `\nGreen chain tail (stories that could not start are NOT passed):\n\n\`\`\`\n${green.tail}\n\`\`\`\n`
      : ""
  const attributionWarnings = report.attributionWarnings.length
    ? `\n## File attribution warnings\n\n${report.attributionWarnings.map((warning) => `- ${warning}`).join("\n")}\n`
    : ""
  return `# figma-align report — run ${report.runId}

Branch \`${report.branch}\` · wave \`${report.wave}\` · skipped ${report.skipped.join(", ") || "none"}

${nodes}

## Checks

| Command | Exit |
| --- | --- |
${commandRows}
| green chain | ${green ? green.code : "not run"} |
${greenTail}
${attributionWarnings}
## Delivery

${report.delivery}
`
}

// ---------------------------------------------------------------- workflow

const figmaAlign = defineWorkflow({
  meta: {
    name: "figma-align",
    description:
      "Align pending Figma nodes with the React design system following the figma-to-code and start-figma-to-code skills: the config found from git, the token preflight (environment, then the figma-pat keychain entry) and its route, the MCP gate before anything is written, the figma:status session report, the delta plan and triage with fresh rules/comments snapshots, a brief per node, parallel analysis, a durable decision checkpoint, one writer at a time with read-only verification that can overlap a writer, then check:catalogue, the rules check, one parity capture and report per node, the visual baseline preflight and the green chain. Never commits. " +
      "args: { nodes?: string[] (node ids; default: the next pending nodes in implementationOrder), waveSize?: integer (default 3), refresh?: boolean (live snapshot + triage first; needs a token), triage?: boolean (triage the pinned snapshot), approval?: 'pause' | 'auto' (default 'pause': stop after the decisions so the person can edit packages/pagopa-ui/.figma/align/<runId>/decisions.json, then resume), analyseOnly?: boolean (stop after the decisions), greenChain?: boolean (default true), startStorybook?: boolean (default true) }",
    phases: [
      {
        title: "Preflight",
        detail: "Config, token and route, MCP gate, figma:status, working tree",
      },
      { title: "Delta", detail: "Snapshot, plan, triage, rules/comments, pending queue, wave" },
      {
        title: "Analyse",
        detail: "Per node: brief, source, devices, cases, decision (read-only, parallel)",
      },
      { title: "Decide", detail: "Decisions written; durable pause for the person" },
      {
        title: "Align",
        detail: "One writer per node; rules, cases, verification and one fix round",
      },
      {
        title: "Close",
        detail:
          "fmt, check:catalogue, rules check, check parity, one capture/report per node, visual baseline preflight, green chain",
      },
      { title: "Report" },
    ],
    argsSchema: {
      type: "object",
      properties: {
        nodes: { type: "array", items: { type: "string" } },
        waveSize: { type: "integer" },
        refresh: { type: "boolean" },
        triage: { type: "boolean" },
        approval: { type: "string", enum: ["pause", "auto"] },
        analyseOnly: { type: "boolean" },
        greenChain: { type: "boolean" },
        startStorybook: { type: "boolean" },
      },
    },
  },

  run: async (ctx) => {
    const args = ctx.args ?? {}
    const opts = {
      nodes: Array.isArray(args.nodes) ? args.nodes.map(String) : [],
      waveSize: Number.isInteger(args.waveSize) && args.waveSize > 0 ? args.waveSize : 3,
      refresh: args.refresh === true,
      triage: args.triage === true || args.refresh === true,
      approval: args.approval === "auto" ? "auto" : "pause",
      analyseOnly: args.analyseOnly === true,
      greenChain: args.greenChain !== false,
      startStorybook: args.startStorybook !== false,
    }
    const { signal } = ctx
    // The decisions checkpoint lives beside the config it was written for: the
    // discovery may name another package, so the path is settled once inside
    // the preflight, which is also what creates the folder.
    let outDir = join(PACKAGE_DIR, ".figma/align", ctx.runId)
    let storybook = null

    const ensureStorybook = async (config) => {
      const url = config.storybook.url
      if (await storybookAnswers(url)) return url
      if (!opts.startStorybook) return null
      if (!storybook) {
        ctx.log(`Storybook does not answer: starting it on ${url} (log in ${outDir})`)
        const log = createWriteStream(join(outDir, "storybook.log"))
        storybook = spawn("pnpm", ["nx", "run", "pagopa-ui-storybook:storybook"], {
          cwd: ROOT,
          env: { ...process.env, NX_TUI: "false", CI: "true", NX_LOAD_DOT_ENV_FILES: "false" },
          stdio: ["ignore", "pipe", "pipe"],
          detached: true,
        })
        storybook.stdout.pipe(log)
        storybook.stderr.pipe(log)
      }
      for (let i = 0; i < 90; i++) {
        if (signal.aborted) return null
        if (storybook.exitCode !== null) return null
        if (await storybookAnswers(url)) return url
        await new Promise((r) => setTimeout(r, 2000))
      }
      return null
    }

    // Every deterministic check lands in the report with its exit code.
    const commands = []
    const check = async (label, cmdArgs, extra = {}) => {
      try {
        const result = await run("pnpm", cmdArgs, { signal, allowExit: [0, 1, 2], ...extra })
        commands.push({ label, code: result.code })
        ctx.log(`${label}: exit ${result.code}`)
        return result
      } catch (error) {
        commands.push({ label, code: -1 })
        ctx.log(`${label}: failed to run — ${tail(error.message, 3)}`)
        return null
      }
    }

    try {
      // ------------------------------------------------------------ preflight
      ctx.phase("Preflight")
      const config = readConfig()
      outDir = join(PACKAGE_DIR, ".figma/align", ctx.runId)
      mkdirSync(outDir, { recursive: true })
      for (const key of ["figma", "catalog", "storybook", "design"]) {
        if (!config[key]) throw new Error(`figma-to-code.yaml: missing section '${key}'`)
      }
      const design = designConfig(config)
      const snapshot = resolveConfigPath(config.figma.snapshot)
      const parityOut = resolveConfigPath(config.figma.parityOut)
      const mcpInventory = resolveConfigPath(config.figma.mcpInventory)
      const registryPath = join(PACKAGE_DIR, config.catalog.registry)

      // Two states decide the whole run, so they come before any command that
      // writes: where the config is, and whether Figma answers at all.
      ctx.log(`Config: ${repoPath(CONFIG_FILE)}`)
      const token = tokenPreflight()
      ctx.log(`Token: ${token.source}`)
      ctx.log(
        token.present
          ? "Route: REST — figma:plan and figma:export read the live file; the pinned snapshot stays the offline source."
          : "Route: MCP — the Figma tools read the file and only the pinned snapshot and the committed evidence are available: every live step stays off.",
      )
      if (!token.present && opts.refresh) {
        throw new Error(
          `Snapshot refresh needs a token: ${token.source}. Export FIGMA_TOKEN (file_content:read, library_content:read) in the shell that runs the session, or work from the pinned snapshot without refresh.`,
        )
      }
      const gateNode = firstInventoryNode(config)
      const gate = await ctx.step(`mcp-gate:${ctx.runId}`, () =>
        ctx.agent(mcpGatePrompt(config, gateNode), {
          label: `mcp-gate:${ctx.runId}`,
          schema: gateSchema,
        }),
      )
      if (!gate?.ok) {
        throw new Error(
          `MCP gate: ${gate?.message ?? "no result"} — the session stops here, before anything is written.`,
        )
      }
      ctx.log(`MCP gate: ${gate.call || "MCP"} answered`)

      // The session report is the preflight: token state, pinned snapshot, the
      // drift against the inventory, the rules ledger, the comments and the
      // pending queue with its design requests.
      // `--live` is one metadata read: it says whether the file changed at all,
      // and a missing token or an unreachable file is reported, never thrown.
      const statusArgs = ["nx", "run", "pagopa-ui-cli:figma:status", "--json", "--live"]
      const statusRun = await check("figma:status", statusArgs, { allowExit: [0, 1] })
      let status = null
      if (statusRun) {
        try {
          status = parseJsonOutput(statusRun.stdout)
        } catch {
          status = null
        }
      }
      if (status) {
        const rules = status.rules ?? {}
        const comments = status.comments ?? {}
        const requests = status.requests ?? {}
        ctx.log(
          `Snapshot ${status.snapshot?.present ? status.snapshot.path : "missing"} · rules ${
            rules.pending ?? 0
          } pending/${rules.stale ?? 0} stale · comments ${comments.open ?? 0} open · requests ${
            requests.open ?? 0
          } open/${requests.answered ?? 0} answered`,
        )
        if (status.next) ctx.log(`Next: ${status.next}`)
        if (status.live?.changedSinceInventory === true && !opts.refresh) {
          ctx.log(
            "The file changed since the inventory sync: this wave reads the pinned snapshot. Pass refresh=true to re-snapshot and triage first.",
          )
        }
      } else {
        ctx.log("figma:status did not return JSON: the preflight continues from the files.")
      }

      const branch = (await run("git", ["branch", "--show-current"], { signal })).stdout.trim()
      const dirty = (await run("git", ["status", "--porcelain"], { signal })).stdout.trim()
      ctx.log(`Branch ${branch || "(detached)"}${dirty ? " — working tree NOT clean" : ""}`)

      // ------------------------------------------------------------ delta
      ctx.phase("Delta")
      if (opts.refresh) {
        // The MCP list discovers the roots a REST read cannot see, so it is
        // tried first and the workflow — never the agent — runs the export.
        // The REST plan is the fallback: exit 1 there is drift, not failure.
        const listed = await ctx.agent(mcpInventoryPrompt(config, mcpInventory), {
          label: `mcp-inventory:${ctx.runId}`,
          schema: refreshSchema,
        })
        let pinned = ""
        if (listed?.ok) {
          const exported = await check(
            "figma:export",
            ["nx", "run", "pagopa-ui-cli:figma:export", "--input", mcpInventory],
            { allowExit: [0, 1], timeoutMs: 15 * 60_000 },
          )
          if (exported?.code === 0) pinned = `figma:export from the MCP list (${listed.message})`
          else ctx.log("figma:export did not pin the snapshot: the REST plan reads it instead.")
        } else {
          ctx.log(`MCP component list not read: ${listed?.message ?? "no result"}`)
        }
        if (!pinned) {
          // The REST plan is the fallback, and it prints the plan JSON the wave
          // reads: a nonzero exit there is a validation error, not drift.
          const planned = await check("figma:plan", ["ui-cli", "figma", "plan"], {
            allowExit: [0, 1, 2, 3],
            timeoutMs: 15 * 60_000,
          })
          if (!planned) {
            throw new Error(
              `Snapshot refresh failed: figma:plan did not run. Export FIGMA_TOKEN in the shell that runs the session, or run the export yourself, then start a new run.`,
            )
          }
          if (planned.code !== 0 && planned.code !== 3) {
            throw new Error(
              `Snapshot refresh failed: figma:plan exited ${planned.code} — ${tail(
                `${planned.stdout ?? ""}\n${planned.stderr ?? ""}`,
                3,
              ).replace(/\s+/g, " ")}`,
            )
          }
          pinned = "figma:plan over REST (MCP-only roots not rediscovered)"
        }
        ctx.log(`Snapshot: ${pinned}`)
      }
      if (!existsSync(snapshot)) {
        throw new Error(
          `No pinned snapshot at ${repoPath(snapshot)}: run with refresh=true (needs a token or the MCP route) or export it yourself.`,
        )
      }

      if (opts.triage) {
        await ctx.step(`triage:${ctx.runId}`, async () => {
          const triage = await run(
            "pnpm",
            ["ui-cli", "update", "inventory", "--input", snapshot, "--triage"],
            { signal, allowExit: [0, 1] },
          )
          commands.push({ label: "figma:triage", code: triage.code })
          const fmt = await run("pnpm", ["nx", "run-many", "-t", "fmt"], { signal })
          commands.push({ label: "fmt (triage payload)", code: fmt.code })
          return { code: triage.code }
        })
        ctx.log("Triage refreshed the inventory and queued the production delta as pending.")
      }

      // The `.Regole` boxes and the comments sit outside the fingerprint, so a
      // fresh snapshot is the only way the brief sees a rule or a thread that
      // changed without producing drift. Missing credentials never block the
      // pinned-snapshot path: the committed ledger and the last local snapshot
      // still answer.
      if (token.present) {
        const rules = await check(
          "figma:rules refresh",
          ["nx", "run", "pagopa-ui-cli:figma:rules", "refresh"],
          { allowExit: [0, 1, 2], timeoutMs: 10 * 60_000 },
        )
        if (!rules || rules.code !== 0) {
          ctx.log("Rules snapshot not refreshed: the brief falls back to the committed ledger.")
        }
        const comments = await check(
          "figma:comments --refresh",
          ["nx", "run", "pagopa-ui-cli:figma:comments", "--refresh"],
          { allowExit: [0, 1, 2], timeoutMs: 5 * 60_000 },
        )
        if (!comments || comments.code !== 0) {
          ctx.log("Comments snapshot not refreshed: the brief reports the last local snapshot.")
        }
      } else {
        ctx.log(
          "Token missing: rules and comments read the last local snapshots, not the live file.",
        )
      }

      // The plan diff of the rules ledger: which cards the snapshot gained,
      // which the ledger no longer matches and which the source removed. A
      // node is not finished while a card that targets it is pending or stale,
      // so the wave reads this before it picks nodes.
      const rulesPlan = await check(
        "figma:rules",
        ["nx", "run", "pagopa-ui-cli:figma:rules", "plan"],
        {
          allowExit: [0, 1, 2],
        },
      )
      if (rulesPlan?.stdout) {
        ctx.log(tail(rulesPlan.stdout, 2).replace(/\s+/g, " "))
      }

      const plan = await ctx.step("plan-v1", async () => {
        const { stdout } = await run(
          "node",
          ["packages/ui-cli/src/cli.ts", "figma", "plan", "--input", snapshot, "--json"],
          { signal, allowExit: [0, 3] },
        )
        return parseJsonOutput(stdout)
      })
      // A fresh snapshot and inventory make the committed evidence slice old;
      // the drift job refreshes it in the same pull request, and so does a
      // direct refresh run. `check:parity` then proves the two still match.
      if (opts.refresh) {
        const evidence = await check(
          "update:evidence",
          ["nx", "run", "pagopa-ui-cli:update:evidence", "--input", snapshot],
          { allowExit: [0, 1, 2], timeoutMs: 30 * 60_000 },
        )
        if (!evidence || evidence.code !== 0) {
          ctx.log("Evidence bundle not refreshed: check:parity will report the stale slice.")
        }
      }

      const queue = await ctx.step("queue-v1", async () => {
        const { stdout } = await run(
          "pnpm",
          ["nx", "run", "pagopa-ui-cli:parity:queue", "--status", "pending", "--json"],
          { signal },
        )
        return parseJsonOutput(stdout)
      })
      const drift = ["added", "removed", "changed", "renamed", "moved", "affected", "baseline"]
        .map((key) => `${key} ${(plan[key] ?? []).length}`)
        .join(" · ")
      ctx.log(
        `Delta: ${drift} · implementationOrder ${(plan.implementationOrder ?? []).length} · ` +
          `pending ${(plan.pending ?? []).length} · unverifiedDesign ${
            (plan.unverifiedDesign ?? []).length
          }`,
      )
      // The surface is not a delta: it is what the file draws that no node
      // answers. `uncensused` is the page census debt, and the wave owes it a
      // page-tree read before it can claim the pages it touched are complete.
      ctx.log(
        `Surface: ${(plan.surfaceWaiting ?? []).length} waiting · ` +
          `${(plan.surfaceUnmirrored ?? []).length} unmirrored · ` +
          `${(plan.surfaceUncensored ?? []).length} uncensused`,
      )
      if ((plan.surfaceUncensored ?? []).length) {
        ctx.log(
          `Page census: ${(plan.surfaceUncensored ?? []).length} page(s) owed a read — ${config.catalog.pageSurface}.`,
        )
      }
      ctx.log(`Pending queue: ${queue.cases.length} nodes`)

      const wave = await ctx.step("wave-v1", async () => {
        const registry = JSON.parse(readFileSync(registryPath, "utf8")).entries ?? {}
        const pending = new Map(queue.cases.map((entry) => [entry.nodeId, entry]))
        const order = plan.implementationOrder ?? []
        let ids
        if (opts.nodes.length) {
          ids = opts.nodes
          const historical = ids.filter((id) => registry[id]?.status === "implemented")
          if (historical.length && ids.length > 1) {
            throw new Error(
              `Historical implemented nodes are reviewed one at a time, never in bulk: ${historical.join(", ")}`,
            )
          }
        } else {
          const ordered = order.filter((id) => pending.has(id))
          const rest = [...pending.keys()].filter((id) => !order.includes(id))
          ids = [...ordered, ...rest].slice(0, opts.waveSize)
        }
        // The plan already carries the standing queue with the design requests
        // its notes name; the brief is the fuller read each node gets next.
        const pendingById = new Map((plan.pending ?? []).map((entry) => [entry.nodeId, entry]))
        const briefOf = async (id) => {
          try {
            const { stdout } = await run(
              "pnpm",
              ["nx", "run", "pagopa-ui-cli:figma:brief", "--node", id, "--json"],
              { signal, allowExit: [0, 1] },
            )
            return parseJsonOutput(stdout)
          } catch (error) {
            ctx.log(`Brief ${id}: not read — ${tail(error.message, 2)}`)
            return null
          }
        }
        const classesOf = (id) =>
          [
            "added",
            "changed",
            "changedVariants",
            "renamed",
            "moved",
            "affected",
            "baseline",
          ].filter((key) =>
            (plan[key] ?? []).some((item) => item === id || item?.nodeId === id || item?.id === id),
          )
        const nodes = []
        const pages = inventoryPages(config)
        for (const id of ids) {
          const entry = registry[id]
          if (!entry) throw new Error(`Node ${id} is not in the registry`)
          if (entry.status === "mocked") {
            ctx.log(`${id}: mocked demo — never queued (a review is not a renewal)`)
            continue
          }
          const queued =
            pending.get(id) ??
            parseJsonOutput(
              (
                await run(
                  "pnpm",
                  ["nx", "run", "pagopa-ui-cli:parity:queue", "--node", id, "--json"],
                  { signal },
                )
              ).stdout,
            ).cases?.[0]
          const brief = await briefOf(id)
          nodes.push({
            nodeId: id,
            name: entry.target?.export ?? queued?.export ?? id,
            status: entry.status,
            note: entry.note ?? brief?.note ?? "",
            pageName: pages.get(id)?.pageName ?? "",
            target: entry.target ?? brief?.target ?? null,
            storyIds: queued?.storyIds ?? [],
            classes: classesOf(id),
            brief,
            designRequests: brief?.designRequests ?? pendingById.get(id)?.designRequests ?? [],
          })
        }
        return nodes
      })
      if (!wave.length) {
        ctx.log("Nothing to align: the selection has no pending, non-mocked node.")
        return { runId: ctx.runId, wave: [], message: "nothing to align" }
      }
      ctx.log(
        `Wave: ${wave.map((n) => `${n.nodeId} ${n.name}`).join(", ")}` +
          (opts.nodes.length
            ? ""
            : ` (${Math.max(0, queue.cases.length - wave.length)} pending nodes left for later waves)`),
      )

      // ------------------------------------------------------------ analyse
      ctx.phase("Analyse")
      const analysedUrl = await ensureStorybook(config)
      if (!analysedUrl) {
        ctx.log(
          "Storybook is not reachable: the analysis reads the source only, renders unverified.",
        )
      } else {
        config.storybook.url = analysedUrl
        process.env.STORYBOOK_URL = analysedUrl
        ctx.log(`Storybook: ${analysedUrl}`)
      }
      const analyses = await ctx.parallel(
        wave.map(
          (node) => () =>
            ctx.agent(analysePrompt(config, node), {
              label: `analyse:${node.nodeId}`,
              schema: analysisSchema,
            }),
        ),
      )

      // ------------------------------------------------------------ decide
      ctx.phase("Decide")
      const decisionsFile = join(outDir, "decisions.json")
      // Journaled so a resume never overwrites the person's edits.
      await ctx.step(`decisions-written:${ctx.runId}`, () => {
        const proposals = wave.map((node, index) => {
          const analysis = analyses[index]
          return analysis
            ? { ...analysis, nodeId: node.nodeId, name: node.name, instructions: "" }
            : {
                nodeId: node.nodeId,
                name: node.name,
                decision: "skip",
                reason: "the analysis returned no result",
                devices: [],
                dependencies: [],
                existingCases: [],
                rules: [],
                comments: [],
                deltas: [],
                plan: "",
                openQuestions: [],
                instructions: "",
              }
        })
        writeFileSync(decisionsFile, `${JSON.stringify(proposals, null, 2)}\n`)
        writeFileSync(join(outDir, "decisions.md"), decisionsMarkdown(ctx.runId, proposals))
        return proposals.length
      })
      ctx.log(`Decisions: ${join(outDir, "decisions.md")}`)

      if (opts.analyseOnly) {
        ctx.phase("Report")
        return {
          runId: ctx.runId,
          decisionsFile,
          decisions: JSON.parse(readFileSync(decisionsFile, "utf8")),
        }
      }
      if (opts.approval === "pause") {
        ctx.log(
          `Paused: review ${decisionsFile} (decision: ${DECISIONS.join("|")}, optional "instructions"), then resume run ${ctx.runId}.`,
        )
        await ctx.pause("decisions-approved")
      }

      const approved = await ctx.step("decisions-approved-v1", () => {
        const edited = JSON.parse(readFileSync(decisionsFile, "utf8"))
        for (const entry of edited) {
          if (!DECISIONS.includes(entry.decision)) {
            throw new Error(
              `decisions.json: ${entry.nodeId} has an unknown decision '${entry.decision}'`,
            )
          }
        }
        return edited
      })
      const work = wave
        .map((node) => ({ node, decision: approved.find((d) => d.nodeId === node.nodeId) }))
        .filter(({ decision }) => decision && decision.decision !== "skip")
      ctx.log(
        `Approved: ${work.map(({ node, decision }) => `${node.name}=${decision.decision}`).join(", ") || "none"}`,
      )

      // ------------------------------------------------------------ align
      ctx.phase("Align")
      // An exclusion or a design request has no render to compare: only the
      // decisions that save cases need Storybook.
      const renderDecisions = new Set(["implement", "review", "map"])
      const needsRender = work.some(({ decision }) => renderDecisions.has(decision.decision))
      if (needsRender) {
        const alignedUrl = await ensureStorybook(config)
        if (!alignedUrl) {
          throw new Error(
            `Storybook does not answer: the parity loop needs it (see ${join(outDir, "storybook.log")}). Start it and resume run ${ctx.runId}.`,
          )
        }
        config.storybook.url = alignedUrl
        process.env.STORYBOOK_URL = alignedUrl
        // Create the output parents before verification so capture/report do
        // not change an observed ancestor merely by creating their directories.
        prepareCloseoutOutputs(parityOut)
      } else if (work.length) {
        ctx.log("No approved decision renders a case: Storybook is not required for this wave.")
      }
      const attributionWarnings = new Set()
      const captureChangedFiles = () =>
        worktreeHashes(signal, (warning) => {
          if (!attributionWarnings.has(warning)) ctx.log(warning)
          attributionWarnings.add(warning)
        })
      const writeNode = async (label, prompt) => {
        const before = await captureChangedFiles()
        const result = await ctx.agent(prompt, { label, schema: alignmentSchema })
        const files = changedBetween(before, await captureChangedFiles())
        return { result, files }
      }
      const verifyNode = (node, alignment, kind) =>
        collectVerification({
          signal,
          readContext: () => verificationContext(config, signal),
          // A fresh label prevents the SDK from replaying a verifier from
          // an earlier attempt or resume instead of inspecting this context.
          verify: () =>
            ctx.agent(verifyPrompt(config, node, alignment), {
              label: `${kind}:${node.nodeId}:${randomUUID()}`,
              schema: verificationSchema,
            }),
        })

      // Verification may overlap a writer; the start/end/final context hash
      // invalidates any result whose relevant source changed, and the final
      // report re-verifies it once, including after the green-chain fix.
      const results = await ctx.pipeline(
        work,
        async (_, { node, decision }) => {
          const { result, files } = await writeNode(
            `align:${node.nodeId}`,
            alignPrompt(config, node, decision),
          )
          const valid = result?.nodeId === node.nodeId
          const writerFailure = valid
            ? null
            : result
              ? "The alignment writer returned a different node."
              : "The alignment writer returned no result."
          ctx.log(`${node.name}: ${valid ? `${result.status} — ${result.summary}` : writerFailure}`)
          return { node, decision, alignment: valid ? result : null, files, writerFailure }
        },
        async (previous) => {
          if (!previous.alignment) return { ...previous, verification: null }
          return {
            ...previous,
            ...(await verifyNode(previous.node, previous.alignment, "verify")),
          }
        },
        async (previous) => {
          const { node, alignment, verification } = previous
          if (
            !alignment ||
            !verification ||
            verification.nodeId !== node.nodeId ||
            verification.pass ||
            !verification.findings?.length ||
            previous.contextError ||
            previous.startContext !== previous.endContext
          ) {
            return previous
          }
          ctx.log(`${node.name}: ${verification.findings.length} findings — one fix round`)
          const fixed = await writeNode(
            `fix:${node.nodeId}`,
            fixPrompt(config, node, alignment, verification),
          )
          const files = [...new Set([...previous.files, ...fixed.files])].sort()
          if (!fixed.result || fixed.result.nodeId !== node.nodeId) {
            return {
              ...previous,
              files,
              writerFailure: fixed.result
                ? "The fix writer returned a different node."
                : "The fix writer returned no result.",
            }
          }
          return {
            ...previous,
            alignment: fixed.result,
            files,
            ...(await verifyNode(node, fixed.result, "reverify")),
          }
        },
      )

      // ------------------------------------------------------------ close
      ctx.phase("Close")
      // One wave per node: the report names the node it measures, and a single
      // comma-list capture would merge every node into a wave no reader can
      // attribute. An exclusion or a design request has no case to capture.
      const date = new Date().toISOString().slice(0, 10)
      const runWave = `${date}-alignment-${ctx.runId.slice(0, 8)}`
      const rendered = results
        .filter(Boolean)
        .filter((result) => renderDecisions.has(result.decision.decision))
        .map((result) => result.node.nodeId)

      await check("fmt", ["nx", "run-many", "-t", "fmt"])
      await check("check:catalogue", ["nx", "run", "pagopa-ui:check:catalogue"])
      await check("check:rules", ["nx", "run", "pagopa-ui-cli:check:rules"])
      await check("check:devices", ["nx", "run", "pagopa-ui-cli:check:devices"])
      await check("check:evidence", ["nx", "run", "pagopa-ui-cli:check:evidence"])
      await check("check:parity", ["nx", "run", "pagopa-ui-cli:check:parity"])
      for (const nodeId of rendered) {
        await check(
          `parity:check (${nodeId})`,
          ["ui-cli", "parity", "check", "--node", nodeId, "--saved"],
          { timeoutMs: 30 * 60_000 },
        )
        const nodeWave = `${date}-${nodeId.replace(/[^A-Za-z0-9]+/g, "-")}-alignment`
        const nodeDir = join(parityOut, nodeWave)
        // `--saved` measures exactly the committed cases of this node: an
        // ad-hoc capture would photograph a page nobody reviews again.
        const measured = await check(
          `parity:capture (${nodeId})`,
          [
            "nx",
            "run",
            "pagopa-ui-cli:parity:capture",
            "--saved",
            "--node",
            nodeId,
            "--out",
            nodeDir,
          ],
          { timeoutMs: 30 * 60_000 },
        )
        if (!measured || measured.code !== 0) {
          ctx.log(`${nodeId}: the capture measured nothing — the report would be empty.`)
          continue
        }
        await check(`parity:report (${nodeId})`, [
          "nx",
          "run",
          "pagopa-ui-cli:parity:report",
          "--wave",
          nodeWave,
          "--dir",
          nodeDir,
          "--out",
          join(PACKAGE_DIR, "docs/reports", `${nodeWave}-figma-parity.md`),
        ])
      }
      await check("docs", ["nx", "run", "pagopa-ui:docs"])
      // The visual gate is the other half of the green chain, and its baselines
      // are reviewed Linux images: the preflight says which scoped stories have
      // none, and a missing baseline is a finding for the person, not a reason
      // to stop a wave that never produced one.
      await check(
        "test:visual (baseline preflight)",
        [
          "nx",
          "run",
          "pagopa-ui-cli:test:visual",
          "--since",
          "origin/main",
          "--out",
          "apps/storybook/visual/scope.json",
          "--check-baselines",
        ],
        { allowExit: [0, 1, 2], timeoutMs: 20 * 60_000 },
      )

      let green = null
      let greenFixFailed = false
      if (opts.greenChain) {
        const chain = readGreenChain()
        const greenRun = async (attempt) => {
          const logFile = join(outDir, `green-chain-${attempt}.log`)
          ctx.log(`Green chain, attempt ${attempt}: ${logFile}`)
          try {
            const result = await run("bash", ["-c", chain], {
              signal,
              allowExit: [0, 1, 2],
              timeoutMs: 90 * 60_000,
              logFile,
            })
            return { code: result.code, logFile, tail: tail(result.stdout + result.stderr, 80) }
          } catch (error) {
            return { code: -1, logFile, tail: String(error.message) }
          }
        }
        green = await greenRun(1)
        if (green.code !== 0) {
          const reply = await ctx.agent(greenFixPrompt(config, wave, green.tail), {
            label: `green-fix:${ctx.runId}`,
          })
          greenFixFailed = !reply
          ctx.log(`Green fix: ${reply ? tail(reply, 6) : "no result"}`)
          green = await greenRun(2)
        }
        ctx.log(`Green chain: ${green.code === 0 ? "green" : `RED (exit ${green.code})`}`)
      }

      // ------------------------------------------------------------ report
      ctx.phase("Report")
      let changedFiles = changedBetween({}, await captureChangedFiles())
      let finalContext
      let finalContextError
      const captureFinalContext = () => {
        try {
          finalContext = verificationContext(config, signal)
          finalContextError = undefined
        } catch (error) {
          if (signal.aborted) throw error
          finalContext = undefined
          finalContextError = String(error?.message ?? error)
          ctx.log(`Final verification context unavailable: ${finalContextError}`)
        }
      }
      captureFinalContext()
      const refreshed = await reverifyStaleResults({
        results,
        finalContext,
        greenFixFailed,
        parallel: (tasks) => ctx.parallel(tasks),
        verify: (node, alignment) => verifyNode(node, alignment, "final-verify"),
      })
      if (refreshed.attempted) {
        ctx.log(`Final re-verification attempted for ${refreshed.attempted} stale node(s).`)
        changedFiles = changedBetween({}, await captureChangedFiles())
        captureFinalContext()
      }

      const report = {
        runId: ctx.runId,
        branch,
        wave: runWave,
        nodes: refreshed.results.map((r, i) => {
          if (r) {
            const verdict = assessVerification({
              nodeId: r.node.nodeId,
              alignment: r.alignment,
              verification: r.verification,
              startContext: r.startContext,
              endContext: r.endContext,
              finalContext,
              contextError: r.contextError ?? finalContextError,
              writerFailure: r.writerFailure,
              greenFixFailed,
            })
            return {
              nodeId: r.node.nodeId,
              name: r.node.name,
              decision: r.decision.decision,
              reason: r.decision.reason,
              status: r.writerFailure ? "unknown" : (r.alignment?.status ?? "unknown"),
              summary: r.alignment?.summary ?? "the writer returned no result",
              cases:
                (r.verification?.nodeId === r.node.nodeId && r.verification.cases) ||
                r.alignment?.cases ||
                [],
              verified: verdict.verified,
              findings: verdict.findings,
              rules: r.alignment?.rules ?? r.decision.rules ?? [],
              comments: r.alignment?.comments ?? r.decision.comments ?? [],
              designRequest: r.alignment?.designRequest ?? "",
              preview: r.alignment?.preview ?? "",
              openPoints: r.alignment?.openPoints ?? [],
              commands: r.alignment?.commands ?? [],
              files: r.files,
            }
          }
          return {
            nodeId: work[i].node.nodeId,
            name: work[i].node.name,
            status: "failed",
            verified: false,
            findings: ["The pipeline failed before a verification result was available."],
          }
        }),
        skipped: approved.filter((d) => d.decision === "skip").map((d) => d.nodeId),
        commands,
        greenChain: green ? { code: green.code, log: green.logFile } : "not run",
        preexistingChanges: dirty ? dirty.split("\n").length : 0,
        changedFiles,
        changedFilesScope:
          "Git-visible modified/untracked verification inputs only; ignored, credential and unrelated files are excluded.",
        attributionWarnings: [...attributionWarnings],
        delivery: `Nothing was committed: this workflow never commits. Review the diff, then commit the alignment on the drift branch — one commit per node — and push it yourself: the drift branch merge is the review record (handoff.md). Once the drift pull request exists, comment the before/after media on it (handoff.md, "Before/after media"). The visual preflight above only lists the scoped stories that still have no reviewed baseline: until those baselines are reviewed, the visual gate is unverified, and the per-device verdicts in this report are the case table, not a claim about the screenshots. ${
          design.preview.branch
            ? `A visual design request still needs its review story on ${design.preview.branch}, its captures of the deployed preview and the review pull request index.`
            : "Configure design.preview before a visual design request can be published."
        }`,
      }
      const reportFile = join(outDir, "report.md")
      writeFileSync(reportFile, reportMarkdown(report, green))
      ctx.log(`Report: ${reportFile}`)
      return { ...report, reportFile }
    } finally {
      if (storybook?.pid) {
        try {
          process.kill(-storybook.pid, "SIGTERM")
        } catch {
          // already gone
        }
      }
    }
  },
})

await joinSession({ workflows: [figmaAlign] })
