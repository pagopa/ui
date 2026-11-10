#!/usr/bin/env bash
# Build-time setup for the figma-to-code evals (harbor-bench `harbor/` overlay).
#
# The skill runs inside a real pagopa/ui checkout, so this clones the
# repository at a pinned commit, installs the toolchain the `ui-cli` commands
# need, and hands the agent a clean worktree. This runs before the generated
# baseline commit: everything it writes is the agent's starting workspace.
set -euo pipefail

NODE_VERSION="${NODE_VERSION:-24.14.1}"
PNPM_VERSION="${PNPM_VERSION:-11.28.6}"
PAGOPA_UI_REPO="${PAGOPA_UI_REPO:-https://github.com/pagopa/ui.git}"
# The ref the agent's workspace is cut from: it must already carry the `ui-cli`
# this skill calls, so a command the skill names cannot fail on a missing flag.
# Re-pin it to the merge commit once `main` carries the node card and the JSON
# writer that degrades without the formatter.
PAGOPA_UI_REF="${PAGOPA_UI_REF:-b0bdc306a467d33db2822641f87504226028c27b}"

WORKSPACE=/workspace

# TARGETARCH is only populated by buildx; derive the architecture from the
# image itself so a native arm64 build does not install an x64 Node.
case "$(uname -m)" in
  aarch64 | arm64) node_arch=arm64 ;;
  *) node_arch=x64 ;;
esac

if ! command -v node >/dev/null 2>&1; then
  echo "figma-to-code eval: installing Node $NODE_VERSION (linux-$node_arch)"
  curl -fsSL "https://nodejs.org/dist/v$NODE_VERSION/node-v$NODE_VERSION-linux-$node_arch.tar.gz" \
    | tar -xz -C /usr/local --strip-components=1
fi
command -v pnpm >/dev/null 2>&1 || npm install -g "pnpm@$PNPM_VERSION" >/dev/null

