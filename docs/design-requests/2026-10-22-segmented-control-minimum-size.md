# Is the segmented control's `Size=Minimum` a compact composition to implement?

- Node: [ButtonGroup](https://www.figma.com/design/pvhsJpPGQbEwNLiyP7BOIw?node-id=1293-8394) (`1293:8394`)
- Page: • Button Group
- Type: design
- Issue: https://github.com/pagopa/ui/issues/43
- Preview: https://proud-wave-056050103-19.westeurope.5.azurestaticapps.net/?path=/story/reviews-segmented-control-minimum-size--option-a / https://proud-wave-056050103-19.westeurope.5.azurestaticapps.net/?path=/story/reviews-segmented-control-minimum-size--option-b / https://proud-wave-056050103-19.westeurope.5.azurestaticapps.net/?path=/story/reviews-segmented-control-minimum-size--option-c
- Status: open — the node stays `pending`
- Decision owner: Figma design owner

## Context

`SegmentedControl` is the pill of mutually exclusive segments. Its
`Size=Default` variant is reviewed and matches the source: a 64px pill with
8px padding, an 8px gap between five 140x48 segments, the selected segment in
the primary fill with the 16/22 Semibold label.

The same set declares `Size=Minimum` (`1293:8395`), a 212x64 pill with the
selected label segment (140x48) beside a 48x48 segment that carries only a
`chevron` icon; the label of the second segment is hidden. No screen in the
file instantiates either variant, so the source does not show where the
minimum form is used.

## The open question

- Is `Size=Minimum` the narrow-width composition of the same control — the
  label collapses to one selected segment plus an overflow/next segment — or
  an explicit compact mode a caller chooses in a tight surface?
- If it is the narrow composition, what does the icon-only segment do: open
  the remaining choices, scroll the pill, or something else? The source draws
  the chevron but no popup.
- The library currently answers the narrow case by keeping every label and
  truncating it (`min-w-0 truncate` at a 320px viewport). Should that stay, or
  does the source's compact form replace it?

## Why it matters

`Size=Minimum` needs a public API surface the component does not have: the
`items` label is a plain string and there is no icon-only or compact mode. A
guess would either add a prop without a contract or change the narrow
behaviour the registry note records today. Until the answer arrives the node
stays `pending`; the `Size=Default` case is committed
(`1293-8394-default-selected`) and the `Size=Minimum` variant has no case.
Because the change would extend the public API, it is not implemented from the
source alone.

## Options

- **Compact mode via an item-level option** — an item can be icon-only with an
  accessible name; the caller places it. The API grows by one optional field
  and the source composition is reproduced exactly; the narrow behaviour stays
  the caller's choice.
- **Automatic narrow composition** — below a breakpoint the control collapses
  the trailing segments into the chevron segment. No API change, but the
  control must own the popup/scroll behaviour the source does not draw.
- **Keep truncation** — treat `Size=Minimum` as an illustrative compact form,
  not a contract; the library keeps every label announced and truncates it.
  No work, and the source variant stays unimplemented.

## What is already fixed

The `Size=Default` composition is reviewed and verified: the 64px pill, the
8px padding and segment gap, the 140x48 segments with 24px inline insets, the
16/22 Semibold label, the primary selected fill and `aria-pressed`. The shape
is a full pill on both the group and the segments.
