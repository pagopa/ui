# Parity tooling

Signatures come from `pnpm ui-cli parity <command> --help`. `align --node <id>`
supplies the work order and the exact check lines per declared device. `check` and
`source` read `--input`, else `figma.snapshot`, else the committed evidence slice;
`check` and `capture` need Storybook (`STORYBOOK_URL=<url>`). `--saved` reproduces every
committed case and checks device coverage; `--devices` is no substitute for saved cases. The source reader is the only reader of the source; `check --screenshot
<file>` renders to look at; trust `check` over the render module's `--root`
(which forces `display:block`).

## Exit codes

`0` pass (declared residues may remain) · `1` violation · `2` cannot run (usage,
missing input or evidence, stale slice, refused capture) · `3` reconciliation
required. Missing evidence is never a pass, and an aggregate code certifies no
row. The default profile is the reviewed one: mapped deltas and residues decide,
composition evidence is an `advisory`; `--strict` promotes advisories.

## Reading the result

`deltas` carry the token class (`token|near-token|inline`) against the token
vocabulary; `advisories` are offsets from the declared origin and inverted sibling
order; `responsive` reports `clipped`, `escaped`, `truncated`, the band rows,
advisory `scrollable` and, under a `layoutScope`, `scope viewport|container:
verified|NOT confirmed`; `residues` are declared deltas with a reason; `capture`
reports devicePixelRatio, the ruler, forced root width, kept focus and offset
origin. Text compares only with `--compare-text`: the fixture owns its copy.

## Capturing a state

Hardened before any number: motion off, caret and scrollbars hidden, fonts
awaited, focus blurred (`--keep-focus`), pointer parked; a scaled capture exits 2.
`--viewport` follows the frame width, `--height` the artboard; a mockup wider than
the device viewport raises the viewport below the next breakpoint, and Storybook's
minimum is 320. `--expect-state <state>` exits 2 when the story does not show it;
the generic predicates are `enabled`, `disabled`, `focused`, `filled`, `empty`,
`open`, `error`, else `--state-evidence <selector>`. No Figma-label → prop map
exists: the state is checked, never inferred. Always pass `--state`: it names the
case.

## The case corpus

`catalog.parityCases` records variants, states, devices, dimensions, scope,
selectors and residues. `--save-case` owns the formatted write;
reproduce IDs with `--case`. `pnpm nx run pagopa-ui-cli:check:parity` validates
corpus, coverage and evidence hermetically, `check:evidence` the bundle alone;
neither substitutes for capturing a story. Refresh with `pnpm ui-cli update
evidence --input <snapshot>`. `cases --sync` proposes one draft per missing device
and per unpointed variant from a sibling; a draft never counts as coverage until
`--save-case --note "reviewed: …"` replaces it; a node with no reviewed case
starts with one manual `check --node`, and a `--node` case takes `--note`.

## Case mapping

`--node` finds the registry target (module, export, story, `storyExports`); a plain
component is its own single variant (`--variant <node id>`). `--root` is the compared element; `--subject-root <layer>` maps the
component's own layer, never the wrapper; `--subject "<layer>=<selector>"` adds a
nested subject, declared per device (a missing layer exits 2), paths key first
(`X.offset.top`). The root subject is `field`, so `--ignore gap` may omit the
prefix. Scope selectors under `#storybook-root`; prefer
`:nth-of-type` when separators sit between items. `namedLeaves` match
exact layer names, emoji and `[ID: …]`. A `TEXT` subject compares the vertical
offset only; `--compare-box height` adds its height, `full` its width.

## What does not exist

No PNG pixel diff or percentage budget — the gate is 2px per property plus
structural deltas; no workbench, packets or approval files; no `refs` or pixel
baselines, so re-run `check` after a change. Tools write under `src/` only for
`--save-case`. Device requirements are in `references/devices/vocabulary.md`.
