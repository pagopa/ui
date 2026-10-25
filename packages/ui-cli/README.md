# UI CLI and checks

`pagopa-ui-cli` is the single command-line entry point of the design system:
the repository checks and the Figma tools. The checks enforce the rules in
[CONTRIBUTING.md](../../CONTRIBUTING.md) and in the agent skills under
`.agents/skills` at the workspace root. The Figma tools read the design file and
compare it with the source code of the audited package, `packages/pagopa-ui`.

## Rules

- Run each command through Nx (`pnpm nx run pagopa-ui-cli:<target>`) or
  `pnpm --filter pagopa-ui-cli run <script>`: the CLI reads the
  design system through an explicit root (`PAGOPA_UI_ROOT`), never from the
  working directory. Every path inside a command is relative to that root.
- Figma is read-only. The tools use GET requests only. They never write to the
  Figma file.
- Only `src/figma/rest.ts` uses the network.
- A token comes from the process environment variable `FIGMA_TOKEN`. The token
  needs the `file_content:read` and `library_content:read` scopes. The live
  commands preflight it at startup and exit with explicit guidance when it is
  missing. Do not commit the token. Do not load `.env` automatically.
- Agents must not read `.env`. If the token is only in `.env`, the user runs the
  export and gives the JSON output to the agent.
- Do not edit a generated file by hand. The generated files are
  `src/catalog/figma/inventory.json` in the design system and
  `packages/artwork/src/assets/figma-icons/*`,
  `packages/artwork/src/assets/figma-pictograms/*`,
  `packages/artwork/src/components/icons/icon-assets.ts`,
  `packages/artwork/src/components/icons/pictogram-assets.ts` and
  `packages/artwork/src/components/icons/figma-inventory.ts`; the token
  generator owns `packages/tokens/src/manifest.json`, `packages/tokens/src/figma.generated.css`,
  `packages/tokens/src/figma-tokens.generated.ts` and
  `packages/tokens/src/figma-text-classes.generated.ts`.
- `src/catalog/figma/registry.json` is hand-maintained, reviewed data: so are the
  two device policy files beside it — `device-policy.json` (the vocabulary: the
  axes, the devices with their aliases and the values that mean "no device
  axis", never a component list) and `device-exceptions.json` (the reasoned
  burn-down exceptions, `<nodeId>: <reason>`, which must shrink). `figma:check`
  validates their shapes, resolves every axis value the inventory declares and
  refuses an exception whose node no longer misses a device.
- `packages/tokens/src/foundations.json` is hand-maintained, reviewed data: the
  foundation entries without a single published variable (spacing steps, sizes,
  breakpoints, container thresholds, z-index steps, radius extensions, effect
  styles), each with its source and, for a local extension, the reason.
- `packages/tokens/src/foundation-baseline.json` is the ceiling of the foundation lint
  and can only go down; `packages/tokens/src/foundation-exceptions.json` is its reasoned
  burn-down list (`rule`, `file`, `match`, `nodeId`, `reason`). A stale
  exception fails the check.
- `data/css-budget.json` is the ceiling of the published
  stylesheet: raw bytes and the two payloads a server sends, gzip and brotli.
  Growth fails; a ceiling kept ahead of the artifact only warns.
  `node src/cli.ts check css --write` records the size you accept and
  never raises a ceiling — a raise is a reviewed edit with its reason — and
  `--measure` prints the sizes to copy into the file.
- Do not commit the `.figma/` directory. It is in `.gitignore`. The REST
  snapshot can be larger than 100 MB.

## Files

