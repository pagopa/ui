# Design request — TimelineDrawer mobile edge and header rhythm

- Type: design
- Issue: https://github.com/pagopa/ui/issues/39
- Status: open — the node stays `pending`
- Decision owner: @gunzip
- Preview: https://proud-wave-056050103-19.westeurope.5.azurestaticapps.net/?path=/story/reviews-timeline-drawer-width-and-mobile--option-a / https://proud-wave-056050103-19.westeurope.5.azurestaticapps.net/?path=/story/reviews-timeline-drawer-width-and-mobile--option-b / https://proud-wave-056050103-19.westeurope.5.azurestaticapps.net/?path=/story/reviews-timeline-drawer-width-and-mobile--option-c

Date: 21 October 2026. Origin: the alignment wave, node
`1333:16408`. Figma was not modified: the measurements below come from the
pinned inventory, the registry note and the current render.

The node stays `pending`; the desktop case is not committed yet. The
implementation is
[timeline-drawer.tsx](../../packages/pagopa-ui/src/components/overlays/timeline-drawer.tsx),
which composes
[drawer.tsx](../../packages/pagopa-ui/src/components/overlays/drawer.tsx) and the
primitive
[drawer.tsx](../../packages/pagopa-ui/src/components/primitives/drawer.tsx); the
story is
[TimelineDrawer.stories.tsx](../../apps/storybook/src/TimelineDrawer.stories.tsx).

## Why

The source set declares a real `Device` axis, so the node needs one verified
case per device. The shell now matches the source on the shared 416 width (a 1px
residue against 417, the same as the reviewed Drawer), the title and the
pictogram. Two composition decisions are still open: the mobile edge and the
24px head-to-description rhythm. The width question recorded earlier as OV4 is
therefore already resolved by the current primitive; confirm it rather than
reopen it.

## Evidence

| Item          | Source                                                                                    | Current code                                                                                                                                                                                                                                                              |
| ------------- | ----------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Desktop panel | `1333:16406`, 417 wide (24 + 369 content + 24), 2294 high                                 | the primitive right panel uses `w-104` = 416 with `max-w-full`: a 1px residue, the same accepted residue as the Drawer source `1278:6527`                                                                                                                                 |
| Mobile panel  | `1333:16407`, 320 wide, 2136 high, bottom sheet with 16px top radii                       | the primitive supports `direction="bottom"`: `inset-x-0 bottom-0 max-h-dvh rounded-t-xl`, scrollable body. `TimelineDrawer` does not expose `direction`, so the default stays a right-edge panel; a right panel at 320 is full width (`max-w-full`) but has no top radius |
| Header rhythm | head-to-description gap 24 (description top 88 against 72)                                | `DrawerHeader` uses `gap-2` = 8 (the Drawer source's own 8px rhythm)                                                                                                                                                                                                      |
| Title         | Bold face, 24/32 desktop, 18/28 mobile                                                    | `text-title-xs-mobile md:text-title-xs` (the mapped Bold face)                                                                                                                                                                                                            |
| Fixture       | two timeline items, with source chips, per-item actions and a right-aligned footer action | the `Playground` story draws two items without those slots; this is a story gap, not a design question                                                                                                                                                                    |

The Drawer source (`1278:6527`) records the 416 width with a 1px residue and a
header gap of 8, so a shared header change would reopen that node.

## Questions

1. **Shared width.** Confirm 416 (`w-104`) for both Drawer and TimelineDrawer
   and the 1px residue against the 417 source. This is the current code and the
   reviewed Drawer measurement; the alternative is a new 417-exact value, which
   breaks the shared drawer width for a single pixel.
2. **Mobile edge.** The source mobile is a bottom sheet; the current
   `TimelineDrawer` is a right-edge panel and does not expose `direction`.
   - **A (recommended):** expose `direction` on `TimelineDrawer` (pass it to
     `Drawer`) and add a `SourceMobile` story that opens it from the bottom. The
     caller keeps the choice; the source composition becomes reproducible.
   - **B:** keep `direction` internal to `Drawer` and require the caller to
     compose `Drawer` directly for the bottom sheet; `TimelineDrawer` is then a
     right-edge-only helper. Record the source mobile as a caller choice.
   - **C:** make the default responsive (bottom below `sm`, right above). This
     adds a viewport decision inside the component and needs a separate
     accessibility review.
3. **Header rhythm.** The source head-to-description gap is 24; the shared
   Drawer header uses 8.
   - **A (recommended):** treat 24 as a TimelineDrawer composition: render the
     description as the first body block with a 24px gap, leaving the Drawer
     header at 8 so the reviewed Drawer source does not reopen.
   - **B:** change the shared Drawer header to 24 and re-review `1278:6527`
     against its own source. Use this only if both drawers share the rhythm.
   - **C:** add a `headerGap` prop. This makes a source rhythm caller-owned and
     needs a new API decision.
4. **Bottom-sheet height.** The mobile source is 2136 high; the primitive uses
   `max-h-dvh` with a scrollable body.
   - **A (recommended):** keep `max-h-dvh` and the inner scroll; the sheet can
     cover the viewport and the timeline scrolls.
   - **B:** cap the sheet below the viewport (for example 80vh) to keep the page
     visible. This is a new source rule; confirm only if the source intends it.

## What we are asking for, in short

1. Confirm the shared 416 width and the 1px residue (OV4 is resolved by the
   current primitive).
2. Confirm whether `TimelineDrawer` exposes `direction` for the mobile bottom
   sheet or stays right-edge only.
3. Confirm the 24px head-to-description rhythm and whether it is a
   TimelineDrawer composition or a shared Drawer change.
4. Confirm `max-h-dvh` with an inner scroll for the mobile sheet.

## Unblock

After the decisions: update the component and the `SourceDesktop`/`SourceMobile`
stories, capture one case per device, save them with `--save-case`, update the
registry note and set `implemented` only when both cases verify. If the
decisions go against the source, record the residue and its reason in the case
and in the registry note.
