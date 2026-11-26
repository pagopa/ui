# Glossary map

The repository speaks two vocabularies and a term belongs to exactly one of
them: **Figma alignment**, the domain that reads the source library and proves
that the code matches it, and the **consumer design system**, the package an
application installs and renders. They meet in this file, which stays the single
entry point for both, and they do not overlap: a `Node` is not a `Component`, a
`Variant` is not a `Prop`, a Figma variable is not a `Token`.

## Map

| Vocabulary             | Read by                                      | Canonical source                                                                                                                                                                                                                 |
| ---------------------- | -------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Figma alignment        | the maintainer and the agent aligning a node | [Figma alignment](#figma-alignment), below; the committed records in `packages/pagopa-ui/src/catalog/figma/`; the procedure in [figma-to-code](.agents/skills/figma-to-code/SKILL.md)                                            |
| Consumer design system | the application team adopting `@pagopa/ui`   | [Consumer design system](#consumer-design-system), below; the package guide in [packages/pagopa-ui/README.md](packages/pagopa-ui/README.md); the standards in [pagopa-ui-standards](.agents/skills/pagopa-ui-standards/SKILL.md) |

Where the detail of a term outgrows one entry, the document that owns it is its
source of truth and the map points there; every other term is owned by the
section it sits in.

| Term           | Vocabulary      | Canonical source                                                                                                   |
| -------------- | --------------- | ------------------------------------------------------------------------------------------------------------------ |
| Prop naming    | consumer        | [prop conventions](.agents/skills/pagopa-ui-standards/references/prop-conventions.md)                              |
| Text contract  | consumer        | [pagopa-ui-standards](.agents/skills/pagopa-ui-standards/SKILL.md)                                                 |
| Story          | consumer        | [story contracts](.agents/skills/pagopa-ui-standards/references/story-contracts.md)                                |
| Token          | consumer        | [tokens guide](apps/storybook/src/guides/tokens.md), [foundations guide](apps/storybook/src/guides/foundations.md) |
| Artwork        | consumer        | [ADR-0003](docs/decisions/0003-artwork-provenance.md)                                                              |
| Public surface | consumer        | [API report](packages/pagopa-ui/etc/pagopa-ui.api.md)                                                              |
| Drift          | Figma alignment | [figma drift handoff](docs/figma-drift-handoff.md)                                                                 |
| Parity         | Figma alignment | [ADR-0011](docs/decisions/0011-ephemeral-parity-diagnostic.md)                                                     |

## Figma alignment

The vocabulary of the domain that keeps the React design system aligned with its Figma library: the source library, the reviewed comparisons and the records that prove them.

### Language

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
An on-demand comparison between one source variant and one story: selectors, width, state and the residues it reports. It is derived from the registry and the command line, never stored.
_Avoid_: test, scenario, sample, committed case

**Coverage**:
The declared devices of a set that its story renders; it is a property the inventory reads from the device policy, not a count of reviewed comparisons.
_Avoid_: completeness, case coverage

**Residue**:
A measured difference accepted with a written reason; it stays visible and does not block.
_Avoid_: exception, tolerance

**Parity**:
The numeric agreement between a source variant and its rendered story, plus the structural and responsive verdict. It is a diagnostic a session runs on a node, not a state the repository keeps ([ADR-0011](docs/decisions/0011-ephemeral-parity-diagnostic.md)).
_Avoid_: pixel diff, fidelity score

**Verification**:
The hermetic verdict `check:catalogue`, `check:artwork` and `check:rules` reach from the committed records, with no snapshot, browser or network.
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

## Consumer design system

The vocabulary of the package an application installs: what it imports, what it
overrides and where it reads the rules.

### Language

**Component**:
The exported React unit a consumer imports and renders. In the Figma vocabulary
the drawing it implements is a node.
_Avoid_: node (for the package side), widget, element

**Consumer**:
The application team that installs `@pagopa/ui` and owns the product the
component appears in.
_Avoid_: user, client

**Prop**:
A public option of a component, named by the prop conventions: what the consumer
sets, never an internal implementation detail.
_Avoid_: attribute, parameter, option

**Controlled and uncontrolled**:
Who owns a stateful value: the consumer through a prop and its change handler,
or the component itself, which then exposes a default.
_Avoid_: controlled mode, managed state

**Text contract**:
The rule that every string a component renders or announces is a public,
overridable prop with a default; where the sentence depends on data, the
consumer receives the data and returns the sentence.
_Avoid_: copy, labels, i18n

**Token**:
A public CSS custom property the package exports and the consumer applies; the
Figma side of it is a variable.
_Avoid_: variable (for the public token), design token (as a synonym), theme value

**Artwork**:
The icons and pictograms the package ships as components, each with its
provenance and licence recorded.
_Avoid_: asset, graphic, image

**Story**:
The Storybook example that shows one state of a component and proves it renders.
_Avoid_: example, demo, sample

**Guide**:
The Markdown page, beside the stories, that documents a component or a
foundation for the consumer.
_Avoid_: documentation, doc page

**Catalogue**:
The published Storybook build the guides and the stories are served from.
_Avoid_: documentation site, portal

**Public surface**:
The exports, props, texts and tokens the package promises to keep, declared in
the API report.
_Avoid_: API, contract (as a synonym)
