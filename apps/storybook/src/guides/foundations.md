## Tokens

Colours, typography, radius and elevation are generated from the Figma
Variables into `packages/tokens/src/figma.generated.css`; `src/index.css` binds the
semantic aliases. `packages/tokens/src/manifest.json` records every variable,
exclusion and reason, and `pnpm nx run pagopa-ui-tokens:tokens:check` validates
the chain. Components use these
tokens and never hardcoded hex values: interactive states (hover/active) and
the brand colours (`navy`) are CSS tokens too.

- **Radius**: the Figma foundations only — 8px (`rounded-sm`–`lg`), 16px
  (`rounded-xl`/`2xl`) and 24px (`rounded-3xl`/`4xl`), with no interpolated
  values.
- **Colour**: primary is `#0B3EE3`; the solid status colours use the source
  `Color/Icon/*` variables. The remaining local values (`--primary-active`,
  `--destructive-hover`, `--avatar-frame`, `--avatar-icon-surface` and the three
  brand colours) are documented extensions, not pending work.
- **Type scale**: `text-hero`, `text-h3`, `text-h4`, `text-title-*` (xxl→xs,
  mobile variants included), `text-body*`, `text-mono`, `text-label*`,
  `text-caption*` and `text-button`, each generated with its line height,
  declared weight and the bundled source font. The App IO heading styles
  H1/H2/H5/H6 are not bound to any published component and stay out of the
  scale until a component consumes them.
- **Font**: Titillio, the Figma source family, vendored unmodified (OFL 1.1) in
  `src/assets/fonts/titillio` and shipped with the library. The bundle has no
  500 face: the source style `Titillio/500` is the Semibold face (CSS 600,
  `font-semibold`, `text-*-sb`) and `Titillio/600` is the Bold face (CSS 700,
  `font-bold`). `font-medium` renders the Regular face.

## Interaction and accessibility

- **Focus**: an immediately painted, opaque 2px solid perimeter, drawn with the
  system foreground colours under forced colours. Native calendar editors also
  show the perimeter while focus stays inside the browser's shadow UI.
- **Targets**: interactive targets reach at least 44px. A source-sized visual
  box stays source-sized: the pointer target grows through an invisible
  `::after` expansion built from the existing inset utilities (`-inset-2.5` on a
  24px box, `-inset-y-3` on a 20–22px text line), never by inflating the visible
  row, chip or text action. Keep horizontal expansion out of scroll containers.
- **Motion**: transitions are disabled under `prefers-reduced-motion`, and
  static controls never acquire an invented transition. Decorative rotation is
  opt-in through `motion-safe`; the functional loading animations follow a
  bounded reduced-motion policy.
- **Theme**: the supported application theme is light only. The dark pictogram
  variant is artwork for a dark surface, not dark application support.

## Scope of the documentation

The component pages document reviewed source compositions with explicit
accessibility adaptations; the bundled source font does not make them a
pixel-identical certification of the Figma frames. Storybook interaction and
accessibility tests and the installed-artifact consumer run in Chromium, Firefox
and WebKit, including 320px reflow; manual screen-reader review (VoiceOver with
Safari, NVDA with Firefox) and actual browser zoom are not yet verified.

The `◆ KEY TEMPLATE` nodes without a dedicated page under `Components/Templates`
are `mocked`: a private scaffold outside the public entry, the coverage
denominator and the story taxonomy. The `Foundations/Figma inventory` page
shows the status of every published node.
