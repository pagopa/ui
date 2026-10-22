# Figma fidelity and drift — one plan for the remaining work

Status: proposed, 2026-10-21. This plan supersedes `a1-fidelity-tooling.md`,
`a2-main-components.md` and `e-ci-pipeline.md`, which are removed with it.
Common rules: [README.md](./README.md).

The three old plans described a repository whose tooling lived in `scripts/`.
That is no longer the as-is: the tools live in `packages/ui-cli`, the components
in `packages/pagopa-ui`, the stories in `apps/storybook`, and the numeric parity
loop plus the delta-scoped device gate are already in `main`. This plan keeps
what is still valuable, drops what the current design deliberately does not do,
and turns the remainder into three outcomes:

1. **Reproducibility** — a parity proof that runs without the 160 MB snapshot
   and without a token, and a pinned Figma image per reviewed case.
2. **Completion** — the pending queue and the main components reach the
   current definition of done, one node at a time.
3. **Automation** — the drift run becomes a deterministic, guarded handoff with
   machine-readable artifacts; no coding agent runs in CI.

## 1. Why this plan exists

The old plans are not wrong about the goals, but most of their references are
dead: `scripts/figma-parity`, `scripts/figma-devices.mjs`,
`docs/reports/2026-10-15-figma-parity-hardening-handoff.md` and the A2 list of
components no longer exist. The current source of truth is:

- the `figma-to-code` skill and its references (`parity-tooling`,
  `visual-parity`, `devices`, `definition-of-done`, `node-review`);
- the ADRs, especially [0001](../decisions/0001-rework.md) and
  [0004](../decisions/0004-device-axis.md);
- the tooling README and the CLI itself
  ([packages/ui-cli/README.md](../../packages/ui-cli/README.md));
- the committed catalogue under `packages/pagopa-ui/src/catalog/figma/`.

This plan is written against those, not against the old paths.

## 2. As-is, measured on 2026-10-21

Every number below is reproducible with the commands in Appendix A. Re-measure
before starting; the queue moves.

### 2.1 What is already delivered

| Area                        | As-is                                                                                                                                                                                     | Consequence                                                              |
| --------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| Tooling location            | `packages/ui-cli/src/figma` and `packages/ui-cli/src/parity`; Nx targets                                                                                                                  | The old `scripts/*` ownership is void                                    |
| Parity loop                 | `source`, `render`, `diff`, `check`, `capture`, `report`, `cases`, `queue`; 2 px tolerance; residues; device and layout scope; 88 cases on 34 nodes                                       | The numeric comparison is the gate; there is no pixel-diff gate          |
| Delta gate                  | `figma:check` fails a node in the live delta that stays `implemented` without one case per declared device or a reasoned `device-exceptions.json` entry; historical nodes warn            | A1 action 4 is done; it must not be re-opened                            |
| Device vocabulary           | `device-policy.json`, 52 sets with an axis, 129 declared devices, 18/18 aliases resolved, 0 unmapped                                                                                      | The vocabulary is committed data, not a component list                   |
| Implemented device coverage | 29 implemented sets: 66/66 declared device cases covered, 0 missing, 0 exceptions                                                                                                         | The gate is green on the implemented sets                                |
| Catalogue                   | 353 inventory nodes; inventory statuses 299 implemented, 26 pending, 9 excluded, 19 mocked; registry has 273 entries (223 implemented, 26 pending, 5 excluded, 19 mocked) plus bulk rules | The pending queue is the visible work list                               |
| A11y                        | The shared contract in `apps/storybook/src/support/a11y-contract.ts` runs after every story: keyboard order, names, widget behaviour, 320 px reflow and text spacing                      | The old D outcome is in place; there is no separate a11y table to fill   |
| Tokens and foundations      | `tokens:check`, `foundation:check`, `layers:check` are in the green chain                                                                                                                 | The old C outcome is in place; no new magic values                       |
| Drift workflow              | `.github/workflows/figma-drift.yml`: weekly Monday 04:00 UTC plus `workflow_dispatch`; REST read; one PR with a generated body; force push to `figma-drift/<date>`                        | The deterministic path exists; the artifacts and the branch guard do not |

### 2.2 What remains

| Gap                            | Current evidence                                                                                                                                                            | Why it matters                                                                                         |
| ------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| Offline parity proof           | `parity check`/`source` require `.figma/live-rest.json` and Storybook; no committed source slice and no committed reference image                                           | A clean clone or CI cannot reproduce the source side without the person's token and snapshot           |
| Corpus validation in the gate  | `validateCaseFile` runs in `packages/ui-cli/tests/parity/*`, not in `figma:check`                                                                                           | A malformed case fails the test project, not the catalogue gate; the old A1 action 3 is only half done |
| Pending queue                  | 26 pending nodes; 23 of them have no committed case; 2 pending device sets miss 3 device cases (`TimelineDrawer` 2, `TableCellRow` 1)                                       | The implemented coverage is 66/66, but the queue is where the unverified debt sits                     |
| Main components without a case | 192 implemented nodes have no case; 37 of them are not `PagoPAIcon` (Button 192:1208, Checkbox, RadioField, Avatar, Badge, Chip, Tooltip, Snackbar, Separator, Timeline, …) | Device sets are gated; non-device components are not. The old A2 "main components" are partly here     |
| Variant coverage               | `parity cases --sync --dry-run` proposes 123 state/property cases; 73 are skipped because no sibling case exists                                                            | The proposals are a work list, not a mandate; principal states still need review                       |
| "Order" axis warning           | `figma:check` warns that the `Order` axis of `127:1510` (Pagination) declares `Mobile`, which names a device                                                                | A permanent warning masks the next real device warning                                                 |
| Side-by-side evidence          | The drift PR body lists nodes, devices and links; it has no reference image and no machine-readable delta                                                                   | Review is textual; the old A1 action 5 is not done                                                     |
| Drift artifacts                | `figma sync --rest` does not persist the snapshot; the workflow writes only the PR body; no `delta.json`, no `run.json`                                                     | The handoff is not reproducible and cannot be measured                                                 |
| Branch guard                   | The workflow force-pushes `figma-drift/<date>` on every run                                                                                                                 | A same-day re-run can destroy work a person already did on the branch                                  |
| Chromatic                      | `@chromatic-com/storybook` is installed in `apps/storybook`, but there is no configuration and no workflow                                                                  | The opt-in visual baseline is unused                                                                   |
| Handoff and secrets docs       | `docs/plans/e-ci-handoff.md` and `docs/plans/e-ci-secrets.md` do not exist                                                                                                  | The person has no exact local procedure and no secret/rotation table                                   |

