# Figma delta — snapshot, triage, pending queue

Scope: the delta nodes — `added`, `changed`, `affected`, plus `renamed`/`moved`
identities. `excluded` policy nodes and historical entries wait for an explicit
request ([node-review.md](node-review.md)).

## Entry points

- **A drift pull request** is a complete handoff: its body lists the delta nodes
  with links, classes, targets and per-device variants. Start from its branch at
  step 4.
- **Figma changed, no drift pull request**, or `figma:check` warns that the
  inventory is older than 30 days: start at step 1.
- **The design foundations changed** (Variables): the token step below.
- **Icon or pictogram artwork changed**: [artwork.md](artwork.md) after step 3.
- **A code-side change to a node already in `catalog.inventory`** (fix,
  refactor): [node-review.md](node-review.md).

## Steps

1. **Snapshot.** Run the token preflight ([init.md](init.md)). Call
   `list_file_components_for_code_connect` with `FIGMA_FILE_KEY` from
   `figma.fileModule`, save the response to `figma.mcpInventory`, then
   `pnpm nx run pagopa-ui-cli:figma:export --input <figma.mcpInventory>`. The export joins the MCP-only
   roots with the REST components and sets and fetches document and design
   evidence at one pinned version into `figma.snapshot`.
   **Done when** `figma.snapshot` pins the current version with a complete
   baseline. A metadata-only MCP response is not a baseline, and the scheduled
   REST job cannot discover new MCP-only roots without this step.

2. **Delta.** `node packages/ui-cli/src/cli.ts figma sync --input <figma.snapshot> --plan`
   prints JSON (exit 1 means drift):
   - `added`, `removed`, `changed`, `renamed`, `moved`: identity, property and
     design changes;
   - `baseline`: a node without a full design baseline — the next snapshot must
     carry its evidence;
   - `affected`: implementations that depend on a changed node;
   - `implementationOrder`: the work order, dependencies first, never a `mocked`
     demo;
   - `unverifiedDesign`: nodes without a design fingerprint.

   A set with a device axis is reported **per device**: name the variants and
   links the delta touches; a mobile-only change is a mobile review.
   **Done when** every delta node, its class, its changed devices and the order
   are reported to the person, before any file changes.

3. **Triage.** `pnpm nx run pagopa-ui-cli:figma:triage --input <figma.snapshot> --plan`
   (`pnpm nx run pagopa-ui-cli:figma:update` is the same refresh). It validates before writing,
   refreshes `catalog.inventory`, turns new, changed and affected production
   nodes `pending` (including nodes a bulk rule covered) and prunes removed
   entries with their story exceptions. `mocked` and `excluded` entries keep
   their status. Then `pnpm nx run-many -t fmt`.
   **Done when** the inventory is refreshed and each production delta is
   `pending`. A refresh is not approval.

4. **Decision.** Per queued node, in `implementationOrder`, read the source of
   **every declared device** (`node packages/ui-cli/src/cli.ts parity source <nodeId>
   --compact`, `get_design_context` / `get_screenshot`) and pick exactly one:
   - implement it in the matching family → [new-from-figma.md](new-from-figma.md);
   - it is already implemented and the change reaches it →
     [node-review.md](node-review.md);
   - map it to an existing implementation that actually covers its contract →
     [node-review.md](node-review.md);
   - `excluded` with a reason.

   "It matches the desktop frame" is not a decision for a node with a device
   axis. **Done when** every delta node has one decision and the per-device
   compositions it covers are written down; nodes left `pending` are listed for
   the person.

## Tokens: the design foundations changed

1. Export the published Variables read-only (Figma MCP `get_variable_defs`) to
   `figma.variables` (local, never committed).
2. `node packages/ui-cli/src/cli.ts tokens write --input <figma.variables>` curates the
   snapshot into `tokens.manifest` and regenerates `tokens.generatedCss`.
3. Every variable gets a value or a reasoned exclusion: an unknown namespace or
   an unresolved variable fails the refresh. Local values in `tokens.stylesheet`
   are documented extensions (their reason is in the manifest); re-link one to
   its Figma variable when a source becomes reachable. Text styles that no
   published node binds stay out of scope until a component consumes them.
4. `pnpm nx run pagopa-ui-tokens:tokens:check`, then [visual-parity.md](visual-parity.md) for every
   component whose token changed value.

**Done when** `pnpm nx run pagopa-ui-tokens:tokens:check` passes and every `var(--figma-*)` reference in
`tokens.stylesheet` resolves.
