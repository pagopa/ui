# Story and test contracts

What a component's story proves, on top of the
[definition of done](definition-of-done.md).

## Stories and tests

- [ ] One story file in `apps/storybook/src`, titled `Foundations/*` or
      `Components/<section>/*` (a new section fails `story-taxonomy.test.mjs` in
      `pnpm nx run pagopa-ui-cli:test`), with a description, essential `argTypes`
      and a Playground. No parallel demo; retired sections stay retired.
- [ ] The guide states behaviour and accessibility adaptations and renders on the
      docs page. Storybook prose is English; Italian only in rendered content.
- [ ] The a11y suite passes with `test: 'error'` in three engines, then under
      forced colours and reduced motion (the `storybook-conditions` project in
      `vite.config.ts`), plus the shared contract in
      `apps/storybook/src/support/a11y-contract.ts`: keyboard order, names,
      painted focus, widget behaviour, the single-announcement error strategy,
      the 320px and text-spacing conditions.
- [ ] A source-fidelity story asserts the rhythm its parity case maps at the root
      — row heights, padding and gap, full-bleed dividers, footer — in every
      engine, which catches an engine-specific escape.
- [ ] A `container`-scoped parity case draws the source frame — `SourceFrame` and
      `layout: "fullscreen"` — so render, snapshot and capture agree; `parity
      capture` fails `story-collapsed` otherwise.
- [ ] A story that cannot satisfy a contract condition declares it in its own
      `parameters: { a11yContract: { reflow: false } }` with a reason comment; a
      pending reflow decision gets one request in `docs/design-requests/`.
- [ ] Interactive components have `play()` tests on native behaviour: submission
      and form data, required and disabled, controlled updates, reset including
      cancellation, validation, focus and keyboard.
- [ ] Overlays test closing with focus restoration and the final open state:
      containment, keyboard, accessible title, axe.
- [ ] A popup-list action is keyboard-reachable with native activation, sits
      outside the listbox, runs after the popup closes, keeps the value without
      submitting, and moves focus into any overlay it opens.
- [ ] Coverage is green and thresholds only ratchet up
      (`pnpm nx run pagopa-ui-storybook:test:coverage`) over production
      components, gates in `vite.config.ts`; test the required, disabled, reset
      and failure branches — render coverage is not native behaviour.
- [ ] Automated checks are not screen-reader or browser-zoom testing: both are
      manual, never claim them.
