# Design request — TableList: should the loading state be a skeleton?

- Type: design
- Issue: https://github.com/pagopa/ui/issues/29
- Status: open
- Decision owner: @gunzip
- Preview: https://proud-wave-056050103-19.westeurope.5.azurestaticapps.net/?path=/story/reviews-table-list-skeleton--option-a / https://proud-wave-056050103-19.westeurope.5.azurestaticapps.net/?path=/story/reviews-table-list-skeleton--option-b / https://proud-wave-056050103-19.westeurope.5.azurestaticapps.net/?path=/story/reviews-table-list-skeleton--option-c
- Figma node: `9520:2537` (`TableListItem`)
- Comment thread: `1813923067` (2026-06-23)

## Context

`TableList` composes `TableListItem` rows and optionally a pagination slot. The
rows usually arrive from an API. Today the list has no loading state, so the
panel collapses and then jumps when the rows arrive. The source set declares only
`Layout=Desktop|Mobile|Any`; there is no `State=Skeleton`. `TableCellRow` has a
skeleton state, but that is the table cell row, not this list.

## Options

1. **No skeleton in the design system.** Products compose `Skeleton` inside their
   own row. No new API.
2. **`TableList` owns the skeleton.** The list renders three placeholder rows;
   each row keeps the label/value columns and a 48px action placeholder. The
   list gains a `loading` prop. This is the recommendation.
3. **Only `TableListItem` owns the skeleton.** The product decides the row count.

## Decision

Pending. Option 2 is the recommendation.
