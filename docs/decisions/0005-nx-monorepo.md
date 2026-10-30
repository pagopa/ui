# ADR-0005 — The Nx monorepo: layout, validation and release

- **Status:** Accepted — adopted on 2026-10-19.
- **Date:** 2026-10-19
- **Context:** the workspace split deferred in [ADR-0002 §2](./0002-deferred-decisions.md),
  triggered by the validation and release needs. The follow-up implementation
  flows landed with the monorepo itself.

## 1. Problem

The design system was one package at the repository root: 673 files under
`src/`, 35 scripts, 95 stories, one serial CI job of 13 steps that ran every
check on every pull request, and no release path (`private: true`, `0.0.0`).
Three costs followed:

- no task graph, so a one-line change re-ran the Figma checks, the three browser
  engines, the artifact consumer and the stylesheet budget;
- the checks were npm scripts at the root, each with its own idea of the working
  directory, and CI re-encoded the list of them by hand;
- nothing could be versioned or published independently, while
  [ADR-0002 §2](./0002-deferred-decisions.md) already named the trigger for a
  workspace split.

## 2. Decision space

**A — stay single-package, keep the hand-written CI.** No new tooling; the
serial job stays the gate; the release path is written by hand when needed.

**B — adopt the DX Nx scaffold with one package.** Nx with the DX code review
(`validate-v2`), the package under `packages/`, the agent documents and the
infrastructure at the workspace root, the checks turned into Nx targets, and Nx
Release with version plans.

**C — go straight to the full split.** `packages/tokens`, `packages/artwork`,
`packages/pagopa-ui`, `apps/storybook`: the deepest separation, at the cost of
rewriting the generation scripts (they emit into `src/tokens` and `src/assets`)
and the import contract between the packages, in the same change that moves the
tree.

## 3. Decision

**B.** The move and the tooling land first; the split of the layers stays a
later, independent step with its own trigger. Concretely:

1. **Layout.** `packages/pagopa-ui` holds the design system — components, tokens,
   generated artwork, the Figma catalogue, the stories, the guides and the
   scripts. `apps/` stays empty. `infra/repository` is the DX repository
   bootstrap. The agent documents (`.agents/skills`), the decisions, the plans
   and the workflows stay at the workspace root, where the DX tooling expects
   them. _Amended in F4_: the artwork, the tokens and the Figma tooling are the
   packages `packages/artwork`, `packages/tokens` and `packages/ui-cli`,
   and the stories, the guides and the Storybook live in the application
   `apps/storybook`; the evidence chain was split across the two projects
   without weakening it.
2. **The working directory is the seam.** Every script already resolved its root
   from the working directory: the Nx targets run each one with `cwd` set to the
   package root, so `src/…`, `scripts/…` and `.figma/…` kept their meaning and
   only two scripts changed (the documentation check resolves the workspace root
   for the agent documents and the ADRs; the changed-only runner recognises
   `.storybook/` at any depth, because git reports repository-relative paths).
3. **The validation list is the Nx one.** `validate-v2` runs
   `build,test,lint,typecheck,fmt,docs -c=ci` on the affected projects, so the
   package exposes those targets and the hermetic checks ride along as
   dependencies of `test`. The suites that need a browser — the story projects
   with the v8 coverage gates on Chromium, the WebKit pass, and the packed
   artifact consumer — live in the repository's own `deep-checks.yml`, on pull
   requests, on `main` and nightly, where Firefox joins the engines.
4. **TypeScript 7 with the TypeScript 6 API.** The compiler that runs the tasks
   is TypeScript 7 (`@typescript/native`); the `typescript` name carries the 6
   API so that `@nx/js/typescript` and every API-consuming tool keeps working.
5. **Release through Nx.** Version plans (`pnpm nx release plan`) describe the
   change; the DX release manager opens the "Version Packages" pull request and
   tags the release. At the time of this decision, publication was deferred
   until the repository moved into the PagoPA organization. **Follow-up
   (2026-10-20):** the package is now configured as `@pagopa/ui` for GitHub
   Packages, and the first publication remains gated by a version plan.
6. **One linter.** Oxlint stays, with the rules of `@pagopa/eslint-config` that
   Oxlint implements ported rule by rule (`perfectionist` has no equivalent); the
   two structural rules are warnings with a declared burn-down.

## 4. Consequences

- A change runs what it touches: the 12-target chain is a full cache hit in
  under half a second on an unchanged tree, and `nx affected` answers the same
  question in CI.
- The checks keep their own authority: each is an Nx target with declared inputs
  and outputs, and the documentation, artwork, token, layer and foundation checks
  are unchanged in what they prove.
- The repository gained a toolchain (`mise`), an infrastructure bootstrap, a
  release manager and a second CI workflow: more moving parts, each with a single
  owner, and three upstream behaviours to report (the `require` condition of
  `@pagopa/nx-terraform`, the option injection of the scaffold `targetDefaults`,
  the logger of the Terraform plugin configured twice under a stale daemon).
- The design system is not published by this decision: no consumer behaviour
  changes, and the porting work keeps its `Unreleased` record in the package
  changelog until the first version plan writes a versioned section above it.

## 5. Deferred decisions with triggers

| Deferred                                                                                                                                                                       | Trigger                                                                                                                                                 |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| The extraction of the stories into `apps/storybook`, which today builds the deployable documentation; `packages/artwork`, `packages/tokens` and `packages/ui-cli` landed in F4 | The evidence chain (`figma:check` proves what each story renders) can be split across two projects without losing that proof                            |
| First publication of `@pagopa/ui`                                                                                                                                              | A version plan is merged after the GitHub Packages publisher configuration lands                                                                        |
| A remote cache (Nx Cloud or self-hosted)                                                                                                                                       | CI wall-clock time or a second repository sharing the graph                                                                                             |
| Promoting `complexity` and `max-lines-per-function` back to `error`                                                                                                            | The burn-down reaching zero (48 functions today)                                                                                                        |
| The browser suites inside the reusable DX job                                                                                                                                  | A `mise` dependency that installs the Playwright browsers in that job                                                                                   |
| The documentation deployment                                                                                                                                                   | Decided 2026-10-19: Azure Static Web App; its infrastructure project and the DX static-application release workflow are the implementation that follows |

## 6. Related

- [ADR-0002 §2](./0002-deferred-decisions.md) — the workspace split it triggered,
  now resolved.
- [ADR-0002 §4](./0002-deferred-decisions.md) — the public API evolution: still
  open, its trigger is the first publication.
