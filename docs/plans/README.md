# Execution plans: index, common rules and session kickoff

Origin: the design-system assessment and its actions A–G. This folder holds
plans and follow-up records for each flow, each executable by an autonomous
agent session. Each session reads **this file** (common rules) and **its own
plan**, and nothing else is mandatory.

## Flows and dependencies

| Flow | Plan or outcome                                                                                 | Depends on  | Can run with         |
| ---- | ------------------------------------------------------------------------------------------------ | ----------- | -------------------- |
| F0   | closed: the `figma-to-code` skill and the essential documents                                    | —           | —                    |
| F1   | [mcp-to-rest.md](./mcp-to-rest.md) (future, conditional)                                          | F0 (closed) | — (outside the wave) |
| B    | outcome: [prop conventions](../../.agents/skills/pagopa-ui-standards/references/prop-conventions.md) | F0          | C, D, A1             |
| C    | outcome: `packages/tokens`; follow-up: [foundation variables](../design-requests/2026-10-16-foundation-variables.md) | F0 | B, D, A1 |
| D    | outcome: Storybook accessibility contract; follow-up: [reflow conditions](../design-requests/2026-10-16-a11y-reflow-conditions.md) | F0 | B, C, A1 |
| A1   | [a1-fidelity-tooling.md](./a1-fidelity-tooling.md)                                               | F0          | B, C, D              |
| A2   | [a2-main-components.md](./a2-main-components.md)                                                 | C, D, A1    | E                    |
| E    | [e-ci-pipeline.md](./e-ci-pipeline.md) — deterministic drift PR, local implementation            | A1, B       | A2                   |

```
F0 ─┬─ B ──────────────┬─ E
    ├─ C ──┐           │
    ├─ D ──┼─ A2       │
    └─ A1 ─┴───────────┘
```

F1 is not part of the graph: it is a future, conditional plan. The phase on
visual aids can start right away; the one on variables opens only with a Figma
Enterprise plan and the `file_variables:read` scope.

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
5. **Green before review.** Run the full check of `AGENTS.md` (rule "Green
   before commit"): `pnpm typecheck && pnpm lint && pnpm format:check && pnpm
   test:tooling && pnpm test:coverage && pnpm figma:check && pnpm tokens:check &&
   pnpm assets:check && pnpm layers:check && pnpm docs:check && pnpm build &&
   pnpm library:check` (if it changes, the one documented in `AGENTS.md`
   wins). Stories run in a browser: if they do not start in the environment, the
   session says so explicitly and **does not** count those tests as passed.
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
   Do not push (the repository has no remote) and do not merge into `main`:
   the person does that.
10. **Final report.** Every session closes with: what was done, the commands
    run and their outcome, before/after numbers, what is missing and why,
    decisions that need the person.

## Prerequisites (owned by the person, one-off)

1. Commit everything to `main`. **Worktrees start from the last commit**:
   whatever is not committed does not reach the sessions.
2. `pnpm install` works and the last `pnpm figma:check` is green.
3. `.figma/` (full snapshot, 160 MB, outside git) exists in the main
   directory: the flows that read design data need it (C, A1, A2).
4. For E and for the on-demand baseline of A1: a GitHub repository created and
   the secrets ready (`FIGMA_TOKEN` and `DRIFT_PR_TOKEN` for E; a Chromatic token
   for A1). The other flows do not need them.

## How to start a session

Example for A1. For the other flows only the branch and plan names change.

```sh
# from the main repository directory
git worktree add ../pagopa-ui-a1 -b plan/a1-fidelity-tooling main
cd ../pagopa-ui-a1
pnpm install
ln -s ../pagopa-ui/.figma .figma   # shared snapshot (the main directory is called pagopa-ui)
export FIGMA_TOKEN=...            # only if the flow requires it (A1, A2, C)
copilot                           # GitHub Copilot CLI in the worktree
```

First message in the session (adapt the plan file):

```text
You are flow A1 of the plan in docs/plans/. Read docs/plans/README.md (common
rules) and docs/plans/a1-fidelity-tooling.md, then execute the plan
autonomously: classify, implement, verify with the acceptance commands and
close with the required report. Do not touch the files of other flows. Stop and
ask only for the decisions listed in the plan as "to ask".
```

Operating rules:

- **Order.** B, C, D and A1 start from `main` in parallel. A2 starts when C and
  D are in `main`. E starts when A1 and B are in `main`.
- **Storybook in parallel.** Every session that starts Storybook uses a
  different port (`pnpm exec storybook dev -p 6007`, and for the comparison
  tools `STORYBOOK_URL=http://localhost:6007`). Port 6006 belongs to the main
  worktree.
- **Sessions are independent.** Parallel sessions do not talk to each other:
  dependencies are passed only through `main`.

## How to merge a session (the person)

```sh
cd /Users/danilo.spinelli/Developer/pagopa-ui          # main directory, branch main
git log --oneline main..plan/a1-fidelity-tooling       # review the commits
git diff --stat main...plan/a1-fidelity-tooling
git merge --no-ff plan/a1-fidelity-tooling
git worktree remove ../pagopa-ui-a1 && git branch -d plan/a1-fidelity-tooling
```

If two parallel flows touched the same file, the second one to be merged first
runs `git rebase main` in its worktree and re-runs the checks.
