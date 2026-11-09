# Two scopes, declared per case and verified

- **viewport** — the page width decides: a surface used once per page and
  spanning it (chrome bands, full-width panels, page-level states). Media queries
  (`tablet:`, `tablet-md:`, `desktop:`, `desktop-xl:`, `desktop-xxl:`); the device
  width is the capture viewport.
- **container** — the space the component receives decides: a module inside a
  column, card, panel or drawer. Container queries (`@container/*`,
  `@max-[…]/*`); the capture sets the root width and keeps the viewport wide.

Read the viewport breakpoint values from the token layer: the Figma scale, not
Tailwind defaults. The theme resets Tailwind's scale, and the foundation check
rejects `sm:`, `md:`, `lg:`, `xl:`, `2xl:` and their `max-` forms
(`default-breakpoint`).

Decide by one question: **can the component's own width differ from the page
width?** Always the page → viewport. A caller can place it in a narrow column of
a wide page → container; then a source mobile variant describes the narrow
container, not the page. A full-width page is `viewport` even if the container
probe also moves.

`parity check` verifies the declaration: a `viewport` case must change when only
the viewport changes, a `container` case when only the root width changes at a
fixed viewport. A mismatch is a `responsive.scope.*` finding. Do not declare
`layoutScope` when a prop (orientation, direction, device) picks the composition
or when every device draws one composition; write the reason in the case note.

## Two judgement calls the checks cannot make

**A narrow container is not a narrow viewport.** A viewport-scoped surface keeps
its desktop composition in a narrow column of a wide page, by design: shrinking
only a container tests nothing, so set the page viewport. The inverse is a defect:
a container-scoped module that reads the viewport collapses inside a wide card.

**The tablet device has no exact frame width.** A source tablet frame is drawn at
its design width, which need not coincide with the token breakpoint. Decide per
case — viewport for a page surface, container for a module — and record the choice
in the registry note or the case. With several tablet frames, take the one nearest
the midpoint above `tablet` and skip frames that exercise the same branch. Never
add a breakpoint for a variant nobody renders.
