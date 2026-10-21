# Execution plans: index, common rules and session kickoff

Origin: the design-system assessment and its actions A–G. This folder holds
plans and follow-up records for each flow, each executable by an autonomous
agent session. Each session reads **this file** (common rules) and **its own
plan**, and nothing else is mandatory.

On 2026-10-21 the A1, A2 and E plans were consolidated into
[figma-fidelity-and-drift.md](./figma-fidelity-and-drift.md); the three old
files were removed. The as-is is the monorepo: tools in `packages/ui-cli`,
components in `packages/pagopa-ui`, stories in `apps/storybook`.

## Flows and dependencies

| Flow | Plan or outcome                                                                                                                                           | Depends on         | Can run with         |
| ---- | --------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------ | -------------------- |
| F0   | closed: the `figma-to-code` skill and the essential documents                                                                                             | —                  | —                    |
| F1   | [mcp-to-rest.md](./mcp-to-rest.md) (future, conditional)                                                                                                  | F0 (closed)        | — (outside the wave) |
| B    | closed outcome: [prop conventions](../../.agents/skills/pagopa-ui-standards/references/prop-conventions.md)                                               | F0                 | —                    |
| C    | closed outcome: `packages/tokens`; follow-up: [foundation variables](../design-requests/2026-10-16-foundation-variables.md)                               | F0                 | —                    |
| D    | closed outcome: Storybook accessibility contract; follow-up: [reflow conditions](../design-requests/2026-10-16-a11y-reflow-conditions.md)                 | F0                 | —                    |
| A/E  | [figma-fidelity-and-drift.md](./figma-fidelity-and-drift.md) — corpus gate, evidence bundle, opt-in Chromatic, guarded drift handoff, component burn-down | F0; B, C, D closed | —                    |
| F2   | [pipeline-proposal.md](./pipeline-proposal.md) — deep checks in parallel jobs; sharding and cache are future work                                         | —                  | —                    |

```
F0 ─┬─ B ─┐
    ├─ C ─┼─ A/E
    └─ D ─┘
```

F1 is not part of the graph: it is a future, conditional plan. F2 landed its
first milestone (the parallel jobs) and its remaining work is future and
independent of the wave above. The phase on visual aids can start right away;
the one on variables opens only with a Figma Enterprise plan and the
`file_variables:read` scope.

## Rules common to every session

1. **Figma is read-only.** No writes to Figma, no tool that writes (Code
   Connect, `use_figma`…). The token is used to read only.
2. **Credentials.** Never read, load or print `.env`. The Figma token is the
   environment variable `FIGMA_TOKEN`, exported by the person in the session
   shell (scopes `file_content:read` and `library_content:read`). If it is
   missing, the session stops at whatever requires it and says so.
3. **One branch and one worktree per session.** Never work on `main`. Never
   touch the files of another flow (the "ownership" table of each plan). If a
   change outside your scope is needed, note it in the report and carry on.
4. Flows do not modify `AGENTS.md`, `CONTRIBUTING.md`, `README.md` or
   `SKILL.md`. They add one reference file to the `figma-to-code` skill and one
   row to the use-case index of `SKILL.md` (new rows are written one per line to
   reduce conflicts).
5. **Green before review.** Run [the green chain](../../CONTRIBUTING.md#the-green-chain)
   in full through Nx. Stories run in a browser: if they do not start in the
   environment, the session says so explicitly and **does not** count those tests
   as passed.
6. **Numbers must be re-measured.** The counts in the plans come from the
   report and may have changed: every session re-measures its own before
   starting and reports "before/after".
7. **CHANGELOG.** Every change that alters rendering or the public API gets a
   row under "Unreleased" in `CHANGELOG.md` (one row per entry).
8. **No history in the instructions.** What is written in the skill, in
   `AGENTS.md` and in the READMEs is about how to operate, not about how a
   decision was reached.
9. **Commit.** Messages in conventional-commit style, trailer
   `Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>`.
   Do not push and do not merge into `main`: the person does that.
10. **Final report.** Every session closes with: what was done, the commands
    run and their outcome, before/after numbers, what is missing and why,
    decisions that need the person.

## Prerequisites (owned by the person, one-off)

1. Commit everything to `main`. **Worktrees start from the last commit**:
   whatever is not committed does not reach the sessions.
2. `pnpm install` works and the last `pnpm figma:check` is green.
3. `.figma/` (full snapshot, 160 MB, outside git) exists in the main
   directory: the live parity wave needs it (A/E M5) and the evidence refresh
   reads it. The committed evidence bundle lets a clone read the source side
   without it; Storybook is still required for a render.
4. For A/E: a GitHub repository created and the secrets ready. The drift job
   needs `FIGMA_TOKEN` and `DRIFT_PR_TOKEN`; the opt-in Chromatic baseline needs
   `CHROMATIC_PROJECT_TOKEN`. The agent writes the workflow and the secrets
   document; the person inserts the secrets.

## How to start a session

Example for A/E. For the other flows only the branch and plan names change.

```sh
# from the main repository directory
git worktree add ../pagopa-ui-fidelity -b plan/figma-fidelity main
cd ../pagopa-ui-fidelity
pnpm install
ln -s ../pagopa-ui/.figma .figma   # shared snapshot (the main directory is called pagopa-ui)
export FIGMA_TOKEN=...            # only for the live steps
copilot                           # GitHub Copilot CLI in the worktree
```

First message in the session (adapt the milestone and the plan file):

```text
You are the implementing agent for docs/plans/figma-fidelity-and-drift.md.
Read docs/plans/README.md (common rules) and the plan, then execute milestone
M1..M4 autonomously: implement, verify with the acceptance commands and close
with the required report. Do not start M5 (the component burn-down) in this
session. Do not touch the files of another flow. Stop and ask only for the
decisions listed in the plan as "to ask".
```

Operating rules:

- **Order.** A/E starts from `main` after F0, B, C and D are closed. M1–M4 are
  the tooling and drift wave; M5 is a separate, multi-session burn-down.
- **Storybook in parallel.** Every session that starts Storybook uses a
  different port (`pnpm exec storybook dev -p 6007`, and for the comparison
  tools `STORYBOOK_URL=http://localhost:6007`). Port 6006 belongs to the main
  worktree.
- **Sessions are independent.** Parallel sessions do not talk to each other:
  dependencies are passed only through `main`.

## How to merge a session (the person)

```sh
cd /Users/danilo.spinelli/Developer/pagopa-ui          # main directory, branch main
git log --oneline main..plan/figma-fidelity       # review the commits
git diff --stat main...plan/figma-fidelity
git merge --no-ff plan/figma-fidelity
git worktree remove ../pagopa-ui-fidelity && git branch -d plan/figma-fidelity
```

If two parallel flows touched the same file, the second one to be merged first
runs `git rebase main` in its worktree and re-runs the checks.
