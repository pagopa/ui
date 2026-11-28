# Checkbox and Radio: do the focused variants carry one name and one perimeter?

- Type: design
- Issue: https://github.com/pagopa/ui/issues/144
- Status: open
- Ratified defaults: [docs/design-defaults.md](../design-defaults.md) — apply §2–§4 before asking; what they do not decide stays open here.
- Decision owner: @gunzip
- Preview: none

## Context

Nothing the library renders changes: both focused rows are drawn, mapped to the focused state of the checkbox and of the radio, and pass their parity checks. The cost sits in the source: the parity corpus keys every case by node id and every subject by layer name, so a row called `Status=Status6` and a shape that belongs to no variant make the recorded evidence ambiguous, and a reviewer has to read the node tree to tell a deliberate drawing from a slip.

## Options

- A — Leave the source as the drift left it: the library keeps mapping by node id; the two focused rows stay the only ones whose name does not read `Focused`, and the stray `Ellipse 6` stays in the radio row where it can be read as part of the drawing.
- B — One name and one perimeter per focused row: the variants read like their siblings, the six rows of each set name their indicator the same way, and the perimeter is drawn once, inside the indicator.

## Decision