### 2.3 What changed in the old plans

| Old item                         | As-is                                                                                                              | This plan                                                                |
| -------------------------------- | ------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------ |
| A1 A5, committed reference slice | Not done                                                                                                           | M2 evidence bundle: compact source slice                                 |
| A1 A7, reference image per case  | Not done, and `parity-tooling.md` explicitly says there is no pixel baseline                                       | M2: pinned Figma PNG as review evidence, never a pixel gate              |
| A1 A6, CI-friendly verification  | `validateCaseFile` only in tests                                                                                   | M1: `parity verify` plus the corpus in `figma:check`                     |
| A1 gate on the delta             | Done (RD1)                                                                                                         | Keep; add a regression test, do not redesign                             |
| A1 side-by-side in the PR        | Not done                                                                                                           | M2 + M4: reference links in the body, render attached by the local agent |
| A1 Chromatic                     | Not done                                                                                                           | M3: opt-in workflow, never a required check                              |
| A1 "Order" axis                  | Still warns                                                                                                        | M1: reasoned policy exception, no component names                        |
| A2 dependencies B, C, D          | Closed and absorbed                                                                                                | Replaced by the current green chain                                      |
| A2 component list                | Stale: `Select`, `Radio`, `Switch` are now `SelectField`, `RadioField`, `SwitchField`; Button has two source nodes | M5: the queue and the registry are authoritative                         |
| A2 a11y table                    | No such table now                                                                                                  | The shared a11y contract is the gate                                     |
| E deterministic drift            | Workflow exists                                                                                                    | M4: artifacts, guard, docs, metrics                                      |
| E local handoff                  | Document missing                                                                                                   | M4: `docs/figma-drift-handoff.md`                                        |
| E secrets                        | Document missing                                                                                                   | M4: `docs/figma-drift-secrets.md`                                        |
| E no agent in CI                 | Already the design                                                                                                 | Keep; the local agent is the implementation environment                  |

## 3. Decisions

1. **The gate stays numeric.** The verdict is the 2 px property comparison plus
   the structural and responsive deltas. A committed reference PNG is review
   evidence; it is not diffed by pixels and does not block a merge by itself.
   This keeps the current `parity-tooling.md` contract true.
2. **The evidence bundle is generated, not hand-edited.** A command writes the
   compact source slice, the pinned Figma PNGs and a manifest with hashes and
   source fingerprints. The bundle is committed so a clone can run the source
   side without `.figma/` and without a token.
3. **The queue is the scope.** No hand-written list of components drives the
   work. The 26 pending nodes, the 3 missing device cases and the 37 non-icon
   implemented nodes without a case are the measured work list; the implementing
   agent reads `parity queue` and `registry.json` at the start of every session.
4. **One node at a time, one commit per node.** No bulk approval. A node becomes
   `implemented` only after a reviewed render; a node that needs a design
   decision stays `pending` with the decision written in its note.
5. **CI never runs a coding agent.** The drift job fetches, compares, refreshes
   the inventory, writes the evidence and opens one PR. The person and their
   local agent implement on the branch.
6. **Figma remains read-only.** No write tool, no Code Connect publish, no
   `use_figma`; the token is used for GET requests only.
7. **Chromatic is opt-in.** It is triggered by `workflow_dispatch` or by a
   `chromatic` pull-request label, never by default and never as a required
   check. A missing token skips the opt-in run, not the PR. The project and the
   token are approved; the person creates them.
8. **The old plans are removed.** `a1-fidelity-tooling.md`,
   `a2-main-components.md` and `e-ci-pipeline.md` are deleted; the README index
   points here.
9. **Evidence images are committed under a 10 MB cap.** If the cap is exceeded,
   the bundle is reduced to the main components; the cap is not raised.
10. **M5 starts with the 26 pending nodes**, then the 37 implemented non-icon
    components without a case. Icons remain out of the parity scope.
11. **The Figma design owner decides the three blockers**: the TimelineDrawer
    mobile edge and header rhythm (the 416 width is already the shared width,
    with a 1px residue against 417), the TableCellRow card export and the
    Pagination `Order` semantics. The nodes stay `pending` until those decisions
    are recorded.
12. **The drift schedule stays weekly, Monday 04:00 UTC.** It is re-evaluated
    only after the two metrics have been measured.
13. **The branch guard fails closed.** A branch with commits that are not the
    bot's is not pushed and not updated; the job stops with a clear message.

## 4. Return on investment

The costs are indicative and must be re-measured after M1. The order is chosen
so the cheapest protective work lands first.

