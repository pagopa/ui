`Spinner` maps the source `Brand=Primary` and `Brand=Contrast` to
`variant="primary"` and `variant="contrast"`. The contrast variant paints the
white contrast token, so it belongs on a caller-owned dark or brand surface.
`size` defaults to `md`, with `sm` and `lg` as library extensions.

The ring is decorative and hidden from assistive technology. An explicit `label`
opts into a polite `status`; label only the spinner that owns the announcement
and keep `aria-busy` on the caller-owned region being updated. When a loading
state changes its message, prefer a stable caller-owned status region rendered
before the message changes. The activity animation keeps running under reduced
motion, as the functional loading-indicator exception allows.
