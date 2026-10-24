# Design request — ProgressKpi: how should a failed completion look?

- Type: design
- Issue: https://github.com/pagopa/ui/issues/30
- Status: open
- Decision owner: @gunzip
- Preview: https://proud-wave-056050103-19.westeurope.5.azurestaticapps.net/?path=/story/reviews-progress-kpi-error--option-a / https://proud-wave-056050103-19.westeurope.5.azurestaticapps.net/?path=/story/reviews-progress-kpi-error--option-b / https://proud-wave-056050103-19.westeurope.5.azurestaticapps.net/?path=/story/reviews-progress-kpi-error--option-c
- Figma node: `9612:3997` (`.ProgressKpiBody`); public card `12133:82475`
- Comment thread: `1913329252` (2026-09-04)

## Context

A count can reach 100% and still be an error: if every notification fails, the
counter is complete but the green bar and the check say that everything went
well. The thread asks for a completed state with a negative outcome. Elena
replied that an “error state” may be clearer than a “completed in error” state
and asked for the product case. `ProgressKpi` today only has `completed`, which
paints the success tokens; the source `ProgressKpiCard` declares only
`Type=Default|Multi`.

## Options

1. **Add an error tone to the completed state.** The bar, the percentage and the
   footer icon use the error tokens; the count stays 100%. This is the
   recommendation.
2. **Add `failed` as a second value.** The card shows success and failure counts
   side by side, with a new source layout.
3. **No change in the design system.** Products compose their own error card.

## Decision

Pending. Option 1 is the recommendation.
