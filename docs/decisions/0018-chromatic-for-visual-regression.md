# ADR-0018 — Chromatic owns the visual diff, opt-in through a project token

- **Status:** Accepted — 2026-11-27, **experimental**. The decision stands and the
  run is in use; it is not yet a visual gate, for the reasons §4 records: a live
  build reports ten stories failing their plays that `test:stories` passes, a
  build over the plan's limit publishes and runs no test while staying green, and
  TurboSnap is inert for the first ten CI builds. What ends the experimental
  status is §5, and the work is tracked in
  [#195](https://github.com/pagopa/ui/issues/195). Supersedes
  [ADR-0017](./0017-visual-baselines-outside-git.md).
- **Date:** 2026-11-27
- **Context:** ADR-0017 made the Playwright suite the only visual runner: it
  captured every story at 320, 600 and 1200 px on a pinned Linux container and
  compared the images against a set fetched from `pagopa/ui-visual-baselines`,
  keyed by the Storybook manifest, the engine and the image digest. The decision
  was correct about pixels and expensive about machinery: a scope walk that read
  the built index and walked every import edge (~500 lines), a storage reader
  with its own key format and preflight (~225 lines), a fetch step, a
  `--check-baselines` verdict, a second repository to keep private-or-public, and
  ~1.3k lines of tests pinning the walk and the fetch. The service the same
  project had already wired and then removed — Chromatic — answers the same
  question with a managed renderer, a dashboard and dependency tracing, and
  charges for it in a subscription rather than in repository code.
- **Related:** [ADR-0004](./0004-device-axis.md) (the widths a capture takes),
  [ADR-0015](./0015-ephemeral-parity-diagnostic.md) (parity is a diagnostic;
  rendered regression belongs to the visual runner this ADR names),
  [ADR-0017](./0017-visual-baselines-outside-git.md) (superseded: where the
  pixels live stops mattering once the project does not hold them).

## 1. Problem

ADR-0017 traded a committed corpus for an owned pipeline, and the pipeline became
the cost:

- **The scope walk was ours to keep correct.** Import-edge tracing, the modules
  that widen to the whole catalogue without an edge, the `no-visual` tag and the
  preflight formed a subsystem whose failure mode was a silent under-capture: a
  change the walk missed simply compared nothing.
- **The storage was ours to operate.** A second repository, a key format, a
  sparse fetch, a token story (public storage or a credential of its own) and a
  capture procedure that only the pinned image can run. Nothing about it is a
  design-system concern.
- **The baseline was ours to capture.** Accepting a visual change meant running
  Docker locally, then opening a pull request in another repository. The step
  nobody enjoys is the step that stops happening, and a stale baseline set is
  indistinguishable from a clean run until the key moves.
- **A visual diff is a service problem.** Rendering a Storybook, diffing 3 000
  captures across three widths, storing the history and presenting the
  accept/reject decision is what Chromatic sells. The project was rebuilding it.

## 2. Decision space

**A — keep the Playwright suite and the baselines repository (ADR-0017).**

- Pros: the pixels are ours, the comparison runs offline, the threshold and the
  widths are exactly the ones the device axis names, and no third party sees the
  catalogue.
- Cons: the walk, the fetch, the key, the storage repository and the capture
  procedure stay; every new story widens what the walk must keep proving.

**B — keep Playwright and move the storage to an object store.** Less git, same
subsystem, plus new infrastructure and a credential.

- Pros: no second repository.
- Cons: the walk, the key and the preflight stay; the capture stays Linux-only
  and manual. It buys storage, which is not the cost.

**C — Chromatic, opt-in through a project token.** The CLI builds nothing of its
own: it uploads the Storybook this repository already builds, renders every
story at the widths the preview declares, and traces the changed files to the
stories they reach (TurboSnap).

- Pros: the walk, the key, the fetch, the storage repository, the preflight and
  their tests leave the tree; the diff, the history and the accept step live in
  a dashboard a designer can read; TurboSnap is maintained outside this
  repository.
- Cons: a third-party service holds the catalogue, a subscription pays for it,
  the comparison needs the network, and the exact rendering is Chromatic's
  (Linux, its browser build) rather than the container this repository pinned.

## 3. Decision

**C.** Chromatic is the visual runner. The Playwright visual suite, the scope
walk, the baselines reader, the storage repository, the screenshots and the
`ui-cli test visual` command are deleted.

### RD1 — the integration is opt-in through the secret, never through a label

`chromatic.yml` runs on every pull request that is not the review preview, on the
nightly schedule and on a manual dispatch. Its first step reads
`CHROMATIC_PROJECT_TOKEN` and publishes `present`; every later step is
conditional on it. A repository without the token runs a green job that says so
in a notice — no red check, no skipped-job ambiguity, and the day the token
exists the same workflow starts comparing with no further change. The label
trigger of the earlier integration is not restored: a check that appears only
when someone remembers to ask is a check nobody reads.

### RD2 — TurboSnap is the scope, and the whole catalogue is the fallback

A pull request compares the stories its diff reaches: `--only-changed` asks
Chromatic to trace the changed files through the built index. A scheduled run,
a manual dispatch and the **Version Packages** pull request pass no
`--only-changed` and compare every story, because those are the passes where a
story nothing else proved has to surface. A change Chromatic cannot trace — a
token file, a stylesheet behind a CSS variable — widens to the full catalogue
rather than passing silently.

The first run of a project has no baseline to trace against, so it captures the
whole catalogue and becomes the baseline. That bootstrap is why the workflow
checks out with `fetch-depth: 0`: TurboSnap reads the git history to compute the
changed file set.

### RD3 — the runner is a pinned dependency, not a third-party action

`chromatic` is a devDependency of `apps/storybook`, at an exact version, run
through a `pagopa-ui-storybook:chromatic` target. A GitHub action would be
another commit SHA to track and another `with:` block to keep in step with the
CLI's flags; a package is already governed by the lockfile, and the same command
runs on a laptop. The token reaches the CLI through the environment, never
through `--project-token`: an argument is a token in the process list.

### RD4 — exemptions are per-story parameters, not tags

The two catalogue stories that change whenever any other story changes — the
token catalogue and the Figma inventory — declare
`parameters.chromatic.disableSnapshot = true`. The `no-visual` tag they carried
existed for one runner; a parameter names the concern where the concern lives,
and it leaves the Storybook tags to mean what the Storybook test runner reads.

The widths stay where ADR-0004 put them: `parameters.chromatic.viewports` in the
preview declares 320, 600 and 1200, the same three the Playwright suite captured.

### RD5 — the run reports, it does not gate

`--exit-zero-on-changes` keeps a run green when the diff is non-empty, so the
workflow cannot become an accidental merge gate while the project is still
deciding who owns the verdict. The change itself is in the dashboard, linked
from the run. Making it a required check is a deferred decision, and it is the
one that turns the dashboard into a gate.

## 4. Consequences

- ~1.3k lines of harness and tests leave the tree (`visual.ts`,
  `visual-baselines.ts`, `visual-cases.ts`, the Playwright config and spec, four
  test files), along with the `ui-cli test visual` command and the two Nx
  targets. `packages/ui-cli/tests/e2e`, the parity render and the Playwright
  installation stay: they prove behaviour and geometry, not pixels.
- The repository keeps no pixels at all: no committed screenshots, no storage
  repository, no fetch, no key, no capture procedure. Accepting a change is a
  click in Chromatic.
- The Storybook build is still the artifact both the deploy and the comparison
  read, so a story that does not build never reaches the diff.
- Chromatic sees the built catalogue of a public design system on every run. A
  private project would need a plan and a token policy; this one already ships
  its catalogue as a public Storybook.
- A run without a token proves nothing. The check is green, and its notice is
  the only signal that the visual diff did not happen: the project accepts that
  green-while-dormant state deliberately, because a red check for a service
  nobody has subscribed to yet would block every pull request.
- The rendering is Chromatic's. A pixel that differed between the pinned
  container and Chromatic's renderer no longer produces a finding, and the
  threshold is Chromatic's (`diffThreshold` per story) rather than the
  `threshold: 0` plus 32-pixel budget the Playwright suite used.
- The engine axis narrows to one renderer. ADR-0004's widths survive in the
  capture; the Firefox and WebKit story passes in `deep-checks.yml` keep proving
  behaviour on the other engines, but no engine other than Chromatic's compares
  pixels.
- A capture is what the subscription sells. The snapshotted stories — 544 of the
  546, at the three widths ADR-0004 keeps — are 1 632 per full build, and both
  the nightly and the release pull request capture all of them. Under that
  budget Chromatic limits the build rather than failing it: it publishes the
  Storybook, runs no test, and the job stays green. The plan therefore has to
  cover one full catalogue a day before the nightly means anything. A step after
  the CLI reads its log for that answer and raises a warning annotation and a
  summary line, so a limited build is distinguishable from a clean one in the
  pull request while still proving nothing about the diff.
- The play functions travel with the catalogue: Chromatic runs them as
  interaction tests and fails the build on one, which `--exit-zero-on-changes`
  does not cover. The first live run (2026-11-27) reported 20 from ten stories —
  `Accessibility/Navigation Texts`, `Table/Empty With Action`,
  `Table/Truncated Cells`, `ProductCard/Source Product`,
  `Autocomplete/Multiselect Overridable Texts`,
  `SelectableRows/Choice Command Surfaces Callback Errors`,
  `Footer/Logged User False Desktop`, `Pagination/Collapse Width`,
  `SideNav/Nested And Profile` and `SideNav/Condensed`.
- The cause is not established, and the two explanations the shapes suggested
  are ruled out. The width is not it: the same ten stories, run with the browser
  viewport forced to 320 px and to the runner's default 414 px, pass on Chromium
  and on WebKit. Uncaught browser errors are not it either: the only story that
  raises one is `Choice Command Surfaces Callback Errors`, deliberately, since a
  callback is what it surfaces. `test:stories` already proves all ten, so a
  green pull request and a red build disagree about the same stories; §5 holds
  the decision, and a run under the plan's limit captures nothing, so it also
  runs no play and hides the question.
- TurboSnap needs ten builds from CI before it traces anything, which the first
  live run reported alongside the failures. Until then `--only-changed` is
  inert: every pull request captures the whole catalogue, ten full builds before
  the flag starts saving the captures it was chosen for. Tracing also needs a
  stats file: the Vite builder writes `preview-stats.json` only under
  `--stats-json`, which the build script passes, because the first build to
  attempt tracing after the tenth failed at "Prepare your built Storybook"
  (`run 46028216052`) instead of comparing.
- **The run is experimental, and it is read that way.** Everything above is why: a
  build can be green having compared nothing, one can be red for a play
  `test:stories` passes, and before the tenth CI build `--only-changed` saves no
  capture. A green check therefore reports that the run happened, not that the
  pixels did not move, and it is a dashboard to read rather than a proof to cite
  until the exit criteria below hold.

## 5. Deferred decisions with triggers

| Deferred                                | Trigger                                                                                                                                                                                                                                                  |
| --------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Leaving the experimental status (§4)    | One run, on one commit, compares all 1 632 captures under the plan's limit, reports no play failure that `test:stories` passes, and traces under `--only-changed` — the three together, not one at a time                                                |
| Making the Chromatic check required     | The token exists and a run has been green for a week; `--exit-zero-on-changes` is what has to go first, in the same change                                                                                                                               |
| Whether the build judges the plays      | The interaction report is read against the ten stories it names: reproduce the condition Chromatic's runner adds, take those stories out of the capture, or leave the judgement to `test:stories`. A limited build answers nothing — no capture, no play |
| A `diffThreshold` per family of stories | A run reports renderer noise on text-heavy stories that the reviewers learn to ignore; the parameter is per story, so it lands there                                                                                                                     |
| Comparing on a second engine            | A regression proves invisible on Chromatic's renderer; no flag exists today, so the trigger is a second visual service, not a flag                                                                                                                       |
| A Chromatic project per release channel | A pre-release channel needs its own baseline history rather than sharing one                                                                                                                                                                             |

## 6. Related

- `.github/workflows/chromatic.yml` — the run this ADR decides, and the probe
  step that makes it opt-in.
- `apps/storybook/chromatic.config.json` — the flags the target always uses.
- `apps/storybook/.storybook/preview.tsx` — the viewports the capture takes.
- `packages/ui-cli/tests/workflows/chromatic.test.mjs` — the wiring: the probe
  step precedes every step that spends the token, the nightly and the release
  pull request drop `--only-changed`, and the fork never receives the secret.
- `CONTRIBUTING.md` §CI and §Visual regression — the same contract in prose.
