# ProgressLoader

`ProgressLoader` implements the component set `236:1311`; its only required
variant is `Status=Default` (`236:1312`). `FigmaDefault` renders the source
composition at an evidence viewport; the runtime bar remains width-responsive,
and the artboard width is not a fixed component width.

## Behavior and accessibility

- An omitted `value` renders the source's indeterminate indicator and retains
  the existing pulse motion. Reduced-motion preferences stop that animation.
- A numeric `value` is clamped to 0–100 and rendered through the shared
  progress primitive with an accessible value.
- `showLabel` controls the visible label/value row. Hiding the row keeps the
  progressbar's accessible name and applies the source's padded bar layout.
- The track and indicator are decorative; the progressbar exposes its role,
  name and determinate or indeterminate state.

The source colors use the existing secondary/primary tokens with no delta. The
label layout's spacing tokens remain a library extension; the `Matrix` story's
constrained wrapper is story-only and does not impose a runtime width on the
component.
