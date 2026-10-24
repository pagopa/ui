# Design request — Identity Provider Selector: which loading skeleton?

- Type: design
- Issue: https://github.com/pagopa/ui/issues/33
- Status: open
- Decision owner: @gunzip
- Preview: https://proud-wave-056050103-19.westeurope.5.azurestaticapps.net/?path=/story/reviews-identity-provider-skeleton--option-a / https://proud-wave-056050103-19.westeurope.5.azurestaticapps.net/?path=/story/reviews-identity-provider-skeleton--option-b / https://proud-wave-056050103-19.westeurope.5.azurestaticapps.net/?path=/story/reviews-identity-provider-skeleton--option-c
- Figma node: `1992:147363` (`Identity Provider Selector`, mocked)
- Comment thread: `1770336895` (2026-05-21)

## Context

The provider list is fetched from an API. Without a placeholder, the panel
collapses and then jumps when the list arrives. The thread asks for a skeleton.
The component is still a demo mock.

## Options

1. **Three row skeletons that preserve the panel height.** Each row keeps the
   icon, the name and the status slot. This is the recommendation.
2. **One block skeleton for the whole list.**
3. **A spinner only.** No layout placeholder.

## Decision

Pending. Option 1 is the recommendation.
