# Figma drift handoff

The weekly drift job opens one pull request on `figma-drift/<date>`. The job has
already refreshed the inventory, queued the delta as `pending` and refreshed the
offline evidence; the alignment is done by the person and their local agent on
that branch. CI never runs a coding agent.

The workflow uploads `delta.json`, `run.json` and `pr-body.md` as artifacts
(retention 14 days). The branch carries the same `delta.json` inputs in the pull
request body: the classes, the nodes, the work order and the summaries.

## 1. Create the worktree

From the main repository directory:

```sh
git fetch origin
git worktree add ../pagopa-ui-drift -b figma-drift/<date> origin/figma-drift/<date>
cd ../pagopa-ui-drift
pnpm install
```

## 2. Credentials

Live Figma steps need the read-only token, exported by the person in the shell
that runs the agent:

```sh
export FIGMA_TOKEN=...
```

The token needs `file_content:read` and `library_content:read`. Never read,
source or commit `.env`; the tools read the process environment only. When the
token is missing, stop the live step and work from the committed evidence slice:
`parity check --case <id>` still reads the source side without a token, and
Storybook is still required for the render.

## 3. Read the handoff

1. The pull request body: summary, per-node classes and devices, evidence ids and
   reference images, the artifacts.
2. `delta.json`: `counts`, `nodes` per class, `implementationOrder`, the device
   and coverage summaries.
3. The `figma-to-code` skill, delta use case, and its references
   (`delta.md`, `visual-parity.md`, `devices.md`, `node-review.md`,
   `definition-of-done.md`, `parity-tooling.md`).
4. The registry note of each node: it is binding.

## 4. Work in `implementationOrder`

One node at a time, one commit per node. For each node:

```sh
pnpm nx run pagopa-ui-cli:figma:parity:queue --node <id>
pnpm nx run pagopa-ui-cli:figma:parity:cases --sync --node <id> --dry-run
pnpm nx run pagopa-ui-cli:figma:parity:check --node <id> --devices   # device axis
pnpm nx run pagopa-ui-cli:figma:parity:check --case <caseId>
```

Fix the component or the story, save the reviewed case with
`--save-case --note "reviewed: …"`, and update the registry (`status`, `target`,
`storyExports`, note). A draft is not coverage. At most three fix passes per
case, then a residue with a reason or a written blocker.

A design decision that cannot be made in code leaves the node `pending`, goes
to `docs/design-requests/` and never enters the component.

## 5. Checks

```sh
pnpm nx run pagopa-ui:figma:check
pnpm nx run pagopa-ui:foundation:check
pnpm nx run pagopa-ui:layers:check
pnpm nx run pagopa-ui-cli:figma:parity:verify
pnpm nx run pagopa-ui-cli:test
```

Then the full green chain of `CONTRIBUTING.md`. Stories run in a browser: when
they cannot start, say so and do not count them as passed.

## 6. Deliver

Commit the alignment on the drift branch. The person pushes, reviews and merges;
the session does not push, merge or open a pull request. Merging is the review
record.

## Forbidden

- Any write to Figma: no `use_figma`, no Code Connect publish, no renaming or
  editing a node.
- Changing the comparison tools, the public API, the tokens or the instructions
  without an explicit decision.
- Making a node `implemented` without a reviewed render.
- Bulk approval: one node at a time, one decision per node.

## Metrics

The workflow records two durations:

- `handoffPrAt − figmaChangeAt`: from the run start to the pull request creation,
  in `run.json`.
- `mergedAt − handoffPrAt`: read after the merge with
  `gh pr view <number> --json mergedAt`; a monthly query is enough.

The drift schedule stays weekly, Monday 04:00 UTC, until both metrics have been
measured.
