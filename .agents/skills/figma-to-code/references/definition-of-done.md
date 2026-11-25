# Definition of done — source alignment

Satisfied for each touched node before the green chain. The checks own the
predicates; this list owns the order.

- [ ] The rendered story matches the source at its width and state; every declared
      device has its case.
- [ ] The story is the parity capture surface: source width, real states,
      `parameters.design` built with `figmaEmbedUrl`, every `storyExports` entry
      showing the node, not the variant.
- [ ] The guide records which source property drives which prop, attribute or
      content; layer names are quoted verbatim.
- [ ] Every targeting rule has a disposition and the guide opens with the
      consumer-facing block; open comments are answered by the source or promoted
      to a design request.
- [ ] Name and props follow the [standards skill](../../pagopa-ui-standards/SKILL.md),
      whose prop conventions own the departure rule.
- [ ] Accessibility follows the [standards skill](../../pagopa-ui-standards/SKILL.md),
      including what automation cannot certify.

## Closing and delivery

Run the local gates explicitly, recording every command and exit code and
continuing after failures:

```bash
pnpm nx run pagopa-ui:check:catalogue
pnpm nx run pagopa-ui-cli:check:rules
pnpm nx run pagopa-ui-cli:check:devices
pnpm nx run pagopa-ui-cli:check:evidence
pnpm nx run pagopa-ui-cli:check:parity
pnpm nx run pagopa-ui:docs
pnpm nx run workspace:verify
```

With Storybook answering, run `pnpm ui-cli parity check --node <nodeId> --saved`
for **each** touched node. Nx gates reuse unchanged inputs; browser runs are
fresh.

**Push and pull request stay with the person.** Keep stories, registry, inventory
and exception changes with the implementation.

Report each node's decision and reason, each device's verdict, residues, open
items, files touched, and every command with its exit code, distinguishing
passed, failed, skipped and unavailable. A blocked gate is reported, not
passed.

A closing report carries the scope of what was read, not only what it found, so
the person can see the edges of the evidence:

- a pending decision names the design-request file it waits on, not its issue
  number or its title alone;
- a scoped `figma brief --queue` read reports its `implementationOrder` and both
  counts — the nodes it omitted and the nodes it truncated — against the nodes
  the request named;
- a partial rules snapshot says that its `removed` count covers the refreshed
  pages only and that a full `pnpm ui-cli figma rules refresh` is what checks the
  rest;
- a source stop carries the prerequisite, how to supply it and the command that
  retries the read.