| File                                       | Type             | Purpose                                                                                                                                                                                                                                                                                                                                                                                                    |
| ------------------------------------------ | ---------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/lib/source-modules.ts`                | Shared library   | Parses TypeScript and TSX files with `oxc-parser`. Resolves import specifiers, finds runtime export identities, reads the story meta title, the components of a story and its Design panel node ids, so checks link Figma entries to actual exports instead of matching text.                                                                                                                              |
| `src/figma/snapshot.ts`                    | Shared library   | Normalizes a live Figma export, builds contract and design fingerprints, compares snapshots and orders work by dependency, so meaningful drift is visible and dependent work is done in the right order.                                                                                                                                                                                                   |
| `src/figma/devices.ts`                     | Shared library   | Resolves the device vocabulary (`device-policy.json`): every axis value the inventory declares maps to a canonical device or to `any`. `--check` fails on an unmapped value, a duplicate alias or a declared axis nobody uses; it warns on an unused alias and on a device-like value on a non-device axis, so changes to Figma's device vocabulary stay explicit instead of being silently misclassified. |
| `src/figma/rest.ts`                        | Shared library   | Sends read-only GET requests to the Figma REST API and returns a pinned snapshot and the rendered SVG variants, so live reads are explicit and the rest of the CLI can use reproducible local data.                                                                                                                                                                                                        |
| `src/checks/import-layers.ts`              | Check            | Enforces the import contract between the layers `primitives`, `icons` and the families, the retired `screens` and `templates` paths and the third-party confinement, preventing dependency-boundary drift from undermining the architecture.                                                                                                                                                               |
| `src/checks/foundation.ts`                 | Check            | Enforces the component class contract over the string literals of `src/components`: no arbitrary px/rem values, default Tailwind text sizes or font weights, raw Figma variables, palette or hex colours, off-scale spacing. Exceptions need a node and a reason; the baseline can only go down, keeping one-off styles from silently diverging from the design foundations.                               |
| `src/figma/icons.ts`                       | Tool and check   | Generates all source icon variants offline; checks pinned provenance, complete identities, standalone SVGs and the runtime map, so public icon aliases stay traceable to complete, reproducible artwork.                                                                                                                                                                                                   |
| `src/checks/doc-links.ts`                  | Check            | Resolves the links and path claims in the agent documentation, the guides, `figma-to-code.yaml` and the script/workflow citations; keeps the `figma-to-code` skill free of project component names, Figma node ids and `docs/` references, so instructions stay actionable without coupling the skill to this repository.                                                                                  |
| `src/checks/library.ts`                    | Check            | Packs the library, installs the tarball in a temporary application and drives the Playwright specs against it, proving consumers can use the packed artifact rather than only the source tree.                                                                                                                                                                                                             |
| `src/checks/library-artifact.ts`           | Shared module    | Defines the static artifact contract (CSS, fonts, licenses, dependency boundaries, export lists) used by `src/checks/library.ts` before the consumer install, catching packaging defects before browser tests.                                                                                                                                                                                             |
| `tests/e2e/library.spec.mjs`               | Playwright spec  | Runs the complete browser sequence per engine (SSR, native forms, overlays, forced colors, artwork, reflow), one project per engine and one retry, covering real browser behavior that static checks cannot prove.                                                                                                                                                                                         |
| `src/checks/css-budget.ts`                 | Check            | Enforces the published stylesheet budget recorded in `data/css-budget.json` (raw bytes, gzip level 9, brotli): growth fails, a ceiling ahead of the artifact only warns, and `--write` records the size you accept without ever raising a ceiling, preventing unreviewed payload growth.                                                                                                                   |
| `src/commands/prepare-types.ts`            | Build step       | Rewrites the specifiers in the emitted `.d.ts` files to produce alias-free ESM, so consumers can resolve the package declarations without this repository's TypeScript aliases. Runs inside `pnpm nx run pagopa-ui:build`.                                                                                                                                                                                 |
| `src/figma/sync.ts`                        | Check and tool   | Validates the catalogue, reports live drift, refreshes the inventory, queues the delta and renders the drift PR body, making Figma/source mismatches explicit and reviewable instead of silent.                                                                                                                                                                                                            |
| `src/figma/export.ts`                      | Tool             | Joins the MCP inventory with the REST data and writes one pinned snapshot to `.figma/live-rest.json`, so sync can work from reproducible evidence instead of querying Figma for every check.                                                                                                                                                                                                               |
| `src/figma/pictograms.ts`                  | Tool and check   | Exports the pictogram variants, writes the asset manifest and validates the committed artwork, keeping published variants reproducible and catching drift before it reaches consumers.                                                                                                                                                                                                                     |
| `src/figma/tokens.ts`                      | Tool and check   | Curates a pinned variable snapshot into the committed token manifest; keys every token by its published Figma id, so a rename is a delta; merges the reviewed foundation entries and generates and validates the CSS foundation layer and the documentation inventory, keeping token identity and published styles aligned.                                                                                |
| `src/parity/source.ts`                     | Tool             | Reads the pinned export into the compact per-node spec (geometry, layout, paint, type) and picks the source variant, so each Storybook capture is compared with the intended Figma variant.                                                                                                                                                                                                                |
| `src/parity/render.ts`                     | Tool             | Captures a Storybook story in Playwright at the source width and probes the DOM; the preflight refuses a scaled, unfixed-width or wrong-state capture, and the offsets are measured from the declared origin, so setup errors cannot masquerade as design drift.                                                                                                                                           |
| `src/parity/diff.ts`                       | Shared library   | Compares spec and probe using a 2px tolerance, the weight law, the 44px target rule, composition offsets/order (advisory unless `--strict`) and token classification, separating meaningful mismatches from tolerated visual noise.                                                                                                                                                                        |
| `src/parity/cases.ts`                      | Shared library   | Joins `registry.json` with the story files (story ids, declared exports, Design-panel nodes) and owns the reviewed case corpus: load, validate, save, so parity runs use explicit, reproducible mappings rather than guessed ones.                                                                                                                                                                         |
| `src/test/changed.ts`                      | Tool             | Runs the test files affected by sources changed since the last successful run of the same pass and records the new baseline, keeping iteration fast without skipping relevant tests or advancing after a failed run.                                                                                                                                                                                       |
| `tests/checks/import-layers.test.mjs`      | Regression tests | Covers the layer rules with `pnpm nx run pagopa-ui-cli:test`, so changes to import syntax cannot bypass the architecture boundaries.                                                                                                                                                                                                                                                                       |
| `tests/checks/foundation.test.mjs`         | Regression tests | Covers foundation ceilings, exemptions, stale exceptions and string-literal extraction against temporary trees, so both intended rules and failure cases stay enforced.                                                                                                                                                                                                                                    |
| `tests/checks/css-budget.test.mjs`         | Regression tests | Covers the budget ceiling, slack, missing metric and `--write` ratchet, protecting the rule that accepted size changes cannot silently raise the budget.                                                                                                                                                                                                                                                   |
| `tests/checks/doc-links.test.mjs`          | Regression tests | Covers link, path-claim and skill-agnosticism rules against temporary trees, so the documentation gate catches regressions without depending on repository state.                                                                                                                                                                                                                                          |
| `tests/checks/story-taxonomy.test.mjs`     | Regression tests | Enforces the Storybook taxonomy: every meta title is `Foundations/*` or a known `Components/<section>/*`, and the retired `Screens/*`, `Templates/*` and `Alignment/*` sections stay retired, keeping taxonomy changes explicit.                                                                                                                                                                           |
| `tests/parity/*.test.mjs`                  | Regression tests | Covers parity rules (tolerance, weight law, targets, classification, composition, capture preflight) and the case corpus (schema, registry/story consistency, canonical save) against fixtures, with no snapshot or browser, so these rules stay fast and deterministic to verify.                                                                                                                         |
| `src/catalog/figma/device-policy.json`     | Reviewed data    | Defines the device vocabulary: the axes that mean "device", canonical devices with aliases, widths and default layout scopes, and values meaning "no device axis". It holds no component name, file or path, so scripts and agents resolve devices consistently without node-specific rules.                                                                                                               |
| `src/catalog/figma/device-exceptions.json` | Reviewed data    | Records burn-down exceptions for nodes whose declared devices the corpus does not cover yet (`<nodeId>: <reason>`); the list must shrink, making known coverage gaps visible instead of permanent blind spots.                                                                                                                                                                                             |
| `src/catalog/figma/rules.json`             | Reviewed data    | The English record of every consolidated `.Regole` card: verbatim Italian title, English title and summary, source hash, targets, disposition and review date. `figma:rules` writes it, `figma:rules:check` validates it, and the guide's `## Component Rules` block carries the consumer-facing subset with no source reference.                                                                          |
| `src/catalog/figma/parity-cases.json`      | Reviewed corpus  | Maps each compared variant to its verified case; `figma:parity:check --case <id>` reproduces it and `--save-case` writes a refinement back, making the evidence reviewable and repeatable. Validated by `tests/parity/cases.test.mjs`.                                                                                                                                                                     |
| `tests/figma/pictograms.test.mjs`          | Regression tests | Covers pictogram export against a mock Figma API, so export behavior can be checked without live network access.                                                                                                                                                                                                                                                                                           |
| `tests/figma/rules.test.mjs`               | Regression tests | Covers the `.Regole` card extraction (sections, status, placeholder, unfiled card), the source hash and the plan diff, and the component-rules block markers, so a rules-box change is either reviewed or reported as drift.                                                                                                                                                                               |
| `tests/figma/tokens.test.mjs`              | Regression tests | Covers token curation, generation and check failure modes against fixtures, ensuring changes cannot silently desynchronize token identities, CSS and documentation.                                                                                                                                                                                                                                        |
| `tests/figma/icons.test.mjs`               | Regression tests | Exercises offline icon extraction, masks, transforms, Boolean geometry, defaults and complete source coverage, guarding against artwork variants silently disappearing or changing.                                                                                                                                                                                                                        |
| `tests/figma/sync.test.mjs`                | Regression tests | Covers delta logic, fingerprints, evidence rules and write protection, preserving the guarantees that make Figma updates reviewable and safe.                                                                                                                                                                                                                                                              |
| `tests/changed.test.mjs`                   | Regression tests | Covers the changed-only window, per-pass baselines, fallbacks and argument handling against temporary repositories, so incremental runs stay relevant and reliable.                                                                                                                                                                                                                                        |
| `tests/fixtures/library-consumer/`         | Test fixture     | The packed-library application exercises native forms/reset, Dialog/Drawer/Popover, responsive Table, text fonts and source artwork in all three engines, proving the built package works in a consumer app.                                                                                                                                                                                               |
| `tests/fixtures/vitest-changed/`           | Test fixture     | A Vitest test double that records the arguments a changed-only run would execute, allowing selection and fallback behavior to be verified without running the full test suite.                                                                                                                                                                                                                             |

## What the checks protect

1. **The architecture.** The layer check rejects a wrong import, also through a
   barrel file, an alias, a type-only import, a dynamic import or `require`. It
   rejects a dependency cycle. It rejects the removed layers `atoms`,
   `molecules`, `organisms`, `figma-primitives`, `ui` and the retired `screens`.
   It rejects a direct `cn`
   import outside `src/lib/cn.ts`, where the merge tables know the generated
   type scale.
2. **The story taxonomy.** The taxonomy test proves that every library story
   still lives under `Foundations/*` or `Components/<section>/*`, so a
   prototype or fidelity section cannot be added under a new top-level title
   without a recorded decision. It also proves that the retired `Screens`,
   `Templates` and `Alignment` surfaces stay deleted.
3. **The published artifact.** `src/commands/prepare-types.ts` makes the typings
   consumable. `src/checks/library.ts` proves that an external application can
   install, type-check, server-render and use the package. It also proves that
   the CSS, the fonts and the artwork are standalone.
4. **The Figma alignment.** `src/figma/sync.ts` proves that each published node is
   accounted for, that each `implemented` target exists, that a story renders
   that exact export, that a node linked to a single story export shows it in
   the story's `parameters.design` (the Storybook Design panel mapping), that
   the reviews are current and that each public export has a mapping. A missing
   item is an error, not a silent gap.
   The device dimension is part of the check: `src/figma/devices.ts` resolves every
   axis value the inventory declares against the committed vocabulary, so a new
   source value fails with its axis in the message and the fix is one alias line.
   `figma:check` prints the vocabulary line and the coverage line
   (`devices: <n> implemented sets · covered <n> · missing <n> · exceptions <n>`),
   fails a node that enters the live delta (or is newly closed `implemented`)
   while a declared device has no reviewed case and no reasoned
   `device-exceptions.json` entry, and keeps the historical burn-down a single
   warning whose work list is `node src/cli.ts parity queue --uncovered`.
5. **The artwork.** The icon check and the pictogram check prove that each public
   alias maps to a real source identity with pinned export provenance. Names
   remain stable through source renames and page moves. A newer metadata-only
   version does not invalidate unchanged artwork: current fingerprints, variant
   identities, checksums and icon geometry must still match.
6. **The design foundations.** `src/figma/tokens.ts` proves that the committed
   token manifest matches the generated CSS foundation layer and the
   documentation inventory, and that every `var(--figma-*)` reference in
   `src/index.css` resolves. Legacy namespaces are excluded with recorded
   reasons; unknown namespaces fail the refresh, and an unresolved variable
   either gets a value or a reasoned exclusion — none can linger silently.
7. **The component class contract.** `src/checks/foundation.ts` proves that
   `src/components` consumes the token scale: no arbitrary px/rem values, no
   default Tailwind text sizes or standalone font weights, no raw
   `--figma-*` variables, no palette or hex colours, no off-scale spacing. A
   value may stay only through a reasoned exception that names its source
   node, and the baseline that bounds the counts can only go down.

## TypeScript and lint

Every module under `src/` is TypeScript and runs directly on Node's type
stripping (`node src/cli.ts`), with no build step. The `node:test` specs and the
Playwright spec stay `.mjs`: they are executable documentation of the CLI and
are run as-is. `pnpm run typecheck` checks the tree
with `tsc`; the reviewed JSON shapes are Zod schemas under `src/schemas` rather
than hand-written if-chains. Every source module, including the parity probe,
diff and CLI, is typechecked with no `@ts-nocheck`.

`oxlint` uses this package's own `.oxlintrc.json`: it lints TypeScript and the
Node runtime, not React or Vitest, and the browser consumer fixture is ignored.
There are no compatibility entry points at the package root: the CLI is the
only way in, and a new command is added to `src/cli.ts`.

## CLI

Every command is a subcommand of one entry point, so `--help` is the reference:

From the package:

```bash
pnpm run cli -- --help
pnpm run cli -- check --help
pnpm run cli -- figma sync --help
pnpm run cli -- parity check --help
```

From the workspace root, either the package script or the installed bin:

```bash
pnpm --filter pagopa-ui-cli run cli -- --help
node packages/ui-cli/src/cli.ts --help
```

The npm tasks below are thin aliases over that tree, kept because the Nx
targets and the agent skills name them. A direct call is always
`ui-cli <group> <command>` (or `node packages/ui-cli/src/cli.ts <group> <command>`).

The packed-artifact check is not aliased here: it audits the built package, so
it belongs to that package and runs as `pnpm nx run pagopa-ui:library:check`,
which builds it first.

## npm tasks

| Task                    | Command                             | Network     | Notes                                                                                                                                                                                                                                                                          |
| ----------------------- | ----------------------------------- | ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `figma:check`           | `check figma`                       | No          | The hermetic check. Runs on each push and pull request.                                                                                                                                                                                                                        |
| `figma:devices`         | `figma devices`                     | No          | Resolves the declared device vocabulary; `--check` is the gate (also inside `figma:check`), `--json` feeds tooling.                                                                                                                                                            |
| `figma:export`          | `figma export`                      | Yes         | Needs `FIGMA_TOKEN`. Writes `.figma/live-rest.json`.                                                                                                                                                                                                                           |
| `figma:update`          | `figma sync --write`                | Yes         | Refreshes the inventory and queues the delta. Equal to triage.                                                                                                                                                                                                                 |
| `figma:triage`          | `figma sync --triage`               | Yes         | Refreshes the inventory and queues the delta. Equal to update.                                                                                                                                                                                                                 |
| `figma:rules`           | `figma rules`                       | `--refresh` | The `.Regole` boxes: `--plan` diffs the live snapshot against the committed ledger, `--refresh` reads the boxes, `--mark` records a decision, `--check` validates the ledger and the guides, `--node` prints the rules of a node.                                              |
| `figma:comments`        | `figma comments`                    | `--refresh` | The node comments: `--refresh` snapshots the threads, `--node` prints the threads of a node, `--open` keeps the unresolved ones.                                                                                                                                               |
| `figma:brief`           | `figma brief --node <id>`           | No          | The implementation brief of a node: registry entry, rules, open comments and design requests, read offline from the local snapshots.                                                                                                                                           |
| `figma:parity:queue`    | `parity queue`                      | No          | The registry cases with their story ids and missing evidence; `--unmapped` prints the cases with no committed mapping.                                                                                                                                                         |
| `figma:parity:check`    | `parity check`                      | No          | Needs a source (the local snapshot, `--input`, or the committed evidence slice) and Storybook on `:6006`; exit 1 on deltas, 2 on missing evidence (including a refused capture or a slice that no longer matches the committed inventory). `--case <id>` runs a reviewed case. |
| `figma:parity:cases`    | `parity cases`                      | No          | Proposes the missing device cases and the variants no reviewed case points at (states and visual properties) from a sibling case; a proposal is a draft (`note`) until a wave replaces its note with the reviewed render.                                                      |
| `figma:parity:verify`   | `parity verify`                     | No          | The hermetic verdict of the case corpus, the device coverage and the evidence bundle: no snapshot, no Storybook, no network; exit 1 on errors, 0 with warnings.                                                                                                                |
| `figma:parity:evidence` | `parity evidence`                   | `--write`   | `--check` is hermetic and proves the bundle matches the corpus; `--write` refreshes the slice, the pinned PNGs and the manifest and needs `FIGMA_TOKEN` and a pinned snapshot.                                                                                                 |
| `tokens:check`          | `tokens check`                      | No          | Validates the manifest against the generated tokens and styles.                                                                                                                                                                                                                |
| `icons:check`           | `assets icons check`                | No          | Validates every source icon identity, SVG variant and provenance.                                                                                                                                                                                                              |
| `pictograms:check`      | `assets pictograms check`           | No          | Validates the committed assets, the generated module and provenance.                                                                                                                                                                                                           |
| `assets:check`          | `check assets`                      | No          | The single artwork gate; the two checks stay as individual aliases.                                                                                                                                                                                                            |
| `layers:check`          | `check layers`                      | No          | Reads `src`.                                                                                                                                                                                                                                                                   |
| `foundation:check`      | `check foundation`                  | No          | Enforces the component class contract; `--measure` prints the current counts.                                                                                                                                                                                                  |
| `docs:check`            | `check docs`                        | No          | Reads the repository; fails on a dead link or path and on a project identifier inside the skill.                                                                                                                                                                               |
| `test`                  | `node --test "tests/**/*.test.mjs"` | No          | Runs the CLI regressions.                                                                                                                                                                                                                                                      |
| `test:changed`          | `test changed`                      | No          | The fast pass (Firefox and WebKit) on the affected test files only.                                                                                                                                                                                                            |
| `test:coverage:changed` | `test changed --coverage`           | No          | The Chromium/v8 coverage pass on the affected test files; the report covers the changed files.                                                                                                                                                                                 |

