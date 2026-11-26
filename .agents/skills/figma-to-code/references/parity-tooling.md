# Parity tooling

Signatures come from `pnpm ui-cli parity <command> --help`. Three verbs, no
fourth: `source` prints a node's pinned spec, `render` probes one story, `check`
compares the two. Nothing is written — no case, no bundle, no baseline — so the
verdict belongs to the session that asked for it and a later session must ask
again. `check` and `source` read `--input`, else `figma.snapshot`; `check` and
`render` need Storybook (`STORYBOOK_URL=<url>`, default `http://localhost:6006`).
`--node <id> --device <name>` narrows a run to one declared device. The source
reader is the only reader of the source; `check --screenshot <file>` renders to
look at; trust `check` over the render module's `--root` (which forces
`display:block`).

## Exit codes

`0` pass (declared residues may remain) · `1` violation · `2` cannot run (usage,
missing input, refused capture) · `3` reconciliation required. A refused capture
is never a pass, and an aggregate code certifies no row. The default profile is
the reviewed one: mapped deltas and residues decide, composition evidence is an
`advisory`; `--strict` promotes advisories.

## Reading the result

`deltas` carry the token class (`token|near-token|inline`) against the token
vocabulary; `advisories` are offsets from the declared origin and inverted sibling
order; `responsive` reports `clipped`, `escaped`, `truncated`, the band rows,
advisory `scrollable` and, under a `layoutScope`, `scope viewport|container:
verified|NOT confirmed`; `residues` are declared deltas with a reason; `capture`
reports devicePixelRatio, the ruler, forced root width, kept focus and offset
origin. Text compares only with `--compare-text`: the fixture owns its copy.

Read `deltas` as a question, not a verdict — a difference can be the
implementation being wrong or the source having moved. Report the numbers you
saw to whoever reviews the change: they exist only in your session.

## Capturing a state

Hardened before any number: motion off, caret and scrollbars hidden, fonts
awaited, focus blurred (`--keep-focus`), pointer parked; a scaled capture exits 2.
`--viewport` follows the frame width, `--height` the artboard; a mockup wider than
the device viewport raises the viewport below the next breakpoint, and Storybook's
minimum is 320. `--expect-state <state>` exits 2 when the story does not show it;
the generic predicates are `enabled`, `disabled`, `focused`, `filled`, `empty`,
`open`, `error`, else `--state-evidence <selector>`. No Figma-label → prop map
exists: the state is checked, never inferred. Always pass `--state`: it names the
state being compared.

For pointer hover, set `--expect-state hover` and make `--state-evidence` end in
`:hover`, for example `--state-evidence '#storybook-root .switch-control:hover'`.
The Storybook adapter removes the suffix to hover the target; the DOM probe uses
the full selector as state evidence.

## Devices

A node whose set declares a device axis is compared once per declared device:
`--device <name>` resolves through the device vocabulary and sets the width and
the viewport together, so the same story is measured at the declared width
rather than at a width you chose. Without `--device` the run measures the
story's own frame and reports the responsive bands.

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

No case file, no evidence slice, no manifest, no pinned image, no cap, no
`--save-case`, no `--saved`, no `--case`, no queue and no proposal flow: a
comparison leaves the tree as it found it, and `check` cannot be silenced by
writing a file. No PNG pixel diff or percentage budget either — the comparison
is 2px per property plus structural deltas, so a render-to-render regression is
the visual suite's question, not this one. Device requirements are in
`references/devices/vocabulary.md`.
