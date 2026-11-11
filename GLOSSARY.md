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

**Page**:
The Figma canvas that holds drawings. A session reads it and records it as one unit.
_Avoid_: frame, artboard, screen

**Library**:
The published export of the Figma file. Publication is what puts a drawing in scope.
_Avoid_: export (for the library), catalogue, design system

**Committed records**:
The documents the repository reviews in git — the inventory, the registry, the device vocabulary and the reviewed cases — each with one default path and one read posture. A live export passed by flag is not one of them.
_Avoid_: catalogue, data files, fixtures

**Inventory**:
The committed record of the published nodes and their source facts at a pinned Figma version.
_Avoid_: snapshot (for the committed record), catalogue

**Registry**:
The per-node decision: status, implementation target, linked story and the binding note.
_Avoid_: mapping, index

**Record reader**:
The one module a committed record is read through: it owns the default path, the parse posture, the error and the memory keyed by the resolved file.
_Avoid_: loader, repository, catalogue store

**Status**:
The review state of a node: implemented, pending, excluded, or mocked.
_Avoid_: state (for the review state)

**Identity**:
One drawing of the census: what the page shows of it, its library state and the decision it got. An identity outside the library is not a node.
_Avoid_: entry, item, element

**Census**:
The committed record of the pages a session read: the identities on each page and the decision each one got. For a node it carries the registry's decision, seen from the page side.
_Avoid_: page surface, surface, page map, coverage

**Page read**:
The reading of one page tree, recorded as that page's census. It is the unit of work, and it closes a Figma session.
_Avoid_: page scan, page crawl

**Case**:
A reviewed, reproducible comparison between one source variant and one story: selectors, width, state, residues and a note.
_Avoid_: test, scenario, sample

**Draft case**:
A proposed case whose mapping has not been reviewed; it never counts as coverage.
_Avoid_: proposal (when meaning coverage), pending case

**Case corpus**:
The reviewed cases held as one value: its documents — the cases, the inventory, the registry and the device vocabulary, read the first time a judgment asks for them — are readonly properties, its judgments are methods over them (`of`, `reviewed`, `node`, `find`, `pointed`, `coverage`, `proposals`, `stateProposals`, `validate`), and `validate()` takes no arguments because the documents are already inside; it is `parity/corpus.ts`, and the registry keeps the decision while the corpus keeps the comparison.
_Avoid_: case file (for the value), case list, cases module, catalogue

**Case writer**:
The module a reviewed decision is stored through: it turns a proposal into a committed case, keeps case identity, and forgets the record reader's memory after writing.
_Avoid_: saver, case store, repository, corpus

**Coverage**:
The declared devices of a node that a reviewed case covers.
_Avoid_: completeness

**Device exception**:
A written reason a node may stay implemented with a case missing for one of its declared devices; it is a burn-down list beside the corpus (`parity/device-exceptions.ts`), not a committed record and not a coverage claim.
_Avoid_: residue, tolerance, waiver

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
