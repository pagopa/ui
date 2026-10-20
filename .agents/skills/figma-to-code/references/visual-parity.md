# Visual parity — render first

A component is aligned when **its rendered story matches the source variant**:
same width, same state, same anatomy, same tokens, measured and seen. Reading the
code, a green suite or a component-set thumbnail does not establish it.
The commands are in [parity-tooling.md](parity-tooling.md); devices in
[devices.md](devices.md).

## Inputs

- `figma.snapshot` current. When it is missing or older than the last Figma
  change, stop and ask the person to export it (the credentials are theirs);
  without it `check` exits 2.
- Storybook on `storybook.url`; start `pnpm storybook` when nothing answers. A
  file created while Storybook runs is not in the Tailwind scan until
  `touch src/index.css`.
- The work list: `pnpm nx run pagopa-ui-cli:figma:parity:queue --status pending` (never-closed or
  re-opened nodes), `--status implemented` (re-verification: report what moved,
  the decisions stay), `--unmapped` (nodes without a committed case),
  `--node <id>` or `--case <caseId>` for one.
- The scope is the person's: by default a **wave** of three nodes, the highest in
  `implementationOrder` first, each finished before the next. A named list or the
  whole queue only when they say so. "Re-check everything mapped" is not a wave:
  `pnpm nx run pagopa-ui-cli:figma:parity:capture` over the committed cases, then `report`, and only
  what moved enters the loop. "Mapping only" calibrates and saves cases without
  touching components or the registry.

**Done when** the snapshot is current, Storybook answers, and the node ids are
written down with the variants they capture and, for a device axis, the declared
devices (one iteration each).

## The loop (per node, per declared device)

1. **Source numbers.** `node packages/ui-cli/src/cli.ts parity source <nodeId> --compact
   --depth 3`, `--json` for the variant list. Anatomy questions:
   `get_screenshot` (read-only). Read the face from `fontPostScriptName`: the
   REST `fontWeight` can say 500 for a Semibold face.
   **Done when** the variant's geometry and type are written down.
2. **First capture.** `pnpm nx run pagopa-ui-cli:figma:parity:check` with `--state` (it names the
   case id `<node>-<state>-<device>`), `--expect-state`, the source width and
   the source artboard `--height`. Exit 2 is missing evidence, not a delta: fix
   the width, viewport, height or state evidence and run again.
   **Done when** the run reports deltas (not exit 2) and the `capture` block
   reads devicePixelRatio 1, ruler 100px and the expected root width.
3. **Compare both ways.** The images and the numbers (box, padding, gap, radius,
   borders, fills, font size, line height, weight, colour, icon box). Tolerance
   is 2px at the default font size; anything structural — a missing slot, a
   label on the wrong edge, an off-token colour, the wrong face, a swapped stack —
   is a delta however small the pixels.
4. **Close every delta**, one of three ways: a token-ladder fix in the
   component; `--residue "path=reason"` for a deliberate adaptation;
   `--ignore <path>` for a mapping artifact. A subject off on every edge is a
   mapping defect: fix the case, not the component. **Three fix passes per
   case**, then stop and report. Never accept a deviation because it looks
   right.
   **Done when** no delta is left unexplained.
5. **Composition.** `--compare-offset` (plus `--compare-box height` for text
   layers) with `--strict`. Clean → keep it in the case. Explained by a recorded
   adaptation → leave it off and save a `note` with the measurement. Neither →
   a finding for the person. The composition-order advisory is the only check
   that catches a swapped stack whose sizes match: keep it on, or check the order
   by hand.
   **Done when** the case enables the composition check or carries its note.
6. **Save.** `--save-case` (and `--note "reviewed: …"`); the command line is
   never the record.
   **Done when** `pnpm nx run pagopa-ui-cli:figma:parity:check --case <id>` reproduces the node.

## Close the wave

- `pnpm nx run pagopa-ui-cli:figma:parity:capture` over the committed cases, then
  `pnpm nx run pagopa-ui-cli:figma:parity:report --wave <date>-alignment` for the wave record.