| Action                                                                      | Cost              | Return                                                                                                                                                              | Risk if skipped                                                                                                                | Measure                                                                                                            |
| --------------------------------------------------------------------------- | ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------ |
| **M1** corpus in `figma:check` + `parity verify` + `Order` policy exception | S — 1–2 days      | The gate proves the case corpus, not only the catalogue; the last permanent warning disappears; a broken case fails at `figma:check`                                | A malformed case can pass the catalogue gate; a real device warning hides behind the `Order` one                               | `figma:check` has a `cases:` line; `parity verify` exits 0 without a snapshot; warnings 0                          |
| **M4** drift artifacts + branch guard + handoff/secrets docs                | M — 2–4 days      | The weekly PR becomes a reproducible handoff: `delta.json`, `run.json`, evidence links; a same-day re-run cannot destroy local work; the cycle is measurable        | A force push can lose a person's commits; the PR has no machine-readable delta and no metrics                                  | `delta.json`/`run.json` uploaded; guard test fails on a moved branch; `handoffPrAt − figmaChangeAt` recorded       |
| **M3** Chromatic on request                                                 | S — 1 day         | Opt-in visual regression across the stories at mobile and desktop widths, with no pull-request wait                                                                 | Code-side visual regressions outside the 34 mapped parity nodes go unseen                                                      | A labelled PR runs it; a normal PR runs nothing; no token in logs                                                  |
| **M2** evidence bundle (slice + references + manifest)                      | M — 3–5 days      | Parity source and a pinned Figma image per case are reproducible without `.figma`/token; the drift PR can carry the reference; the local agent only adds the render | Every parity run needs a 100+ MB snapshot and a token; review stays textual                                                    | `parity check --case <id>` works in a clone without `.figma`; bundle ≤ 10 MB; every case has a manifest entry      |
| **M5** pending queue and main components                                    | L — multi-session | Closes the 26 pending nodes, the 3 missing device cases and the first case for the main non-device components; the quality debt becomes visible and shrinks         | The pending queue stays; "implemented" remains unverified for 26 nodes and the main non-device components have no render proof | pending 26 → 0 (or every remaining one has a written blocker); device 69/72 → 72/72; unmapped 23 → 0 for the queue |

The highest return per day is **M4**: it protects work, makes the drift PR
actionable and produces the two metrics the process needs. **M1** is a
prerequisite and is cheap. **M3** is additive and opt-in. **M2** is an enabler
for review and offline work; the PNGs are committed under the 10 MB cap and the
bundle is reduced to the main components if it grows past it. **M5** is the
largest investment and should start only after M1, so every closed node uses the
same loop.

## 5. Work plan

### M1 — Hermetic verification and policy closure

**Goal.** The catalogue gate also validates the parity corpus, and the last
permanent device warning is resolved with a reasoned policy entry.

**Actions.**

1. Add `validateCaseFile` to `packages/ui-cli/src/figma/sync.ts`:
   - load the cases after the device policy;
   - pass `registry`, `committed` inventory nodes and `devicePolicy`;
   - append errors to `fail` and warnings to `warnings`;
   - print a `cases:` line with the case count, errors, warnings and drafts.
   - The function already exists in `packages/ui-cli/src/parity/cases.ts`; do
     not duplicate its rules.
2. Add `parity verify`:
   - new subcommand in `packages/ui-cli/src/parity/cli.ts`;
   - runs `validateCaseFile`, `deviceCoverage` and (once M2 lands) the evidence
     check;
   - no snapshot, no Storybook, no network; `--json` for tooling;
   - exits 1 on errors, 0 with warnings.
   - Add the `figma:parity:verify` script to `packages/ui-cli/package.json`
     (Nx infers the target from the package script).
