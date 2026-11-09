import assert from "node:assert/strict"
import * as fs from "node:fs"
import { test } from "node:test"
import { fileURLToPath } from "node:url"

const extension = new URL(
  "../../../../.github/extensions/figma-align/extension.mjs",
  import.meta.url,
)
const context = new URL(
  "../../../../.github/extensions/figma-align/verification-context.mjs",
  import.meta.url,
)
// The preamble ceiling of the context budget: every sub-agent pays this once,
// so the card carries invariants only and the task each prompt adds stays small.
const PREAMBLE_CEILING = 1024
const TASK_CEILING = 1280

let stubs = 0

async function loadWorkflow() {
  const dataUrl = (source) => `data:text/javascript,${encodeURIComponent(source)}`
  const sdkUrl = dataUrl(`
    // Independent SDK stub ${stubs++}.
    export const defineWorkflow = (definition) => definition;
    export const joinSession = async () => {};
  `)
  const source = `${fs
    .readFileSync(extension, "utf8")
    .replace('from "@github/copilot-sdk/extension"', `from "${sdkUrl}"`)
    .replace('from "./verification-context.mjs"', `from "${context.href}"`)
    .replace("fileURLToPath(import.meta.url)", `fileURLToPath(${JSON.stringify(extension.href)})`)}
    export {
      alignPrompt, analysePrompt, fixPrompt, greenFixPrompt, mcpGatePrompt, preamble,
      readConfig, verifyPrompt
    };
  `
  return import(dataUrl(source))
}

const workflow = await loadWorkflow()
const config = workflow.readConfig()
const ROOT = fileURLToPath(new URL("../../../../", import.meta.url)).replace(/\/$/, "")
const card = "packages/pagopa-ui/.figma/align/run-1/cards/61-2786.txt"
const node = {
  nodeId: "61:2786",
  name: "NotificationSettings",
  status: "pending",
  pageName: "Notifications",
  target: { module: "src/components/notification-settings.tsx", export: "NotificationSettings" },
  storyIds: ["notification-settings--default"],
  classes: ["changed"],
  card,
}
const decision = {
  nodeId: node.nodeId,
  decision: "review",
  reason: "the source gained a compact variant",
  devices: [],
  dependencies: [],
  rules: [],
  comments: [],
  deltas: [],
  plan: "re-run the saved case and fix the padding",
  openQuestions: [],
  instructions: "",
}
const alignment = {
  nodeId: node.nodeId,
  status: "implemented",
  summary: "re-ran the case",
  cases: [],
  rules: [],
  comments: [],
  designRequest: "",
  preview: "",
  openPoints: [],
  commands: [],
}
const verification = { nodeId: node.nodeId, pass: false, cases: [], findings: ["padding is 4px"] }

function bytes(text) {
  // The check measures the template, whose `${ROOT}` stays a token: put the
  // token back so the assertion does not depend on the checkout path.
  return Buffer.byteLength(text.replace(ROOT, "${ROOT}"))
}

test("the contract card every sub-agent reads stays under the preamble ceiling", () => {
  const text = workflow.preamble(config)
  assert.ok(bytes(text) <= PREAMBLE_CEILING, `the contract card is ${bytes(text)} bytes`)
})

test("the contract card carries the invariants and leaves the rules to the skills", () => {
  const text = workflow.preamble(config)
  for (const [name, pattern] of [
    ["the skills own the rules", /figma-to-code[\s\S]*pagopa-ui-standards[\s\S]*skills/],
    ["source gate", /Figma is read-only[\s\S]*never use_figma/],
    ["read-only analysis", /read-only: no file created, edited or deleted, no `--save-case`/],
    ["writer discipline", /one writer at a time[\s\S]*never commit, push/],
    ["completion criteria", /is not a pass/],
  ]) {
    assert.match(text, pattern, name)
  }
})

test("analysis, alignment, verification and the fix read the card path", () => {
  const prompts = {
    analyse: workflow.analysePrompt(config, node),
    align: workflow.alignPrompt(config, node, decision),
    verify: workflow.verifyPrompt(config, node, alignment),
    fix: workflow.fixPrompt(config, node, alignment, verification),
  }
  for (const [name, text] of Object.entries(prompts)) {
    assert.ok(text.includes(card), `${name} names the card path`)
    assert.doesNotMatch(text, /figma:brief|figma brief/, `${name} re-invokes the brief`)
  }
})

test("the gate and the green fix add a bounded task to the contract card", () => {
  const base = bytes(workflow.preamble(config))
  const gate = bytes(workflow.mcpGatePrompt(config))
  const green = bytes(
    workflow.greenFixPrompt(config, [node], "packages/pagopa-ui/src/a.tsx > a11y: expected 0"),
  )
  assert.ok(gate - base <= TASK_CEILING, `the gate adds ${gate - base} bytes`)
  assert.ok(green - base <= TASK_CEILING, `the green fix adds ${green - base} bytes`)
})

test("the loop reads one brief per node and hands its card to every sub-agent", () => {
  const source = fs.readFileSync(extension, "utf8")
  const invocations = source.match(/\["nx", "run", "pagopa-ui-cli:figma:brief"/g) ?? []
  assert.equal(invocations.length, 1, "the brief is read once per node, by the loop")
  assert.match(source, /"pagopa-ui-cli:figma:brief", "--node", id, "--card"/)
})