echo "figma-to-code eval: checking out pagopa/ui at $PAGOPA_UI_REF"
scratch="$(mktemp -d)"
git init -q "$scratch/repo"
git -C "$scratch/repo" remote add origin "$PAGOPA_UI_REPO"
git -C "$scratch/repo" fetch -q --depth 1 origin "$PAGOPA_UI_REF"
git -C "$scratch/repo" checkout -q -B main FETCH_HEAD
shopt -s dotglob
cp -a "$scratch/repo"/* "$WORKSPACE"/
rm -rf "$scratch"
rm -f "$WORKSPACE/prepare.sh" "$WORKSPACE/.dockerignore"

# The skill under test is injected by harbor-bench; the copy in the repository
# would shadow it (and leak its evals into the workspace).
rm -rf "$WORKSPACE/.agents/skills/figma-to-code"

cd "$WORKSPACE"
echo "figma-to-code eval: installing the ui-cli runtime dependencies"
# Only what `packages/ui-cli/src/cli.ts` imports at runtime. A workspace install
# is impossible here: the root devDependencies resolve from GitHub Packages and
# need a token. The Nx targets, linters and test runners stay out on purpose —
# the evals grade the Figma flow, not the workspace gates.
deps="$(mktemp -d)"
(
  cd "$deps"
  npm init -y >/dev/null
  npm install --silent --no-audit --no-fund citty@0.2.2 zod@4.6.7 oxc-parser@0.127.0 sharp@0.35.5
)
cp -a "$deps/node_modules" "$WORKSPACE/packages/ui-cli/node_modules"
rm -rf "$deps"
npm cache clean --force >/dev/null 2>&1 || true

# pnpm installs the whole workspace before running a script when node_modules
# does not match the lockfile. That install resolves the root devDependencies
# from GitHub Packages and needs a token, so it would fail — noisily and slowly
# — on every `pnpm ui-cli` call. Turn the pre-run check off.
printf 'verifyDepsBeforeRun: false\n' >>"$WORKSPACE/pnpm-workspace.yaml"

cat >"$WORKSPACE/README.md" <<MD
# figma-to-code eval workspace

- \`pnpm ui-cli <command>\` runs \`packages/ui-cli/src/cli.ts\` from source.
- Only the CLI's runtime dependencies are installed here: the Nx targets, the
  linters and the test runners are not, so \`pnpm nx ...\` does not run.
- The Figma token, when the task has one, arrives as \`FIGMA_TOKEN\`.
MD

rm -f "$WORKSPACE/prepare.sh"

# The scoped-queue task asks about a delta on named nodes, and the live Figma
# file has not moved on them: without a delta the task's own criterion
# ("scoped, never widened") is unsatisfiable, because only `--full` can name the
# nodes. The delta exists by construction instead — the committed inventory is
# staled on exactly those nodes, so the live read the task pins reports them as
# changed. The two are chosen for a narrow dependency closure: their affected
# nodes fit the read's line cap, so one scoped read carries every fact the task
# asks for. The other two tasks name nodes this leaves alone.
node --input-type=module -e '
  import fs from "node:fs"
  import { createHash } from "node:crypto"
  const { compareSnapshots } = await import("./packages/ui-cli/src/figma/snapshot.ts")
  const file = "packages/pagopa-ui/src/catalog/figma/inventory.json"
  const seeded = ["1293:8394", "1333:16408"]
  const live = JSON.parse(fs.readFileSync(file, "utf8"))
  const inventory = JSON.parse(fs.readFileSync(file, "utf8"))
  for (const node of inventory.components) {
    if (!seeded.includes(node.nodeId)) continue
    node.designFingerprint = createHash("sha256").update(`stale:${node.nodeId}`).digest("hex")
  }
  const changed = compareSnapshots(inventory.components, live.components)
    .changed.map((node) => node.nodeId)
    .sort()
  if (changed.join(", ") !== [...seeded].sort().join(", ")) {
    console.error(`figma-to-code eval: the seeded delta is [${changed.join(", ")}], expected [${seeded.join(", ")}]. The inventory schema or the compare changed.`)
    process.exit(1)
  }
  fs.writeFileSync(file, `${JSON.stringify(inventory, null, 2)}\n`)
'

# The two run-reading evals need a run to read, and a run is git-ignored output:
# the image writes one. `eval-status` is a wave that stopped cleanly for approval;
# `eval-checkpoint` is the same wave after a person edited the checkpoint by hand
# and left four problems behind. Both are read-only fixtures — an eval that
# rewrote one would be grading its own edit — and both use the vocabulary the
# skill documents.
align=packages/pagopa-ui/.figma/align
mkdir -p "$align/eval-status" "$align/eval-checkpoint"

cat >"$align/eval-status/decisions.json" <<JSON
[
  {
    "nodeId": "1:1",
    "name": "Accordion",
    "decision": "implement",
    "proposedBy": "analysis",
    "reason": "The header spacing changed and the token ladder already carries the value.",
    "devices": [],
    "dependencies": [],
    "existingCases": [],
    "rules": [],
    "comments": [],
    "deltas": ["header padding 12 → 16"],
    "plan": "move the header padding onto the space ladder",
    "openQuestions": [],
    "instructions": ""
  },
  {
    "nodeId": "1:2",
    "name": "Alert",
    "decision": "implement",
    "proposedBy": "analysis",
    "reason": "A new dismissible variant has no case yet.",
    "devices": [],
    "dependencies": [],
    "existingCases": [],
    "rules": [],
    "comments": [],
    "deltas": ["new dismissible variant"],
    "plan": "add the variant and one mobile case",
    "openQuestions": [],
    "instructions": ""
  }
]
JSON

cat >"$align/eval-status/decisions.md" <<'MD'
# figma-align decisions — run eval-status

Edit `decisions.json` beside this file: set `decision` to one of `implement`,
`review`, `map`, `exclude`, `design-request`, `skip` and add `instructions` to
steer the writer. Then resume the run
(`run_dynamic_workflow { resumeFromRunId: "eval-status" }`).

| Node | Name | Decision | Reason | Devices | Rules | Comments | Open questions |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `1:1` | Accordion | **implement** | The header spacing changed | — | 0 | 0 | 0 |
| `1:2` | Alert | **implement** | A new dismissible variant | — | 0 | 0 | 0 |

## Accordion (`1:1`) — implement

The header spacing changed and the token ladder already carries the value.

- Dependencies: none
- Existing cases: none
- Rules: none
- Open comments: none
- Deltas: header padding 12 → 16
- Plan: move the header padding onto the space ladder
- Open questions: none

## Alert (`1:2`) — implement

A new dismissible variant has no case yet.

- Dependencies: none
- Existing cases: none
- Rules: none
- Open comments: none
- Deltas: new dismissible variant
- Plan: add the variant and one mobile case
- Open questions: none
MD

cat >"$align/eval-status/status.json" <<JSON
{
  "version": 1,
  "runId": "eval-status",
  "outcome": "awaiting-approval",
  "observedAt": "2026-02-03T09:12:44.000Z",
  "branch": "figma-alignment-2026-02-03",
  "phase": "Decide",
  "route": "REST",
  "storybook": "http://localhost:6006",
  "reason": "The wave stopped at its checkpoint: 2 nodes await a decision.",
  "nextStep": "Edit packages/pagopa-ui/.figma/align/eval-status/decisions.json, then resume run eval-status.",
  "decisionsFile": "packages/pagopa-ui/.figma/align/eval-status/decisions.json",
  "nodes": [],
  "checks": [],
  "report": ""
}
JSON

# The wave is 1:1, 1:2 and 2:9. The edited file duplicates 1:1, carries a
# decision outside the six, names a node the wave does not contain and leaves
# two wave nodes without an entry: four problems, not one.
cat >"$align/eval-checkpoint/decisions.json" <<JSON
[
  {
    "nodeId": "1:1",
    "name": "Accordion",
    "decision": "implement",
    "proposedBy": "analysis",
    "reason": "The header spacing changed.",
    "instructions": ""
  },
  {
    "nodeId": "1:1",
    "name": "Accordion",
    "decision": "review",
    "proposedBy": "analysis",
    "reason": "The header spacing changed.",
    "instructions": ""
  },
  {
    "nodeId": "2:7",
    "name": "Banner",
    "decision": "refactor",
    "proposedBy": "analysis",
    "reason": "Not a recorded decision.",
    "instructions": ""
  }
]
JSON

cat >"$align/eval-checkpoint/decisions.md" <<'MD'
# figma-align decisions — run eval-checkpoint

Edit `decisions.json` beside this file: set `decision` to one of `implement`,
`review`, `map`, `exclude`, `design-request`, `skip` and add `instructions` to
steer the writer. Then resume the run
(`run_dynamic_workflow { resumeFromRunId: "eval-checkpoint" }`).

| Node | Name | Decision | Reason | Devices | Rules | Comments | Open questions |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `1:1` | Accordion | **implement** | The header spacing changed | — | 0 | 0 | 0 |
| `1:2` | Alert | **implement** | A new dismissible variant | — | 0 | 0 | 0 |
| `2:9` | Badge | **review** | The dot size is a design question | — | 1 | 0 | 0 |

## Accordion (`1:1`) — implement

The header spacing changed.

- Dependencies: none
- Existing cases: none
- Rules: none
- Open comments: none
- Deltas: header padding 12 → 16
- Plan: move the header padding onto the space ladder
- Open questions: none

## Alert (`1:2`) — implement

A new dismissible variant has no case yet.

- Dependencies: `1:1`
- Existing cases: none
- Rules: none
- Open comments: none
- Deltas: new dismissible variant
- Plan: add the variant and one mobile case
- Open questions: none

## Badge (`2:9`) — review

The dot size is a design question.

- Dependencies: none
- Existing cases: none
- Rules: card-7 `undecided` "May the dot shrink below 8px?" → design-request
- Open comments: none
- Deltas: none
- Plan: none — the rule is still open
- Open questions: may the dot shrink below 8px?
MD

cat >"$align/eval-checkpoint/status.json" <<JSON
{
  "version": 1,
  "runId": "eval-checkpoint",
  "outcome": "awaiting-approval",
  "observedAt": "2026-02-03T09:20:11.000Z",
  "branch": "figma-alignment-2026-02-03",
  "phase": "Decide",
  "route": "REST",
  "storybook": "http://localhost:6006",
  "reason": "The wave stopped at its checkpoint: 3 nodes await a decision.",
  "nextStep": "Edit packages/pagopa-ui/.figma/align/eval-checkpoint/decisions.json, then resume run eval-checkpoint.",
  "decisionsFile": "packages/pagopa-ui/.figma/align/eval-checkpoint/decisions.json",
  "nodes": [],
  "checks": [],
  "report": ""
}
JSON

# Fail fast: a broken workspace must break the image build, not the session.
if ! pnpm ui-cli figma status >/dev/null; then
  echo "figma-to-code eval: 'pnpm ui-cli figma status' failed in the prepared" \
    "workspace. Check PAGOPA_UI_REF and the ui-cli dependency install above." >&2
  exit 1
fi

# Every command that records state goes through the JSON writer, and `figma
# status` never reaches it, so the writer gets its own check: it writes and
# re-reads a scratch file. It needs no Figma token and leaves nothing behind.
if ! node --input-type=module -e '
  import fs from "node:fs"
  const { writeJson } = await import("./packages/ui-cli/src/lib/json.ts")
  const file = "packages/ui-cli/.writer-check.json"
  writeJson(file, { ok: true })
  const parsed = JSON.parse(fs.readFileSync(file, "utf8"))
  fs.rmSync(file)
  if (parsed.ok !== true) process.exit(1)
' >/dev/null; then
  echo "figma-to-code eval: the ui-cli JSON writer failed in the prepared" \
    "workspace. A command that records state would fail mid-session." >&2
  exit 1
fi

# The two run-reading evals grade a fixture, so a fixture that is missing or
# unparseable must break the build rather than the session that reads it.
if ! node --input-type=module -e '
  import fs from "node:fs"
  for (const run of ["eval-status", "eval-checkpoint"]) {
    const dir = `packages/pagopa-ui/.figma/align/${run}`
    const status = JSON.parse(fs.readFileSync(`${dir}/status.json`, "utf8"))
    if (status.runId !== run || status.outcome !== "awaiting-approval") process.exit(1)
    const decisions = JSON.parse(fs.readFileSync(`${dir}/decisions.json`, "utf8"))
    if (!Array.isArray(decisions) || decisions.length === 0) process.exit(1)
  }
' >/dev/null; then
  echo "figma-to-code eval: a run fixture under packages/pagopa-ui/.figma/align" \
    "is missing, is not JSON, or does not record the outcome the eval reads." >&2
  exit 1
fi

echo "figma-to-code eval: workspace ready"