Task names follow `<scope>:<action>`: every validation is `<scope>:check`
(`figma:check`, `tokens:check`, `icons:check`, `pictograms:check`, `assets:check`,
`layers:check`, `docs:check`, `library:check`), every sync/export is `<scope>:<action>`
(`figma:export`, `figma:update`, `figma:triage`, `storybook:build`) and the
everyday primitives are bare verbs (`dev`, `build`, `lint`, `typecheck`, `test`,
`format`).

The task `figma:check` runs this tool without flags. Add a flag after the task
name when you need it.

## The changed-only test loop

`pnpm nx run pagopa-ui-cli:test:changed` and
`pnpm nx run pagopa-ui-cli:test:coverage:changed` are the local iteration
tools. Vitest resolves the test files that import, directly or transitively, the
sources changed since the last successful run of the same command. The window
opens at the `HEAD` commit of that run, so every commit is covered by a local
run at least once, the uncommitted work is always inside the window, and a red
run does not move it. Each command records its own baseline under
`node_modules/.cache/pagopa-ui`, so a fast pass never hides the coverage pass.

- `--all` runs every test file and records the new baseline.
- `--since <ref>` asks about an explicit git ref and records nothing.
- `-- <args>` passes arguments to Vitest: `pnpm nx run pagopa-ui-cli:test:changed -- --bail=1`.
- A change to `package.json` or to `vite.config.ts` runs every test file: those
  are the Vitest `forceRerunTriggers` defaults.
