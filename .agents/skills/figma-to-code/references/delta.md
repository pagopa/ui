# Figma delta — snapshot, triage, pending queue

Scope: the delta nodes — `added`, `changed`, `affected`, plus `renamed`/`moved`
identities. `excluded` policy nodes and historical entries wait for an explicit
request ([node-review.md](node-review.md)).

## Entry points

- **A drift pull request** is a complete handoff: its body lists the delta nodes
  with links, classes, targets and per-device variants. Start from its branch
  after the setup in [handoff.md](handoff.md), then step 3.
- **Figma changed, no drift pull request**, or the session report says the
  inventory is older than 30 days: start at step 1.
- **The design foundations changed** (Variables): the token step below.
- **Icon or pictogram artwork changed**: [artwork.md](artwork.md) after step 2.
- **A code-side change to a node already in `catalog.inventory`** (fix,
  refactor): [node-review.md](node-review.md).

## Steps

1. **Snapshot and delta.** `pnpm nx run pagopa-ui-cli:figma:plan` reads the live
   file over REST, pins its version into `figma.snapshot` and prints the delta
   plan as JSON on stdout (exit 1 means drift, not failure). It reports:
   - `added`, `removed`, `changed`, `renamed`, `moved`: identity, property and
     design changes;
   - `changedVariants`: the variant and the device each design change landed in;
   - `baseline`: a node without a full design baseline — the next snapshot must
     carry its evidence;
   - `affected`: implementations that depend on a changed node;
   - `implementationOrder`: the work order, dependencies first, never a `mocked`
     demo;
   - `pending`: the queue that was already waiting, with its design requests. It
     is not today's delta;
   - `unverifiedDesign`: nodes without a design fingerprint.

   A set with a device axis is reported **per device**: name the variants and
   links the delta touches; a mobile-only change is a mobile review.
   The REST read covers every component published in the file. When a remote
   library may hold roots it cannot see, add the MCP inventory: save
   `list_file_components_for_code_connect` to `figma.mcpInventory` and run
   `pnpm nx run pagopa-ui-cli:figma:export --input <figma.mcpInventory>`. When
   the connected MCP server has no such tool, the REST path is complete for the
   file's own components; say so in the report.
   **Done when** every delta node, its class, its changed devices and its place
   in the order are reported to the person, before any file changes.

2. **Triage.** `pnpm nx run pagopa-ui-cli:figma:triage` refreshes
   `catalog.inventory` from the pinned snapshot, records the file version it was
   read from, turns new, changed and affected production nodes `pending`
   (including nodes a bulk rule covered) and prunes removed entries with their
   story exceptions. `mocked` and `excluded` entries keep their status. Then
   `pnpm nx run-many -t fmt`.
   **Done when** the inventory is refreshed and each production delta is
   `pending`. A refresh is not approval.

3. **Decision.** Per queued node, in `implementationOrder`, read the source of
   **every declared device** (`node packages/ui-cli/src/cli.ts parity source <nodeId>
   --compact`, `get_design_context` / `get_screenshot`) and pick exactly one:
   - implement it in the matching family → [new-from-figma.md](new-from-figma.md);
   - it is already implemented and the change reaches it →
     [node-review.md](node-review.md);
   - map it to an existing implementation that actually covers its contract →
     [node-review.md](node-review.md);
   - `excluded` with a reason;
   - the source leaves a question only the design owner can answer → write a
     design request ([design-request.md](design-request.md)) and keep the node
     `pending`.

   The design fingerprint cannot see the `.Regole` boxes or the component
   description: `pnpm nx run pagopa-ui-cli:figma:rules -- --plan` reports the
   rules a page changed, and `figma:brief --node <nodeId>` is the read that
   closes the gap ([rules.md](rules.md)).

   "It matches the desktop frame" is not a decision for a node with a device
   axis. **Done when** every delta node has one decision and the per-device
   compositions it covers are written down; nodes left `pending` name their
   design request or blocker, and no rule that targets a touched node is
   `pending` or `stale`.

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
