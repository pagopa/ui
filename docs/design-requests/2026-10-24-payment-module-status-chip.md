# Design request — PaymentModule: is status a chip or a suggestion line?

- Type: design
- Issue: https://github.com/pagopa/ui/issues/36
- Status: open
- Decision owner: @gunzip
- Preview: pending — the previews session adds the option stories and the PR #19 index
- Figma node: `11133:16142` (`PaymentModule`)
- Comment thread: `1847814302` (2026-07-17)

## Context

The Figma demo draws a status Chip whose size follows a status tooltip. The
React module has no chip slot; its `metadata` values accept `ReactNode`, and its
`suggestion` line carries the recommendation. The thread asks whether the status
must exist and who owns the chip size.

## Options

1. **Add a first-class chip prop.** The module owns the chip size and tooltip.
2. **Keep the status product-owned.** The product passes a Chip through the
   `metadata` value. This is the recommendation.
3. **Use only the suggestion line.** No chip.

## Decision

Pending. Option 2 is the recommendation.
