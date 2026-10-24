# Design request — Identity Provider Selector: does the SPID help link stay?

- Type: design
- Issue: https://github.com/pagopa/ui/issues/32
- Status: open
- Decision owner: @gunzip
- Preview: pending — the previews session adds the option stories and the PR #19 index
- Figma node: `1992:147363` (`Identity Provider Selector`, mocked)
- Comment thread: `1770328203` (2026-05-21)

## Context

The selector draws the link “Non hai SPID? Scopri di più” below the provider
list. The link helps a person without SPID, but it takes space below a list that
can be long. The thread asks whether to keep it or remove it.

## Options

1. **Keep it below the list.** It stays next to the choice it explains. This is
   the recommendation.
2. **Remove it.** The page owns the SPID help.
3. **Move it into the panel header or footer.** It stays visible while the list
   scrolls, but it is farther from the choice.

## Decision

Pending. Option 1 is the recommendation.
