`ProgressLoader` implements the source `Status=Default` bar and stays width
responsive: the bar has no fixed width.

## Behavior and accessibility

- An omitted `value` renders the indeterminate indicator and retains the pulse
  motion. Reduced-motion preferences stop that animation.
- A numeric `value` is clamped to 0-100 and rendered through the shared progress
  primitive with an accessible value.
- `showLabel` controls the visible label/value row; hiding the row keeps the
  progressbar's accessible name.
- The track and indicator are decorative; the progressbar exposes its role,
  name and determinate or indeterminate state.

The label row and the determinate `value` path are library extensions with no
source variant.
