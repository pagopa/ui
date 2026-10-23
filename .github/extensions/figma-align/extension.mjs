// The `figma-align` dynamic workflow: the figma-to-code skill
// (.agents/skills/figma-to-code) as an orchestration. The skill stays the
// source of every rule; this file only sequences it, runs the deterministic
// commands itself and hands each node to a subagent that loads the skill.
//
// Phases: preflight → delta → wave → analyse (parallel, read-only) → decisions
// (durable pause) → align (one writer at a time, verification overlapping) →
// close (fmt, figma:check, parity verify/capture/report, green chain) → report.
//
// Run it from a Copilot CLI session in this repository, for example:
//   run_dynamic_workflow { name: "figma-align", args: { waveSize: 3 } }
// then edit `packages/pagopa-ui/.figma/align/<runId>/decisions.json` (git-ignored)
// and resume the run.

import { spawn } from "node:child_process"
import { createHash } from "node:crypto"
import {
  createWriteStream,
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  writeFileSync,
} from "node:fs"
import { homedir } from "node:os"
import { dirname, join, resolve } from "node:path"
import { fileURLToPath } from "node:url"
import { defineWorkflow, joinSession } from "@github/copilot-sdk/extension"

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../../..")
const PACKAGE_DIR = join(ROOT, "packages/pagopa-ui")
const CONFIG_FILE = join(PACKAGE_DIR, "figma-to-code.yaml")
const DECISIONS = ["implement", "review", "map", "exclude", "design-request", "skip"]

// Node does not read the OS trust store: trust the portless CA so `fetch` can
// probe the HTTPS Storybook URL the proxy serves.
const PORTLESS_CA = join(homedir(), ".portless/ca.pem")
if (!process.env.NODE_EXTRA_CA_CERTS && existsSync(PORTLESS_CA)) {
  process.env.NODE_EXTRA_CA_CERTS = PORTLESS_CA
}

// ---------------------------------------------------------------- helpers

