# ADR-0012 — Utilities ship under an internal prefix, in both spellings while the tree migrates

- **Status:** Accepted — 2026-12-04, temporary: the contract step of the same
  spec removes it.
- **Date:** 2026-12-04
- **Context:** a design-system utility class is a global name. A host page that
  also runs Tailwind, or that carries an older hand-written `.flex` or `.hidden`,
  resolves its own spelling against the library's stylesheet, and the library
  cannot see the collision. Before this ADR the published stylesheet emitted one
  spelling for every utility — the bare one — so the only way to reach a
  collision-free name was to rename the utilities of every component, story and
  demo at once.
- **Related:** [the coexistence
  spec](../../packages/ui-cli/tests/e2e/library-host-css-coexistence.spec.mjs) —
  what the prefix may not disturb; [ADR-0011](./0011-css-cascade-layers.md) — the
  layer arrangement the prefix lives inside; `packages/pagopa-ui/src/index.css`,
  `packages/pagopa-ui/build/prefixed-candidates.ts` — the implementation;
  `packages/ui-cli/data/css-budget.json` — the size the doubling costs and the
  size the contract step restores.

## 1. Problem

Every utility the library renders is a bare class: `flex`, `p-6`,
`text-foreground`. Two of them reliably collide with a host:

- **A host on Tailwind v4.** The host's own `styles.css` emits the same bare
  class names with its own theme, so the two sheets restyle each other. ADR-0011
  makes the layer order decide such a tie, which is coherent but still means the
  library's utility moves when the host's does.
- **A host that carries a legacy stylesheet.** A hand-written `.hidden` or
  `.flex` from an earlier UI kit reaches into the component subtree the moment
  the class name matches.

The migration needs a name a host cannot plausibly use, and it cannot be
introduced in one commit: the rename touches every component, story and demo
template, and each of them must keep rendering between the two ends of it.

## 2. Decision

**A utility is spelled twice while the migration runs: the bare candidate it
already had and the same candidate under the internal `pui:` prefix.**

```css
@custom-variant pui (&);
@source "../.generated/prefixed-candidates.txt";
```

1. **The prefix is a variant, not Tailwind's `prefix()` option.** `prefix(pui)`
   is one global switch with two effects the library cannot accept during the
   migration: it renames the generated custom properties (`--color-primary`
   becomes `--pui-color-primary`, and every `var()` with it), which are public
   tokens of this package, and it rewrites the `group` marker a `group-hover/nav`
   variant points at (`:where(.pui\:group\/nav)` instead of the host's own
   `.group/nav`). `@custom-variant pui (&)` is purely additive: it emits
   `.pui\:flex` with the declarations `.flex` has, and changes the meaning of no
   candidate already in the tree.
2. **Both spellings come from a mirror of candidates.** Tailwind emits one rule
   per candidate it finds in the scan surface, so the build writes
   `.generated/prefixed-candidates.txt` — every candidate of the surface in both
   spellings — and the stylesheet `@source`s it. A candidate already spelled with
   the prefix is normalized to its bare form first, so a source rewritten to
   `pui:flex` keeps emitting `.flex` too and nothing breaks mid-migration.
3. **One plugin writes it, both surfaces share it.**
   `packages/pagopa-ui/build/prefixed-candidates.ts` compiles the entry, scans
   the surface with the same `Scanner` Tailwind uses, and writes the mirror before
   Tailwind reads the stylesheet. The library registers it in
   `packages/pagopa-ui/vite.config.ts`; Storybook registers it in
   `apps/storybook/vite.config.ts` over `src/preview.css`, so the stories get the
   same contract from their own, wider surface.
4. **The prefix adds no layer and no reset.** The prefixed rules land in
   `pagopa-ui.utilities` beside the bare ones, so ADR-0011's arrangement — two
   library layers opened before any host rule, resets confined to `[data-slot]`
   and the portal root — holds unchanged. The coexistence spec passes untouched.

## 3. Consequences

- **The published stylesheet doubles.** `dist/styles.css` measured raw 135 347 /
  gzip 21 532 / brotli 17 864 bytes before the prefix and raw 244 200 / gzip
  36 376 / brotli 23 463 with it. The budget records the larger size and the size
  the contract step must return to; growth past the doubled figure still fails.
- **The prefix is not yet the contract.** During the migration a component may
  spell a utility either way, so the collision is only removed where the tree has
  been rewritten. The ticket that ends the migration deletes the variant, the
  mirror and the plugin, and the artifact returns to one spelling.
- **The mirror is generated, never committed.** It is a function of the sources;
  a stale one would emit utilities no source references, and a committed one
  would be reviewed as if it were authored. `.generated/` is ignored, and the
  plugin rewrites it in `buildStart` and on watch changes.
- **Native `prefix()` stays open at the contract step.** Once the tree spells one
  way, the option is a single switch again — but only if the token rename is
  accepted, because it moves every `--color-*`, `--radius-*` and `--text-*` the
  library publishes into a `--pui-` namespace. The variant is the reversible
  half-step that keeps that decision for later.
- **A hand-written class is not a utility.** The stylesheet also carries plain
  classes of its own (`.shimmer`, `.pagopa-ui-root`); the prefix does not double
  them, because they are the library's own markup contract and no host collision
  rename is pending on them.

## 4. Alternatives

- **Adopt `prefix(pui)` now.** One switch, no generated file — rejected while
  the tree still spells bare utilities, because the option emits one spelling
  only (every component would stop rendering until the rename landed) and
  because it renames the published token variables.
- **Duplicate the emitted selectors after the compile.** A post-processing pass
  over the artifact would write `.flex, .pui\:flex { … }` without a second
  candidate set. It splits one rule into a selector list whose `--tw-*`
  fallbacks and `@supports` wrappers have to be preserved by hand, and it has to
  track every shape Tailwind emits; the mirror instead reuses Tailwind's own
  emission.
- **Rename the utilities outright.** The correct end state, and an all-at-once
  change that cannot be reviewed or rolled back by area; it is what the contract
  step does once the prefix has proven the two spellings coexist.
