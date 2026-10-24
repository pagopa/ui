# Design request — Identity Provider Selector: what does the spinner replace?

- Type: design
- Issue: https://github.com/pagopa/ui/issues/31
- Status: open
- Decision owner: @gunzip
- Preview: pending — the previews session adds the option stories and the PR #19 index
- Figma node: `1992:147363` (`Identity Provider Selector`, mocked)
- Comment thread: `1770238435` (2026-05-21)

## Context

The One Identity login can take a moment. The thread asks for a spinner. The
component is not public yet: `TemplateComponents.tsx` is a demo mock. The answer
decides the real component contract.

## Options

1. **Replace the provider icon in the selected row.** The row keeps its size and
   the spinner sits where the provider mark was. This is the recommendation.
2. **Cover the whole panel with a loading layer.**
3. **No spinner in the list.** The continue button owns the busy state.

## Decision

Pending. Option 1 is the recommendation.