function run(cmd, args, { signal, allowExit = [0], timeoutMs = 10 * 60_000, logFile } = {}) {
  return new Promise((resolvePromise, reject) => {
    const child = spawn(cmd, args, {
      cwd: ROOT,
      env: { ...process.env, FORCE_COLOR: "0", NX_TUI: "false" },
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
          `${cmd} ${args.join(" ")} exited ${result.code}\n${tail(stderr || stdout, 40)}`,
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

function parseJsonOutput(text) {
  const start = text.search(/^[[{]/m)
  if (start < 0) throw new Error(`no JSON in output:\n${tail(text, 20)}`)
  return JSON.parse(text.slice(start))
}

// The config is a two-level YAML map of paths; no dependency needed to read it.
function readConfig() {
  const config = {}
  let section = null
  for (const raw of readFileSync(CONFIG_FILE, "utf8").split("\n")) {
    const line = raw.replace(/\s+#.*$/, "")
    if (!line.trim() || line.trim().startsWith("#")) continue
    const top = line.match(/^([A-Za-z]\w*):\s*$/)
    const nested = line.match(/^\s+([A-Za-z]\w*):\s*(.+?)\s*$/)
    if (top) config[(section = top[1])] = {}
    else if (nested && section) config[section][nested[1]] = nested[2].replace(/^["']|["']$/g, "")
  }
  return config
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

// Registry, case corpus and Storybook are shared: one writer at a time.
function createLock() {
  let last = Promise.resolve()
  return (task) => {
    const next = last.then(task, task)
    last = next.catch(() => {})
    return next
  }
}

// Content hashes of every modified or untracked file, to attribute the files
// each node's writer touched without trusting the agent's own list.
async function worktreeHashes(signal) {
  const { stdout } = await run("git", ["ls-files", "-m", "-o", "--exclude-standard", "-z"], {
    signal,
  })
  const hashes = {}
  for (const file of stdout.split("\0").filter(Boolean)) {
    const path = join(ROOT, file)
    hashes[file] = existsSync(path)
      ? createHash("sha1").update(readFileSync(path)).digest("hex")
      : "deleted"
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

// portless owns the branch prefix, so ask it for the URL instead of building it.
async function portlessUrl(name, signal) {
  try {
    const { stdout } = await run(
      "pnpm",
      ["--filter", "pagopa-ui-storybook", "exec", "portless", "get", name],
      { signal, allowExit: [0, 1] },
    )
    const line = stdout
      .trim()
      .split("\n")
      .reverse()
      .find((candidate) => /^https?:\/\//.test(candidate))
    return line?.trim() ?? null
  } catch {
    return null
  }
}

// ---------------------------------------------------------------- schemas

const strings = { type: "array", items: { type: "string" } }

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
    designRequest: { type: "string" },
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

// ---------------------------------------------------------------- prompts

function preamble(config) {
  return `You work in the pagopa-ui monorepo at ${ROOT}; run every command from there.
First load the \`figma-to-code\` skill and the \`pagopa-ui-standards\` skill and follow them: they own every rule, this prompt only scopes your part. The skill config is packages/pagopa-ui/figma-to-code.yaml (paths in it are relative to packages/pagopa-ui, except \`design.requests\` which is docs/design-requests at the workspace root; the local \`.figma/\` exports live in packages/pagopa-ui/.figma).

Hard rules for this run:
- Never read, source or load \`.env\`; never print FIGMA_TOKEN.
- Figma is read-only: use only get_design_context, get_screenshot, get_metadata, get_variable_defs and list_file_components_for_code_connect. Never use_figma or any tool that writes to Figma or publishes Code Connect.
- Never commit, push, switch branches or open pull requests: the person delivers.
- The working tree is shared with the person and other writers. Never revert, delete, stash, \`git checkout\` or \`git restore\` a change you did not make in this task, even if it looks unrelated or breaks a check: report it in openPoints instead.
- Storybook already runs at ${config.storybook.url}. Prefix every command that renders it (\`figma:parity:check\`, \`figma:parity:capture\`) with \`STORYBOOK_URL=${config.storybook.url}\`. Never start, restart or kill it. A file created now enters the Tailwind scan only after \`touch packages/pagopa-ui/src/index.css\`.
- Run project targets as \`pnpm nx run <project>:<target> [flags]\` (the ui-cli changes directory to packages/pagopa-ui, so pass absolute paths or package-relative ones); \`node packages/ui-cli/src/cli.ts parity source ...\` and \`... figma sync ...\` run from the root as the skill shows.
- Code, comments and docs in English; Italian only for rendered component and story copy.
- Parity is the render: never claim a match from reading code.`
}

function nodeContext(node) {
  return `Node ${node.nodeId} — ${node.name}
- registry status: ${node.status}
- registry note: ${node.note || "(none)"}
- target: ${JSON.stringify(node.target)}
- story ids: ${JSON.stringify(node.storyIds)}
- delta classes in the current plan: ${node.classes.length ? node.classes.join(", ") : "none (queued pending)"}
- design requests naming it: ${node.designRequests.length ? node.designRequests.join(", ") : "none"}`
}

function analysePrompt(config, node) {
  return `${preamble(config)}

TASK: analyse ONE node and propose its decision (figma-to-code delta.md step 4). This is a READ-ONLY step: do not edit, create or delete any repository file; never pass --save-case. Parity captures under .figma/ are allowed.

${nodeContext(node)}

Do:
1. Read the registry entry and note (packages/pagopa-ui/src/catalog/figma/registry.json), the target component, its story, and its guide under apps/storybook/src/guides. The note is binding.
2. Read the source of EVERY declared device: \`node packages/ui-cli/src/cli.ts parity source ${node.nodeId} --depth 1\` (variants, device, box), then \`--compact --depth 3\` per device variant; use get_screenshot read-only when the anatomy is unclear. List each rendered dependency (instance-swap defaults included).
3. List the committed cases with \`node packages/ui-cli/src/cli.ts parity queue --node ${node.nodeId} --json\` and run each with \`pnpm nx run pagopa-ui-cli:figma:parity:check --case <caseId>\`; for a device axis also \`--node ${node.nodeId} --devices\`. Record each exit code and the deltas.
4. Pick exactly one decision:
   - implement: no real implementation covers the node yet (new-from-figma.md);
   - review: it is implemented and the change reaches it, or its cases fail (node-review.md);
   - map: an existing implementation covers its whole contract, every device included (node-review.md);
   - exclude: out of scope, with the reason;
   - design-request: the source leaves a question only the design owner can answer (design-request.md); an open request already named above keeps the node there unless its answer is recorded.
   "It matches the desktop frame" is not a decision for a node with a device axis.

Return the JSON: devices = one entry per declared device (device "any" when there is no axis) with the variant node id, its box and what its composition shows; deltas = what the render must change (empty when the cases pass); plan = the concrete steps the writer will take; openQuestions = what only the design owner can answer.`
}

const DECISION_GUIDANCE = {
  implement:
    "Follow references/new-from-figma.md end to end: implement, story at the exact source width with parameters.design = figmaEmbedUrl, guide, the visual-parity loop per variant and per declared device, one saved case each, then the registry entry.",
  review:
    "Follow references/node-review.md: re-run every committed case, capture the missing ones per device, fix the component and its story where they must change (token ladder), re-run, then record the decision in the registry.",
  map: "Follow references/node-review.md for a mapping: prove the existing implementation covers the node's whole contract on every declared device with saved cases, then point the registry target at it.",
  exclude:
    "Set the registry entry to excluded with a self-contained reason in its note. Change nothing else.",
  "design-request":
    "Follow references/design-request.md: write one request under docs/design-requests (YYYY-MM-DD-<slug>.md, today's date), keep the node pending and name the request in its registry note. Change nothing else.",
}

function alignPrompt(config, node, decision) {
  return `${preamble(config)}

TASK: align ONE node with its approved decision. You are the only writer in the repository right now; touch only what this node needs.

${nodeContext(node)}

Approved decision: ${decision.decision}
Reason: ${decision.reason}
Devices: ${JSON.stringify(decision.devices)}
Dependencies: ${JSON.stringify(decision.dependencies)}
Known deltas: ${JSON.stringify(decision.deltas)}
Plan from the analysis: ${decision.plan}
Open questions: ${JSON.stringify(decision.openQuestions)}
${decision.instructions ? `Instructions from the person (binding): ${decision.instructions}\n` : ""}
How: ${DECISION_GUIDANCE[decision.decision]}

Limits: three fix passes per case, then a residue with its reason or a written blocker. The case corpus is written only by \`figma:parity:check --save-case\` (with --note "reviewed: …"); never hand-edit it and never leave a draft as coverage. Set status implemented only after you inspected the source and the render of every declared device; otherwise leave it pending with the blocker in the note. Do not edit registry entries of other nodes. Finish with \`pnpm nx run pagopa-ui:figma:check\` and fix what this node broke. Do not run the full green chain: the workflow runs it once for the whole wave.

Return the JSON: status = the registry status you left; cases = one per saved or re-run case with its device, verdict and residues ("path=reason"); designRequest = the file path or ""; openPoints = what stays open and why; commands = each command you ran with its exit code.`
}

function verifyPrompt(config, node, alignment) {
  return `${preamble(config)}

TASK: independently verify ONE node's alignment. READ-ONLY: do not edit any repository file and never pass --save-case. Another writer may be changing other components meanwhile; judge only this node.

${nodeContext(node)}

The writer reported: ${JSON.stringify(alignment)}

Check (references/definition-of-done.md and visual-parity.md):
1. \`pnpm nx run pagopa-ui-cli:figma:parity:check --case <caseId>\` reproduces every case the node has (list them with \`node packages/ui-cli/src/cli.ts parity queue --node ${node.nodeId} --json\`); for a device axis \`--node ${node.nodeId} --devices\` shows a reviewed passing case per declared device or a reasoned device exception.
2. Every residue has a reason; no inline [Npx] values or off-token colours in the touched component (token ladder); the story is framed at the source width with parameters.design = figmaEmbedUrl; the guide records the source mapping; props follow prop-conventions.md or the departure is in the note.
3. The registry entry is consistent with the outcome: implemented has target.module/export/story/storyExports; pending names its blocker or design request; excluded has a reason.
Skip the checks that do not apply to the decision (an exclusion or a design request has no render to verify).

Return pass=true only when nothing is left to fix; findings = each concrete defect with its file and measurement.`
}

function fixPrompt(config, node, alignment, verification) {
  return `${preamble(config)}

TASK: fix the findings of an independent verification for ONE node. You are the only writer now; touch only this node's files.

${nodeContext(node)}

Writer report: ${JSON.stringify(alignment)}
Verification findings: ${JSON.stringify(verification.findings)}
Case verdicts: ${JSON.stringify(verification.cases)}

Fix each finding with the token ladder, re-run and re-save the affected cases (--save-case --note "reviewed: …"), keep the registry consistent, then \`pnpm nx run pagopa-ui:figma:check\`. A finding you cannot close becomes a residue with its reason or a blocker in the registry note, never a silent pass.

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
      } | ${p.openQuestions.length} |`,
  )
  const details = proposals
    .map(
      (p) => `## ${p.name} (\`${p.nodeId}\`) — ${p.decision}

${p.reason}

- Dependencies: ${p.dependencies.join(", ") || "none"}
- Existing cases: ${p.existingCases.map((c) => `${c.caseId} (exit ${c.exit}): ${c.summary}`).join("; ") || "none"}
- Deltas: ${p.deltas.join("; ") || "none"}
- Plan: ${p.plan || "—"}
- Open questions: ${p.openQuestions.join("; ") || "none"}`,
    )
    .join("\n\n")
  return `# figma-align decisions — run ${runId}

Edit \`decisions.json\` beside this file: set \`decision\` to one of
${DECISIONS.map((d) => `\`${d}\``).join(", ")} and add \`instructions\` to steer
the writer. Then resume the run (\`run_dynamic_workflow { resumeFromRunId: "${runId}" }\`).

| Node | Name | Decision | Reason | Devices | Open questions |
| --- | --- | --- | --- | --- | --- |
${rows.join("\n")}

${details}
`
}

function reportMarkdown(report, green) {
  const nodes = report.nodes
    .map((n) => {
      if (n.status === "failed") return `## ${n.name} (\`${n.nodeId}\`) — the pipeline dropped it`
      const cases = n.cases
        .map(
          (c) => `| ${c.caseId} | ${c.device} | ${c.verdict} | ${c.residues.join("<br>") || "—"} |`,
        )
        .join("\n")
      return `## ${n.name} (\`${n.nodeId}\`) — ${n.decision} → ${n.status}

${n.summary}

- Reason: ${n.reason}
- Independent verification: ${n.verified ? "pass" : "NOT passed"}${
        n.findings.length ? `\n  - ${n.findings.join("\n  - ")}` : ""
      }
- Design request: ${n.designRequest || "none"}
- Open: ${n.openPoints.join("; ") || "nothing"}
- Files: ${n.files.join(", ") || "none"}

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
  return `# figma-align report — run ${report.runId}

Branch \`${report.branch}\` · wave \`${report.wave}\` · skipped ${report.skipped.join(", ") || "none"}

${nodes}

## Checks

| Command | Exit |
| --- | --- |
${commandRows}
| green chain | ${green ? green.code : "not run"} |
${greenTail}
## Delivery

${report.delivery}
`
}

// ---------------------------------------------------------------- workflow

const figmaAlign = defineWorkflow({
  meta: {
    name: "figma-align",
    description:
      "Align pending Figma nodes with the React design system following the figma-to-code skill: delta plan, parallel per-node analysis, a durable decision checkpoint, one writer per node with overlapping independent verification, then figma:check, the parity wave record and the green chain. Never commits. " +
      "args: { nodes?: string[] (node ids; default: the next pending nodes in implementationOrder), waveSize?: integer (default 3), refresh?: boolean (live snapshot + triage first; needs FIGMA_TOKEN), triage?: boolean (triage the pinned snapshot), approval?: 'pause' | 'auto' (default 'pause': stop after the decisions so the person can edit packages/pagopa-ui/.figma/align/<runId>/decisions.json, then resume), analyseOnly?: boolean (stop after the decisions), greenChain?: boolean (default true), startStorybook?: boolean (default true) }",
    phases: [
      { title: "Preflight", detail: "Config, working tree" },
      { title: "Delta", detail: "Snapshot, sync plan, triage, pending queue, wave" },
      {
        title: "Analyse",
        detail: "Per node: source, devices, cases, decision (read-only, parallel)",
      },
      { title: "Decide", detail: "Decisions written; durable pause for the person" },
      { title: "Align", detail: "One writer per node; verification and one fix round" },
      { title: "Close", detail: "fmt, figma:check, parity verify/capture/report, green chain" },
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
    const outDir = join(PACKAGE_DIR, ".figma/align", ctx.runId)
    mkdirSync(outDir, { recursive: true })
    let storybook = null

    const ensureStorybook = async (config) => {
      const fallback = config.storybook.url
      // portless serves a named URL; the probe follows the route it assigned.
      const portless = await portlessUrl("pagopa-ui-storybook", signal)
      if (portless && (await storybookAnswers(portless))) return portless
      if (await storybookAnswers(fallback)) return fallback
      if (!opts.startStorybook) return null
      if (!storybook) {
        ctx.log(`Storybook does not answer: starting it through portless (log in ${outDir})`)
        const log = createWriteStream(join(outDir, "storybook.log"))
        storybook = spawn(
          "pnpm",
          ["nx", "run", "pagopa-ui-storybook:storybook", "--ci", "--no-open"],
          {
            cwd: ROOT,
            env: { ...process.env, NX_TUI: "false", CI: "true" },
            stdio: ["ignore", "pipe", "pipe"],
            detached: true,
          },
        )
        storybook.stdout.pipe(log)
        storybook.stderr.pipe(log)
      }
      for (let i = 0; i < 90; i++) {
        if (signal.aborted) return null
        if (storybook.exitCode !== null) return null
        const url = portless ?? (await portlessUrl("pagopa-ui-storybook", signal))
        if (url && (await storybookAnswers(url))) return url
        await new Promise((r) => setTimeout(r, 2000))
      }
      return null
    }

    try {
      // ------------------------------------------------------------ preflight
      ctx.phase("Preflight")
      const config = readConfig()
      for (const key of ["figma", "catalog", "storybook", "design"]) {
        if (!config[key]) throw new Error(`figma-to-code.yaml: missing section '${key}'`)
      }
      const snapshot = resolveConfigPath(config.figma.snapshot)
      const parityOut = resolveConfigPath(config.figma.parityOut)
      const mcpInventory = resolveConfigPath(config.figma.mcpInventory)
      const registryPath = join(PACKAGE_DIR, config.catalog.registry)
      const requestsDir = resolveConfigPath(config.design.requests)

      const branch = (await run("git", ["branch", "--show-current"], { signal })).stdout.trim()
      const dirty = (await run("git", ["status", "--porcelain"], { signal })).stdout.trim()
      ctx.log(`Branch ${branch || "(detached)"}${dirty ? " — working tree NOT clean" : ""}`)

      // ------------------------------------------------------------ delta
      ctx.phase("Delta")
      if (opts.refresh) {
        const refreshed = await ctx.agent(
          `${preamble(config)}

TASK: take a fresh Figma snapshot (figma-to-code delta.md step 1). Nothing else.
1. Run the token preflight from references/init.md. If it fails, stop and return ok=false with its guidance verbatim (never the token).
2. Call the Figma MCP tool list_file_components_for_code_connect with the FIGMA_FILE_KEY exported by packages/pagopa-ui/${config.figma.fileModule}; save the full JSON response to ${mcpInventory}.
3. Run \`pnpm nx run pagopa-ui-cli:figma:export --input ${mcpInventory}\`.
Return ok=true with the pinned version in message when ${snapshot} pins the current version with a complete baseline.`,
          { label: `snapshot:${ctx.runId}`, schema: refreshSchema },
        )
        if (!refreshed?.ok) {
          throw new Error(
            `Snapshot refresh failed: ${refreshed?.message ?? "no result"}. Export FIGMA_TOKEN in the shell that runs the session, or run the export yourself, then start a new run.`,
          )
        }
        ctx.log(`Snapshot: ${refreshed.message}`)
      }
      if (!existsSync(snapshot)) {
        throw new Error(
          `No pinned snapshot at ${snapshot}: run with refresh=true (needs FIGMA_TOKEN) or export it yourself.`,
        )
      }

      if (opts.triage) {
        await ctx.step(`triage:${ctx.runId}`, async () => {
          const triage = await run(
            "pnpm",
            ["nx", "run", "pagopa-ui-cli:figma:triage", "--input", snapshot, "--plan"],
            { signal, allowExit: [0, 1] },
          )
          await run("pnpm", ["nx", "run-many", "-t", "fmt"], { signal })
          return { code: triage.code }
        })
        ctx.log("Triage refreshed the inventory and queued the production delta as pending.")
      }

      const plan = await ctx.step("plan-v1", async () => {
        const { stdout } = await run(
          "node",
          ["packages/ui-cli/src/cli.ts", "figma", "sync", "--input", snapshot, "--plan"],
          { signal, allowExit: [0, 1] },
        )
        return parseJsonOutput(stdout)
      })
      const queue = await ctx.step("queue-v1", async () => {
        const { stdout } = await run(
          "node",
          ["packages/ui-cli/src/cli.ts", "parity", "queue", "--status", "pending", "--json"],
          { signal },
        )
        return parseJsonOutput(stdout)
      })
      const drift = ["added", "removed", "changed", "renamed", "moved", "affected", "baseline"]
        .map((key) => `${key} ${(plan[key] ?? []).length}`)
        .join(" · ")
      ctx.log(`Delta: ${drift} · implementationOrder ${(plan.implementationOrder ?? []).length}`)
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
        const requests = existsSync(requestsDir)
          ? readdirSync(requestsDir)
              .filter((file) => file.endsWith(".md"))
              .map((file) => ({
                path: join(config.design.requests, file),
                text: readFileSync(join(requestsDir, file), "utf8"),
              }))
          : []
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
        for (const id of ids) {
          const entry = registry[id]
          if (!entry) throw new Error(`Node ${id} is not in the registry`)
          if (entry.status === "mocked") continue
          const queued =
            pending.get(id) ??
            parseJsonOutput(
              (
                await run(
                  "node",
                  ["packages/ui-cli/src/cli.ts", "parity", "queue", "--node", id, "--json"],
                  { signal },
                )
              ).stdout,
            ).cases?.[0]
          nodes.push({
            nodeId: id,
            name: entry.target?.export ?? queued?.export ?? id,
            status: entry.status,
            note: entry.note ?? "",
            target: entry.target ?? null,
            storyIds: queued?.storyIds ?? [],
            classes: classesOf(id),
            designRequests: requests
              .filter((request) => request.text.includes(`\`${id}\``))
              .map((request) => request.path),
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
      if (work.length) {
        const alignedUrl = await ensureStorybook(config)
        if (!alignedUrl) {
          throw new Error(
            `Storybook does not answer: the parity loop needs it (see ${join(outDir, "storybook.log")}). Start it and resume run ${ctx.runId}.`,
          )
        }
        config.storybook.url = alignedUrl
        process.env.STORYBOOK_URL = alignedUrl
      }
      const exclusive = createLock()
      const writeNode = (label, prompt) =>
        exclusive(async () => {
          const before = await worktreeHashes(signal)
          const result = await ctx.agent(prompt, { label, schema: alignmentSchema })
          const files = changedBetween(before, await worktreeHashes(signal))
          return { result, files }
        })

      // Writers run one at a time in implementationOrder; each node's
      // verification overlaps the next node's writer.
      const results = await ctx.pipeline(
        work,
        async (_, { node, decision }) => {
          const { result, files } = await writeNode(
            `align:${node.nodeId}`,
            alignPrompt(config, node, decision),
          )
          ctx.log(`${node.name}: ${result ? `${result.status} — ${result.summary}` : "no result"}`)
          return { node, decision, alignment: result, files }
        },
        async (previous) => {
          if (!previous.alignment) return { ...previous, verification: null }
          const verification = await ctx.agent(
            verifyPrompt(config, previous.node, previous.alignment),
            { label: `verify:${previous.node.nodeId}`, schema: verificationSchema },
          )
          return { ...previous, verification }
        },
        async (previous) => {
          const { node, alignment, verification } = previous
          if (!alignment || !verification || verification.pass) return previous
          ctx.log(`${node.name}: ${verification.findings.length} findings — one fix round`)
          const fixed = await writeNode(
            `fix:${node.nodeId}`,
            fixPrompt(config, node, alignment, verification),
          )
          const reverification = await ctx.agent(
            verifyPrompt(config, node, fixed.result ?? alignment),
            { label: `reverify:${node.nodeId}`, schema: verificationSchema },
          )
          return {
            ...previous,
            alignment: fixed.result ?? alignment,
            files: [...new Set([...previous.files, ...fixed.files])].sort(),
            verification: reverification,
          }
        },
      )

      // ------------------------------------------------------------ close
      ctx.phase("Close")
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
      const waveName = `${new Date().toISOString().slice(0, 10)}-alignment-${ctx.runId.slice(0, 8)}`
      const waveDir = join(parityOut, waveName)
      const aligned = results.filter(Boolean).map((r) => r.node.nodeId)

      await check("fmt", ["nx", "run-many", "-t", "fmt"])
      await check("figma:check", ["nx", "run", "pagopa-ui:figma:check"])
      await check("figma:parity:verify", ["nx", "run", "pagopa-ui-cli:figma:parity:verify"])
      if (aligned.length) {
        await check(
          "figma:parity:capture",
          [
            "nx",
            "run",
            "pagopa-ui-cli:figma:parity:capture",
            "--node",
            aligned.join(","),
            "--out",
            waveDir,
          ],
          { timeoutMs: 30 * 60_000 },
        )
        await check("figma:parity:report", [
          "nx",
          "run",
          "pagopa-ui-cli:figma:parity:report",
          "--wave",
          waveName,
          "--dir",
          waveDir,
        ])
      }

      let green = null
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
          const reply = await exclusive(() =>
            ctx.agent(greenFixPrompt(config, wave, green.tail), {
              label: `green-fix:${ctx.runId}`,
            }),
          )
          ctx.log(`Green fix: ${reply ? tail(reply, 6) : "no result"}`)
          green = await greenRun(2)
        }
        ctx.log(`Green chain: ${green.code === 0 ? "green" : `RED (exit ${green.code})`}`)
      }

      // ------------------------------------------------------------ report
      ctx.phase("Report")
      const report = {
        runId: ctx.runId,
        branch,
        wave: waveName,
        nodes: results.map((r, i) =>
          r
            ? {
                nodeId: r.node.nodeId,
                name: r.node.name,
                decision: r.decision.decision,
                reason: r.decision.reason,
                status: r.alignment?.status ?? "unknown",
                summary: r.alignment?.summary ?? "the writer returned no result",
                cases: r.verification?.cases ?? r.alignment?.cases ?? [],
                verified: r.verification?.pass ?? false,
                findings: r.verification?.findings ?? [],
                designRequest: r.alignment?.designRequest ?? "",
                openPoints: r.alignment?.openPoints ?? [],
                files: r.files,
              }
            : { nodeId: work[i].node.nodeId, name: work[i].node.name, status: "failed" },
        ),
        skipped: approved.filter((d) => d.decision === "skip").map((d) => d.nodeId),
        commands,
        greenChain: green ? { code: green.code, log: green.logFile } : "not run",
        preexistingChanges: dirty ? dirty.split("\n").length : 0,
        changedFiles: changedBetween({}, await worktreeHashes(signal)),
        delivery:
          "Nothing was committed. Review the diff, then commit (one commit per node on a figma-drift branch) and push yourself.",
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
