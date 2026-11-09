# Contributing — PagoPA UI

The library is developed **agent-first**: people describe the work, coding
agents implement it, and repository checks verify what they produce. The person
reviews and merges. This file holds what is true for people and agents alike;
[AGENTS.md](./AGENTS.md) adds the agent-only rules and which skill owns which
work.

## Setup

The toolchain comes from [mise](https://mise.jdx.dev/): Node.js and pnpm are
pinned in `.node-version` and `mise.lock` (Node 24.22.1 and pnpm 11.28.6 at the
time of writing). Terraform, tflint, trivy and terraform-docs are also locked
in `mise.toml`/`mise.lock`; only the `infra/` projects need them.

1. Install the locked toolchain and trust the repository configuration once:

   ```bash
   mise install
   mise trust
   ```

2. Create the local, git-ignored `.npmrc`. The DX Nx packages are served by
   GitHub Packages and installed through pnpm's `gh:` protocol, so the GitHub
   token needs the `read:packages` scope:

   ```bash
   gh auth refresh --scopes read:packages
   install -m 600 /dev/null .npmrc
   printf '//npm.pkg.github.com/:_authToken=%s\n' "$(gh auth token)" > .npmrc
   ```

3. Install dependencies and build the workspace:

   ```bash
   pnpm install
   pnpm nx run-many -t build
   ```

4. Start the documentation and visual-check surface:

   ```bash
   pnpm nx run pagopa-ui-storybook:storybook
   ```

   Storybook answers at `http://localhost:6006`; `PORT` moves it.

### GitHub Copilot plugins

`.github/copilot/settings.json` carries the recommended PagoPA DX marketplace
and plugin suggestions. Keep it committed to avoid per-developer setup drift;
edit the related flags if the team does not use a suggested plugin. See the
[DX plugin documentation](https://dx.pagopa.it/docs/coding-with-ai/plugin-marketplace).

## Composition

The repository is an Nx monorepo. The design system is the package
`packages/pagopa-ui`; its generated artwork is `packages/artwork`; its design
foundations are `packages/tokens`; its checks and Figma tooling are
`packages/ui-cli`; the documentation is the application
`apps/storybook`; the agent documents, the ADRs and the workflows live at the
workspace root. The paths below are inside `packages/pagopa-ui` unless they
name another package.

The design system uses TypeScript 7, Tailwind CSS v4 and Base UI primitives
(shadcn wrappers), with Storybook as its documentation surface.

- `src/components/primitives` — Base UI primitives; `icons` — the public icon
  and pictogram components, re-exporting the generated catalogue from
  `packages/artwork`.
- `src/components/{inputs,navigation,feedback,content,data-display,composites,overlays}`
  — the families.
- `src/pagopa-ui.ts` — the public entry point.
- `src/catalog/figma` — inventory, registry, story titles, parity cases, device policy,
  exceptions.
- `src/index.css` — the semantic aliases and the stylesheet entry; `src/library.css`
  — the published scan surface of the stylesheet, whose size
  `packages/ui-cli/src/checks/css-budget.ts` records; `src/lib/cn.ts` — the
  configured class-merge engine. The token manifest and the generated CSS live in
  `packages/tokens`.
- The stories and the guides are in `apps/storybook/src` (`guides/*.md`).
- `apps/storybook` — the documentation application: the stories, the Figma
  page templates (`apps/storybook/src/templates`, never shipped), the component
  guides and the accessibility support, with the Storybook configuration that
  renders them.
- `packages/artwork` — the pinned SVG assets and the generated icon and
  pictogram modules, exported as typed data (`pagopa-ui-artwork`).
- `packages/ui-cli` — the checks and the Figma tooling, audited through
  an explicit root ([README.md](./packages/ui-cli/README.md)).

Each folder under `packages/` is a reusable workspace. Packages meant for
internal sharing declare `private: true`; the others are intended for the
registry. Components consume artwork through its package, never a file path.

`apps/` holds deployable artifacts; deployment belongs to each application.
Storybook builds its static documentation into `apps/storybook/dist`.
Its hosting target is Azure Static Web App.

`infra/` holds the infrastructure as code for project resources and execution
environments. `docs/` holds technical documentation, architecture,
[ADRs](https://adr.github.io/), standards, reports and plans. Deferred decisions
and their triggers are in [docs/decisions](./docs/decisions/). Consumer
documentation belongs to the package README or to an application under `apps/`.

### Repository infrastructure

`infra/repository` configures repository settings. It is intended to run once,
locally, at project initialization:

```bash
cd infra/repository
az account set --name <subscription_name>  # when Azure is the CSP
terraform init
terraform plan
terraform apply
```

## Nx tasks

Every task is an Nx target: `pnpm nx show project pagopa-ui` lists the design
system's, `pnpm nx show project pagopa-ui-cli` the tooling's. Direct UI CLI
invocation is documented in [the UI CLI
README](./packages/ui-cli/README.md#cli); the Nx targets below remain the gates
and CI entry points.

Use `pnpm nx show projects` to list projects and
`pnpm nx show project <name>` to inspect their targets.

- `pnpm nx run pagopa-ui-storybook:storybook` — Storybook on
  `http://localhost:6006`; `PORT=6007` moves it, and `STORYBOOK_URL` points the
  UI CLI at a Storybook another session serves.
- `pnpm nx run pagopa-ui-storybook:test:stories` — the stories in Firefox and WebKit;
  `pnpm nx run pagopa-ui-storybook:test:webkit` — the stories in WebKit alone, the pass a
  pull request runs; `pnpm nx run pagopa-ui-storybook:test:coverage` — the stories in
  Chromium with v8 coverage and the gates.
- `pnpm nx run pagopa-ui-storybook:test:changed` — only the tests affected since the last
  successful run of the same command; for iterating, the chain stays the gate
  ([baseline](./packages/ui-cli/README.md#the-changed-only-test-loop)).
- `pnpm nx run pagopa-ui:test` — the package's unit project.
- `pnpm nx run pagopa-ui-artwork:test` — the artwork identities, variants,
  standalone SVGs and provenance (`check:artwork`, hung under `test` so the DX
  review reaches it).
- `pnpm nx run pagopa-ui-tokens:test` — the token manifest against the generated
  CSS and TypeScript (`check:tokens`, hung under `test`).
- `pnpm nx run pagopa-ui-cli:test` — the `node --test`
  suites of the tooling and of its fixtures.
- `pnpm nx run pagopa-ui:check:catalogue` — hermetic catalogue check;
  `foundation:check` — the component class contract. The artwork and the tokens
  validate themselves: `pagopa-ui-artwork:test` and `pagopa-ui-tokens:test`.
  `pagopa-ui:update:stories` refreshes the committed Storybook titles the
  inventory story links read; `check:catalogue` fails when they are stale.
- `pnpm nx run pagopa-ui:layers:check` — the import layers of the
  [`pagopa-ui-standards`](./.agents/skills/pagopa-ui-standards/references/definition-of-done.md)
  definition of done; `pnpm nx run pagopa-ui:docs` — document links and the
  agnosticism of the `figma-to-code` skill.
- `pnpm nx run pagopa-ui:library:check` — the packed artifact in a plain app,
  three engines. The stylesheet payload budget of the built artifact runs inside
  `pnpm nx run pagopa-ui:build`.
- `pnpm nx run pagopa-ui-storybook:build` — the deployable documentation
  (`dist/` inside `apps/storybook`) out of the stories the application carries.
- `pnpm ui-cli parity check`,
  `pnpm ui-cli figma devices`
  — parity tools, see the
  [`figma-to-code`](./.agents/skills/figma-to-code/SKILL.md) skill.

### Workspace commands

```bash
# Build all projects, run one target, or select affected tests
pnpm nx run-many -t build
pnpm nx run <project>:<target>
pnpm nx run-many -t <target>
pnpm nx affected -t test

# Type-check or lint the design system
pnpm nx run pagopa-ui:typecheck
pnpm nx run pagopa-ui:lint

# Run a package command in one workspace or in all workspaces
pnpm --filter <workspace> <command>
pnpm -r <command>

# Add a dependency at the root, to one workspace, or to every workspace
pnpm -w add -D <package>
pnpm --filter <workspace> add <package>
pnpm -r add <package>
```

## Lint and format

`oxlint` is the only linter. `.oxlintrc.json` reproduces the rules of the shared
`@pagopa/eslint-config` that Oxlint implements — 95 of the 119 rules, plus the 22
test rules, verified rule by rule. What is missing is the 22 `perfectionist`
sorting rules (Oxlint has no equivalent; the formatter can sort imports, it is
off today) and `no-octal`/`no-undef-init`. Two structural rules, `complexity`
and `max-lines-per-function`, are warnings while their burn-down runs. The
generated modules are excluded in each package that owns them (the artwork and
token ones): the checks compare them byte for byte, so a fix pass must not
rewrite them.

`oxfmt` is the formatter: `pnpm nx format:check` at the workspace root, or
`pnpm nx run pagopa-ui:fmt -c ci` for the package alone.

## Asking an agent

Name the outcome and the scope; the skills own the procedure. Figma is
read-only: the repository reads the design file and never writes to it. When
the agent needs live Figma data, export a read-only `FIGMA_TOKEN` (scopes
`file_content:read`, `library_content:read`) in the shell that runs it — never in
a file the agent reads.

**A Figma delta** — Figma changed, or the weekly drift pull request is open:

> Align the open drift pull request: decide every queued node, device by device,
> and commit the alignment on its branch.

> Figma changed since the last export. Take a new snapshot, show me the delta and
> the queue before changing anything.

**A new component** — from a Figma node, or without one:

> Implement the Figma node `<nodeId>` as a public component. Verify the render
> on every declared device and record the cases.

> Add a private `<family>` helper with no Figma node, used by `<component>`.

**A standards change** — a prop, a visible or announced text, a test, a story or
a guide, with or without Figma:

> Make the empty-state message of `<component>` overridable by the consumer and
> add the test that proves the replacement renders.

**A node review** — an existing mapping, one node at a time:

> Re-review node `<nodeId>`: compare the story with the current source, fix what
> drifted, and tell me the decision and the residues.

> Run a parity wave on the next three pending nodes.

Every session ends with a report — the decision per node, the residues and their
reasons, the commands with their results — and stops before commit, push or pull
request unless you ask for them.

## Skill evals

Both Figma skills carry graded sessions in the `evals.json` format
(agentskills.io): `figma-to-code` in
[`.agents/skills/figma-to-code/evals`](./.agents/skills/figma-to-code/evals/evals.json),
`figma-to-ui` in
[`packages/pagopa-ui/skills/figma-to-ui/evals`](./packages/pagopa-ui/skills/figma-to-ui/evals/evals.json).
Three evals each: one end-to-end pass over a single node or frame, one
guardrail that must stop and report instead of inventing a design, and one
delta triage over two or three nodes that must read the batched context once
instead of a brief per node. They grade
the session — what the agent read, resolved and decided — not the diff, so a
skill change is graded without building anything; they are the regression net
for the skills' own instructions.

The `harbor/` directory next to each `evals/` builds that session for
[harbor-bench](https://github.com/pagopa/dx/tree/main/apps/harbor-bench):
`environment/prepare.sh` prepares the workspace at image build, one
`<task>/task.toml` overlay per task sets the artifact excludes and the
`FIGMA_TOKEN` of the live evals, and the generated verifier hands the judge a
bounded packet of the workspace instead of the whole checkout. Neither `evals/` nor `harbor/`
ships: the `files` list of `packages/pagopa-ui` excludes them.

### Running a skill's evals

```bash
uv tool install "git+https://github.com/pagopa/dx@main#subdirectory=apps/harbor-bench"
# harbor-bench pins `harbor` as a dependency, and `uv tool install` links only
# the package's own executable, so `harbor` on PATH may be another install.
HARBOR="$(uv tool dir)/harbor-bench/bin/harbor"

# One convert per skill: it injects only the skill its evals belong to.
harbor-bench convert --evals .agents/skills/figma-to-code/evals/evals.json --out .harbor/code
harbor-bench convert --evals packages/pagopa-ui/skills/figma-to-ui/evals/evals.json --out .harbor/ui

FIGMA_TOKEN=… COPILOT_GITHUB_TOKEN=… "$HARBOR" run -c .harbor/code/config.yaml -y \
  --ae COPILOT_GITHUB_TOKEN=… \
  --jobs-dir .harbor/runs --job-name code
```

`COPILOT_GITHUB_TOKEN` reaches the agent through `--ae` and the judge through
the host environment. `FIGMA_TOKEN` stays in the host environment: each live
task's `[environment.env]` entry forwards it to that task alone, so the
guardrails and every `figma-to-ui` eval still start without one — an `--ae
FIGMA_TOKEN=…` would hand a token to every task and disarm the guardrail it
grades.

`harbor-bench compare <base> <head>` runs the same evals twice, base skill
against head skill — a local directory or a git source such as
`pagopa/ui@main` — and writes `comparison.md`. Keep `--out .harbor` and
`--runs-dir .harbor/runs`: `.harbor` is ignored.

### What fails fast

A session that cannot be graded does not start, and the failure names the fix:

- `prepare.sh` ends with the command the skill depends on (`pnpm ui-cli figma
  status`, `pagopa-ui-map resolve 61:2786`), so a broken image build stops the
  run before an agent spends a turn on it.
- Without a token the live read reports `token missing — export FIGMA_TOKEN
  (file_content:read, library_content:read)`, which is also the stop the
  `figma-to-code` guardrail grades.
- The workspace packet the verifier hands the judge is capped, so a checkout
  full of `node_modules` and screenshots cannot time the judge out.
- A verifier that finds no judge credential writes `0` and a `reason.txt` naming
  the variable to export, so an ungraded session cannot read as a pass. The same
  holds for the skill-use gate: no proven skill load is a `0`, never a skip.

The evals are not in the green chain: they start agent sessions and need the
network, a Copilot token and, for one eval, a Figma token. Done when every eval
the change touched reports 1.0 in its `verifier/reward.json`, and a 0.0 is read
from `verifier/reward-details.json` before the agent is blamed — a broken judge
scores the same.

## Workflow

1. A working branch from `main`.
2. Conventional commits: `feat:`, `fix:`, `test:`, `docs:`, `chore:`,
   `refactor:`.
3. A pull request to `main` with [the green chain](#the-green-chain) green.
4. A change to the public API exported from `src/pagopa-ui.ts`, or to how a
   component renders, is described in the pull request. The version plans of
   `nx release` carry it to the changelog and to the published package. An
   export change also updates the committed API report with
   `pnpm nx run pagopa-ui:api:update`; the `etc/pagopa-ui.api.md` diff is what
   the pull request reviews, and `api:check` fails until it is committed.

## Git hooks

The repository installs no git hook: the feedback comes from Nx (cached, only
what changed) and CI is the source of truth. `pnpm nx affected -t lint,typecheck`
answers the same question before a push.

## Releases

`nx release` owns the versions. A pull request that changes the package carries
a _version plan_:

```bash
pnpm nx release plan                                  # guided
pnpm nx release plan patch -p pagopa-ui -m "fix: …"    # scriptable
```

The plan file lands in the `version-plans` directory under `.nx` and is
committed with the change.
`pnpm nx release plan:check` reports a touched project without one, and the DX
code review leaves the same warning as a pull request comment. Merging the pull
request opens (or updates) the **Version Packages** pull request with the bump
and the changelog entry; merging that one tags the release.

The design-system package is `@pagopa/ui` and publishes to GitHub Packages
(`https://npm.pkg.github.com`), not npmjs. Nx infers its
`nx-release-publish` target from the non-private package manifest, while
`project.json` pins that target to GitHub Packages. `release.yaml` supplies the
GitHub token with `packages: write`. The normal release flow publishes only
after a version plan is merged; `workflow_dispatch` is an explicit recovery
path that publishes all projects with a publish target.

Package visibility and consumer access are managed in GitHub Packages.
The first publication is still pending; consumer installation is documented in
the [root README](./README.md#install).

## CI

`.github/workflows/validate.yaml` runs the DX code review on every pull request
and delegates to the reusable
[`validate-v2.yaml`](https://github.com/pagopa/dx/blob/main/.github/workflows/validate-v2.yaml)
workflow. Alongside the Nx checks below, it formats projects and runs
`validate`, `trivy` and Terraform plans for infrastructure projects under the
`infra-<env>-ci` GitHub environments.

Terraform roots under `infra/` are inferred by `@pagopa/nx-terraform`. Shared
Terraform modules live in `_modules` directories; changing one marks every
project in its area as affected. Projects with a `Dockerfile` are inferred by
`@pagopa/nx-docker`.

- `validate.yaml` — the DX reusable code review: `fmt`, `lint`, `typecheck`,
  `docs`, `build` and the unit project on the affected projects, plus the version
  plan warning. The app's `build` runs here too, so the documentation is proven
  to build on every pull request that touches the package.
- `deep-checks.yml` — the suites that need a browser, in three parallel jobs: the
  coverage gates on Chromium, the WebKit pass and the packed artifact consumer. On
  pull requests for the affected projects, where WebKit is the extra engine;
  nightly on everything, which adds Firefox. Draft pull requests are skipped
  until they are ready for review. A merge to `main` runs nothing: the diff it
  carries is the one the pull request already proved, and the nightly is the
  whole-repository pass.
- `visual.yml` — the visual regression on the whole catalogue: the nightly and
  the **Version Packages** pull request, so a publish is never gated on a scoped
  guess. `visual:update` captures a diff's images, `visual:check` opts a pull
  request into the comparison.
- `figma-drift.yml` — the weekly drift snapshot and its review pull request.
- `release.yaml` — the DX release manager, on `main`.

Deep checks and visual regression attach seven-day `nx-profile-*` artifacts,
including on failed runs. Their Chrome-trace JSON records each Nx task's duration
(`dur` in microseconds) and status; visual artifacts also carry the actual scope.
An affected run with no tasks is an empty sample, not a speed improvement.
Compare runs with the same event, engine and non-empty scope, alongside GitHub's
setup/job timings, before changing parallelism. No coverage threshold, engine,
scope fallback or baseline review is relaxed by this instrumentation; sharding
remains an experiment, not an assumed win.

### The release pull request

The **Version Packages** pull request and the commit it lands on `main` are not
changes: they carry the version, the changelog and the consumed version plan,
and nothing else. The code being published was proven on the pull request that
produced it, so the release skips the code review, the story preview and the
deep checks. A skipped job reports `skipped`, which merges cleanly; a
path-filtered workflow would leave a required check pending instead.

The visual regression is the one check that runs there, because that pull
request is the last moment before `@pagopa/ui` is published: it captures the
whole catalogue, at every width, against the committed Linux baselines. A
baseline the nightly or this gate rejects is repaired by its own pull request
with the `visual:update` label; merging it updates the **Version Packages** pull
request, whose synchronisation runs the gate again on the new images.

Merging a release therefore starts the release and the production Storybook
deploy, not seven runs at once. A hand-written pull request runs everything but
the visual regression: only the `nx-release/` branch is exempt from the other
checks, and the visual gate belongs to it — or to a pull request carrying
`visual:check`.

No merge to `main` runs the deep checks or the visual regression: a merge
carries the diff its pull request already proved, and the nightly schedules are
what re-prove the whole repository. For the visual gate the proof a change
carries is the baselines it commits with `visual:update`; the nightly and the
release gate are where the whole catalogue is compared again.

## The green chain

Green before commit; CI runs the same:

```bash
pnpm nx run workspace:verify
```

`-c fast` is the quick subset: it stops before the browser suites and the
Storybook build, so it never replaces the full run before a commit.

What it runs:

```bash
pnpm nx run-many -p pagopa-ui -c=ci -t typecheck,fmt,lint,docs,check:catalogue,foundation:check,layers:check,build,test && \
  pnpm nx run-many -p pagopa-ui-artwork,pagopa-ui-tokens,pagopa-ui-cli -c=ci -t typecheck,fmt,lint && \
  pnpm nx run pagopa-ui-artwork:test && pnpm nx run pagopa-ui-tokens:test && pnpm nx run pagopa-ui-cli:test && \
  pnpm nx run pagopa-ui-cli:check:context-budget && pnpm nx run pagopa-ui-cli:check:rules && pnpm nx run pagopa-ui-cli:check:parity && \
  pnpm nx run pagopa-ui-storybook:test:coverage && pnpm nx run pagopa-ui-storybook:test:stories && pnpm nx run pagopa-ui-storybook:build && pnpm nx run pagopa-ui:library:check
```

The `ci` configuration is the gate: `lint` and `fmt` check instead of writing.
`library:check` and the story passes need the Playwright browsers
(`pnpm exec playwright install chromium firefox webkit`) and the built artifact;
they are the slow end of the chain and run last. The `infra/` projects validate
in CI, where `mise deps` has initialized their toolchain.

### Visual regression

`visual.yml` captures every story at 320, 600 and 1200 px, except the ones
tagged `no-visual`, and compares each image with the baselines in
`apps/storybook/visual/__screenshots__`. Baselines are produced only on Linux,
in the Playwright container `mcr.microsoft.com/playwright:v1.63.0-noble`, by the
workflow itself: never commit one produced on macOS.

The gate runs nightly at 04:00 UTC and on the **Version Packages** pull request,
both times on the whole catalogue: a story nothing captured surfaces a day after
it reached `main`, and a publish never rests on a scoped guess. `--all` names
that capture and skips the walk.

A change owns its images. `ui-cli test visual` reads the built Storybook index,
walks the imports each story reaches — the story file, what it imports, the
shared preview and the stylesheets behind it — and writes the story ids to
`scope.json` in `apps/storybook/visual/`, which the spec reads through
`VISUAL_SCOPE`. A change to a component the walk reaches names the stories that
render it; a change to a file no story imports names none. The same walk widens
to the whole catalogue for anything that can move every screenshot without an
import edge: `packages/tokens`, `packages/artwork`, the design-system `assets`,
the storybook manifests and lockfile, the visual harness itself, and any deleted
source. The `visual:update` label runs that walk and commits the images it names
to the head branch, so a pull request that adds or moves a story carries its
baselines and leaves the other images' bytes alone.

The `visual:check` label runs the same comparison on any pull request, for as
long as the label stays: it is how a reviewer proves a risky change before the
merge, and how the commit the update job pushed gets verified, since that commit
is made with `GITHUB_TOKEN` and starts no run of its own.

Run the same two steps locally:

```bash
pnpm nx run pagopa-ui-storybook:build
pnpm nx run pagopa-ui-cli:test:visual -- --since origin/main --out apps/storybook/visual/scope.json --check-baselines
VISUAL_SCOPE=apps/storybook/visual/scope.json pnpm nx run pagopa-ui-storybook:test:visual
```

`--all` skips the walk and names no story; without `VISUAL_SCOPE` the suite is
complete too. The file carries the mode as well: `stories` lists the ids to
capture, `all` names none because the whole catalogue runs.
`--check-baselines` lists missing or untracked Linux images for the selected
stories before the browser starts; the update job omits it so it can create
those images.

The comparison uses `threshold: 0` and a 32-pixel budget. Every counted pixel
must match exactly; the budget absorbs Chromium's small border and text
rasterisation drift (about 0.01% of a 320x900 capture) without hiding a surface
or layout change. A failure above the budget is a finding, not noise.

To accept a visual change, add the `visual:update` label to the pull request.
The workflow commits the new images to its head branch; review a sample, then
add `visual:check` so the gate compares the committed images. The same
comparison runs locally with Docker and the same image:

```bash
docker run --rm --ipc=host -v "$PWD":/work -w /work/apps/storybook \
  mcr.microsoft.com/playwright:v1.63.0-noble \
  pnpm exec playwright test -c visual/playwright.config.ts
```
