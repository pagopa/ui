`Spinner` maps Figma's `Brand=Primary` (the default) and `Brand=Contrast` to
`variant="primary"` and `variant="contrast"`. Its default `md` size is the
source's; `sm` and `lg` are library size extensions. The contrast variant uses
the white contrast token, so place it on a caller-owned dark or brand surface.
The source's conic ring and rounded terminal are decorative and hidden from
assistive technology by default. An explicit `label` opts into a polite
`status`; label only the spinner that owns the announcement, and keep
`aria-busy` on the caller-owned region being updated. For dynamically changing
loading states, prefer a stable caller-owned status region rendered before its
message changes. The activity animation stays active under reduced motion,
matching the functional loading-indicator exception.
