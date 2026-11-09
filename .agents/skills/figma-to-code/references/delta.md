# Figma delta — snapshot, triage, decisions

Scope is the current production delta and its affected dependants, not the
historical pending queue. Policy-excluded nodes and historical reviews require
an explicit request; mocked demos are never renewed.

## Entry points

An open drift pull request already carries the refreshed state:
[handoff.md](handoff.md), then step 3. A new Figma change or an aged inventory
starts at step 1. A code-side change to a mapped node uses
[node-review.md](node-review.md). Variables use [tokens.md](tokens.md);
artwork uses [artwork.md](artwork.md) after triage.

## Steps

1. **Snapshot and delta.**

   ```sh
   pnpm ui-cli figma plan --json
   ```

   REST is the default; `--input <snapshot>` plans from supplied evidence.
   Read the complete result: added/removed/changed/renamed/moved identities,
   affected dependants, changed variants and devices, missing baselines,
   unverified design, dependency-first `implementationOrder`, and page-surface
   gaps. `pending` is the pre-existing queue, not this delta. Exit 3 means
   reconciliation is due, not a failed export
   ([parity-tooling.md](parity-tooling.md#exit-codes-and-profiles)).

   If MCP exposes the published component list, save its unmodified response to
   `figma.mcpInventory`, then
   `pnpm ui-cli figma export --input <figma.mcpInventory>` and plan from the
   resulting snapshot. This joins MCP-only roots with REST; it still needs a
   REST token. If that tool is absent, REST covers the file's own components;
   report that remote roots were not rediscovered. With no REST token, obtain
   fresh usable evidence from the person; a component list alone cannot replace
   the full snapshot.

   **Done when** the person has the delta, changed devices and work order before
   implementation or accepted-state writes. Pinning a local snapshot is not an
   implementation decision.
2. **Triage the inspected snapshot.**

   ```sh
   pnpm ui-cli update inventory --input <figma.snapshot> --triage
   ```

   This refreshes the inventory, queues production changes and affected nodes,
   prunes removed entries and synchronizes queued census identities. Mocked
   and excluded decisions survive. The writer formats JSON and lowers the
   note-length ratchet; no manual JSON round-trip or formatter step is needed.
   **Done when** accepted inventory and production pending queue reflect the
   reported delta. A refresh is not approval.
3. **Decide**, in the delta's `implementationOrder`.
   Read the batched context with `pnpm ui-cli figma brief --queue --refresh`:
   it is scoped to this delta and names how many pending nodes it omitted, so
   never widen it to `--full` to find the order. Use `--node <id>` for a single
   node. Run
   `pnpm ui-cli parity align --node <id>` and inspect every declared device's
   source and render. Apply [review semantics](catalogue.md#review-semantics):
   implement → [new-from-figma.md](new-from-figma.md);
   existing implementation or mapping → [node-review.md](node-review.md);
   exclusion → `figma registry set` with a reason;
   unanswered source question → [design-request.md](design-request.md).

   **Done when** every delta node has a reasoned decision and the device
   compositions it covers are recorded. Pending nodes name a request/blocker;
   implemented nodes satisfy [source alignment](definition-of-done.md).
