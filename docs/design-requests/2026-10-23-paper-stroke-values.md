# Design request — Paper stroke values

- Card: `I7393:45981;52:895` on the `• Paper 🟢` page (`7295:40450`)
- Type: design
- Issue: https://github.com/pagopa/ui/issues/47
- Preview: https://proud-wave-056050103-19.westeurope.5.azurestaticapps.net/?path=/story/reviews-paper-stroke-values--option-a / https://proud-wave-056050103-19.westeurope.5.azurestaticapps.net/?path=/story/reviews-paper-stroke-values--option-b
- Status: open — the rule stays `conflict` until the values are confirmed
- Decision owner: Figma design owner
- Updated: 23 October 2026 — surfaced by the wave-4 rules import

Date: 23 October 2026. Origin: the component-rules migration
([12-component-rules.md](../plans/improvements/12-component-rules.md)). Figma
was not modified: the evidence below comes from the read-only page tree.

## Why

The consolidated card "Border radius, Padding, Stroke, Elevation" describes the
possible combinations of the `paper` element. It states that the stroke has two
values, `0px` and `16px`. The page drawing contradicts that: the examples are
labelled "Stroke 0 px", "Stroke 1 px", "Stroke custom" and "Top stroke blue",
the cards that carry a stroke use a 1px stroke, and a 16px stroke would consume
the whole 16px padding of the smallest paper.

The other three axes in the card agree with the drawing: border radius 8, 16 or
24px, padding 16 or 24px, elevation always 0.

## Question

Are the stroke values `0` and `1px` (as drawn) or `0` and `16px` (as written)?
If a thicker or inset stroke is a real variant, say which value it uses and
which token carries it.

## Unblock

When the card is corrected, re-mark it as imported into the foundations guide
with the confirmed radius, padding, stroke and elevation values. Until then the
ledger keeps the card as a conflict and the foundations guide does not state a
stroke value.
