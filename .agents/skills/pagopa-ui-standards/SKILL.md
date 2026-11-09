---
name: pagopa-ui-standards
description: Standards for every component, with or without a design source: placement and imports, the text contract that keeps every rendered or announced string overridable, props, stories, tests, lint disables and the definition of done. Use when creating or changing a component, prop, public surface, text, test, story or guide.
---

# Pagopa UI standards

- [definition-of-done.md](references/definition-of-done.md) — what a component
  proves.
- [prop-conventions.md](references/prop-conventions.md) — naming: how a part,
  state or choice becomes a prop.
- Storybook's offline CLI, `pnpm --filter pagopa-ui-storybook exec storybook
  skills|tools`, supplies props and story ids: never from memory.

## The text contract

Every string a component renders or announces is reachable by the consumer.
Defaults are allowed and overridable, from the provider dictionary;
`text-defaults` rejects a literal. Where text depends on data, the consumer
receives the data and returns the sentence, owning plurals and grammar.
Text props are public API: exported, forwarded, shown in the guide with a
replacement example.

## Tests and disables

A test passes a non-default value and asserts the outcome: rendered text or
accessible name. Fix a lint cause; a disable is for a false positive or
a documented constraint, names the rule and reason, stays on one line.
Correctness, hooks, accessibility and type-safety rules always hold.
Where layout depends on text, the story shows the short and long case.
