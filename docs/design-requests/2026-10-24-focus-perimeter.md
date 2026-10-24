# Design request — Focus perimeter: white inner border or a single blue outline?

- Type: design
- Issue: https://github.com/pagopa/ui/issues/34
- Status: open
- Decision owner: @gunzip
- Preview: https://proud-wave-056050103-19.westeurope.5.azurestaticapps.net/?path=/story/reviews-focus-perimeter--option-a / https://proud-wave-056050103-19.westeurope.5.azurestaticapps.net/?path=/story/reviews-focus-perimeter--option-b / https://proud-wave-056050103-19.westeurope.5.azurestaticapps.net/?path=/story/reviews-focus-perimeter--option-c
- Figma node: `1527:20695` (now removed; the decision is recorded in the thread)
- Rule card: `I123:3565;52:898` (“Stato focused”)
- Comment threads: `1525594157`, `1530342125` (2025-11)

## Context

The 2025 A11y review recorded a white inner safety border plus a blue outer
border for focus, applied to every focused state. The current code uses one blue
outline (`--ring: blue-500`) with an offset, so the gap shows the page colour. The
2026 consolidated card says the source draws no focused variant and the
perimeter is a library adaptation, but it does not name the double border. The
original node is removed; the decision survives only in the threads.

## Options

1. **Blue outer border plus a white inner safety border.** This is the 2025
   decision; it applies to every focusable control. This is the recommendation.
2. **One blue outline with an offset.** This is the current code.
3. **Blue outer border plus a surface-coloured inner gap.**

## Decision

Pending. Option 1 is the recommendation. Do not change one component only.
