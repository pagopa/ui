# Design request — Accordion: can the header hold an avatar or a coloured icon?

- Type: design
- Issue: https://github.com/pagopa/ui/issues/35
- Status: open
- Decision owner: @gunzip
- Preview: https://proud-wave-056050103-19.westeurope.5.azurestaticapps.net/?path=/story/reviews-accordion-avatar-icons--option-a / https://proud-wave-056050103-19.westeurope.5.azurestaticapps.net/?path=/story/reviews-accordion-avatar-icons--option-b / https://proud-wave-056050103-19.westeurope.5.azurestaticapps.net/?path=/story/reviews-accordion-avatar-icons--option-c
- Figma node: `759:6399` (`AccordionItem`)
- Comment thread: `1919241855` (2026-09-09)

## Context

The header today renders a 24px grey decorative icon from the arbitrary `icon`
slot. Sarah asked whether the header can also hold an avatar or a coloured icon;
Elena replied that there is no evidence yet but that foreseeing avatar and
coloured icons would avoid rework. The source has one icon instance and no
avatar variant.

## Options

1. **Keep only the grey decorative icon.**
2. **Add an optional avatar slot.** A 40px avatar takes the icon position; the
   chevron stays. This is the recommendation.
3. **Allow a coloured icon but no avatar.** The icon slot already accepts a
   coloured glyph at 24px.

## Decision

Pending. Option 2 is the recommendation.
