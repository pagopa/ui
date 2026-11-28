# Definition of done — source alignment

Satisfied for each touched node before the green chain. The checks own the
predicates; this list owns the order.

- [ ] The rendered story matches the source at its width and state, on every
      declared device.
- [ ] The story is the comparison surface: source width, real states,
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
pnpm nx run pagopa-ui-cli:check:devices
pnpm nx run pagopa-ui:docs
pnpm nx run workspace:verify
```

`pnpm nx run pagopa-ui-cli:check:rules` reports the `.Regola` drift and exits 0:
the pending, `new`, `stale` and `removed` cards it prints are findings of the
node, reported and not counted as a failure. `--strict` fails on that drift, for
the caller that wants the ledger closed rather than reported.

With Storybook answering, run `pnpm ui-cli align <nodeId> --device <device>` for
**each** touched node on **each** device the inventory declares: one run reads the
target, the story and the declared devices, probes Storybook and compares
([commands.md](commands.md)). Nothing is stored between runs, so the comparison
is this session's and Nx reuses nothing: the numbers are read now or not at all.
Write the decision and its documents with
`pnpm ui-cli record <nodeId> --status <status>`, which is atomic and idempotent,
and report the run that closed the node, not the one you first typed.

**Push and pull request stay with the person.** Keep stories, registry, inventory
and exception changes with the implementation.

Report each node's decision and reason, each device's verdict, residues, open
items, files touched, and every command with its exit code, distinguishing
passed, failed, skipped and unavailable. A blocked gate is reported, not
passed.

Name the scope of every read the report rests on.

A scoped rules refresh's report says the snapshot is partial and that only a full
`pnpm ui-cli figma rules refresh` re-checks the pages it skipped.
