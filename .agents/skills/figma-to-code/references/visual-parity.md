# Visual parity — render first

A component is aligned when **its rendered story matches the source variant**:
same width, same state, same anatomy, same tokens, measured and seen. Reading the
code, a green suite or a component-set thumbnail does not establish it. Commands,
exit codes and result fields are in [parity-tooling.md](parity-tooling.md).

## Preflight

- A current source: the pinned snapshot, an explicit input, or a committed
  evidence slice. Without usable evidence the run exits 2; refresh through the
  delta route.
- Storybook on `storybook.url`; start `pnpm nx run pagopa-ui-storybook:storybook`
  if nothing answers. A concurrent session serves its own copy with `PORT=6007`
  and points the CLI at it with `STORYBOOK_URL=http://localhost:6007`. A new
  source file may need `tokens.stylesheet` touched to refresh the Tailwind scan.
- The scope is the person's: a **wave** of three nodes, highest in
  `implementationOrder` first, each finished before the next. "Re-check
  everything mapped" is not a wave: capture each mapped node into its own `--out`;
  only what moved enters the loop.

**Done when** the evidence is current, Storybook answers, and the node ids are
written down with their variants and declared devices.

## The loop (per node, per declared device)

1. **Source numbers.** `parity source <nodeId> --compact --depth 3`, `--json` for
   the variant list, `--png` for the pinned source image.
2. **First capture.** Name the state, expect it, the source width, the artboard
   height and the compare offset, with `--strict` on this first run: strict is the
   only pass that catches a swapped stack whose sizes match. Exit 2 is missing
   evidence, not a delta.
3. **Compare both ways.** The numbers and the images, at native size and with
   magnified crops of seams, notches and joined edges. Anything structural — a
   missing slot, a wrong edge, an off-token colour, the wrong face, a swapped
   stack — is a delta however small.
4. **Close every delta**: a token-ladder fix in the component, `--residue
   "<path>=<reason>"` for a deliberate adaptation, or `--ignore <path>` for a
   mapping artifact; a subject off on every edge is a mapping defect. **Three fix
   passes per case**, then stop and report. Never accept a deviation because it
   looks right.
5. **Save.** `--save-case --note "reviewed: …"`; the command line is never the
   record; a `cases --sync` draft never counts as coverage. **Done when**
   `parity check --case <id>` reproduces the node.

## Close the wave

`parity capture --saved --node <id> --out <dir>` then `parity report --dir <dir>
--wave <date>-<node-id>-alignment` per node, a distinct wave name each. Registry
for the verified nodes only, then `pnpm nx run pagopa-ui:check:catalogue`.

## What a reviewer decides

- **Evidence.** A whole-set screenshot is a contact sheet: scaled down it cannot
  decide typography or 1–2px geometry. The pinned export is the truth; a saved
  render can predate it and the Design-panel thumbnail is never evidence. Numbers
  read geometry, paint and type, not text opacity: on a muted or disabled state
  read the image, because a faded title is a delta even when every measured
  property matches. For a seam-sensitive fix add a focused regression that fails
  on the defect.
- **Type and paint.** A type-scale token carries its own weight; widths measured
  under an old font substitute are history. Elevation comes only from the Figma
  shadow scale, and a group's 50% opacity fades artwork, never text. Expand, never
  inflate: the 44px target is an invisible `::after`, never `min-h-11` on a 24px
  row.
- **The fixture is part of the contract.** Frame it at the exact source width with
  `max-w-full`; a capped wrapper makes the capture lie. When fixture copy wraps
  differently, record the height and offset residues, never change the copy.
- **What a residue is.** A declared delta with a reason, visible and not blocking:
  a deliberate adaptation, or a mockup that hides or overflows its own layers.
  Anything a token or class could fix is a fix.
