---
name: figma-to-code
description: Figma → React process for this design system. Use when Figma gained or changed components, icons, pictograms or variables; when a drift pull request needs its alignment, or its before/after captures of what changed; when a component is created from a Figma node, aligned, verified against its source frame or re-reviewed; when a component with no node joins the public API; when a set declares a Device/Breakpoint axis; when someone asks the designer a question or a design answer must land — review story, captures, issue, record; or when `figma:check` reports stale or missing evidence.
---

# Figma to code

Keeps the components of this repository aligned with their Figma source. Project
data — paths, the device vocabulary, per-node decisions, tokens — lives in the
files the config names: read them, never copy them into this skill.

## Session start

`pnpm nx run pagopa-ui-cli:figma:status` prints the token state, the pinned
snapshot, the drift against the committed inventory, the rules ledger and comment
counts, the pending queue with its design requests, the page surface line and the
next command. `--live` adds the file version and its last-modified date: that is
what tells whether Figma changed at all. Run it before reading anything else;
nothing below repeats what it reports. Before touching one node, read
`figma:brief --node <nodeId>`.

A session that touches a page also reads that page's tree — `get_metadata` on the
page node — and brings its census up to date
([catalogue.md](references/catalogue.md#the-page-surface)).

## Config first

Find the config with `git ls-files '*figma-to-code.yaml'` — one per repository,
beside the package it describes; when it is missing, run
[init](references/init.md). Paths are relative to the config's folder, except
`design.requests`, which is relative to the workspace root. Keys below are
written as `catalog.registry`. Every command runs from the repository root.

## Running the commands

Every command is an Nx target — `pnpm nx run <project>:<target>` — followed by
its flags, space-separated:

- **`--flag value`, both halves separate.** `parity check --case <id>`. The `=`
  form dies in the wrapper and the tool never sees it: `--case=<id>` exits with
  `check requires --node <id> or --case <caseId>`.
- **The flags go straight after the target.** `figma:rules --refresh --node <id>`.
  A `--` of their own reaches the script, which answers "No command specified".
- **Nx reads its own options first** (`-c=ci`, `-t`, `--output-style=static`), so
  those keep their form; no task flag collides with them today.
- **Ask the target for its flags**: the target with `--help`, or
  `pnpm --filter pagopa-ui-cli run cli parity` with no arguments, prints every
  subcommand and flag. `parity source` and `parity render` have no target of
  their own and take the filter form, the flags in the same two shapes.
- **A failed task prints its name and a `full log:` path.** Read that file, or
  re-run with `--output-style=static`: the log names the rule that failed, so
  quote the rule and never the task alone.
- **Exit 1 is a result twice** — drift in `figma:plan`, a delta in
  `parity:check` — and a failure everywhere else; read the code's meaning
  ([parity-tooling.md](references/parity-tooling.md)) before calling a run
  broken.

## Rules for every use case

- **Figma is read-only.** Read through the REST export or the Figma MCP read
  tools (`get_design_context`, `get_screenshot`, `get_metadata`,
  `get_variable_defs`, `list_file_components_for_code_connect`). Never rename,
  move or edit a node, never call a tool that writes (`use_figma`, Code Connect
  publishing). Drift is reconciled in the repository.
- **Credentials and the MCP gate.** The person exports `FIGMA_TOKEN` (scopes
  `file_content:read`, `library_content:read`) in the process environment; never
  read, source or load `.env`, never print the token. `figma:status` reports the
  token state, and a missing token stops only the REST steps: the source is still
  read through the MCP. The gate is [init.md](references/init.md) §2.
- **`nodeId` is identity.** Names and pages change; the registry is keyed by
  `nodeId`, bulk rules by `pageId`.
- **The library is the scope.** A drawing the file never published is not
  implemented: not a component of this design system, no work owed. The census
  records it as `unpublished`, so publication — which grows the export — fails
  the mirror and makes the decision due
  ([catalogue.md](references/catalogue.md#the-page-surface)).
- **A composition is source too.** A page draws arrangements, not only
  identities: the frame stacking four elements, the mobile page at 304, the
  drawer panel at 417. Each is measured by a case at the device it is drawn at,
  or excused in writing in the census; a row rendered at the set's own variant
  width measures the set, not the page.
- **Figma URLs come from `figma.fileModule`** (`FIGMA_FILE_KEY`,
  `figmaNodeUrl`, `figmaEmbedUrl`); never hardcode the file URL. A story's
  `design` parameter uses `figmaEmbedUrl`: the addon only rewrites a URL with a
  path segment after the file key into its embeddable form.
- **Parity is the render.** The story, captured at the source width and state,
  matches the source variant in numbers and images. A code read, a green suite or
  a set thumbnail is not evidence.
- **Devices are part of the contract.** A set with a `Device`/`Breakpoint` axis
  is aligned for every declared device, each from its own variant.
- **Token ladder.** The existing token, else the compatible one within 2px with
  the residue recorded, else a new token through `tokens.manifest`. Never an
  inline pixel value.
- **Review is a decision, not a refresh.** `implemented` follows an inspection
  of the source and the render; the record is the drift pull request merge or the
  decision written in the session. Historical nodes are reviewed one at a time on
  request, never in bulk; `mocked` demos are never queued or renewed.
- **An open point goes to the design owner.** A question the source cannot answer
  becomes one issue for `design.owners`, with a review story on the review pull
  request when it is visual, and one record at `design.requests`; the node stays
  `pending` until the answer is recorded
  ([design-request.md](references/design-request.md)).
- **A drift branch is the handoff.** Commit the alignment on the drift branch;
  the person pushes and merges ([handoff.md](references/handoff.md)).
- **The registry is the only status source.** Per-node constraints live in the
  node's registry `note`, component behaviour in its guide under `code.guides`.
  Read both before touching a component.
- **The rules boxes and the comments are source.** The `.Regole` cards and the
  node comments sit outside the fingerprint, so no drift reports them. Read the
  node's brief before implementing, translate the consumer-facing rules into
  the guide, record every other card with a disposition, and leave no `pending`
  or `stale` rule on a node you touch ([rules.md](references/rules.md)).

## Use cases

| Use case                                     | Reference                                             |
| -------------------------------------------- | ----------------------------------------------------- |
| Figma delta: snapshot, triage, pending queue | [delta.md](references/delta.md)                       |
| Drift handoff: branch, artifacts, local alignment, before/after media | [handoff.md](references/handoff.md)               |
| New component from a Figma node              | [new-from-figma.md](references/new-from-figma.md)     |
| Component without a Figma node: coverage     | [new-without-node.md](references/new-without-node.md) |
| Name and props of a new or revised node      | [prop-conventions.md](references/prop-conventions.md) |
| Visual comparison and fix, a parity wave     | [visual-parity.md](references/visual-parity.md)       |
| Device and breakpoint variants               | [devices.md](references/devices.md)                   |
| Foundation tokens: refresh, extensions        | [tokens.md](references/tokens.md)                     |
| Icons and pictograms                         | [artwork.md](references/artwork.md)                   |
| Review of an existing node                   | [node-review.md](references/node-review.md)           |
| An open question for the design owner        | [design-request.md](references/design-request.md)     |
| Rules and comments of a node: brief, ledger, guide | [rules.md](references/rules.md)                 |

Shared references, loaded when a use case points at them:
[definition-of-done.md](references/definition-of-done.md) (source alignment:
what a node-backed component proves), [catalogue.md](references/catalogue.md)
(alignment files, statuses, the `figma:check` contract),
[parity-tooling.md](references/parity-tooling.md) (the parity commands),
[rules.md](references/rules.md) (the rules ledger and node comments),
[init.md](references/init.md) (config and the MCP gate).

## Closing every use case

1. **Source alignment** satisfied for each touched node
   ([definition-of-done.md](references/definition-of-done.md)).
2. **Green chain**: the repository's full pre-commit chain. Stories run in a
   browser: when they cannot start, say so and never count them as passed.
3. **Delivery stop**: report and ask before commit, push or pull request.
   Stories, registry, inventory and exception changes travel with the
   implementation. On a drift branch, commit the alignment there and leave the
   push and merge to the person ([handoff.md](references/handoff.md)). Once that
   pull request exists, one comment on it carries the before/after pair of every
   node whose render moved
   ([handoff.md](references/handoff.md#before--after-media)).
4. **Report**: what changed; per node the decision and its reason; per device
   the verdict; the residues with their reasons; what stays open and why; files
   touched; each command with its result.
