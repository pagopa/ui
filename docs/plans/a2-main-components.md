# A2 — Coverage of the main components

Common rules: [README.md](./README.md). Source: assessment §5, actions A and G.
Depends on **C**, **D** and **A1** already in `main` (it touches the same
components as C and D and uses the tools of A1). Can run with E.

## Goal

Bring the main components to the "done" state: a comparison with Figma verified
for every declared variant and device, and accessibility according to the table
and the common tests of D. Then carry on with the rest of the queue.

## Decisions already made

- A component is **done** when it satisfies all of: (1) a verified comparison
  case for every declared device and for the visual variants, with any remaining
  differences justified (or an exception recorded with a reason); (2) the common
  tests for its type green and its a11y table row filled in; (3) the full check
  green; (4) no new magic value (the check of C).
- Historical nodes are reviewed **one at a time**, never in bulk.
- Alignments are not invented: the proof is the render comparison, not reading
  the code. Differences that require a design decision are flagged, not absorbed.
- Work with the `figma-to-code` skill, and choose props with the convention of B.

## Main components, in order

1. Button
2. TextField and TextArea
3. Select, Checkbox, Radio, Switch
4. Alert, Banner
5. Dialog, Drawer
6. Tabs, Table, Pagination, Breadcrumbs
7. Header, Footer
8. Cookies, SkipToMainContent

For every entry, use `pnpm figma:parity:queue` and `pnpm figma:parity:queue
--uncovered` to discover the nodes, variants and devices to cover (the node
names come from the registry, not from this list). The most depended-upon
`pending` node (a component other components depend on) goes first.

## Scope and files

Ownership: the components listed above in `src/components/**`, their stories,
`src/catalog/figma/parity-cases.json`, the node notes in `registry.json`
(state, note and deviations). Do not modify the tools (A1), the tokens (C) or
the common tests (D): if they are missing, flag it.

## Procedure (per node)

1. Read the state (`pnpm figma:triage`) and the existing cases
   (`pnpm figma:parity:queue`).
2. Propose the missing cases (`pnpm figma:parity:cases --sync --node <id>
   --dry-run`), then complete them by giving the story for every row.
3. Capture and compare (`pnpm figma:parity:check --case <id>`), fix the
   component, repeat. At most three attempts per case: beyond that, record the
   case as a reasoned residue and flag it.
4. Run the common tests of D and the foundation check of C.
5. Update `registry.json` (state `implemented` only with the proof) and
   `CHANGELOG.md` if rendering or the API change.
6. One commit per node.

Every session works on at most one family of the list at a time, and may do more
than one only if the nodes are independent.

## Acceptance

For every node: the commands of steps 3 and 4 green, the full check green, and
one report row with verified cases, reasoned residues and findings. For the
session: coverage before/after (`figma:check` and `queue --uncovered`), and the
number of "done" main components out of the total.

## To ask the person

- Differences that the comparison attributes to Figma itself (off-scale values,
  an axis with an unresolved value): they go to design, they are not absorbed.
- The tablet case of Feedback Page (the frame composition `SM Tablet` is not
  declared by the state sets): it needs a component decision.

## Out of scope

- New tools, new process layers.
- Non-main components, until the list above is closed.