- Registry for the verified nodes only ([new-from-figma.md](new-from-figma.md)
  step 6), then `pnpm nx run pagopa-ui:figma:check`.

Per node, done means: the preflight passes; every delta is fixed, a residue or
an ignore; `--strict` is clean or the note explains it; the case reproduces;
every declared device has a case or a reasoned exception; the registry covers
only verified nodes and `figma:check` is green.

## The token ladder

Every visual value, in order:

1. an existing token (semantic colour, type class, spacing or radius step);
2. the nearest compatible token within 2px — keep it and record the residue;
3. a recurring source value earns a token through `tokens.manifest`; the change
   lands once in the token layer.

An arbitrary `[Npx]` utility or a local override that closes a 1–2px gap hides
the difference and breaks the scale. Not gaps, and source-exact: the frame size
of the source frame itself (forced by the capture, never baked into the
component) and source artwork geometry. Radius steps are 8/16/24. A colour shared
by several tokens matches the `token` class by value only: pick the semantic
token deliberately.

## Traps

### Typography

- **The pinned source's `500` is the Semibold face (CSS 600), `600` is Bold
  (700).** The bundle has no 500 face and `font-synthesis: none`, so
  `font-medium` renders Regular: always suspect it. A test asserting
  `fontWeight === "500"` freezes the wrong face; assert the mapped value.
- A type-scale token carries its own weight: no weight override on top of it.
- Widths measured under an old font substitute are history: re-measure, never
  re-approve.

### Targets and rhythm

- **Expand, never inflate.** A source-exact visual box stays source-exact; the
  44px target (48px for buttons) is an invisible `::after` built from existing
  inset utilities (`after:absolute after:-inset-2.5` on a 24px box,
  `after:-inset-y-3` on a 20–22px text line; grep `after:-inset` for the
  pattern). `min-h-11` on a 24px row is drift, not accessibility.
- Keep horizontal expansion out of scroll containers: it feeds `scrollWidth` and
  fails reflow in WebKit and Firefox; a vertical `-inset-y-*` is usually enough.
- Icon slots wrapping inline children are `flex` with a fixed size, or the line
  box adds 4–7px.
- A divider must not double the parent's bottom padding.

### The story fixture is part of the contract

- Frame the fixture at the exact source width with `max-w-full`. A
  `min(52rem, …)` or `max-w-*` wrapper caps the capture; an inflated action in
  the fixture reads as component drift.
- When the forced width exceeds the viewport, use `layout: "fullscreen"`: the
  centred `#storybook-root` shrinks and the preflight exits 2.
- A story root holding only `position: fixed` content has no box: render it
  fullscreen with a page-surface decorator.
- Open portal overlays with `--click` on the trigger, not a `play()` that races
  the probe; `[role="dialog"]` is the `--expect-state open` evidence.
- Never put `\n` inside a JSX attribute string.
- When fixture copy wraps differently from the mockup, record the height and
  offset residues; do not change the copy to match.

### Field labels: notch vs inset

Source fields keep the label inside the control when empty and unfocused
(centred for single-line fields, top-aligned for multi-line ones) and float it
into the top-border notch when focused or filled. A label that stays inset while
filled is a delta, not a variant.

### Paint

- Elevation comes only from the Figma shadow scale, never Tailwind
  `shadow-md/lg/xl`.
- Never apply a source group's 50% opacity to text; fade only the artwork.
- Round source geometry to the nearest existing token and record the delta.
- When a mockup hides or overflows its own layers, compare against the visible
  composition and record a residue.
- Before calling a source artwork missing, search the artwork catalogue under
  every name.

### Evidence

- A whole-set screenshot is a contact sheet: scaled down, it cannot decide
  typography or 1–2px geometry. Read the variant's numbers; crop or zoom when the
  question is visual.
- A saved render can predate the pin; the pinned export is the truth. Re-shoot
  with `get_screenshot` when they disagree; the Design-panel thumbnail is never
  evidence.

## Reporting

Per component: story id · source PNG · render PNG · source vs render numbers ·
state (`verified` | `fixed` | `review-required`) · residues with their reasons.
"Aligned" without the numbers and both images is an unverified claim.
