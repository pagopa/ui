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

`SpinnerBrandVariants` is the parity surface: `109-2455-primary` and
`109-2455-contrast` compare both `Brand` variants at 24×24, the source's 2px
ring with the 20px opening and the `Ellipse 8 (Stroke)` terminal measuring
2.09×3.41 at 21.91/9.59. The ring is a conic-gradient: its colour is reviewed in
the render, not read from a background property. The capture is static because
the 1s activity animation is functional.
