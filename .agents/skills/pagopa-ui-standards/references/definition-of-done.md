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
- [ ] `@base-ui/react`, `react-day-picker`, `lucide-react` only in `primitives`;
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
