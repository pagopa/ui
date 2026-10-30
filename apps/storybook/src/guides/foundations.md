<!-- component-rules:start -->

## Component Rules

- Choose the text colour from the background's accessible pair; the background decides which text colours pass contrast.
- Prefer tone-on-tone colour pairings for a fresher look.
- Order every palette from the darkest step to the lightest.
- Name a colour by its hue and saturation step, never by the feature it serves.
- Express a colour's function through a design token, not through its name.
- Reserve the 32px shadow for modals and drawers.
- Tie the corner radius to the element's elevation, not to its width or content.

<!-- component-rules:end -->

## Tokens

Colours, typography, radius and elevation come from the Figma Variables and are
consumed as tokens: components use them and never hardcoded hex values, including
interactive states (hover/active) and the brand colours.

- **Radius**: only the foundation steps 8, 16 and 24, with no interpolated values.
- **Colour**: primary is `#0B3EE3`, and the solid status colours come from the
  source `Color/Icon/*` variables. The remaining local values
  (`--primary-active`, `--destructive-hover`, `--avatar-frame`,
  `--avatar-icon-surface` and the three brand colours) are documented extensions,
  not pending work.
- **Type scale**: `text-hero`, `text-h3`, `text-h4`, `text-title-*` (xxl to xs,
  mobile variants included), `text-body*`, `text-mono`, `text-label*`,
  `text-caption*` and `text-button`. The App IO heading styles H1, H2, H5 and H6
  stay out of the scale until a published component consumes them.
- **Font**: Titillio, the source family, shipped unmodified (OFL 1.1) with the
  library. The bundle has no 500 face: the source style `Titillio/500` is the
  Semibold face (CSS 600, `font-semibold`, `text-*-sb`) and `Titillio/600` is the
  Bold face (CSS 700, `font-bold`), so `font-medium` renders the Regular face.

## Interaction and accessibility

- **Focus**: an immediately painted, opaque 2px solid perimeter, drawn with the
  system foreground colours under forced colours.
- **Targets**: interactive targets reach at least 44px. A source-sized visual box
  stays source-sized: the pointer target grows through an invisible expansion,
  never by inflating the visible row, chip or text action. Keep horizontal
  expansion out of scroll containers.
- **Motion**: transitions are disabled under `prefers-reduced-motion`, and static
  controls never acquire an invented transition. Decorative rotation is opt-in
  through `motion-safe`; the functional loading animations follow a bounded
  reduced-motion policy.
- **Theme**: the supported application theme is light only. The dark pictogram
  variant is artwork for a dark surface, not dark application support.

The component pages document reviewed source compositions with explicit
accessibility adaptations, so the bundled source font does not make them a
pixel-identical certification of the Figma frames.
