<!-- component-rules:start -->

## Component Rules

- On desktop place the drawer on the right at the fixed panel width — 416px in code, a 1px residue against the 417px source.
- On mobile compose a full-width bottom sheet anchored to the bottom edge; keep 24px of empty space at its top and let the body scroll inside the viewport.
- At the SM breakpoint keep the desktop placement and width, with the title on the mobile type scale.
- Use the drawer for additional details about an object, or to select and insert elements that affect the main page, such as adding from a library.
- Keep the action row anchored to the bottom of the panel: only the content scrolls, the actions stay visible.

<!-- component-rules:end -->

`Drawer` is built on Base UI's `Drawer`. Base UI has no `direction`: the library
prop (`"top" | "right" | "bottom" | "left"`, default `"right"`) maps to the
dismiss gesture plus the panel geometry of that edge. Focus trap, Escape, scroll
lock, outside press, focus restoration to the trigger, the slide from the panel's
edge and the backdrop fade come from the Dialog core. The slide and fade follow
the swipe without a transition while dragging, and are removed under reduced
motion.

The title is the drawer's accessible name. The optional header `icon` is
decorative, `description` is associated supporting copy, and `footer` holds the
actions (full width when stacked, intrinsic and end-aligned from `sm`). The close
button is a native icon button with an accessible name. The title keeps the
mobile type scale through the tablet range and switches to the desktop title
scale from the `tablet-md` device step.

`direction` stays caller-owned: the component does not choose a bottom sheet on
mobile. The drag-handle pill appears only when the drawer opens from the bottom
edge and is decorative.
