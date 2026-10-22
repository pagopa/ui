# Definition of done — a component

Every new or changed component satisfies all of it before the green chain. The
component's guide in `apps/storybook/src/guides` records its behaviour and
adaptations: read it first.

## Placement and imports

`pnpm nx run pagopa-ui:layers:check` enforces the import layers. Every import form obeys them —
aliases, re-exports, dynamic, CommonJS, type-only; runtime cycles and computed
paths fail, type-only cycles pass.

- [ ] Lives in a family under `src/components` — `inputs`, `navigation`,
      `feedback`, `content`, `data-display`, `composites`, `overlays` — chosen
      by what the component does. Base UI wrappers live in `primitives`, the
      generated icon and pictogram catalogue in `icons`, private page modules
      and demos in `templates`.
- [ ] Imports point only downward: `primitives`/`icons` ← families ←
      `templates` ← stories. Primitives never reach a family; families may
      compose each other; nothing in `src/components` imports `apps/storybook/src` or
      `src/catalog`.
- [ ] `@base-ui/react`, `react-day-picker` and `lucide-react` only in
      `primitives`; `cn` only from `@/lib/cn`.
- [ ] Removed layers stay removed: `atoms`, `molecules`, `organisms`,
      `figma-primitives`, `ui`, `screens`.
- [ ] The family's primitives and existing components are reused before new
      markup is written; a template composes families and owns layout, not
      copy.

## Code

- [ ] Clear API and name. Colours, spacing, radius, type and elevation come
      from the tokens in `src/index.css`: no hex, no inline `[Npx]` value.
      Elevation comes only from the elevation tokens.
- [ ] No mock data or product copy: every visible text is a prop.
- [ ] Light application theme only; dark artwork variants are supported.
- [ ] Prop JSDoc gives meaning, behaviour and `@default` values — never
      measurements, type scales, colours or geometry, which change while the
      contract stays. `@deprecated` and provenance notes stay.
- [ ] The name and props follow the [prop conventions](prop-conventions.md):
      one line per departure in the node's registry `note` when a source node
      backs the component, in the guide when none does.
- [ ] Public or private is a decision; ask the person when in doubt. A
      production component is exported from its family `index.ts` and the
      public entry (`src/pagopa-ui.ts`); internal helpers, demos and no-op
      aliases stay out — publish behaviour, never an empty placeholder. The
      public surface is frozen until the first publication: a new public export
      is the person's decision. Then semver applies.

## Behaviour and accessibility

- [ ] Native semantics first: navigation and download links stay native `<a>`
      (button styling comes from the internal `buttonVariants` helper, never a
      button primitive rendering an anchor, which imposes button keyboard
      behaviour); form controls submit through native form data.
- [ ] Pointer targets reach 44px (48px for buttons) through an invisible
      `::after` built from existing inset utilities — `after:absolute
      after:-inset-2.5` on a 24px box, `after:-inset-y-3` on a 20–22px text
      line (grep `after:-inset`) — never by inflating the visible box
      (`min-h-11` on a 24px row). Horizontal expansion stays out of scroll
      containers: it feeds `scrollWidth` and fails reflow.
- [ ] Keyboard perimeters are solid and immediately opaque; reduced motion
      removes transitions instead of inventing them; forced colours keep
      system-coloured paint for every state cue.
- [ ] Content collapsed or hidden at a width keeps its accessible name:
      collapsing text stays in the DOM as `sr-only` and returns where it shows
      (`sr-only sm:not-sr-only`, or the container equivalent); a link collapsing
      to its icon keeps its label as `sr-only`. The accessible name never
      degrades to an avatar `alt` or an icon.

## Stories and tests

- [ ] A story in `apps/storybook/src` titled `Foundations/*` or
      `Components/<section>/*` (`packages/ui-cli/tests/checks/story-taxonomy.test.mjs`, in
      `pnpm nx run pagopa-ui-cli:test`, fails a new top-level section), with a description,
      essential `argTypes` and a Playground. It is the component's only story
      file: no parallel demo or prototype; retired layers and story sections
      stay retired.
- [ ] The guide in `apps/storybook/src/guides` states behaviour and the accessibility
      adaptations; it renders on the story's docs page. Storybook prose is
      English; Italian only for rendered content (product copy, sample values).
- [ ] The story passes the a11y suite (`test: 'error'`): labels, roles, focus,
      contrast, targets. Story tests run in three engines, after a second pass
      under forced colours and reduced motion (the `storybook-conditions`
      project in `vite.config.ts`), and every story runs the shared
      accessibility contract in `apps/storybook/src/support/a11y-contract.ts`:
      keyboard order, accessible names, painted focus, widget behaviour, the
      single-announcement error strategy and the 320px and text-spacing
      conditions.
- [ ] A story that cannot satisfy a contract condition declares it in its own
      `parameters: { a11yContract: { reflow: false } }` with a reason comment
      beside the flag: exemptions live with each story. A pending reflow
      decision also gets one request in
      `docs/design-requests/2026-10-16-a11y-reflow-conditions.md`.
- [ ] Interactive components have `play()` tests on native behaviour, not only
      callbacks: submission and form data, required and disabled, controlled
      updates, reset (including cancellation), validation, focus and keyboard.
- [ ] Overlays test closing with focus restoration and the final open state:
      focus containment, keyboard, accessible title, axe.
- [ ] An action inside a popup list is keyboard-reachable with native
      activation, sits outside the listbox, runs after the popup closes,
      preserves the value without submitting, and moves focus into any overlay it
      opens.
- [ ] Coverage: `pnpm nx run pagopa-ui-storybook:test:coverage` is green and thresholds only ratchet up.
      The denominator is the production components, not catalogues or demos; the
      global gates and the stricter per-file gates are in `vite.config.ts`. Test
      required, disabled, reset and failure branches: render coverage is not
      native behaviour.
- [ ] Automated checks are not screen-reader or browser-zoom testing: both are
      manual, never claim them.

## Tooling and delivery

- [ ] New tooling behaviour has a CLI regression test in `pnpm nx run pagopa-ui-cli:test`;
      public changes pass the installed-artifact consumer in
      `pnpm nx run pagopa-ui:library:check`. Never replace that consumer with a
      repository-linked smoke test or `skipLibCheck`: React stays a peer, and
      styling and font tools stay build-time.
- [ ] A rendering or public API change has a line under `## Unreleased` in
      `CHANGELOG.md`.
- [ ] `pnpm nx run-many -t fmt` and `pnpm nx run-many -t lint` executed, then the green chain.
