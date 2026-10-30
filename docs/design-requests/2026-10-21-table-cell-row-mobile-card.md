# Design request — TableCellRow mobile card: wrapper, component or Table contract

- Type: design
- Issue: https://github.com/pagopa/ui/issues/38
- Status: open — the node stays `pending`
- Decision owner: @gunzip
- Preview: https://proud-wave-056050103-19.westeurope.5.azurestaticapps.net/?path=/story/reviews-table-cell-row-mobile-card--option-a / https://proud-wave-056050103-19.westeurope.5.azurestaticapps.net/?path=/story/reviews-table-cell-row-mobile-card--option-b / https://proud-wave-056050103-19.westeurope.5.azurestaticapps.net/?path=/story/reviews-table-cell-row-mobile-card--option-c

Date: 21 October 2026. Origin: the alignment wave, node
`1344:40672`. Figma was not modified: the measurements below come from the
pinned inventory, the registry note and the current render.

The node stays `pending`; the desktop case is committed, the mobile case is open.
The implementation is
[table-cell-row.tsx](../../packages/pagopa-ui/src/components/data-display/table-cell-row.tsx);
the responsive card is owned by
[table.tsx](../../packages/pagopa-ui/src/components/data-display/table.tsx); the
story is [Table.stories.tsx](../../apps/storybook/src/Table.stories.tsx).

## Why

The source set declares `Device=Desktop` and `Device=Mobile`, but the component
is a row helper: it renders `<TableRow>` with `TableHead`/`TableCell` and has no
card surface of its own. The mobile source is the row drawn as a card. The
current `CellComposition` story renders the desktop row; `SourceMobile` renders
the Table's mobile composition but does not render `TableCellRow`. As a result
`figma:check` refuses a mobile case for this node even though the Table's mobile
case compares the card geometry successfully.

## Evidence

| Item      | Source                                                                                                                         | Current implementation                                                                                                                                                                                                                       |
| --------- | ------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Desktop   | `1344:40652`, 645x48; the cell is 48 tall with `px-4`, the first cell's link is 16/22 600 primary                              | `1344-40672-default-desktop` verifies; residues: the fixture draws two columns against the source's seven fixed cells (114/153/59/59/59/89/112), so the growing first column takes 380.45, and the single-child cell gap is a mapping ignore |
| Mobile    | `1337:75105`, 272x492; the row is a card with labelled values and actions                                                      | mapped against the Table's mobile render it verifies (row 498 against 492, standalone 272 against the table's inset 256, responsive clean)                                                                                                   |
| Ownership | the mobile card is the Table's `@container/table` composition: `TableListField` renders the labelled values and the row stacks | `TableCellRow` has no card surface and no `storyExports` entry that renders it in the card context; `SourceMobile` does not render `TableCellRow`                                                                                            |

The existing registry note already records this: the card is covered by the
Table's mobile case (`1349-22020-default-mobile`); the open piece is whether the
row helper has an honest mobile composition of its own.

## Options

- **A (recommended if the card is a presentation wrapper): a story composition.**
  Add a dedicated `CardComposition`/`SourceMobile` export that renders
  `TableCellRow` inside a 272px card surface, with the labels carried by the
  cell content. The case compares the row inside the card, not a standalone
  272-wide surface. The target export stays `TableCellRow`; no public API
  change. Use this only if that composition reproduces the source card.
- **B: add a card contract to `TableCellRow`.** Add a `variant="card"` or a
  `labels`/`card` prop so the component itself owns the stacked card surface.
  This is a public API change and must follow the prop conventions; it is the
  right choice only if the card is a reusable row contract, not a Table detail.
- **C: exclude the mobile node.** The card is the Table's composition
  (`TableListField` + `@container/table`), already covered by
  `1349-22020-default-mobile`; `TableCellRow` is a desktop row helper. Mark the
  node `excluded` with that reason and keep the desktop case.

## What we are asking for, in short

1. Is the mobile `1337:75105` a wrapper around the row helper (A), a reusable
   row-card contract (B), or the Table's own card composition (C)?
2. If A: confirm that a 272px card surface around `TableCellRow`, with the
   labels in the cell content, is an honest mapping for the source card.
3. If B: name the card slots (labels, actions, status) and confirm the public
   API addition.
4. If C: confirm that the Table's mobile case is the only card contract; the
   node is then excluded with that reason.

## Unblock

After the decision:

- **A:** add the story export, save the mobile case against `1337:75105`, keep
  the desktop case, update the registry note and set `implemented`.
- **B:** implement the card variant/prop, add its story, capture the mobile
  case and update the public API/changelog through the normal decision.
- **C:** set the node `excluded` with the reason, keep the desktop case and
  remove it from the device-coverage work list.
