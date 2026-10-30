# Design request — Pagination `Order`: page position, compact state or device

- Node: [Pagination](https://www.figma.com/design/pvhsJpPGQbEwNLiyP7BOIw?node-id=127-1510) (`127:1510`)
- Type: design
- Issue: https://github.com/pagopa/ui/issues/37
- Preview: https://proud-wave-056050103-19.westeurope.5.azurestaticapps.net/?path=/story/reviews-pagination-order-axis--option-a / https://proud-wave-056050103-19.westeurope.5.azurestaticapps.net/?path=/story/reviews-pagination-order-axis--option-b / https://proud-wave-056050103-19.westeurope.5.azurestaticapps.net/?path=/story/reviews-pagination-order-axis--option-c
- Status: open — the node stays `pending`
- Decision owner: Figma design owner
- Updated: 22 October 2026 — questions 5 to 7 added after the source review;
  the element sizes and the narrow-canvas overflow are fixed (see "Already fixed").

Date: 21 October 2026. Origin: the alignment wave, node
`127:1510`. Figma was not modified: the measurements below come from the
pinned inventory, the registry note and the current render.

The node stays `pending`; the M1 device-policy exception (`ignoredValues`) will
keep the `figma:check` warning out of the output until this decision is made. The
implementation is
[pagination.tsx](../../packages/pagopa-ui/src/components/navigation/pagination.tsx);
the story is
[Pagination.stories.tsx](../../apps/storybook/src/Pagination.stories.tsx). The
device vocabulary is documented in
[0004-device-axis.md](../decisions/0004-device-axis.md).

## Why

The source set has one `Order` variant axis with four values:
`First page`, `Last page`, `Mobile` and `Second page and more`. The first, second
and last values describe the page position; `Mobile` describes a compact
composition. Because `Mobile` is also a device name, the device checker reports
the axis as a mixed axis. The current component is container-driven: it hides
the non-current page buttons and the ellipsis below the `@max-narrow/pagination`
container threshold and has no `Order` prop.

## Evidence

| Variant                      | Node       | Box    |
| ---------------------------- | ---------- | ------ |
| `Order=First page`           | `126:5056` | 836x46 |
| `Order=Second page and more` | `127:1511` | 836x46 |
| `Order=Last page`            | `127:1535` | 836x46 |
| `Order=Mobile`               | `130:1899` | 836x46 |

All four variants are 836x46. The `Mobile` value is therefore not a device
frame: it is a compact presentation at the same width. The code, however,
selects the compact composition from the container width
(`@max-narrow/pagination`); at 836 the current render would show the full page
list, not the compact one. The source state and the code's trigger do not match
yet.

## Questions

1. **Is `Mobile` a state or a width behavior?**
   - **A (recommended): a content state.** The compact composition is selected
     by a `layout="compact"` prop, reproducible at the source's 836 width; the
     container query stays the fallback for genuinely narrow containers. This
     matches a state axis and makes the source case verifiable without pretending
     the frame is narrow.
   - **B: a width behavior.** The source `Mobile` frame should be a narrow frame
     (for example 320) so the container query triggers; the current 836 frame is
     then a source error to fix.
   - **C: a device axis.** Add a real `Device` axis with separate 320 and 836
     frames. Use this only if the source really draws a device composition; the
     current `Mobile` frame is 836 wide, so this adds a new source frame rather
     than renaming one.
2. **Axis shape.** Which variant names should the source carry?
   - **A (recommended):** split the axis into `Page position` (`First page`,
     `Last page`, `Second page and more`) and `Layout` (`Default`, `Compact`).
     This removes the mixed axis and the device-name collision.
   - **B:** keep `Order` but rename `Mobile` to `Compact`. Fewer variant
     renames, but the page position and the layout remain on one axis.
   - **C:** keep `Order=Mobile` unchanged and record the mixed-axis decision in
     the registry note; the policy exception stays.
3. **Compact composition.** Confirm that the compact state is previous, current
   and next only, with the page numbers and the ellipsis hidden, as the current
   narrow-container behavior does.
4. **Container threshold.** If B (width behavior) or A (prop plus fallback) is
   chosen, confirm the container threshold at which the compact state applies.
   The code uses the `narrow` container token; confirm it or name the correct
   value.

5. **Rows per page.** Every variant draws a `.Rows per page` part
   ([`1504:9763`](https://www.figma.com/design/pvhsJpPGQbEwNLiyP7BOIw?node-id=1504-9763)),
   shown by default (`Show Row per page` = true): on the desktop states the label
   "Rows perpage" (Regular 14/20, #555c70) and a 97x46 select
   ([`1503:9760`](https://www.figma.com/design/pvhsJpPGQbEwNLiyP7BOIw?node-id=1503-9760))
   in a 463px slot with a 12px gap; on `Mobile` the select alone fills a 684px
   slot. The part has its own `Device` axis (`Descktop`, `Mobile`). The page
   group sits after it, right-aligned (365px wide in the desktop states,
   hugging at the right on `Mobile` with a 16px gap). Today the component draws
   neither: the application supplies its own rows-per-page control, and the
   page group is centred in the available width.
   - **A:** rows per page is part of the Pagination contract: the component
     renders it (or offers a slot for it) and right-aligns the page group next
     to it. The part's `Device` axis then becomes a device contract of its own.
   - **B:** rows per page stays an application-owned control, as the tables
     guide states today; the source part is an example of the composition. Then
     confirm whether the page group alone is right-aligned or centred.
6. **Edge page window.** At the first page the source draws `1 2 3 … 101`; at
   the last page `1 … 99 100 101`; at the second page `1 2 3 … 101`. The
   component keeps the current page, its neighbours, the first and the last,
   so it draws `1 2 … 101` at the first page and `1 … 100 101` at the last.
   Confirm that the source keeps three numbered pages at the edges
   (`1 2 3 … N` and `1 … N-2 N-1 N`) for every total, and what happens with a
   short total (for example 4 or 5 pages).
7. **`Show left arrow`.** The set has a `Show left arrow` property (default
   true). The rendered source states draw no previous chevron on `First page`
   and no next chevron on `Last page`, while the component always renders both
   controls and disables the one that cannot move. Confirm whether the edge
   arrow is **hidden** (removed, so the group shifts) or **disabled** (kept in
   place, greyed and not operable), and whether a matching `Show right arrow`
   is meant for the last page.

## What we are asking for, in short

1. Confirm whether `Mobile` is a content state (recommended), a width behavior
   or a real device axis.
2. If a state: confirm the `layout="compact"` prop and split `Order` into page
   position and layout (recommended), or rename `Mobile` to `Compact`.
3. Confirm the compact composition (previous, current, next; no numbers, no
   ellipsis).
4. Confirm the container threshold and the future of the device-policy
   exception.
5. Say whether rows per page belongs to the Pagination contract and whether the
   page group is right-aligned.
6. Confirm the edge page window: `1 2 3 … N` and `1 … N-2 N-1 N`.
7. Confirm whether the edge arrow is hidden or disabled (`Show left arrow`).

## Already fixed

These did not depend on the questions above and were aligned on 22 October 2026:

- **Element sizes.** Each page is 40 wide and hugs its number to 46 high
  (padding 12, radius 8; a three-digit page grows to about 55); previous and
  next are 40x40 with the 2px #e8ebf1 stroke; the ellipsis is 40x40, unstroked
  as in the source. The controls keep a 44px touch target through an invisible
  expansion, so the drawn size matches the source.
- **Narrow canvas.** The Storybook example no longer overflows its canvas at a
  320 viewport.
- The page-position states have their own examples (first, second and last
  page, out of 101 pages), linked to `126:5056`, `127:1511` and `127:1535` and
  framed at the source width of 836, so their outer box matches the 836x46
  variants. The Pagination guide records the source mapping.

## Unblock

After the decision:

- **A:** add the `layout` prop and the compact story, capture the `130:1899`
  state at 836, save the case, update the registry note and set `implemented`.
  Split/rename the source axis; remove the policy exception when the source no
  longer uses `Mobile` as a value.
- **B:** fix the source frame to the narrow width, capture the case at that
  width, save it and keep the container behavior; remove the policy exception
  when the value no longer names a device.
- **C:** add the device frame to the source first (read-only for this
  repository), then add one case per device.
- If the source keeps `Order=Mobile` unchanged, record the mixed-axis decision
  in the registry note and keep the reasoned `ignoredValues` entry; the node can
  still close with a case for the page-position states and the compact state.
- Questions 5 to 7: implement the answered composition (rows per page and the
  group alignment, the edge window in `pageRange` with its unit test, the edge
  arrow), then capture the first, second and last page states at 836 and save
  their cases.
