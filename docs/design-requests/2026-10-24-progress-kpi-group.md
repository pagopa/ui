# Design request — ProgressKpiGroup: composition or public component?

- Nodes: [ProgressKpiGroup](https://www.figma.com/design/pvhsJpPGQbEwNLiyP7BOIw?node-id=9698-58826) (`9698:58826`, set `excluded`) and
  [ProgressKpiCard](https://www.figma.com/design/pvhsJpPGQbEwNLiyP7BOIw?node-id=12133-82475) (`12133:82475`, `implemented`)
- Page: • Card 🟠 (`392:5292`)
- Rule card: `I9698:58982;52:895` ("Progress KPI card usage")
- Issue: https://github.com/pagopa/ui/issues/22
- Preview: https://proud-wave-056050103-19.westeurope.5.azurestaticapps.net/?path=/story/reviews-progress-kpi-group--option-a / https://proud-wave-056050103-19.westeurope.5.azurestaticapps.net/?path=/story/reviews-progress-kpi-group--option-b / https://proud-wave-056050103-19.westeurope.5.azurestaticapps.net/?path=/story/reviews-progress-kpi-group--option-c
- Status: open — the card is implemented and the rule is in
  `apps/storybook/src/guides/progress-kpi.md`; the group has no implementation
  and the set is `excluded`
- Decision owner: Figma design owner, plus the person for a new public export

## Context

The card rule imported from Figma says:

> Up to four cards per row; on mobile use the mobile variant as a peek carousel,
> never stack; switch the state through the nested instance; the info icon opens
> a tooltip, not a modal.

The card (`ProgressKpi`) implements the state (`completed`), the secondary rows,
the locale and an `info` slot. What does not exist is the **group**: today
`templates/figma/TemplateShell.tsx:167-169` renders three cards in a plain grid,
and no component owns the four-per-row limit or the mobile carousel.

The source set `ProgressKpiGroup` is registered as `excluded`; the rule is
imported anyway, because it binds how the cards are composed.

## The open question

1. **Is the group a public component** (`ProgressKpiGroup`) or a documented
   composition of `ProgressKpi` cards?
2. **If a component:** does it own the whole mobile carousel (scroll-snap, the
   peeking second card, the scroll controls) or only the grid, leaving the
   carousel to the page?
3. **Breakpoints:** the source text names Desktop (`>=900px`, four per row) and
   Mobile (`<900px`, peek carousel). Confirm that 900px is the device boundary,
   not a container width.
4. **Info icon:** the rule says it opens a tooltip. Does the group wire the
   tooltip, or does the caller pass the whole `info` slot (today a `ReactNode`)?
5. **`excluded`:** if the rule is now part of the docs, is `excluded` still the
   right status for the set?

## Options

- **A — public `ProgressKpiGroup`.** A small API (`children` or `items`, plus
  `layout` if the caller may force one): four-up grid above 900, scroll-snap
  carousel with a half-card peek below, no autoplay, keyboard scroll, no
  horizontal page overflow at 320. The card stays single-purpose. This is a new
  public export, so it needs the person's approval on the surface.
- **B — composition only.** Document the grid and the carousel in
  `progress-kpi.md` and add a story that shows both layouts; no export. The
  4-up limit stays a caller rule, which is what the guide says today.
- **C — keep it out.** Keep `excluded` and change the rule to describe the card
  only, removing the group sentence from the guide.

## Why it matters

A mobile carousel that merely scrolls is not accessible by itself: it needs a
reachable first item, no keyboard trap, visible scroll affordance and a
documented alternative when the cards are few. If the answer is "composition",
the guide must say so and the story must show the exact classes; if it is a
component, the a11y contract and the device cases grow with it.

## What is already fixed

- The card (`ProgressKpi`) implements the source card: header, percentage, bar,
  footer, secondary rows, completed state and the `info` slot.
- The group's four-per-row limit and the mobile peek are **not** implemented and
  are the subject of this request.
