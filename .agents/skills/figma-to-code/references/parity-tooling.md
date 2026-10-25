# Parity tooling — the commands of the loop

`pnpm --filter pagopa-ui-cli run cli -- parity` with no arguments prints every subcommand and flag; read it
there. This file says what each command proves and how to read it. `check` and
`source` read `--input`, else `figma.snapshot`, else the committed evidence
slice; `check` and `capture` also need Storybook on `storybook.url`
(`STORYBOOK_URL=<url>` for another one). The default case corpus is
`catalog.parityCases` (`--cases <file>` overrides it).

Every row is a target of `pagopa-ui-cli`: run it as
`pnpm nx run pagopa-ui-cli:<target> [flags]`.

## Commands

| Target                                             | Proves                                                                                                                                                       |
| -------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `figma:devices [--check]`                          | every declared axis value resolves through `catalog.devicePolicy` (no snapshot, no browser)                                                                   |
| `figma:parity:queue`                               | the work list: per registry node its story ids, Design-panel nodes and undeclared exports; `--unmapped`, `--coverage`, `--uncovered` (the device burn-down) |
| `figma:parity:check --node <id>` / `--case <caseId>` | source numbers, render probe, classified diff, responsive verdict and capture preflight for one case                                                         |
| `figma:parity:check --node <id> --devices`         | every declared device's committed case in one table; exit 1 when a device has no reviewed case or its case fails                                            |
| `figma:parity:capture`                             | a whole wave: per case the report, probe and PNG under `figma.parityOut`, plus `summary.json`                                                                |
| `figma:parity:cases --sync`                        | proposes the missing device cases and the variants no reviewed case points at, as drafts                                                                     |
| `figma:parity:verify`                              | the case corpus, the device coverage and the evidence bundle, hermetically (no snapshot, no browser); exit 1 on errors, 0 with warnings                      |
| `figma:parity:evidence --write` / `--check`        | the offline bundle: `--write` refreshes the slice, the pinned PNGs and the manifest (token + snapshot); `--check` proves they still match the corpus         |
| `figma:parity:report --wave <name>`                | the wave record: counts, verdicts, advisories, residues, open deltas, the re-run command per case                                                            |
| `source <nodeId>` (via `pnpm --filter pagopa-ui-cli run cli -- parity source <nodeId>`) | the source spec `check` diffs against (`--compact` anatomy, `--json`, `--depth N`); `--png [file]` writes the pinned variant render (needs the token and the pinned snapshot), default `.figma/parity/source/<nodeId>.png` |
| `render --story <storyId>` (via `pnpm --filter pagopa-ui-cli run cli -- parity render --story <storyId>`) | a render probe alone; `--tree [--depth N]` prints the DOM anatomy (box, position, padding, gap) of the root's descendants, the render-side counterpart of `source --compact` |

`source.mjs` is the only reader of the source: never grow a second reader from a
scratch file. A render to look at is `check` with `--screenshot <file>` (the same
preflight as the numbers); the source render is the pinned PNG or
`get_screenshot`. Trust `figma:parity:check` over `render.mjs --root`: the latter
forces `display:block` on the root, `check` forces only `#storybook-root`.

## Rules the scripts encode

One owner per rule: `source.mjs` (the spec), `render.mjs` (capture, probe,
preflight), `diff.mjs` (classification). Tests and fixtures sit beside them and
run in `pnpm nx run pagopa-ui-cli:test` with no snapshot and no browser.

- Tolerance 2px. Weight law: source `500` → CSS 600, `600` → 700, so a 400 face
  is always a delta.
- A ≥44px target counts when it comes from the invisible `::after` expansion.
- A borderless render's inset ring (an inset box-shadow with no offset and no
  blur) is its stroke, the CSS form of a Figma inside stroke.
- Token class against `tokens.generatedCss` and `tokens.manifest`; offsets
  against the 4px spacing scale.
- Centered-layout trap: Storybook's centered layout adds 16px `border-box`
  padding, so the capture forces it to 0 before measuring.
- `args` trap: the Storybook `args` URL parameter silently drops values with
  spaces, so apply states with `--fill`/`--click`, not args.

## Exit codes and profiles

`0` verified (residues allowed) · `1` deltas above tolerance · `2` invalid input,
missing snapshot or Storybook, a stale evidence slice, or a capture the preflight
refused (`capture-mismatch`, `state-mismatch`). Missing evidence is never a pass.

The default profile is the reviewed one: mapped property deltas and residues
decide; composition evidence (offsets, sibling order) is an `advisory`.
`--strict` promotes advisories into the verdict — for a dedicated run on a case
whose mapping is calibrated (`compareOffset`), not for the everyday loop.

## Reading the result

- `deltas`: what still needs a fix; numeric ones carry the token class
  (`token`, `near-token`, `inline`) against `tokens.generatedCss` and
  `tokens.manifest` (offsets against the 4px spacing scale).
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

`catalog.parityCases` holds one entry per compared variant and device: `id`,
story, width/viewport/height, `device`, `layoutScope`, selectors, residues,
flags, `note`. `--save-case` writes it back in canonical field order; never
hand-edit a mapping into a report. After a save, run the package formatter
(`pnpm nx run pagopa-ui:fmt`): the canonical file is valid but not formatted,
and `fmt:check` fails on it. `pnpm nx run pagopa-ui-cli:test` validates every case
hermetically (node in the inventory, story among the declared `storyExports`,
non-empty selectors and residue reasons, no unknown fields).

The corpus only gains fields: every existing id, residue and verdict keeps
reproducing with `--case <id>`. `--save-case` rewrites the whole file in
canonical order, so commit a reorder on its own, apart from new cases.

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
and probes stay in `figma.parityOut`. Story tests run at one viewport, so device
verification is `check --devices` and `library:check`, never a `play()` test that
does not set its own viewport.
