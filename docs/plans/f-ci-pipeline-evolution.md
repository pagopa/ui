# F2 — Deep checks: shorter pull requests, same proof

Status: the split (M1) is implemented in `.github/workflows/deep-checks.yml`;
M2–M5 are future work. Common rules: [README.md](./README.md).

## Goal

Keep every check `deep-checks.yml` runs today and cut the pull-request wait from
about nine minutes to under five, without turning a gate into an approximation.
The nightly run stays the place where everything runs.

## Starting point (measured 2026-10-21)

| Run                                               | Wall clock |
| ------------------------------------------------- | ---------- |
| Pull request touching the design system           | 562s       |
| Nightly (`schedule`)                              | 532s       |
| Pull request that affects nothing (`infra/` only) | 105s       |

Setup was ~70s of every run, of which 42–45s were `playwright install --with-deps`.

Local measurements (`--skip-nx-cache`, 18 cores, so proportions rather than
absolute values):

| Block                                                 | Wall | CPU  |
| ----------------------------------------------------- | ---- | ---- |
| `pagopa-ui:build`                                     | 3.8s | 6.5s |
| `pagopa-ui:library:check`                             | 53s  | 53s  |
| `pagopa-ui-storybook:test:stories` (Firefox + WebKit) | 72s  | 434s |
| `pagopa-ui-storybook:test:coverage` (both passes)     | 110s | 715s |

The tree holds 407 stories in 95 files. Before the split every story ran about
six times per run: Firefox and WebKit in the fast pass, Firefox in the
forced-colors conditions, then Chromium twice in the coverage pass.

Three structural costs, in order of weight:

1. the two Vitest invocations of `test:coverage` ran in the same job, one after
   the other;
2. one job on four vCPUs ran the fast pass, the coverage pass and the packed
   artifact with `parallel: 10`, so CPU-bound browser work competed with itself;
3. `nx affected` granularity is the project, and the `storybook` inputs are the
   whole `packages/pagopa-ui/src`: one component change reruns everything.

## Decisions

- **The engine set belongs to the pass.** v8 coverage is collected on Chromium
  only; a pull request proves WebKit; Firefox joins in the nightly run. Every
  story still executes in all three engines, just not in the same pass.
- **Gates stay whole.** The coverage thresholds are global; a partial run cannot
  evaluate them honestly. The Chromium pass runs the whole story tree on every
  pull request, and the changed-only selector (`ui-cli test changed`) stays a
  local tool.
- **Wall clock is the target, not runner minutes.** Three jobs pay three setups;
  the cost is accepted because the wait halves.
- **Drafts are skipped** and re-run on `ready_for_review`.
- **No remote cache yet.** `neverConnectToCloud: true` is a governance choice,
  not a setting to flip in a performance change.

## What M1 changed

- `apps/storybook/package.json` — `test:stories` (Firefox + WebKit),
  `test:webkit` (WebKit, the pull-request pass), `test:coverage` (Chromium and the
  gates alone, no longer the fast pass plus coverage).
- `apps/storybook/vite.config.ts` — the engine instances follow the mode, so a
  pass runs the engines it needs and no more.
- `apps/storybook/project.json`, `nx.json` — the `test:webkit` target and the two
  story targets cached.
- `.github/workflows/deep-checks.yml` — three parallel jobs (`coverage`,
  `webkit`, `library`), `nx affected` per job, nightly variants that add Firefox
  and every project, a Playwright browser cache keyed on the installed version,
  and the pinned actions of the split. There is no Nx cache step: the local
  cache cannot cross runners (see M4).

A warm rerun of #7 is the evidence for M4: the jobs restored the Nx cache, the
log reported `Unrecognized Cache Artifacts`, and `coverage` and `library` re-ran
their tasks. Freezing the cache and its database together, inside the checkout,
does not change it: the database records the machine that wrote it, and a
restored entry is not metadata this runner may use.

## What is left

| Milestone | Work                                                                                                                                                                                                          |
| --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| M2        | Per-task timings in the run summary (`--output-style=static` or `NX_VERBOSE_LOGGING`) so the estimates above become measurements, and the budget is checked against them instead of the wall clock alone      |
| M3        | Shard the WebKit and nightly passes (`vitest --shard=i/N`, 2–3 runners): the nightly drops towards ~4 minutes, the pull request only if it needs it                                                           |
| M4        | Decide the remote cache: Nx Cloud or an S3-compatible backend; measure the hit rate of the local cache first, then decide whether the governance change is justified                                          |
| M5        | Gate `library:check` on the public surface (`package.json`, `library-entry.ts`, `vite.config.ts`, `tsconfig.lib.json`, the library checks) if the minutes matter; today it runs in parallel and costs no wait |

Options considered and not taken:

- **Story-level selection as a gate.** `ui-cli test changed --since` selects the
  tests a diff touches, but the global thresholds make a partial run a false
  gate; it stays in the local loop.
- **Workflow-level `paths-ignore`.** A skipped workflow leaves the required
  checks pending and blocks the merge; the job-level draft filter reports
  `skipped`, which merges cleanly.
- **Firefox on every pull request.** It costs roughly the WebKit pass again. If
  nightly-only Firefox starts costing merges, add it for a `paths` subset (CSS,
  `apps/storybook/src/support`) rather than for everything.

## Acceptance

- A pull request touching one component is under five minutes from `opened` to
  the three checks reporting, with the coverage gates, WebKit and the packed
  artifact all green.
- A nightly run still executes every story in Chromium, Firefox and WebKit, plus
  the packed artifact, and covers every project regardless of the diff.
- A draft pull request runs nothing; `ready_for_review` runs the three jobs.
- A Playwright cache hit costs no browser download; a cache miss still installs
  the browser the job uses.
- No check is removed or downgraded: the same targets exist and fail the same
  way as before.

## Risks

| Risk                                                            | Impact                                     | Mitigation                                                                                |
| --------------------------------------------------------------- | ------------------------------------------ | ----------------------------------------------------------------------------------------- |
| A Firefox-only regression reaches `main`                        | discovered the following night             | the nightly run is the guard; M5-style `paths` subset if it becomes frequent              |
| A nightly failure has no one watching it                        | the guard exists but nobody reacts         | decide the notification for `deep-checks` failures (issue or chat), listed under "to ask" |
| Two engines on pull requests double the browser minutes         | cost, not wait                             | the parallel split keeps the wait; re-measure before adding more                          |
| A cache key shared across branches restores a stale `.nx/cache` | a task skipped with an old terminal output | Nx hashes the inputs; the rolling `run_id` key keeps the entry fresh                      |

## To ask the person

1. Where a nightly failure should surface (issue, chat, or the existing schedule
   e-mail), since the nightly is now the only Firefox guard.
2. Whether M3 (sharding) is worth the extra runner minutes after M1 is measured.
3. Whether M4 (remote cache) belongs to this repository at all, or waits for a
   platform-wide PagoPA DX decision.
