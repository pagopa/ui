# Parity tooling — evidence and case mapping

Use `pnpm ui-cli parity <command> --help` for signatures, not a cached command
inventory. For one node, `align --node <id>` supplies the work order and exact
check lines for each declared device; follow them, inspect the images, then
save reviewed cases with `check --save-case`. `check` and `source`
read `--input`, else `figma.snapshot`, else the committed evidence
slice; `check` and `capture` also need Storybook on `storybook.url`
(`STORYBOOK_URL=<url>` for another one). The default case corpus is
`catalog.parityCases` (`--cases <file>` overrides it).

`pnpm ui-cli parity check --node <id> --saved` reproduces all committed cases,
including multiple states per device, and checks device coverage.
`--devices` checks declared-device cases; it is not a substitute for additional
saved states. `capture --saved --node <id> --dry-run` lists saved case IDs.

The source reader is the only reader of the source: never grow a second one
from a scratch file. A render to look at is `check --screenshot <file>` (same
preflight); the source render is the pinned PNG or `get_screenshot`. Trust
`parity check` over the render module's `--root`: the latter forces
`display:block`, `check` only `#storybook-root`.

## Rules the scripts encode

One owner per rule: the source reader (the spec), the render module (capture,
probe, preflight), the diff module (classification). Tests and fixtures sit
beside them and run in `pnpm nx run pagopa-ui-cli:test` with no snapshot and no
browser.

The check's messages name the rest: 2px tolerance and the
[token/type contract](tokens.md#the-component-class-contract); a ≥44px target
only when the invisible `::after` expands it; a borderless render's inset ring
(an inset box-shadow with no offset or blur) as its stroke; token classes
against `tokens.generatedCss` and `tokens.manifest`, offsets against the 4px
scale — the capture forces Storybook's 16px `border-box` padding to 0. Apply states with `--fill`/`--click`: the Storybook `args` URL parameter
silently drops values with spaces.

## Exit codes and profiles

`0` pass (declared residues may remain) · `1` violation/failure ·
`2` cannot run (usage, missing input/evidence, stale slice or refused capture) ·
`3` reconciliation required (Figma drift or parity delta above tolerance).
Missing evidence is never a pass. Read each row of a batched result: the
aggregate code does not certify a failed, skipped or unavailable row.

The default profile is the reviewed one: mapped property deltas and residues
decide; composition evidence (offsets, sibling order) is an `advisory`.
`--strict` promotes advisories into the verdict — for a calibrated mapping
(`compareOffset`), not the everyday loop.

## Reading the result

- `deltas`: what still needs a fix; numeric ones carry the token class
  (`token`, `near-token`, `inline`) against the token vocabulary.
- `advisories`: offsets from the declared origin, inverted sibling order.
- `responsive`: `clipped`, `escaped`, `truncated`, the band rows and
  `scrollable` (advisory). All but `scrollable` are deltas; a deliberate
  adaptation is a residue. With a declared `layoutScope`, also
  `scope viewport|container: verified|NOT confirmed`.
- `residues`: declared deltas with a reason; visible, not blocking.
- `capture`: devicePixelRatio, the 100px ruler, the forced root width, kept
  focus, the offset origin, the state evidence.
- `notes` (`--notes`): matched values and the automatic rules (a centred axis
  keeps the source inset when the box height matches; a leaf does not own its
  container's gap).
- Text is compared only with `--compare-text`: the fixture owns its copy.

## Capturing a state

The capture is hardened before any number: motion off, caret and scrollbars
hidden, fonts awaited, focus blurred (`--keep-focus` keeps it), pointer parked. A
scaled capture or one that missed the forced width exits 2.

- `--viewport` follows the source frame width, `--height` the artboard height.
- If the source mockup is wider than the device viewport, raise the viewport and
  stay below the next breakpoint. A mobile frame narrower than 320 is not a
  device width: Storybook's minimum is 320, capture there.
- `--expect-state <state>` exits 2 when the story does not show it (a filled
  source against an empty story). The generic predicates are `enabled`,
  `disabled`, `focused`, `filled`, `empty`, `open` and `error`; a state outside
  them gets `--state-evidence <selector>`. No Figma-label → prop map exists: the
  state is checked, never inferred.
- Always pass `--state`: it names the case.

## The case corpus

`catalog.parityCases` records compared variants, states, devices, dimensions,
scope, selectors and reasoned residues. `--save-case` owns its formatted
canonical write; inspect the diff and reproduce existing IDs with `--case`.
`pnpm ui-cli check parity` validates the corpus, device coverage and evidence
hermetically; `pnpm ui-cli check evidence` validates the bundle alone.
To refresh stale slices and pinned images use
`pnpm ui-cli update evidence --input <snapshot>` with a token. Neither
hermetic check substitutes for capturing a rendered story.

A case created with `--node` has no note: attach one with `--note`. A
`cases --sync` draft (`note: "draft — refine the mapping"`) never counts as
coverage until a reviewed render replaces its note (`--save-case --note
"reviewed: …"`). `cases --sync` proposes one draft per missing device and one
per variant no reviewed case points at, from one sibling; a draft pins the
variant, its device and its width. A node with no reviewed case at all starts
with one manual `check --node` capture: there is no sibling to propose from.

When the source is the committed evidence slice, `--case` checks the manifest's
version and design fingerprint against the committed inventory before the
capture: a slice that moved with the inventory is a rerun, a slice that did not
is exit 2 (stale evidence) until it is refreshed.

`capture --saved --node <id>` uses the same case mapping and evidence guard as
`check --case`; its summary names every case and flags drafts. An absent case,
missing story, capture error or draft cannot verify the node. Without `--saved`,
`capture --node` uses the registry wave's status filter and first story, not the
committed cases. `queue --node` likewise lists registry targets, not case IDs.

## Case mapping

`--node` finds the registry target (module, export, story, `storyExports`). A
node the file publishes without variants — a plain component — is its own single
variant: `--state` names the case, `--variant` takes the node id.

- `--root` is the element compared with the variant; `--subject-root <layer>`
  maps the component's own layer, never the mockup wrapper;
  `--subject "<layer>=<selector>"` adds a nested subject. Subjects are declared
  per device: a missing layer exits 2. Subject paths are written key first
  (`X.offset.top`). The root subject is `field`: its deltas are
  `field.<property>`, and `--ignore gap` or `--residue "box.height=…"` may
  omit the prefix.
- A case that maps only the root proves the variant's outer box, not its inner
  padding or gap: add a subject for the frames that drive the rhythm, or record
  the adaptation in the note.
- Selectors run over the whole document: scope them under `#storybook-root`.
  Use `:nth-of-type`, not `:nth-child`, when separators sit between items.
- `namedLeaves` match exact layer names, emoji and `[ID: …]` included.
- A `TEXT` subject compares the vertical offset only; `--compare-box height`
  adds its height (the label-float signal), `full` its width too.
- Mapping artifacts are `--ignore`d, never fixed in the component: the phantom
  gap of a single-child frame; an inset or gap the DOM puts on the inner row; a
  nested frame whose child the DOM keeps as a sibling (ignore its height only
  when the gap equals child + gap exactly).
- An imprecise first selector gives honest but useless deltas: refine the
  mapping once and save it.

## What does not exist

No PNG pixel diff or percentage budget (the gate is 2px per property plus the
structural deltas); no workbench, packets, approval files or visual-contract
corpus; no `refs` or pixel baselines — after a code change re-run
`check`. The parity tools never write under `src/` except `--save-case`; renders
and probes stay in `figma.parityOut`. Device/story-frame requirements are in
[devices.md](devices.md).
