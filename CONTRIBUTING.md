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

4. Start the documentation surface:

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

The design system uses TypeScript 6 — one compiler, the stable line, per
[ADR-0010](./docs/decisions/0010-single-typescript-compiler.md) —, Tailwind CSS
v4 and Base UI primitives (shadcn wrappers), with Storybook as its documentation
surface.

- `src/components/primitives` — Base UI primitives; `icons` — the public icon
  and pictogram components, re-exporting the generated catalogue from
  `packages/artwork`.
- `src/components/{inputs,navigation,feedback,content,data-display,composites,overlays}`
  — the families.
- `src/pagopa-ui.ts` — the public entry point.
- `src/catalog/figma` — inventory, registry, story titles, device policy,
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
[ADRs](https://adr.github.io/), standards, reports and plans;
[docs/README.md](./docs/README.md) is its navigation surface, and every document
of the tree is reachable from it. Deferred decisions and their triggers are in
[docs/decisions](./docs/decisions/). Consumer documentation belongs to the
package README or to an application under `apps/`. The [glossary
map](./GLOSSARY.md) separates the Figma-alignment vocabulary from the consumer
design-system one.

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
  Chromium with v8 coverage and the gates. Every one of them takes
  `-- --shard=<index>/<count>`, which runs one slice of the collected story
  files: the nightly workflow spreads the full pass over four runners.
- `pnpm nx run pagopa-ui-storybook:test:changed` — only the tests affected since the last
  successful run of the same command; for iterating, the chain stays the gate
  ([baseline](./packages/ui-cli/README.md#the-changed-only-test-loop)).
- `pnpm nx run pagopa-ui:test` — the package's unit project.
- `pnpm nx run pagopa-ui-artwork:test` — the artwork identities, variants,
  standalone SVGs and provenance (`check:artwork`, hung under `test` so the DX
  review reaches it).
- `pnpm nx run pagopa-ui-tokens:test` — the token manifest against the generated
  CSS and TypeScript (`check:tokens`, hung under `test`).
- `pnpm nx run pagopa-ui-cli:test:unit` and
  `pnpm nx run pagopa-ui-cli:test:contracts` — the `node --test` suites of the
  tooling and of its fixtures, split by what they read. The unit target runs
  every suite that works against a temporary tree, so a fixture edit does not
  invalidate the consumers of the `tooling` named input; the contract target
  runs the five suites that read this repository — the task graph, the
  workflows and the Nx inputs — and is never cached.
- `pnpm nx run pagopa-ui:check:catalogue` — hermetic catalogue check, which
  warns when the committed Storybook titles the inventory story links read are
  behind: the drift refresh regenerates them and `pagopa-ui:update:stories` does
  it on demand; `foundation:check` — the component class contract. The artwork
  and the tokens validate themselves: `pagopa-ui-artwork:test` and
  `pagopa-ui-tokens:test`.
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
  `pnpm ui-cli check devices`
  — the parity diagnostic — it compares a node's numeric source with its story
  and records nothing — and the device policy, see the
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

> Run a parity check on the next three pending nodes.

Every session ends with a report — the decision per node, the residues and their
reasons, the commands with their results — and stops before commit, push or pull
request unless you ask for them.

## Third-party skills

Two skills come from publishers outside this repository — `modern-web-guidance`
for the platform itself, `shadcn` for the primitives. Each is committed as a
thin `SKILL.md` entrypoint and nothing else: the corpus it delegates to (36k
lines of guides, rule files and assets) stays out of the tree.

[`skills-lock.json`](./skills-lock.json) pins both — the source repository, the
commit and a content hash over the pinned tree — and one command restores them
and verifies them against that pin:

```bash
pnpm skills:restore
```

It downloads the pinned copies into `.agents/skills/`, fails instead of
rewriting the lockfile when a hash disagrees (`--frozen-lockfile`), and puts the
two entrypoints back so the tree stays consistent. Restored files are
gitignored: `git status` stays quiet whether or not the corpus is on disk. To
look without restoring, `npx -y skills@1.9.0 list` reports what is installed,
`npx -y skills@1.9.0 list --json` each skill's status, and
`npx -y skills@1.9.0 experimental_install --dry-run` what a restore would do.

The entrypoints delegate, so they work with nothing restored:
`modern-web-guidance` reads its corpus through
`pnpx modern-web-guidance@latest search|retrieve`, `shadcn` reads its live
documentation through `npx shadcn@latest docs`. Both need outbound network
access. They are also the repository's own text, so `skills list` reports the
pinned skills as `modified`: the hash pins the publisher's tree, not the
entrypoint. `npx -y skills@1.9.0 update <name> -p` moves the pin to a newer
commit and rewrites the lockfile — re-apply the entrypoint on top and commit
both.

What stays vendored, and why the lockfile cannot retrieve it:

| Skill                                                                | Why it stays                                                                                                                                                                  |
| -------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `pagopa-ui-standards`, `figma-to-code`, `start-figma-to-code`        | written here; there is no upstream to pin                                                                                                                                     |
| `figma-to-ui`, in `packages/pagopa-ui/skills/`                       | written here and shipped in the package for its consumers; there is no upstream to pin                                                                                        |
| the `nx-*` and `link-workspace-packages` skills in `.github/skills/` | generated by `pnpm nx configure-ai-agents` from the Nx plugins in `nx.json`; the `skills` CLI installs from an agentskills repository, so it cannot retrieve generator output |

## Skill evals

Both Figma skills carry graded sessions in the `evals.json` format
(agentskills.io): `figma-to-code` in
[`.agents/skills/figma-to-code/evals`](./.agents/skills/figma-to-code/evals/evals.json),
`figma-to-ui` in
[`packages/pagopa-ui/skills/figma-to-ui/evals`](./packages/pagopa-ui/skills/figma-to-ui/evals/evals.json).
Seven evals for `figma-to-code` — an end-to-end pass over a single node, a
guardrail that must stop and report instead of inventing a design, a delta
triage over two or three nodes that must read the batched context once instead
of a brief per node, a drift census reconciliation guardrail over an offline
export, a scoped rules-refresh guardrail that keeps untouched pages intact on a
partial snapshot, a batched page-surface sync guardrail covering composition
candidates and unverified missing compositions, and a property map round trip
that records a declared mapping through `record --props`, reads it back the way
a consumer does, and reports the preflight refusal of an undeclared property.
`figma-to-ui` has three: the end-to-end pass over a frame, the guardrail, and
the declared property map a consumer sets for a component set. They grade
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

The workspace each task grades is cut from `main` unless `PAGOPA_UI_REF` says
otherwise, in `prepare.sh` of both skills: a pinned commit goes stale silently,
and the skill ends up graded against a `ui-cli` that is not the one in the same
checkout, so a renamed flag reads as a skill regression nobody can reproduce.
`PAGOPA_UI_REF=<sha>` reproduces an older run, and tries a branch before it
merges:

```bash
PAGOPA_UI_REF="$(git rev-parse HEAD)" harbor-bench convert \
  --evals .agents/skills/figma-to-code/evals/evals.json --out .harbor/code
```

`harbor-bench compare <base> <head>` runs the same evals twice, base skill
against head skill — a local directory or a git source such as
`pagopa/ui@main` — and writes `comparison.md`. Keep `--out .harbor` and
`--runs-dir .harbor/runs`: `.harbor` is ignored.

### Skill evals in CI

[`skill-evals.yml`](./.github/workflows/skill-evals.yml) splits the suite along
the one line that matters — what a credential can buy:

- **Compile** runs on every pull request that touches a skill, an `evals.json`
  or `packages/ui-cli`, and needs no token. It converts both suites, which
  rejects an eval the schema does not accept, and diffs every compiled
  `task.toml` against the overlay meant to describe it: a renamed eval keeps its
  old overlay directory, convert falls back to the defaults, and the run would
  grade a task whose artifact excludes and `FIGMA_TOKEN` entry are wrong.
- **Grade** starts agent sessions, so it is dispatch and weekly only. It
  preflights `COPILOT_GITHUB_TOKEN` and `FIGMA_TOKEN` and fails by name when
  either is missing, because a token-free subset would read as a pass for a
  suite it never ran. A fork pull request cannot see the secrets, so it compiles
  and stops there. Run it by hand before a release:
  `gh workflow run skill-evals.yml -f skill=both`.

### What fails fast

A session that cannot be graded does not start, and the failure names the fix:

- `prepare.sh` ends with the commands the skill depends on (`pnpm ui-cli figma
  status`, `pagopa-ui-map resolve 61:2786`) and writes a scratch file through
  the JSON writer, so a broken image build — or a writer that cannot write —
  stops the run before an agent spends a turn on it.
- Without a token the live read reports `token missing — export FIGMA_TOKEN
  (file_content:read, library_content:read)`, which is also the stop the
  `figma-to-code` guardrail grades.
- The workspace packet the verifier hands the judge is capped, so a checkout
  full of `node_modules` and screenshots cannot time the judge out.
- A verifier that finds no judge credential writes `0` and a `reason.txt` naming
  the variable to export, so an ungraded session cannot read as a pass. The same
  holds for the skill-use gate: no proven skill load is a `0`, never a skip.

The evals are not in the green chain: they start agent sessions and need the
network, a Copilot token and, for three of them, a Figma token. Done when every
eval the change touched reports 1.0 in its `verifier/reward.json`, and a 0.0 is
read from `verifier/reward-details.json` before the agent is blamed — a broken
judge scores the same.

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
   the pull request reviews, and `api:check` fails until it is committed. The
   report is not the only guard: `consumer:typecheck` compiles
   `packages/pagopa-ui/consumer-fixture/` against `dist/types` alone, wrapping
   every exported component with its own props type, so an export a consumer
   cannot name breaks that task instead of the report.

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
`project.json` pins that target to GitHub Packages. The package is MIT licensed
and carries `publishConfig.access: "public"`; the same
`release.yaml` job publishes with the repository's own `GITHUB_TOKEN` — no
additional secret — under a `packages: write` permission. The normal release
flow publishes only after a version plan is merged; `workflow_dispatch` is an
explicit recovery path that publishes all projects with a publish target.

Package visibility and consumer access are managed in GitHub Packages.
A public GitHub Packages package still requires an authenticated install, so
consumers need the `.npmrc` and token documented in the
[root README](./README.md#install).
The first publication is still pending.

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
  coverage gates on Chromium, the WebKit pass and the packed artifact consumer.
  On pull requests for the affected projects, where WebKit is the extra engine
  and the story pass runs only the story files the diff reaches; nightly on
  everything, which adds Firefox and splits the story pass into four shards.
  Draft pull requests are skipped until they are ready for review. A merge to
  `main` runs nothing: the diff it carries is the one the pull request already
  proved, and the nightly is the whole-repository pass.
- `chromatic.yml` — the visual diff, run by Chromatic. It is opt-in through the
  `CHROMATIC_PROJECT_TOKEN` secret: the first step publishes whether the token
  exists and every later step is conditional on it, so without one the job is
  green and says so in a notice. See [Visual regression](#visual-regression).
- `figma-drift.yml` — the weekly drift snapshot, component and token, and its
  review pull request.
- `release.yaml` — the DX release manager, on `main`.

Deep checks attach seven-day `nx-profile-*` artifacts, including on failed runs,
and the Chromatic run attaches the one its Storybook build wrote. Their
Chrome-trace JSON records each Nx task's duration (`dur` in microseconds) and
status. An affected run with no tasks is an empty sample, not a speed
improvement. Compare runs with the same event, engine and non-empty scope,
alongside GitHub's setup/job timings, before changing parallelism. No coverage
threshold, engine, scope fallback or baseline review is relaxed by this
instrumentation. The story
shards are the one parallelism the workflows assume: four of them for the whole
catalogue and one for a pull request, where the affected files already fit one
runner and a shard no file reaches would be an empty run. Whether four is the
right count is what those timings answer.

### The release pull request

The **Version Packages** pull request and the commit it lands on `main` are not
changes: they carry the version, the changelog and the consumed version plan,
and nothing else. The code being published was proven on the pull request that
produced it, so the release skips the code review and the story preview: a
skipped job reports `skipped`, which merges cleanly where a path-filtered
workflow would leave a required check pending instead. It does not skip the deep
checks, which run there at the whole-catalogue scope of the nightly, because
what the release guards is the publish and a publish answers to every story.

The visual diff runs there, because that pull request is the last moment before
`@pagopa/ui` is published: it compares the whole catalogue, at every width an
ordinary pull request does not capture it at all. A diff the weekly or this pass
finds is accepted in the Chromatic dashboard, and the pass that reports after the
acceptance is the one that proves the fix.

Merging a release therefore starts the release and the production Storybook
deploy, not seven runs at once. A hand-written pull request runs everything:
only the `nx-release/` branch skips the code review and the story preview, and
its deep checks and visual pass take the whole catalogue.

No merge to `main` runs the deep checks or the visual diff: a merge carries the
diff its pull request already proved, and the nightly schedules are what re-prove
the whole repository. The visual diff is the exception on the pull request side:
it is not captured there at all, so the weekly pass and the release pass are
where the whole catalogue is compared, and a regression is named within a week of
reaching `main`.

## The green chain

Green before commit; CI runs the same. The chain is one Nx task graph: every
gate is an Nx target, `workspace:verify` names the whole graph, and Nx schedules
what the dependencies allow in parallel and replays what it has already cached.

```bash
pnpm nx run workspace:verify
```

`-c fast` is the quick subset: it stops before the browser suites and the
Storybook build, so it never replaces the full run before a commit.

Two gates are not Nx projects, and the chain keeps them anyway.
`mise install --locked node pnpm` opens it as a plain command — a toolchain pin
that could be replayed from a cache would prove nothing — and fails when
`mise.lock` no longer matches what `mise.toml` resolves.
`workspace:check:format` wraps `nx format:check`, which covers every tracked
file, `docs/` and `mise.toml` included.

What the graph holds:

- `workspace:verify-full` — the whole chain: `workspace:verify-fast` plus the
  Storybook tail, `pagopa-ui-storybook:typecheck`, `build`, `test:coverage`,
  `test:stories` and `pagopa-ui:library:check`;
- `workspace:verify-fast` — the static half, gate by gate:
  `workspace:check:format`; `pagopa-ui` `typecheck`, `format:check`,
  `lint:check`, `docs`, `check:catalogue`, `foundation:check`, `layers:check`,
  `build`, `test`; `pagopa-ui-artwork`, `pagopa-ui-tokens` and `pagopa-ui-cli`
  `typecheck`, `format:check`, `lint:check`, `test`. The `.Regole` card report
  (`pagopa-ui-cli:check:rules`) is not a gate: it prints the drift and exits 0,
  and `--strict` is the caller that wants it to fail.

`lint:check` and `format:check` are the gate: `lint` and `fmt` write, the
`:check` variants report, which is what the `ci` configuration CI uses resolves
to. `pagopa-ui:test` pulls the checks that package owns — `api:check`,
`figma:map:check`, `a11y:conformance:check` and the rest — through its
`dependsOn`, so each runs once, wherever in the graph it is needed. A gate is
added by adding a `dependsOn` entry to `tools/workspace/project.json`;
`packages/ui-cli/tests/contracts/verify-chain.test.mjs` reads the task graph and
fails when one leaves it.

A lock the gate rejects is refreshed with `mise lock node pnpm`, which rewrites
only the entries whose resolution moved; commit it with the `.mise/locks`
directory it points at.
`library:check` and the story passes need the Playwright browsers
(`pnpm exec playwright install chromium firefox webkit`) and the built artifact;
they are the slow end of the chain and run last. The `infra/` projects validate
in CI, where `mise deps` has initialized their toolchain.

### Visual regression

Chromatic renders every story at 320, 600 and 1200 px — the widths
`apps/storybook/.storybook/preview.tsx` declares — compares them with the last
build on the base branch, and keeps the history, the review and the accept step
in its dashboard. The decision and its reasons are
[ADR-0018](./docs/decisions/0018-chromatic-for-visual-regression.md); this
section is how to use it.

**The run is experimental.** [ADR-0018 §4](./docs/decisions/0018-chromatic-for-visual-regression.md)
records why: a build over the plan's limit publishes and runs no test while
staying green, and the capture reports rather than gates. A green Chromatic check
therefore reports that the run happened, not that the pixels did not move — it is
a dashboard to read beside a change, never the proof that the change looks the
same, and it is not a required check. ADR-0018 §5 names what ends the
experimental status, and
[§7](./docs/decisions/0018-chromatic-for-visual-regression.md) amends it with the
two decisions below.

The integration is opt-in through the `CHROMATIC_PROJECT_TOKEN` environment
secret of `app-dev-ci` ([Figma drift secrets](./docs/figma-drift-secrets.md) has
the create and rotate steps). The workflow stays in place and its first step
publishes whether the token exists: without one the job is green and says so in
a notice, and the day the secret is created the same run starts comparing with
nothing else to change. Run it locally with the token in the environment:

```bash
pnpm nx run pagopa-ui-storybook:build
CHROMATIC_PROJECT_TOKEN=… pnpm nx run pagopa-ui-storybook:chromatic -- --ci
```

The cadence is weekly, on the **Version Packages** pull request and on a manual
dispatch — never on an ordinary pull request. A pull request is gated instead by
the story suite, the two condition renderings and the accessibility contract in
`deep-checks.yml`, which run in minutes and fail the check; a capture bills per
snapshot, reports rather than gates, and is read against a history that is worth
reading a week later. Every pass compares the whole catalogue, so nothing is
scoped and TurboSnap is not wired: no `--only-changed`, no stats file, and a
shallow checkout. The trade is accepted: a visual regression surfaces within a
week of reaching `main`, and the weekly run names the commit it appeared in.

Two stories pin their own width, and they capture only that width: `SideNav >
Condensed` renders a 1440 px page fixture and `SideNav > CondensedMobile` its
320 px counterpart, so the other two widths are a crop of a composition that does
not respond. A story that does respond keeps the three widths.

The comparison reports, it does not gate: `exitZeroOnChanges` in
`apps/storybook/chromatic.config.json` keeps a non-empty diff green and the
verdict in the dashboard. To accept a change, open its build in the dashboard
and accept the changed stories; the next build of the branch compares against
what was accepted. Nothing is stored in this repository — no image, no
`__screenshots__`, no baseline key.

The capture is what the plan sells, and a full build is 544 stories at three
widths. Under the plan's limit Chromatic limits the build instead of failing it:
the Storybook publishes, no test runs and the job is green while comparing
nothing. The step after the CLI reads its log for that answer and raises a
warning annotation and a summary line, so a green check that proved nothing says
so on the pull request instead of looking like a clean one — but the plan still
has to cover the catalogue before the run means anything.

The build also runs the stories' `play` functions as interaction tests, and one
of those failing fails the build even with `exitZeroOnChanges`. Ten stories pin
desktop geometry — a fixed row height, an 852 px table, 899 px and 900 px
regions, four footer columns, a 1440 px page whose rail expands on hover — and
Chromatic renders each story at 320, 600 and 1200 px, so the narrow rendering is
what failed their plays; `test:stories` passes them because the browser runner's
viewport is wide. No Storybook parameter disables only the play
(`disableSnapshot` stops the capture too), so those ten plays open with the
guard below and the capture judges their pixels while `test:stories` judges their
behaviour on two engines:

```tsx
import isChromatic from "chromatic/isChromatic"

export const Pinned: Story = {
  play: async ({ canvasElement }) => {
    if (isChromatic()) return
    // …
  },
}
```

`isChromatic()` is false at build time and under `test:stories` and true only in
Chromatic's renderer, so the guard costs the other runs nothing. Write it only
for a play whose assertions are desktop geometry: a play that holds at every
width should keep running here.

Two catalogues change whenever everything else does, so they are exempt by
parameter rather than by a tag: `Foundations/Tokens` and the Figma inventory
declare `parameters.chromatic.disableSnapshot`. The review stories under
`Reviews/` are not compared either: they live on `design.preview.branch`, and
the workflow skips that head ref.
