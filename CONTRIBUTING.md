# Contributing — PagoPA UI

Work in this repository is done by asking a coding agent; the person reviews and
merges. This file holds what is true for people and agents alike;
[AGENTS.md](./AGENTS.md) adds the agent-only rules and which skill owns which
work.

## Setup

- The toolchain comes from [mise](https://mise.jdx.dev/) (`mise install`, then
  `mise trust` once): Node 24.22.1 and pnpm 11.28.6, pinned in `.node-version`
  and `mise.lock`.
- `pnpm install`
- `pnpm nx run pagopa-ui-storybook:storybook` for the documentation and the visual checks

## Composition

The repository is an Nx monorepo. The design system is the package
`packages/pagopa-ui`; its generated artwork is `packages/artwork`; its design
foundations are `packages/tokens`; its checks and Figma tooling are
`packages/ui-cli`; the documentation is the application
`apps/storybook`; the agent documents, the ADRs and the workflows live at the
workspace root. The paths below are inside `packages/pagopa-ui` unless they
name another package.

- `src/components/primitives` — Base UI primitives; `icons` — the public icon
  and pictogram components, re-exporting the generated catalogue from
  `packages/artwork`.
- `src/components/{inputs,navigation,feedback,content,data-display,composites,overlays}`
  — the families.
- `src/components/templates` — private page modules and demos.
- `src/pagopa-ui.ts` — the public entry point.
- `src/catalog/figma` — inventory, registry, story titles, parity cases, device policy,
  exceptions.
- `src/index.css` — the semantic aliases and the stylesheet entry; `src/library.css`
  — the published scan surface of the stylesheet, whose size
  `packages/ui-cli/src/checks/css-budget.ts` records; `src/lib/cn.ts` — the
  configured class-merge engine. The token manifest and the generated CSS live in
  `packages/tokens`.
- The stories and the guides are in `apps/storybook/src` (`guides/*.md`).
- `apps/storybook` — the documentation application: the stories, the component
  guides and the accessibility support, with the Storybook configuration that
  renders them.
- `packages/artwork` — the pinned SVG assets and the generated icon and
  pictogram modules, exported as typed data (`pagopa-ui-artwork`).
- `packages/ui-cli` — the checks and the Figma tooling, audited through
  an explicit root ([README.md](./packages/ui-cli/README.md)).

## Nx tasks

Every task is an Nx target: `pnpm nx show project pagopa-ui` lists the design
system's, `pnpm nx show project pagopa-ui-cli` the tooling's. The
underlying command is the package script of the same name
(`pnpm --filter @pagopa/ui run <script>` or
`pnpm --filter pagopa-ui-cli run <script>`).

- `pnpm nx run pagopa-ui-storybook:storybook` — Storybook through portless on a
  free port behind the printed stable URL; `PORTLESS=0` keeps `:6006`.
