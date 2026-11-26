# Definition of done — a component

Every new or changed component satisfies all of it before the green chain. Read
its guide in `apps/storybook/src/guides` first.

## Placement and imports

`pnpm nx run pagopa-ui:layers:check` enforces layers for every import form; a
runtime cycle or computed path fails, a type-only cycle passes.

- [ ] Lives in a family under `src/components` — `inputs`, `navigation`,
      `feedback`, `content`, `data-display`, `composites`, `overlays` — chosen by
      what it does; Base UI wrappers in `primitives`, generated icons in `icons`.
- [ ] Imports point down only: `primitives`/`icons` ← families ← stories and
      templates. Nothing under `src/components` imports `apps/storybook/src` or
      `src/catalog`; templates may import any layer through `@/…`.
- [ ] `@base-ui/react` and `react-day-picker` only in `primitives`; no icon
      package is a runtime dependency — glyphs come from the artwork pipeline;
      `cn` only from `@/lib/cn`.
- [ ] Removed layers stay removed: `atoms`, `molecules`, `organisms`,
      `figma-primitives`, `ui`, `screens`, `templates`.
- [ ] Family primitives and components are reused before new markup; a template
      composes families and owns layout, not copy.

## Code

- [ ] Clear API and name. Colour, spacing, radius, type and elevation come from
      the tokens in `src/index.css`: no hex, no inline `[Npx]`.
- [ ] Elevation comes only from the elevation tokens.
- [ ] No mock data or product copy: every visible text is a prop.
- [ ] Light theme only; dark artwork variants are supported.
- [ ] Prop JSDoc gives meaning, behaviour and `@default`, never measurements,
      type scales, colours or geometry. `@deprecated` and provenance stay.
- [ ] Name and props follow the [prop conventions](prop-conventions.md), which own
      the departure rule and its record.
- [ ] Public or private is a decision; ask when in doubt. A production component
      is exported from its family `index.ts` and `src/pagopa-ui.ts`; helpers,
      demos and no-op aliases stay out. The surface is frozen until the first
      publication. Then semver applies.

## Consumer DX

`pnpm nx run pagopa-ui:consumer-dx:check` judges every public component that
owns state. Its rules are the ones a DOM element gives a page for free, and a
defect fails the check by name: parity, `className`, `ref`, attributes, props
type. An exemption is a reasoned entry in
`packages/pagopa-ui/src/consumer-dx-exceptions.json`; once the component is
fixed the entry no longer matches and the check reports it as stale, so the
list only shrinks.

- [ ] Controlled and uncontrolled are one component: the prop that carries the
      state (`open`, `value`, `checked`, `selected`, `expanded`) comes with its
      change callback and its `default…` sibling, so a page can own the state or
      let the component own it without changing its JSX.
- [ ] The props type extends the host element it renders — or
      `ElementProps<tag>` from `primitives/props` — so `id`, `data-*`, `aria-*`
      and the event handlers a page already writes are accepted and reach an
      element. No closed interface that swallows them.
- [ ] `className` is accepted, merged through `cn` after the component's own
      classes, and applied to the element the page expects to style.
- [ ] `ref` reaches that element, or the trigger a page has to focus, and is
      typed by the element, so `ref.current` is the DOM node and not `unknown`.
- [ ] The props type is exported from its module and from `src/pagopa-ui.ts`
      under the component's name, so a consumer wrapping the component in their
      own component types its props without re-deriving them.
- [ ] Host CSS coexists. A consumer's own stylesheet restyles the component by
      setting a `--pui-*` custom property or overriding one class, without
      `!important` and without matching the component's internal structure:
      every colour, spacing, radius and type value reads a custom property, and
      every utility class carries the `pui:` prefix inside its cascade layer, so
      neither side has to out-specify the other. When the host runs Tailwind
      with its own preflight, a component still renders inside its own reset.

## Behaviour and accessibility

- [ ] Native semantics first: navigation and download links stay native `<a>`
      (button styling from `buttonVariants`); forms submit native form data.
- [ ] A fieldset painting a card names its group with `aria-labelledby` on a
      plain child; a `<legend>` can paint outside the card.
- [ ] Pointer targets reach 44px (48px for buttons) through an invisible
      `::after` — `after:absolute after:-inset-2.5` on a 24px box,
      `after:-inset-y-3` on a 20–22px line (grep `after:-inset`) — never by
      inflating the visible box. Horizontal expansion stays out of scroll
      containers: it feeds `scrollWidth` and fails reflow.
- [ ] Keyboard perimeters are solid and immediately opaque; reduced motion
      removes transitions; forced colours keep system paint per state cue.
- [ ] Collapsed or hidden content keeps its accessible name: `sr-only
      sm:not-sr-only`, or the container equivalent; a link collapsing to an icon
      keeps its label. The name never degrades to an avatar `alt` or an icon.
- [ ] Automated checks are not screen-reader or browser-zoom testing: both are
      manual, never claim them.

The story and test contracts are in [story-contracts.md](story-contracts.md).

## Tooling and delivery

- [ ] New tooling behaviour has a CLI regression test in
      `pnpm nx run pagopa-ui-cli:test`; public changes pass the installed-artifact
      consumer in `pnpm nx run pagopa-ui:library:check`, never replaced by a
      repository-linked smoke test or `skipLibCheck`. React stays a peer;
      styling and font tools stay build-time.
- [ ] A rendering or public API change has a line under `## Unreleased` in
      `CHANGELOG.md`.
- [ ] `pnpm nx run-many -t fmt` and `pnpm nx run-many -t lint` run, then the
      green chain.
