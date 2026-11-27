---
id: UC-02
status: ready
priority: Must
parent_dr: ../design-review.md
---

# `UC-02`: Align a component to a Figma delta

**Linked JTBD**: N/A — confirmed: direct intake from the repository (see `open.item-011` of the parent DR).

**Primary actor**: Design system maintainer

**Secondary actors**: Design owner; Continuous integration

**Source artifact**: `CONTRIBUTING.md` § "Asking an agent — A Figma delta"; `docs/decisions/0004` (gate limited to the delta, device policy vocabulary); `packages/pagopa-ui/src/catalog/figma/inventory.json`

**Service Blueprint step**: N/A — confirmed: no service blueprint (see `open.item-019` of the parent DR).

**Domain entities**: Delta, Figma node, Registry entry, Variant, Device, Parity diagnostic, Bulk rule, Work order, Green chain

**Trigger**: Figma changed compared with the committed snapshot, or a weekly drift pull request is open.

**Preconditions**:

- A previous snapshot exists to compare the design fingerprint against.
- A live read of the file is available (read-only token) or a read-only export provided by the maintainer.
- The perimeter of the delta is known: the nodes involved and their status in the registry.

**Main flow**:

1. The maintainer asks for the alignment, declaring whether the work starts from the snapshot or from the drift pull request.
2. The system produces the delta plan: changed nodes, kind of change, fingerprint before and after, residue of uncensused surface.
3. The system triages the nodes and computes the work order from the dependencies.
4. For every node in the queue the system prints the brief and applies the decision: align, record as a reasoned exclusion, or open a design request.
5. The system aligns the component, updates the story and compares the node against its drawing on every declared device; the residues it leaves are this session's, restated in the registry note rather than stored anywhere.
6. The system closes the delta queue and verifies that every node has a recorded decision.
7. The system runs the green chain; the maintainer merges the drift pull request, which for drift is also the act of design approval.

**Alternate flows**:

- `A1`: The delta touches no implemented node — the system updates the snapshot and closes the queue without changing components.
- `A2`: The changed node is not published yet — the system records it as unpublished and assigns it no work.
- `A3`: The change is rule-only or comment-only — the system does not detect it as a delta, because the fingerprint does not cover them, and handles it through `UC-06`.

**Exception flows / edge cases**:

- `E1`: No usable previous snapshot exists -> Error: `BASELINE_SNAPSHOT_MISSING`
- `E2`: The file changed during the read and the fingerprints are not comparable -> Error: `SNAPSHOT_UNSTABLE`
- `E3`: A node in the queue has no recorded decision -> Error: `NODE_DECISION_MISSING`
- `E4`: The rendering diverges between devices with no declared reason -> Error: `DEVICE_DIVERGENCE_UNRECORDED`
- `E5`: A residue measured before the change is still quoted as current -> Error: `PARITY_RESIDUE_STALE`

**Postconditions**:

- The committed snapshot matches the file version that was worked.
- Every node of the delta has a recorded decision: aligned, excluded with a reason, or pending with an open design request.
- The nodes aligned in the delta were compared per declared device, and their residues restated rather than quoted from before the change.
- The drift pull request contains only the work of the delta and its description lists the nodes and the decisions.

**Errors**:

- `BASELINE_SNAPSHOT_MISSING`: the starting snapshot is missing -> the plan is not produced and no file is modified.
- `SNAPSHOT_UNSTABLE`: the file changed between two reads -> the work stops and asks for a fresh read, so as not to align to a version already superseded.
- `NODE_DECISION_MISSING`: the queue contains a node without a decision -> the queue cannot be closed and the pull request stays incomplete.
- `DEVICE_DIVERGENCE_UNRECORDED`: the mobile rendering diverges with no reason the device policy and the registry note account for -> the device check fails and the divergence cannot pass silently.
- `PARITY_RESIDUE_STALE`: a residue was measured under conditions that no longer hold -> the node does not count as reviewed until a fresh comparison measures it again.

**Acceptance checks**:

- `AC-01`: The delta plan lists every changed node with the kind of change and the fingerprints before and after. - Evidence: `pnpm nx run pagopa-ui-cli:figma:plan`
- `AC-02`: The work order respects the dependencies: no dependent node precedes the node it depends on. - Evidence: `pnpm nx run pagopa-ui-cli:figma:triage`
- `AC-03`: Every node of the queue has a recorded decision before the close. - Evidence: `pnpm nx run pagopa-ui-cli:figma:status`
- `AC-04`: Divergences between devices are allowed only when the device policy declares them and the registry note explains them. - Evidence: `packages/pagopa-ui/src/catalog/figma/device-policy.json`; `pnpm nx run pagopa-ui-cli:check:devices`
- `AC-05`: Every aligned node is compared per declared device after the change, with each remaining residue restated. - Evidence: `pnpm ui-cli align <nodeId> --device <device>`, one run per declared device
- `AC-06`: The catalogue check is green after the alignment, and the closing write applied all of its documents or none. - Evidence: `pnpm ui-cli record <nodeId> --status <status>` (its exit code is the catalogue verdict); `pnpm nx run pagopa-ui:check:catalogue`
- `AC-07`: The full green chain is green before the commit. - Evidence: `pnpm nx run workspace:verify`
- `AC-08`: With no starting snapshot, the system returns `BASELINE_SNAPSHOT_MISSING` and modifies no file. - Evidence: `ui-cli` tests on the synchronisation command

**Tracking events**:

- `N/A — confirmed`: no runtime tracking events (see `NFR-07` of the parent DR); the delta and its decisions live in the drift pull request and in the Git history.

**Relevant links**:

- Sequence diagram:

```mermaid
sequenceDiagram
  actor M as Design system maintainer
  participant CLI as ui-cli
  participant CAT as Figma catalogue
  participant LIB as packages/pagopa-ui
  M->>CLI: figma:plan
  CLI-->>M: delta with fingerprints
  M->>CLI: figma:triage
  CLI-->>M: queue and work order
  loop every node in the queue
    M->>CLI: figma:brief --node <nodeId>
    M->>LIB: alignment + per-device comparison
  end
  LIB->>CAT: snapshot updated
  M->>M: merge of the drift pull request (design approval)
```

- Service Blueprint: N/A — confirmed (see `open.item-019` of the parent DR).
- Figma: library `pvhsJpPGQbEwNLiyP7BOIw`, version of the current snapshot.
- DR components: `solution.components.item-001`, `solution.components.item-005`, `solution.components.item-004`
- Endpoint / OpenAPI / AsyncAPI / Data Contract: `contracts.item-004`, `contracts.item-005`, `contracts.item-007`, `contracts.item-008`
- Validation evidence: `pnpm ui-cli align <nodeId> --device <device>`; `pnpm ui-cli record <nodeId> --status <status>`; `docs/figma-drift-handoff.md`

## Open questions and propagation

| ID           | Type              | Item                                                                                                | Impact / blocker                                                            | Owner        | Resolution / link |
| ------------ | ----------------- | --------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------- | ------------ | ----------------- |
| `uc-open-04` | question          | Does a node that is aligned but not yet reviewed by design stay in the queue of the next delta?     | Determines whether the review debt accumulates or is carried between deltas | TBD          | TBD               |
| `uc-open-05` | assumption        | The delta queue is closed when every node has a decision, not when parity is complete               | If wrong, the delta is never closable until the aggregate coverage grows    | TBD          | TBD               |
| `uc-open-06` | proposed decision | A change that touches only rules or comments is always handled through `UC-06`, with no second path | Avoids introducing a second path for the same work                          | design owner | TBD               |