- `pnpm nx run pagopa-ui-storybook:test:stories` — the stories in Firefox and WebKit;
  `pnpm nx run pagopa-ui-storybook:test:webkit` — the stories in WebKit alone, the pass a
  pull request runs; `pnpm nx run pagopa-ui-storybook:test:coverage` — the stories in
  Chromium with v8 coverage and the gates.
  successful run of the same command; for iterating, the chain stays the gate
  ([baseline](./packages/ui-cli/README.md#the-changed-only-test-loop)).
- `pnpm nx run pagopa-ui:test` — the package's unit project.
- `pnpm nx run pagopa-ui-artwork:test` — the artwork identities, variants,
  standalone SVGs and provenance (`assets:check`, hung under `test` so the DX
  review reaches it).
- `pnpm nx run pagopa-ui-tokens:test` — the token manifest against the generated
  CSS and TypeScript (`tokens:check`, hung under `test`).
- `pnpm nx run pagopa-ui-cli:test` — the `node --test`
  suites of the tooling and of its fixtures.
- `pnpm nx run pagopa-ui:figma:check` — hermetic catalogue check;
  `foundation:check` — the component class contract. The artwork and the tokens
  validate themselves: `pagopa-ui-artwork:test` and `pagopa-ui-tokens:test`.
  `pagopa-ui:figma:stories` refreshes the committed Storybook titles the
  inventory story links read; `figma:check` fails when they are stale.
- `pnpm nx run pagopa-ui:layers:check` — the import layers of the
  [`pagopa-ui-standards`](./.agents/skills/pagopa-ui-standards/references/definition-of-done.md)
  definition of done; `pnpm nx run pagopa-ui:docs` — document links and the
  agnosticism of the `figma-to-code` skill.
- `pnpm nx run pagopa-ui:library:check` — the packed artifact in a plain app,
  three engines. The stylesheet payload budget of the built artifact runs inside
  `pnpm nx run pagopa-ui:build`.
- `pnpm nx run pagopa-ui-storybook:build` — the deployable documentation
  (`dist/` inside `apps/storybook`) out of the stories the application carries.
- `pnpm nx run pagopa-ui-cli:figma:parity:check`,
  `pnpm nx run pagopa-ui-cli:figma:devices`
  — parity tools, see the
  [`figma-to-code`](./.agents/skills/figma-to-code/SKILL.md) skill.

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

## Workflow

1. A working branch from `main`.
2. Conventional commits: `feat:`, `fix:`, `test:`, `docs:`, `chore:`,
   `refactor:`.
3. A pull request to `main` with [the green chain](#the-green-chain) green.
4. A change to the public API exported from `src/pagopa-ui.ts`, or to how a
   component renders, is described in the pull request and in
   [CHANGELOG.md](./packages/pagopa-ui/CHANGELOG.md). The version plans of
   `nx release` carry it to the published package.

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

## CI

- `validate.yaml` — the DX reusable code review: `fmt`, `lint`, `typecheck`,
  `docs`, `build` and the unit project on the affected projects, plus the version
  plan warning. The app's `build` runs here too, so the documentation is proven
  to build on every pull request that touches the package.
- `deep-checks.yml` — the suites that need a browser, in three parallel jobs: the
  coverage gates on Chromium, the WebKit pass and the packed artifact consumer. On
  pull requests and on `main` for the affected projects, where WebKit is the extra
  engine; nightly on everything, which adds Firefox. Draft pull requests are skipped
  until they are ready for review.
- `figma-drift.yml` — the weekly drift snapshot and its review pull request.
- `release.yaml` — the DX release manager, on `main`.

### The release pull request

The **Version Packages** pull request and the commit it lands on `main` are not
changes: they carry the version, the changelog and the consumed version plan,
and nothing else. The code being published was proven on the pull request that
produced it, so the release skips the code review, the story preview and the
deep checks, and the version-only push skips the deep checks. A skipped job
reports `skipped`, which merges cleanly; a path-filtered workflow would leave a
required check pending instead.

Merging a release therefore starts the release and the production Storybook
deploy, not seven runs at once. A hand-written pull request runs everything:
only the `nx-release/` branch is exempt.

## The green chain

Green before commit; CI runs the same:

```bash
pnpm nx run-many -p pagopa-ui -c=ci -t typecheck,fmt,lint,docs,figma:check,foundation:check,layers:check,build,test && \
  pnpm nx run-many -p pagopa-ui-artwork,pagopa-ui-tokens,pagopa-ui-cli -c=ci -t typecheck,fmt,lint && \
  pnpm nx run pagopa-ui-artwork:test && pnpm nx run pagopa-ui-tokens:test && pnpm nx run pagopa-ui-cli:test && \
  pnpm nx run pagopa-ui-cli:figma:parity:verify && \
  pnpm nx run pagopa-ui-storybook:test:coverage && pnpm nx run pagopa-ui-storybook:test:stories && pnpm nx run pagopa-ui-storybook:build && pnpm nx run pagopa-ui:library:check
```

The `ci` configuration is the gate: `lint` and `fmt` check instead of writing.
`library:check` and the story passes need the Playwright browsers
(`pnpm exec playwright install chromium firefox webkit`) and the built artifact;
they are the slow end of the chain and run last. The `infra/` projects validate
in CI, where `mise deps` has initialized their toolchain.