- A change to `.storybook/**` or to a stylesheet runs every test file too:
  neither path is part of the module graph of a story, and both reach every
  rendered story.
- The changed-only coverage report holds the changed files and their per-file
  gates. The global thresholds are aggregate numbers, so they stay with the full
  run; the first run of a command, `--all` and `--since` on a full set behave
  like the full suite and check them.
- The Vitest `fsModuleCache` is not enabled (measured on 2026-10-15). It
  persists the transformed modules of the node module runner only: a storybook
  run never writes to `node_modules/.vitest-cache`, and the unit project saves
  40 KB and no measurable time. The browser side already reuses Vite's
  pre-bundle through the Storybook cache
  (`node_modules/.cache/storybook/<version>/<hash>/sb-vitest`). Revisit it if the
  node-side suite grows. `pnpm exec vitest doctor` agrees: it measured
  `fsModuleCache: true` at +1%, `pool: 'threads'` at +5% and `isolate: false` at
  +2%, and recommended keeping the current configuration.
- Neither command replaces
  [the green chain](../../CONTRIBUTING.md#the-green-chain): run it
  before a commit or a pull request.

## Where the scripts run

- **On your machine.** Run the full chain before each commit; while you iterate,
  the changed-only loop above keeps the feedback short. The chain is at the end
  of [CONTRIBUTING.md](../../CONTRIBUTING.md).
- **In CI.** `.github/workflows/validate.yaml` runs the DX code review on the
  affected projects: `fmt`, `lint`, `typecheck`, `docs`, `build` and the unit
  project, with the hermetic checks riding along as dependencies of `test`.
  `.github/workflows/deep-checks.yml` adds the suites that need a browser — the
  story projects with the coverage gates on Chromium, the WebKit pass, and the
  packed artifact consumer — in parallel jobs, on pull requests, on `main` and
  nightly, where Firefox joins the engines.
- **Each Monday at 04:00 UTC.** `.github/workflows/figma-drift.yml` runs
  `node src/cli.ts figma sync --rest --save .figma/live-rest.json --pr-body .figma/pr-body.md --delta .figma/delta.json`.
  The job needs the read-only `FIGMA_TOKEN` secret and fails when it is missing.
  With drift it refreshes the inventory and the evidence bundle and opens one
  review pull request (`DRIFT_PR_TOKEN`), uploading `delta.json`, `run.json` and
  the body as artifacts; without drift it leaves the tree untouched and opens
  nothing. The branch guard refuses to force-push a branch whose head is not the
  bot's commit. The merge is the review record.

## When to run which Figma command

| Situation                                     | Command                                                                       |
| --------------------------------------------- | ----------------------------------------------------------------------------- |
| Before each commit                            | `pnpm nx run pagopa-ui:figma:check`                                           |
| You need the current delta and the work order | `node src/cli.ts figma sync --input .figma/live-rest.json --plan`             |
| You need a new live snapshot                  | `pnpm nx run pagopa-ui-cli:figma:export --input .figma/live-mcp.json`         |
| A delta must enter the repository             | `pnpm nx run pagopa-ui-cli:figma:triage --input .figma/live-rest.json --plan` |
| The design foundations changed in Figma       | `node src/cli.ts tokens write --input .figma/variables.json`                  |
| The artwork of a pictogram changed            | `node src/cli.ts assets pictograms export` and `write`                        |
| Icon artwork or variants changed              | `node src/cli.ts assets icons write --input .figma/live-rest.json`            |

The variable snapshot (`--input`) is a local read-only export of the published
Variables (for example through the Figma MCP `get_variable_defs` tool); it is
not committed, like `.figma/live-rest.json`. The committed manifest is the
reviewed result. The snapshot may carry an `ids` map (`name -> {key, kind,
library}`, harvested read-only from the Figma MCP asset search) with the
published key of every variable and text or effect style: `--write` keys the
manifest by it, so a rename in Figma keeps the id and the generated CSS name
and is reported as a delta. When the snapshot has no ids, `--write` carries
the previous ids over by name and says how many it carried.

The step-by-step procedure is in the `figma-to-code` skill
([SKILL.md](../../.agents/skills/figma-to-code/SKILL.md)).

## The output of the plan mode

The flag `--plan` prints JSON. Use these keys:

- `added`, `removed`, `changed`, `renamed` and `moved`: the identity delta.
- `baseline`: a node without a full design baseline. A new snapshot must give
  the design evidence.
- `affected`: a node that depends on a changed node.
- `implementationOrder`: the work order. The dependencies come first; `mocked`
  demos are never part of it, even when a dependency change affects them.
- `unverifiedDesign`: a node without a design fingerprint.

Review is not tracked by a fingerprint: the queued `pending` nodes are the
visible signal, the drift pull request carries the review instructions and its
merge is the record (ADR-0001).

Rendered instance-swap defaults contribute their actual master identity to the
dependency graph. A swappable Avatar slot is still an Avatar dependency, so a
later Avatar change reaches its rows and their transitive parents.

The command writes a file only when it finds no error. A validation failure
never persists a proposed update.

## Figma Code Connect

Code Connect is a Figma feature. It links a design component to a code
component. It shows a code example in the Dev Mode Inspect panel. It also gives
code context to AI agents through the Figma MCP server. It has two forms:

- the Code Connect UI, inside Figma;
- the Code Connect CLI (`@figma/code-connect`), in the repository.

The CLI reads `.figma.ts` template files and publishes the connections to
Figma. The token needs the Code Connect scope set to Write and the File content
scope set to Read. The feature is available on the Organization and Enterprise
plans only, with a Full or Dev seat. See the
[Code Connect documentation](https://developers.figma.com/docs/code-connect/).

Code Connect is not a replacement for these scripts.

- The CLI publishes connection data to Figma. The rule in
  [CONTRIBUTING.md](../../CONTRIBUTING.md) keeps Figma read-only. Do not confuse this
  connection data with the design nodes. The CLI does not edit the nodes.
  However, it needs a write scope. This repository uses a read-only token
  (`file_content:read`, `library_content:read`).
- Code Connect shows only the components that have a template file. A node
  without a mapping stays silent. Code Connect does not prove coverage.
- Code Connect has no reverse coverage of the public API. It cannot prove that
  each export of `src/pagopa-ui.ts` has a mapping.
- Code Connect has no design fingerprint and no dependency-aware drift
  detection. It cannot tell that a source change reached a mapped
  implementation.
- The Storybook integration helps you write a template from a story. It is a
  legacy feature for React, and it gets no more updates. Code Connect still
  cannot prove that the story renders the mapped export.
- Code Connect can publish in CI. It can fail on an unreadable template file.
  It has no delta report against a pinned Figma version and no work order.
- Code Connect has no artwork pipeline for the icon and the pictogram variants.

The story `Foundations/Figma inventory` shows the same mapping in this
repository, under review in a pull request.

## Simpler alternatives for one check

| Check           | Alternative                                        | What you lose                                                                              |
| --------------- | -------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| `layers:check`  | `eslint-plugin-boundaries` or `dependency-cruiser` | The alias, type-only, dynamic and `require` rules; the cycle rules; the current CLI tests. |
| `icons:check`   | Render smoke test                                  | Source/default/variant identity, pinned geometry, checksums and standalone SVG guarantees. |
| `library:check` | `publint` and `@arethetypeswrong/cli`              | The browser flows, the focus containment, the fonts, the artwork and the reflow test.      |
| `figma:check`   | No equivalent                                      | All the Figma guarantees.                                                                  |

## Limits

- The static checks read the source. They do not replace browser tests, visual
  review or assistive-technology tests.
- The files `evidence-exceptions.json` and `api-exceptions.json` are burn-down
  lists. They must shrink. A new entry needs a reason.
- `figma:check` warns when the inventory is older than 30 days.
- Storybook and `library:check` need Playwright Chromium, Firefox and WebKit. Run
  `pnpm exec playwright install chromium firefox webkit` one time.
