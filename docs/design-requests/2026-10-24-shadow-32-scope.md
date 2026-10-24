# Design request — Shadow 32: modals and drawers only, or every floating layer?

- Node: [Shadow](https://www.figma.com/design/pvhsJpPGQbEwNLiyP7BOIw?node-id=239-1483) (`239:1483`), page • Shadow
- Rule card: `I240:2170;52:896` ("Shadow 32")
- Issue: https://github.com/pagopa/ui/issues/20
- Preview: https://proud-wave-056050103-19.westeurope.5.azurestaticapps.net/?path=/story/reviews-shadow-32--option-a / https://proud-wave-056050103-19.westeurope.5.azurestaticapps.net/?path=/story/reviews-shadow-32--option-b / https://proud-wave-056050103-19.westeurope.5.azurestaticapps.net/?path=/story/reviews-shadow-32--option-c
- Status: open — the rule and the implementation disagree; the components keep
  the current elevation until the answer is recorded
- Decision owner: Figma design owner

## Context

The `.Regole` card says **"Only modals and drawers use the 32px shadow."** The
rule is imported into `apps/storybook/src/guides/foundations.md`, so it is now
part of the public documentation.

The library applies Figma **Shadow 32** (`--shadow-32`) to more surfaces than
the rule allows, and the token itself documents the wider scope:

- `packages/pagopa-ui/src/index.css:203` — the theme entry is commented
  _"Figma Shadow 32: overlays, cards, tooltips"_.
- `packages/pagopa-ui/src/components/overlays/dialog.tsx:36` — modal panel.
- `packages/pagopa-ui/src/components/primitives/drawer.tsx:106` — drawer panel.
- `packages/pagopa-ui/src/components/feedback/snackbar.tsx:54` — snackbar.
- `packages/pagopa-ui/src/components/navigation/cookies.tsx:47` — cookie banner.
- `packages/pagopa-ui/src/components/feedback/scroll-to-bottom.tsx:34` — scroll
  button.
- `packages/pagopa-ui/src/components/primitives/tooltip.tsx:47` — tooltip bubble.
- `packages/pagopa-ui/src/components/primitives/popover.tsx:47` — popover panel.

Two registry notes also assert the wider reading ("`shadow-32` (overlays, cards,
snackbars)"), so the code is not an accident: it follows an earlier decision
that the rule now contradicts.

## The open question

1. **What does "modals and drawers" cover?** Dialog and Drawer only, or every
   floating layer (tooltip, popover, snackbar, cookies, scroll-to-bottom)?
2. **If only Dialog and Drawer:** which elevation do the other surfaces use?
   `Shadow 16` is the menu/dropdown step and `Shadow 1` is the base elevation.
   Is there a source elevation for a toast or a cookie banner?
3. **Cards:** the token comment names cards too. Does a card or a table surface
   take Shadow 32, or is that comment wrong as well?
4. **The rule card:** if the implementation is right, should the card be
   updated to name the floating layers, so the ledger and the guide stop
   promising a constraint nothing follows?

## Options

- **A — update the rule (no code change).** The card names modals, drawers,
  tooltips, popovers, snackbars and the cookie banner; cards stay on their own
  elevation. The theme comment and the registry notes already say this.
- **B — follow the rule.** Tooltip and popover move to `Shadow 16`; snackbar,
  cookies and scroll-to-bottom move to `Shadow 1` (or the source elevation you
  name). The parity cases and the registry notes that assert `shadow-32` change
  with them.
- **C — split.** Dialog, drawer and snackbar keep Shadow 32; tooltip, popover
  and scroll-to-bottom drop to Shadow 16; cookies keep the banner elevation, if
  the source draws one.

## Why it matters

Elevation is the only depth cue in the system; a tooltip and a modal on the same
step flatten the hierarchy. The answer also decides whether the imported rule
stays in `foundations.md` as written or is replaced.

## What is already fixed

- Dialog and drawer use Shadow 32, and the modal backdrop is a plain scrim with
  no blur (separate rule, already implemented).
- The overlay backdrop and the drawer direction are not part of this question.
