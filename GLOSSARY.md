# Figma alignment

The vocabulary of the domain that keeps the React design system aligned with its Figma library: the source library, the reviewed comparisons and the records that prove them.

## Language

**Node**:
A published Figma component or component set, identified by `nodeId`.
_Avoid_: component (for the Figma side), element

**Variant**:
One child of a component set, declaring the axis values (device, state, property) it draws.
_Avoid_: state, version

**Device**:
A canonical composition declared by the device vocabulary: mobile, tablet, desktop, or any.
_Avoid_: breakpoint, resolution

**Inventory**:
The committed record of the published nodes and their source facts at a pinned Figma version.
_Avoid_: snapshot (for the committed record), catalogue

**Registry**:
The per-node decision: status, implementation target, linked story and the binding note.
_Avoid_: mapping, index

**Status**:
The review state of a node: implemented, pending, excluded, or mocked.
_Avoid_: state (for the review state)

**Case**:
A reviewed, reproducible comparison between one source variant and one story: selectors, width, state, residues and a note.
_Avoid_: test, scenario, sample

**Draft case**:
A proposed case whose mapping has not been reviewed; it never counts as coverage.
_Avoid_: proposal (when meaning coverage), pending case

**Coverage**:
The declared devices of a node that a reviewed case covers.
_Avoid_: completeness

**Residue**:
A measured difference accepted with a written reason; it stays visible and does not block.
_Avoid_: exception, tolerance

**Parity**:
The numeric agreement between a source variant and its rendered story, plus the structural and responsive verdict.
_Avoid_: pixel diff, fidelity score

**Evidence bundle**:
The committed, generated set of source documents, pinned Figma images and their manifest that lets a clone read the source side without the live snapshot or a token.
_Avoid_: snapshot (for the bundle), assets

**Verification**:
The hermetic verdict over the case corpus, the device coverage and the evidence bundle, with no snapshot, browser or network.
_Avoid_: evidence (as a synonym), test run

**Delta**:
The difference between the live Figma library and the committed inventory, classified by change kind.
_Avoid_: diff (for the Figma delta), drift (as the object)

**Drift**:
The workflow that detects a delta, refreshes the records and hands the work to a person.
_Avoid_: sync (for the workflow), update

**Work order**:
The dependency-aware sequence in which queued nodes are reviewed.
_Avoid_: queue (for the order), backlog

**Handoff**:
The review package of a drift run: the pull request, its body, the machine-readable delta, the run metrics and the evidence.
_Avoid_: report, packet

**Gate**:
A check whose failure blocks the change; warnings are not gates.
_Avoid_: check (when meaning gate)