3. Close the `Order` warning:
   - extend `DevicePolicySchema` in `packages/ui-cli/src/schemas/devices.ts`
     with an optional `ignoredValues` list of `{ axis, value, reason }`;
   - in `packages/ui-cli/src/figma/devices.ts`, skip a non-device axis value
     that matches an ignored entry; report an error for an ignored entry that no
     inventory axis uses (a stale exception, like `device-exceptions.json`);
   - add the Pagination entry to
     `packages/pagopa-ui/src/catalog/figma/device-policy.json`:
     `Order` / `Mobile` with a generic reason ("the value names a page
     position, not a device") — no component name, file or path in the policy;
   - keep the `127:1510` registry note, which explains the mixed axis.
4. Tests:
   - `packages/ui-cli/tests/figma/sync.test.mjs`: a bad case in a temporary
     tree fails `figma:check`;
   - `packages/ui-cli/tests/figma/devices.test.mjs`: an ignored value suppresses
     the warning; a stale ignored value is an error; a duplicate axis/value is
     an error;
   - `packages/ui-cli/tests/parity/cases.test.mjs` stays the owner of the case
     schema.
5. Documentation: update the command table in
   `packages/ui-cli/README.md` and the parity reference only if the command
   surface changes; do not add a second procedure.

**Acceptance.**

- `pnpm nx run pagopa-ui:figma:check` prints the `cases:` line and no
  `Order` warning; the device line is unchanged.
- `pnpm nx run pagopa-ui-cli:figma:parity:verify` exits 0 in the current
  repository, with no `.figma/` and no token.
- `pnpm nx run pagopa-ui-cli:test` and
  `pnpm nx run pagopa-ui-cli:typecheck` are green.

### M2 — Offline evidence bundle

**Goal.** A clone can read the source side of every reviewed case and see the
pinned Figma image, without `.figma/live-rest.json` and without `FIGMA_TOKEN`.

**Actions.**

1. Add `packages/ui-cli/src/parity/evidence.ts`:
   - `EVIDENCE_DIR = "docs/figma-parity"`;
   - `SOURCE_PATH = "docs/figma-parity/source.json"`;
   - `MANIFEST_PATH = "docs/figma-parity/manifest.json"`;
   - `REFERENCES_DIR = "docs/figma-parity/references"`;
   - `MAX_EVIDENCE_BYTES = 10 * 1024 * 1024`.
2. **Source slice.**
   - From the pinned REST snapshot, write a compact document map, not a full
     REST export:
     ```json
     {
       "schemaVersion": 1,
       "kind": "parity-source",
       "fileKey": "…",
       "version": "…",
       "nodes": {
         "<nodeId>": { "document": { "…": "the full subtree" } }
       }
     }
     ```
   - Include every `nodeId` and `variant` a case points at, with its full
     subtree.
   - `loadExport` detects `kind: "parity-source"` and builds `catalogue` from
     the committed `inventory.json`; it must **not** call `normalizeLive` on the
     slice, because `normalizeLive` requires a document for every published
     node. Keep the current full-snapshot path unchanged.
3. **Reference images.**
   - Add a PNG path to `packages/ui-cli/src/figma/rest.ts` (the existing
     `fetchFigmaImages` is SVG-only): `format=png`, `scale=1`, pinned `version`.
   - For every case, resolve the variant through `variantOfCase`; export the
     variant node, not the whole set.
   - Write `docs/figma-parity/references/<caseId>.png`.
   - Write `manifest.json`:
     ```json
     {
       "schemaVersion": 1,
       "fileKey": "…",
       "version": "…",
       "capturedAt": "2026-10-21",
       "cases": {
         "<caseId>": {
           "png": "references/<caseId>.png",
           "sha256": "…",
           "nodeId": "…",
           "variant": "…",
           "designFingerprint": "…",
           "width": 320,
           "height": 650
         }
       }
     }
     ```
   - Skip a case whose variant `designFingerprint` and PNG hash are unchanged;
     remove an orphan PNG/manifest entry when its case disappears.
   - Fail if the total exceeds `MAX_EVIDENCE_BYTES`; report the size and the
     largest cases and reduce to the main components. The cap is not raised
     (decision of 2026-10-21).
4. **Command.**
   - `parity evidence --write` (needs `FIGMA_TOKEN` and a current snapshot) and
     `parity evidence --check` (hermetic).
   - Add the `figma:parity:evidence` script to `packages/ui-cli/package.json`.
   - `--check` errors on: a case without a manifest entry, an orphan entry, a
     missing PNG, a hash mismatch, a slice missing a case node, or a manifest
     version that differs from the slice.
5. **Fallback.**
   - `loadExport` in `packages/ui-cli/src/parity/source.ts`: use `--input` when
     given; else `.figma/live-rest.json` when it exists; else
     `docs/figma-parity/source.json`; else exit 2 with the current guidance.
   - `check` and `source` print which source they used.
   - Add `--input` to the `parity check` and `parity source` argument surfaces
     in `packages/ui-cli/src/cli.ts` (the check implementation already reads it).
6. **Drift snapshot.**
   - Add `--save <file>` to `figma sync` (and the `figma check` alias): persist
     the REST snapshot returned by `fetchFigmaSnapshot` to
     `.figma/live-rest.json` by default.
   - This is what lets the drift workflow refresh the evidence without a second
     API read.
7. **Documentation.**
   - Add `docs/figma-parity/README.md` (short: what the bundle is, that it is
     generated, how to refresh and check it, the size cap).
   - Add the two commands to `packages/ui-cli/README.md`.
8. **Tests.**
   - `packages/ui-cli/tests/parity/evidence.test.mjs`: slice shape, manifest
     round-trip, orphan detection, hash mismatch, version mismatch, size cap.
     Use fixtures; no network.

**Acceptance.**

- `pnpm nx run pagopa-ui-cli:figma:parity:evidence -- --write` produces the
  slice, the PNGs and the manifest; the total is ≤ 10 MB.
- In a clone **without** `.figma/` and without `FIGMA_TOKEN`,
  `pnpm nx run pagopa-ui-cli:figma:parity:check --case <id>` reads the slice and
  reaches the Storybook capture (Storybook is still required for the render).
- `pnpm nx run pagopa-ui-cli:figma:parity:verify` is green, including the
  evidence check.
- A changed case with a new fingerprint refreshes its PNG; an unchanged case is
  skipped; a removed case removes its entry and file.

### M3 — Chromatic on request

**Goal.** A visual baseline for the stories that runs only when asked.

**Actions.**

1. Configure the viewports in `apps/storybook/.storybook/preview.tsx` with
   `parameters.chromatic.viewports` (mobile 360 and 390, desktop 1200; use the
   installed `@chromatic-com/storybook` documentation, do not guess a flag).
2. Add `apps/storybook/chromatic.config.json` with `onlyChanged: true` and the
   build script the app already has; no token in the file.
3. Add `.github/workflows/chromatic.yml`:
   - `workflow_dispatch`;
   - `pull_request: types: [labeled]` with
     `if: github.event.label.name == 'chromatic'`;
   - minimal permissions (`contents: read`, `pull-requests: write`);
   - the same pnpm/Node/registry setup as the other workflows;
   - build Storybook, then run the official Chromatic action with
     `projectToken: ${{ secrets.CHROMATIC_PROJECT_TOKEN }}`;
   - `exitZeroOnChanges: true` (opt-in signal, not a gate);
   - a missing secret skips the job with a notice, never a red required check;
   - a concurrency group per branch.
4. Add the token and the label to `docs/figma-drift-secrets.md` and to the
   handoff doc: the label is `chromatic`, the secret is
   `CHROMATIC_PROJECT_TOKEN`, the agent writes the workflow but never inserts
   the secret. If M3 lands before M4, create the secrets document with the
   Chromatic row and let M4 extend it.

**Acceptance.**

- A `workflow_dispatch` run on a branch with the token produces a Chromatic
  build; a normal PR runs nothing; a labelled PR runs it.
- The job is not a required check and does not run on `main` by default.
- No token appears in the logs; the config contains no secret.

### M4 — Deterministic drift handoff

**Goal.** The weekly drift becomes a guarded, reproducible PR with a
machine-readable delta and a local procedure the person can follow.

**Actions.**

1. Extend `packages/ui-cli/src/figma/sync.ts`:
   - keep the weekly Monday 04:00 UTC schedule (decision of 2026-10-21);
   - `--delta <file>`: write the delta as JSON next to the PR body;
   - the payload: `generatedAt`, `fileKey`, `liveVersion` (when available),
     `counts` per class, `nodes` per class (`nodeId`, `name`, `pageName`,
     `change`, `status`, `target`), `implementationOrder`, the device summary
     and the coverage summary;
   - `--save <file>` from M2;
   - `--evidence-base <url>`: an optional prefix for raw reference links in the
     PR body (the workflow passes
     `https://raw.githubusercontent.com/<owner>/<repo>/<branch>`).
2. Extend the PR body in `renderPrBody`:
   - keep the summary, classes, devices, review instructions, handoff and verify
     chain;
   - add `## Evidence` per node: the case ids and the reference links when the
     evidence bundle has them;
   - add `## Artifacts`: `delta.json`, `run.json`, the generated body;
   - add the local handoff link and the two metrics placeholders.
   - Do not embed a component image generated in CI; the local agent attaches
     the render after `parity check --case <id> --screenshot`.
3. Update `.github/workflows/figma-drift.yml`:
   - preflight `FIGMA_TOKEN` and fail explicitly;
   - run `figma sync --rest --save .figma/live-rest.json --pr-body .figma/pr-body.md --delta .figma/delta.json`;
   - when there is drift, run `parity evidence --write --input .figma/live-rest.json`
     and `parity evidence --check`; add `docs/figma-parity/**` to the commit;
   - format the refreshed JSON and the evidence manifest;
   - **branch guard** before the push:
     ```sh
     branch="figma-drift/$(date -u +%Y-%m-%d)"
     if git ls-remote --exit-code --heads origin "$branch" >/dev/null; then
       git fetch origin "$branch"
       last_author="$(git log -1 --format='%an' "origin/$branch")"
       last_subject="$(git log -1 --format='%s' "origin/$branch")"
       if [ "$last_author" != "figma-drift[bot]" ] ||
          [ "${last_subject#chore(figma):}" = "$last_subject" ]; then
         echo "::error::branch $branch has commits that are not the bot's; refusing to force-push"
         exit 1
       fi
     fi
     git push --force-with-lease origin "$branch"
     ```
     The exact author/subject check must match the bot's commit in the workflow;
     test it with a moved branch.
   - create or update the PR; then write `.figma/run.json` with `runId`,
     `branch`, `prNumber`, `prUrl`, `figmaChangeAt`, `handoffPrAt`, the delta
     counts and the missing-secret/refresh flags;
   - upload `delta.json`, `run.json` and `pr-body.md` with
     `actions/upload-artifact` (retention 14 days); never upload `.figma/`.
4. Add `docs/figma-drift-handoff.md`:
   - worktree creation from `origin/figma-drift/<date>`;
   - `pnpm install`;
   - `export FIGMA_TOKEN=...` (or use the committed evidence slice; never read
     `.env`);
   - load `figma-to-code` (delta use case) and the references the plan names;
   - the order of work from `delta.json`/`implementationOrder`;
   - the forbidden actions: Figma writes, changes to the comparison tools, to
     the instructions or to the public API without a decision;
   - the checks: `figma:check`, `foundation:check`, `layers:check`,
     `parity check --node <id> --devices`, the targeted tests, the full green
     chain;
   - the delivery: the local session commits on the drift branch; the person
     pushes and merges; the session does not push.
5. Add `docs/figma-drift-secrets.md`:
   - `FIGMA_TOKEN` (`file_content:read`, `library_content:read`) for the drift
     job and the live local steps;
   - `DRIFT_PR_TOKEN` (contents + pull requests) so the bot PR triggers CI;
   - the registry token the workflow already uses for `pnpm install`
     (`GITHUB_TOKEN` through `pagopa/dx/actions/setup-npm-registry`; add a
     dedicated `NODE_AUTH_TOKEN` only if the organisation requires it);
   - `CHROMATIC_PROJECT_TOKEN` for the opt-in baseline;
   - how to create and rotate each, the failure mode, and the rule that no
     agent inserts a secret or reads `.env`.
6. Metrics:
   - `run.json` records `figmaChangeAt` (the snapshot version timestamp or the
     run start) and `handoffPrAt` (the PR creation time).
   - `mergedAt` is read after the merge (`gh pr view --json mergedAt`); a small
     monthly query is enough, no new service.
   - The two reported metrics are `handoffPrAt − figmaChangeAt` and
     `mergedAt − handoffPrAt`.

**Acceptance.**

- With the token, a `workflow_dispatch` run with drift opens
  `figma-drift/<date>` with the body, `delta.json`, `run.json` and the evidence
  update; a second run with no drift opens nothing and leaves the catalogue
  untouched.
- A synthetic drift on a test branch (modify `inventory.json`) makes the gate
  report the node, queues it `pending` and shows it in `delta.json`; the branch
  is not merged.
- A re-run over a branch whose head is not the bot's commit fails with a clear
  message and does not force-push.
- The artifact contains no `.figma/` directory and no token.
- `pnpm nx run pagopa-ui:docs -c ci` is green; `docs/figma-drift-handoff.md` and
  `docs/figma-drift-secrets.md` are committed.

### M5 — Pending queue and main components

**Goal.** Close the measured debt with the current definition of done.

**Scope, in order.** The accepted order is the 26 pending nodes first (the
groups below), then the 37 implemented non-icon components of the second ring;
icons are out of scope.

1. **Unblock the dependencies.** `Alert 212:1899`, `ListItem 908:2234`,
   `DragAndDrop 760:7432`; the Drawer note says these block it.
2. **Overlays.** `Drawer 1278:6527`, `TimelineDrawer 1333:16408`.
3. **Inputs.** `TextField 529:6111`, `TextAreaField 10585:80643`,
   `SwitchField 295:1360` and `349:4683`, `DropDown 616:3864`,
   `DatePicker 8049:39452`, `Autocomplete 824:8838`,
   `AuthenticationCodeInput 198:828`, `SegmentedControl 1293:8394`.
4. **Primitives and actions.** `Button 108:1402`, `Tabs 1137:8910`,
   `Pagination 127:1510`, `MenuDropDown 3262:40787`,
   `StickyButtonBar 3424:12354`.
5. **Navigation.** `Breadcrumb 123:7768`, `Accordion 759:6399`,
   `SkipToMainContent 8090:46352`, `CarouselStepper 10169:11964`.
6. **Feedback and data.** `EmptyState 11149:7765`, `ProgressKpi 12133:82475`,
   `TableCellRow 1344:40672`.
7. **Second ring: implemented non-icon components without a case.** Start from
   `parity queue --unmapped` and the main components the product names
   (Button 192:1208, Checkbox/CheckboxField, RadioField/RadioGroupItem, Avatar,
   Badge, Chip, Tooltip, Snackbar, Separator, Timeline, StatusTile, …). Add one
   reviewed case for each, then the principal states. Icons are out of scope:
   `assets:check` owns them.

**Procedure per node.**

1. Read the node's registry note, its guide and its existing cases
   (`parity queue --node <id>`); the note's constraints are binding.
2. Propose the missing cases:
   `parity cases --sync --node <id> --dry-run`; a draft is not coverage.
3. Capture and compare: `parity check --node <id> --devices` when the set has a
   device axis, `parity check --case <id>` for each committed case; fix the
   component or the story; at most three passes per case, then a residue with a
   reason or a written blocker.
4. Save the reviewed case (`--save-case --note "reviewed: …"`), update the
   registry (`status`, `target`, `storyExports`, note) and the changelog when
   rendering or the API changes.
5. Run the targeted tests and the full green chain; one commit per node.
6. A design defect that cannot be solved in code becomes a file under
   `docs/design-requests/` and the node stays `pending`; it is never absorbed
   into the component.

**Specific blockers.**

- `TimelineDrawer 1333:16408`: blocked by the mobile bottom-sheet composition
  and the 24px head-to-description gap. The 416 width is already the shared
  width with a 1px residue against the 417 source (the same residue as the
  Drawer); the request is
  [2026-10-21-timeline-drawer-width-and-mobile.md](../design-requests/2026-10-21-timeline-drawer-width-and-mobile.md).
  Keep the node `pending` until the design owner decides.
- `TableCellRow 1344:40672`: the request decides whether the mobile card is a
  story wrapper around the row helper, a new card contract, or the Table's own
  composition (in which case the node is `excluded`):
  [2026-10-21-table-cell-row-mobile-card.md](../design-requests/2026-10-21-table-cell-row-mobile-card.md).
  Implement the chosen option, then the mobile case or the exclusion.
- `Pagination 127:1510`: the `Order` axis is not a device axis; M1 records the
  exception. The request is
  [2026-10-21-pagination-order-axis.md](../design-requests/2026-10-21-pagination-order-axis.md).
  Add a case for the desktop composition and the principal states; the `Mobile`
  value is a compact layout, not a device case.

**Rules.**

- One wave of three nodes per session; the highest `implementationOrder` first.
- No bulk approval; no `implemented` without a verified render.
- A component with two source nodes (Button, SwitchField) is done only when
  every node is `implemented` or `excluded` with a reason.
- The a11y contract is the current gate; report screen-reader and browser-zoom
  verification as unverified where it is.
- No new magic value: `foundation:check` and `tokens:check` stay green.

**Acceptance.**

- Before/after: pending count, device coverage, unmapped count, closed nodes.
- Every remaining pending node has a written blocker and a decision owner.
- `pnpm nx run pagopa-ui:figma:check` green; the full green chain green.
- One report per wave: per node the cases, the verdicts, the residues and the
  files.

## 6. Scope and ownership

| Area           | Files                                                                                                                                           | Milestone  |
| -------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- | ---------- |
| Parity tools   | `packages/ui-cli/src/parity/*`, `packages/ui-cli/src/figma/{devices,sync,rest}.ts`, `packages/ui-cli/src/schemas/*`, `packages/ui-cli/tests/**` | M1, M2, M4 |
| Catalogue data | `packages/pagopa-ui/src/catalog/figma/{parity-cases,device-policy,device-exceptions,registry}.json`                                             | M1, M2, M5 |
| Evidence       | `docs/figma-parity/**`                                                                                                                          | M2         |
| Storybook      | `apps/storybook/.storybook/*`, `apps/storybook/chromatic.config.json`, `apps/storybook/src/**` (stories and guides in M5)                       | M3, M5     |
| CI             | `.github/workflows/figma-drift.yml`, `.github/workflows/chromatic.yml`                                                                          | M3, M4     |
| Documentation  | `docs/figma-drift-handoff.md`, `docs/figma-drift-secrets.md`, `docs/figma-parity/README.md`, `packages/ui-cli/README.md`                        | M2, M3, M4 |
| Changelog      | `packages/pagopa-ui/CHANGELOG.md` for rendering/API changes                                                                                     | M5         |

Do not touch:

- the public API in `packages/pagopa-ui/src/pagopa-ui.ts` without a decision;
- the token manifest or the generated CSS unless M5 needs a token and the
  token ladder justifies it;
- `AGENTS.md`, `CONTRIBUTING.md`, the root `README.md` or `.agents/**` beyond
  the one reference row the skill allows;
- the Figma file, in any form.

## 7. Acceptance of the whole plan

1. **M1** — `figma:check` validates the corpus; `parity verify` is green
   without `.figma/`; the `Order` warning is gone; the device line is unchanged.
2. **M2** — a clone without `.figma/` and without `FIGMA_TOKEN` can run
   `parity check --case <id>` against the committed slice (Storybook still
   required for the render), and `parity evidence --check` is green; the bundle
   is ≤ 10 MB.
3. **M3** — the Chromatic workflow runs only on dispatch or the `chromatic`
   label, is not a required check, and never prints the token.
4. **M4** — the drift run produces `delta.json`, `run.json`, the body and the
   evidence; the branch guard refuses a moved branch; the handoff and secrets
   docs are committed; the two metrics are recorded.
5. **M5** — the pending queue and the main non-device components are closed or
   have a written blocker; the registry is the record; no bulk approval.
6. **The green chain** of `CONTRIBUTING.md` is green on every branch. Stories
   run in a browser: when they cannot start, the session says so and does not
   count them as passed.

## 8. Metrics

| Metric                        | Where                           | Target                                                             |
| ----------------------------- | ------------------------------- | ------------------------------------------------------------------ |
| `handoffPrAt − figmaChangeAt` | `run.json`                      | Baseline first, then trend down; weekly schedule until measured    |
| `mergedAt − handoffPrAt`      | merged PR query                 | Baseline first; the local implementation time is the dominant term |
| Delta nodes queued            | `run.json` / `delta.json`       | Visible per run; no target until the backlog is stable             |
| Pending nodes                 | `registry.json` / `figma:check` | 26 → 0, or every remaining one has a blocker                       |
| Device cases                  | `parity queue --coverage`       | 69/72 → 72/72                                                      |
| Cases without a mapping       | `parity queue --unmapped`       | 23/26 → 0 for the queue; the second ring follows                   |
| Evidence bundle size          | `parity evidence --check`       | ≤ 10 MB                                                            |
| Corpus errors                 | `figma:check` / `parity verify` | 0                                                                  |
| Opt-in Chromatic runs         | workflow history                | Only on request; no default run                                    |

## 9. Risks and mitigations

| Risk                                        | Impact                                | Mitigation                                                                                                                              |
| ------------------------------------------- | ------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| The evidence bundle grows past 10 MB        | slow clones, binary churn             | `MAX_EVIDENCE_BYTES`, skip unchanged fingerprints, reduce to the main components; the cap is not raised                                 |
| The slice is stale against the inventory    | a case compares against an old source | the manifest records the version and the variant fingerprint; `parity evidence --check` fails on a mismatch; the drift job refreshes it |
| M5 scope explodes (123 proposals)           | an endless wave                       | the queue is the scope; principal states per node, not every proposal; three passes per case                                            |
| A design defect is absorbed into code       | a silent deviation                    | the node stays `pending`; a file under `docs/design-requests/`; the registry note carries the decision                                  |
| A same-day drift re-run destroys local work | lost commits                          | the branch guard before the push; fail closed                                                                                           |
| A missing `FIGMA_TOKEN` or `DRIFT_PR_TOKEN` | no drift PR, or an unchecked one      | the preflight fails explicitly; the secrets doc names the failure mode                                                                  |
| The Chromatic token is missing              | the opt-in run is skipped             | skip with a notice; never a required check                                                                                              |
| The local agent follows a stale instruction | a wrong implementation                | read the skill and the plan; the registry note is binding; the person reviews the diff                                                  |
| Storybook cannot start                      | render evidence missing               | `parity verify` and the source slice still run; do not count the render as passed                                                       |

## 10. Decisions taken and remaining prerequisites

Decided on 2026-10-21:

| Decision        | Choice                                                                                                |
| --------------- | ----------------------------------------------------------------------------------------------------- |
| Evidence images | Commit the PNGs under the 10 MB cap; if exceeded, reduce to the main components, do not raise the cap |
| Chromatic       | Enable it: project, `CHROMATIC_PROJECT_TOKEN`, `chromatic` label; opt-in only                         |
| M5 order        | First the 26 pending nodes, then the 37 implemented non-icon components without a case                |
| Design blockers | Owned by the Figma design owner; the nodes stay `pending` until the decision is recorded              |
| Drift schedule  | Weekly, Monday 04:00 UTC; re-evaluate only after the metrics are measured                             |
| Branch guard    | Fail closed: no push and no PR update on a branch that has non-bot commits                            |

Remaining prerequisites, owned by the person:

1. Create the Chromatic project and insert `CHROMATIC_PROJECT_TOKEN`; create the
   `chromatic` label on the repository.
2. Insert `FIGMA_TOKEN` and `DRIFT_PR_TOKEN` in the repository secrets.
3. The Figma design owner records the decisions for TimelineDrawer (mobile edge
   and header rhythm; the 416 width is already the shared width), TableCellRow
   and Pagination `Order`; the requests are
   [TimelineDrawer](../design-requests/2026-10-21-timeline-drawer-width-and-mobile.md),
   [TableCellRow](../design-requests/2026-10-21-table-cell-row-mobile-card.md) and
   [Pagination](../design-requests/2026-10-21-pagination-order-axis.md). Until
   then those nodes stay `pending` with the blocker in their registry note.

There are no open scope decisions: the milestones, the order and the guard
behaviour above are the plan.

## 11. Prompt for the implementing agent

### Prompt A — tooling and drift (M1–M4)

```text
You are implementing `docs/plans/figma-fidelity-and-drift.md` in the
`pagopa-ui` repository.

Read first:
- `docs/plans/README.md` (common rules)
- `docs/plans/figma-fidelity-and-drift.md` (this plan)
- `AGENTS.md` and `CONTRIBUTING.md` (the green chain)
- `.agents/skills/figma-to-code/SKILL.md` and the references the plan names
  (`parity-tooling.md`, `visual-parity.md`, `devices.md`,
  `definition-of-done.md`, `node-review.md`)
- `packages/ui-cli/README.md` (the current CLI)

Work in a dedicated worktree on a branch, never on `main`. Do not push, do not
merge and do not open a pull request: the person does that.

Hard rules:
- Figma is read-only. Use GET requests and the read-only MCP tools only.
- Never read, source, print or commit `.env`. Use `FIGMA_TOKEN` from the process
  environment only when a live step needs it. If it is missing, stop that step
  and continue with the committed evidence.
- Do not change the public API, the tokens, the skill or the root instructions
  unless the plan explicitly says so.
- Do not bulk-edit `registry.json`; one node at a time.
- Every command goes through Nx (`pnpm nx run <project>:<target>`), not through
  a path that walks out of the project.

Deliver M1, M2, M3 and M4 in this order. Do not start M5 (the component
burn-down) in this session; it is a separate wave.

For each milestone:
1. Re-measure the baseline with the commands in Appendix A.
2. Implement only the files in the ownership table for that milestone.
3. Run the acceptance commands of the milestone. If Storybook cannot start, say
   so explicitly and do not count the story or parity render as passed.
4. Commit one logical change with a conventional message.
5. Stop at the milestone gate and report before continuing to the next one.

Stop only for the prerequisites in section 10 (secrets, Chromatic project,
design-owner decisions); the scope decisions are already taken. If a change
outside the ownership is needed, write it in the report; do not make it.

Final report: what was done; every command and its outcome; before/after
numbers (cases, pending, device coverage, bundle size, warnings); what is
missing and why; the decisions that need the person.
```

### Prompt B — component burn-down (M5), one wave

```text
You are implementing M5 of `docs/plans/figma-fidelity-and-drift.md`, one wave
of at most three nodes.

Work in a dedicated worktree on a branch, never on `main`. Do not push, do not
merge and do not open a pull request: the person does that.

Hard rules:
- Figma is read-only. Use GET requests and the read-only MCP tools only.
- Never read, source, print or commit `.env`. Use `FIGMA_TOKEN` from the process
  environment only when a live step needs it. If it is missing, stop that step
  and continue with the committed evidence.
- Every command goes through Nx (`pnpm nx run <project>:<target>`), not through
  a path that walks out of the project.

Read `docs/plans/README.md`, the plan, the `figma-to-code` skill and the
registry notes of the nodes you pick. Work in a worktree, do not push or merge.

Pick the three highest nodes from
`pnpm nx run pagopa-ui-cli:figma:parity:queue --status pending` and the
`implementationOrder`; if the plan names a blocker, start there. The queue and
the registry are authoritative; do not use a hand-written component list.

For each node:
1. Read the registry note, the guide and the existing cases.
2. Run `parity check --node <id> --devices` when the set has a device axis and
   `parity check --case <id>` for every committed case.
3. Propose the missing cases with `parity cases --sync --node <id> --dry-run`;
   a draft is not coverage.
4. Fix the component or the story; at most three passes per case; then record a
   residue with a reason or a written blocker.
5. Save the reviewed case with `--save-case --note "reviewed: …"`, update the
   registry and the changelog, and run the targeted tests plus the full green
   chain.
6. One commit per node.

Never mark a node `implemented` without a reviewed render. Never absorb a design
decision: write it under `docs/design-requests/` and leave the node `pending`.
Report per node: cases, verdicts, residues, status, files, commands.
```

## Appendix A — measurements (2026-10-21)

```sh
pnpm nx run pagopa-ui:figma:check
pnpm nx run pagopa-ui-cli:figma:parity:queue --uncovered --json
pnpm nx run pagopa-ui-cli:figma:parity:queue --coverage --json
pnpm nx run pagopa-ui-cli:figma:parity:queue --unmapped
pnpm nx run pagopa-ui-cli:figma:parity:cases --sync --dry-run
pnpm nx run pagopa-ui-cli:test
```

Recorded results:

- `figma:check`: 353 inventory nodes; implemented 299, pending 26, excluded 9,
  mocked 19; 52 sets with an axis; 129 declared devices; 18/18 aliases
  resolved; 0 unmapped; 29 implemented sets, 66/66 covered, 0 missing, 0
  exceptions; one `Order` warning on `127:1510`.
- `queue --coverage`: 32 nodes (implemented + pending), 72 declared device
  cases, 69 covered, 3 missing: `TimelineDrawer` (mobile, desktop) and
  `TableCellRow` (mobile).
- `queue --unmapped`: 23 of 26 pending nodes have no committed case.
- `cases --sync --dry-run`: 1 device proposal, 123 state/property proposals,
  73 skips (mostly "no sibling case").
- `parity-cases.json`: 88 cases on 34 unique nodes.
- Implemented nodes without a case: 192, of which 37 are not `PagoPAIcon`.

## Appendix B — command reference

| Command                                                                                                                                                 | Proves                                                                                        |
| ------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| `pnpm nx run pagopa-ui:figma:check`                                                                                                                     | catalogue, device vocabulary, device coverage, and (after M1) the case corpus                 |
| `pnpm nx run pagopa-ui-cli:figma:parity:verify`                                                                                                         | case corpus, coverage and evidence, without snapshot or browser (after M1/M2)                 |
| `pnpm nx run pagopa-ui-cli:figma:parity:queue --uncovered`                                                                                              | the device burn-down                                                                          |
| `pnpm nx run pagopa-ui-cli:figma:parity:queue --unmapped`                                                                                               | nodes without a committed case                                                                |
| `pnpm nx run pagopa-ui-cli:figma:parity:cases --sync --node <id> --dry-run`                                                                             | the missing cases for one node                                                                |
| `pnpm nx run pagopa-ui-cli:figma:parity:check --node <id> --devices`                                                                                    | every declared device of one node                                                             |
| `pnpm nx run pagopa-ui-cli:figma:parity:check --case <id>`                                                                                              | one reviewed case, from `.figma/` or the committed slice                                      |
| `pnpm nx run pagopa-ui-cli:figma:parity:evidence -- --check`                                                                                            | the slice and the reference manifest (after M2)                                               |
| `pnpm nx run pagopa-ui-cli:figma:parity:evidence -- --write`                                                                                            | refresh the slice and the reference images (needs the token)                                  |
| `pnpm --filter pagopa-ui-cli exec node src/cli.ts figma sync --rest --save .figma/live-rest.json --pr-body .figma/pr-body.md --delta .figma/delta.json` | the drift run (after M2/M4); there is no `figma:sync` Nx target, so the workflow uses the CLI |
