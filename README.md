# PagoPA UI

## Experimental project

> **EXPERIMENTAL — NOT PRODUCTION-READY.** This project exists to validate the
> hypothesis that AI agents can build and evolve a design system from a Figma
> source, under human direction and automated repository checks. Its APIs,
> architecture and workflows may change as that hypothesis is tested.

React design system that implements the **MUI Italia Next** Figma library, built
with TypeScript 7, Tailwind CSS v4, Base UI primitives (shadcn wrappers) and
Storybook.

## How it is built

The library is developed **agent-first**: people describe the work, coding agents
implement it, and the repository checks what they produce.

- [CONTRIBUTING.md](./CONTRIBUTING.md) — how the project is composed, the
  tasks and the checks, how to ask an agent for the work, with prompt examples,
  and the branch, commit and hook rules.
- [AGENTS.md](./AGENTS.md) — the rules that hold only for agents and which
  agent skill owns which work: component standards, the Figma alignment, and the
  Nx workspace conventions.

## Requirements

- Node.js and pnpm, resolved by [mise](https://mise.jdx.dev/) from `.node-version`
  and `mise.lock` (Node 24.22.1, pnpm 11.28.6 at the time of writing).
- Terraform, tflint, trivy and terraform-docs, also from `mise.toml`/`mise.lock`:
  they are needed by the `infra/` projects only.

## Install and run

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

3. Install the dependencies and build every workspace:

   ```bash
   pnpm install
   pnpm nx run-many -t build
   ```

4. Everyday commands:

   ```bash
   pnpm nx run pagopa-ui-storybook:storybook  # Storybook on http://localhost:6006
   pnpm nx run pagopa-ui-storybook:build      # the static documentation into apps/storybook/dist
   pnpm nx run pagopa-ui:typecheck  # TypeScript in strict mode
   pnpm nx run pagopa-ui:lint       # oxlint, with the fixes
   pnpm nx run pagopa-ui:test       # the unit tests
   pnpm nx run-many -t build        # every project
   pnpm nx affected -t test         # only what the change touches
   ```

   Every task of the repository is an Nx target: `pnpm nx show projects` lists
   the projects, `pnpm nx show project <name>` the targets of one of them.

## Repository layout

### `/packages`

The reusable modules of the project. Each sub-folder is a workspace.

- `pagopa-ui` — the design system: components, tokens, generated artwork, the
  Figma catalogue and the public API.
- `artwork` — the pinned SVG assets of the Figma library and the generated
  icon and pictogram modules, exported as typed data; the components consume
  them through the package, never through a file path.
- `tokens` — the design foundations: the token manifest, the foundations, the
  generated CSS layer and the generated TypeScript inventory.
- `ui-cli` — the checks and the Figma tooling that audit it, with their
  tests; it reads the design system through an explicit root and never from the
  working directory.

Packages meant for internal sharing declare `private: true`; the others are
meant for the registry.

### `/apps`

Deployable artifacts: each folder produces something that runs somewhere, and
how and where it is deployed belongs to that single application. `storybook` is
the one today: it carries the stories and the guides of the design system and
builds them into a static site in `apps/storybook` (the `dist/` directory). The
hosting is decided (Azure Static Web App); its infrastructure and release
workflow are the piece missing before the documentation has an address.

### `/infra`

The infrastructure as code that defines the resources and the execution
environments of the project.

### `/docs`

Technical documentation: architecture, [ADRs](https://adr.github.io/), coding
standards, reports and plans. User documentation belongs to the package
`README` (so a registry shows it) or to an application under `/apps`.

## Useful commands

```bash
# build every workspace with Nx
pnpm nx run-many -t build

# run a task on one project, or on every project
pnpm nx run <project>:<target>
pnpm nx run-many -t <target>

# run a command inside one workspace, or in all of them
pnpm --filter <workspace> <command>
pnpm -r <command>

# add a dependency: to the root, to a workspace, to every workspace
pnpm -w add -D <package>
pnpm --filter <workspace> add <package>
pnpm -r add <package>
```

## Releases

[Nx Release](https://nx.dev/features/manage-releases) owns versioning and the
changelogs. A pull request that changes the package carries a version plan:

```bash
pnpm nx release plan
```

Merging it opens (or updates) a `Version Packages` pull request with the bump and
the changelog entry; merging that one tags the release. Only the projects named
in a version plan are bumped.

The package is named `@pagopa/ui` and
`packages/pagopa-ui/project.json` pins its Nx `nx-release-publish` target to
`https://npm.pkg.github.com`; it is not published to npmjs. Nx infers the
target from the non-private manifest.
`release.yaml` publishes versioned projects with `GITHUB_TOKEN` and
`packages: write`. The normal first publication requires a version plan and a
merged `Version Packages` pull request; `workflow_dispatch` is an explicit
recovery path that publishes all projects with a publish target. Package
visibility and consumer access are managed in GitHub Packages.

### `infra/repository`

Sets up the repository settings; it is meant to be executed once, on a local
machine, at project initialization:

```bash
cd infra/repository
az account set --name <subscription_name>  # when Azure is the CSP
terraform init
terraform plan
terraform apply
```

## Consuming the library

After the first release, configure the `@pagopa` scope to use GitHub Packages
(not npmjs) and provide a GitHub classic personal access token with
`read:packages`. Keep the token in an environment variable, not in a committed
file:

```ini
@pagopa:registry=https://npm.pkg.github.com
//npm.pkg.github.com/:_authToken=${NODE_AUTH_TOKEN}
```

Then install `@pagopa/ui` next to React and ReactDOM in the declared peer range,
and import the built stylesheet once:

```tsx
import "@pagopa/ui/styles.css"
import { Button } from "@pagopa/ui"
```

Consumers need no Tailwind, shadcn, repository aliases or font packages: the
artifact ships compiled CSS, the text fonts with their licence, standalone icon
and pictogram SVGs, and declarations for strict Bundler and NodeNext
resolution. The application theme is **light only**; dark pictogram variants
are artwork, not dark application support.

## Versioning

Nothing is published to a registry yet.
Deferred decisions and their triggers are in
[docs/decisions](./docs/decisions/).

## Workflow automation

`.github/workflows/validate.yaml` runs the DX code review on every pull request
and delegates to the reusable
[`validate-v2.yaml`](https://github.com/pagopa/dx/blob/main/.github/workflows/validate-v2.yaml)
workflow: it formats every project, warns on a missing version plan, and runs
`fmt`, `lint`, `typecheck`, `test`, `build` and `docs` on the Nx projects the
change affects (plus `validate`, `trivy` and the Terraform plans for the
infrastructure projects, under the `infra-<env>-ci` GitHub environments).
Terraform roots under `infra/` are inferred by `@pagopa/nx-terraform`; shared
Terraform modules live in `_modules` directories, and a change there marks every
project in the same area as affected. Projects with a `Dockerfile` are inferred
by `@pagopa/nx-docker`.

The checks the reusable workflow does not call — the story projects with the
coverage gates on Chromium, the WebKit pass, and the packed-artifact consumer —
run in `.github/workflows/deep-checks.yml` as three parallel jobs, on pull
requests and on `main` for the affected projects and nightly on everything,
where Firefox joins the engines. The Figma drift detection keeps its weekly
schedule (`.github/workflows/figma-drift.yml`), and
`.github/workflows/release.yaml` runs the DX release manager on `main`.

## GitHub Copilot plugins

This repository includes `.github/copilot/settings.json` with the recommended
PagoPA DX marketplace and plugin suggestions for GitHub Copilot. Keep the file
committed to avoid per-developer setup drift; if your team does not use some of
the suggested plugins, edit the related flags in that file. See the DX
documentation: <https://dx.pagopa.it/docs/coding-with-ai/plugin-marketplace>.
