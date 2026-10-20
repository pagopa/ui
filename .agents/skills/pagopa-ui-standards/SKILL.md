---
name: pagopa-ui-standards
description: Standards for every component of this design system, with or without a design source — placement and imports, the text contract that keeps every rendered or announced string overridable by the consumer, props, stories, tests, lint disables and the definition of done. Use when creating or changing a component, a prop, the public surface, a visible or announced text, a test, a story or a guide.
---

# Pagopa UI standards

How a component, its props, story, test and guide are written. Every rule here
holds whatever produced the component. The detail lives in the references:

- [definition-of-done.md](references/definition-of-done.md) — what a finished
  component proves, placement and imports included. Read it before closing.
- [prop-conventions.md](references/prop-conventions.md) — how a part, a state
  or a choice becomes a prop.
- The Storybook agent CLI, offline: `pnpm exec storybook skills stories|write-story|setup`
  prints the story workflow (stories, data, play functions);
  `pnpm exec storybook tools <toolset> <tool>` reads this configuration
  (`stories changed`, `stories find-by-component`, `docs list|show`, `test run`
  locally; `stories preview` and `review create` need `pnpm storybook` running).
  Use only story ids those tools return.

## The text contract

Every string a component renders or announces is reachable by the consumer, so
the application can translate it. Rendered: labels, titles, placeholders,
messages, empty, loading and error states. Announced: `aria-label`, visually
hidden text, `alt`, live regions.

Defaults are allowed, and every default is overridable from outside; a string
the consumer cannot replace fails the contract. Where the repository exposes a
text mechanism, use it.

The consumer assembles a sentence, not the component. Where the text depends on
data — a count, a selection, a state — the consumer receives the data and
returns the whole sentence, owning plurals, word order and grammar.

Text props are public API: exported with the component, forwarded to the element
that consumes them, and shown in the guide with a replacement example, so no
default reads as the only language.

## Tests prove the contract

At least one test passes a value other than the default and asserts the outcome:
the rendered text for a visible string, the accessible name or live region for an
announced one. Assert visible and announced texts separately when they differ. A
test that asserts an internal default proves the default, not the contract.

## Lint disables

Fix the cause. A disable is reserved for a false positive or a documented library
constraint: scope it to the line, name the rule and write why. Correctness,
hooks, accessibility and type-safety rules always hold.

## Story content length

Where the layout depends on text, the story shows the short and the long case
alongside the design's sample: a wrapping label, a long unbreakable word, the
translated variant.
