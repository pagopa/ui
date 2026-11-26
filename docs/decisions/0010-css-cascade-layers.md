# ADR-0010 — The stylesheet encapsulates with cascade layers, not `@scope`

- **Status:** Accepted — 2026-12-03.
- **Date:** 2026-12-03
- **Context:** the published stylesheet wrapped every library rule in
  `@scope (.pagopa-ui-root)`. `@scope` shipped in Chrome 118, Safari 17.4 and
  Firefox 128, so a consumer on Safari below 17.4 or on Firefox ESR 128 without
  the flag dropped the whole block: components rendered as unstyled HTML rather
  than losing isolation only. The scope also made the host's own reset and its
  layered Tailwind v4 rules compete with the library by proximity, which no host
  could see or reason about.
- **Related:** [the coexistence
  spec](../../packages/ui-cli/tests/e2e/library-host-css-coexistence.spec.mjs) —
  the proof of every claim below; [the tokens
  guide](../../apps/storybook/src/guides/tokens.md) — the consumer-facing
  version; `packages/pagopa-ui/src/index.css` — the implementation.

## 1. Problem

A single `@scope (.pagopa-ui-root)` block had to do three separate jobs, and each
had a different requirement:

- **Support.** All of the library lived inside one at-rule, so the at-rule's
  support defined the library's support. There is no partial fallback: an engine
  that ignores `@scope` ignores the utilities, the tokens and the resets.
- **Precedence against the host.** Scope proximity ranks the innermost matching
  scope above an outer one and above a rule of equal specificity. A host `button`
  reset therefore lost to the library's element styles without the host ever
  saying so, and the documented workaround was to write host rules inside
  `@scope (.pagopa-ui-root)` too.
- **Reach.** `:scope *` reached every descendant of the provider root, including
  the legacy MUI Italia markup a migrating host still renders inside it. That
  markup lost the browser's own margins, list markers and `content-box` box
  model, which is a destructive change a consumer cannot opt out of.

## 2. Decision

**The stylesheet declares two cascade layers as its first rule, and confines
each kind of rule to the roots the library renders.**

```css
@layer pagopa-ui.base, pagopa-ui.utilities;
```

1. **Base resets in `pagopa-ui.base`, everything else in
   `pagopa-ui.utilities`.** Resets come first, so any utility class beats the
   reset it shares an element with. Both layers are opened at the head of the
   artifact, so a layer a host declares in its own stylesheet is ordered after
   them.
2. **Resets reach `[data-slot]` roots and the portal root, nothing else.** Every
   component root carries `data-slot`, and overlays mount into
   `[data-pagopa-ui-portal-root]`. Host markup inside a `UIProvider` keeps the
   browser's defaults: `p` margins, `ul` markers, `content-box`.
3. **Root selectors are written with `:where()`.** `:where([data-slot], …)`
   contributes zero specificity, so a consumer class of equal specificity still
   overrides a library base rule.
4. **`@scope` is gone.** The built stylesheet contains no `@scope` at-rule, and
   the browser matrix is no longer gated on it.

## 3. Consequences

- **A host layer outranks the library.** Because the library's order statement
  comes first, a host that writes `@layer host.base, host.utilities` gets both
  layers after the library's. A host `.p-6 { padding: 5px }` therefore wins over
  the library's `.p-6` on the same element, including on a dialog body in the
  portal root. This is deliberate: the library never outranks a host layer, which
  is the price of never restyling the host.
- **Unlayered host CSS outranks every layer.** A plain host class overrides a
  library utility with no `!important` and no `@scope` wrapper, the inverse of
  the previous contract. It is the behaviour a consumer already expects from any
  layered framework, and it is asserted in the coexistence spec.
- **`!important` still wins.** A host rule marked `!important` beats every layer,
  so the library's own `!important` contracts — the reduced-motion block — had to
  keep it.
- **A selector that must reach the root says so.** `@scope`'s `:scope *` covered
  the scope root; a `… *` descendant selector does not. Each library-wide
  contract that has to apply to a component root as well as its subtree — the
  reduced-motion block and the forced-colors focus perimeter — lists the root
  selector explicitly. The forced-colors perimeter uses `:is()` rather than
  `:where()` because it must outrank a component's own
  `focus-visible:outline-ring` utility, the weight `@scope`'s pseudo-class used
  to supply.
- **Every component root needs its slot.** A component whose outermost element
  carries no `data-slot` loses the resets for its whole subtree, so the attribute
  is part of the shape contract of a component, reviewed with it.
- **The resets are preflight, rewritten.** The `@scope` could import
  `tailwindcss/preflight.css`; a layer cannot nest it, so `pagopa-ui.base`
  restates it with each selector naming the roots it may reach, and the two keep
  parity. The rules whose browser default is already the same value — the
  monospace stack of `code`, `kbd`, `samp` and `pre`, `small`, `sub` and `sup`,
  the multiple-select `optgroup` indents, Chrome's datalist marker — and the
  `html` rules the `@scope` could never reach are left out, so no literal enters
  `src/index.css` that no foundation token can express.

## 4. Alternatives

- **Keep `@scope` and add a fallback block.** A duplicated unlayered copy of the
  stylesheet doubles the artifact and drifts from the scoped one at the first
  edit; nothing detects the drift.
- **Unlayered stylesheet with `:where()` only.** Confinement would work, but the
  host could no longer order its own rules against the library's: every tie
  would be specificity arithmetic across two stylesheets it does not own.
- **Shadow DOM per component.** Isolation is stronger than needed, and it breaks
  every external theming contract the library publishes — tokens on `:root`,
  host utility classes, the shared overlay root.
