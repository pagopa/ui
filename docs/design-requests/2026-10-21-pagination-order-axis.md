# Design request — Pagination `Order`: page position, compact state or device

Date: 21 October 2026. Origin: flow A/E, milestone M5
([figma-fidelity-and-drift.md](../plans/figma-fidelity-and-drift.md)), node
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

## What we are asking for, in short

1. Confirm whether `Mobile` is a content state (recommended), a width behavior
   or a real device axis.
2. If a state: confirm the `layout="compact"` prop and split `Order` into page
   position and layout (recommended), or rename `Mobile` to `Compact`.
3. Confirm the compact composition (previous, current, next; no numbers, no
   ellipsis).
4. Confirm the container threshold and the future of the device-policy
   exception.

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
