`Drawer` is built on Base UI's `Drawer`. Base UI has no `direction`: the library
prop (`"top" | "right" | "bottom" | "left"`, default `"right"`) maps to
`swipeDirection` (the dismiss gesture) plus the panel geometry of that edge.
Focus trap, Escape, scroll lock, outside press, focus restoration to the
trigger, the slide from the panel's edge and the backdrop fade come from the
Dialog core the Drawer extends. The slide and fade follow the swipe without a
transition while dragging and are removed under reduced motion.

The title is the drawer's accessible name. The optional header `icon` is the
source pictogram, `description` is associated supporting copy and `footer` holds
the actions (full width when stacked, intrinsic and end-aligned from `sm`). The
close button is a native icon button with an accessible name.

The drag-handle pill is a bottom-sheet-only source affordance: it appears only
when the drawer opens from the bottom edge and is decorative.
