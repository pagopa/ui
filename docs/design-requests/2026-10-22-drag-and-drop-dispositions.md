# Design request — Drag & Drop dispositions and error composition

- Type: design
- Issue: https://github.com/pagopa/ui/issues/42
- Status: open — the node stays `pending`
- Decision owner: @gunzip
- Preview: https://proud-wave-056050103-19.westeurope.5.azurestaticapps.net/?path=/story/reviews-drag-and-drop-dispositions--option-a / https://proud-wave-056050103-19.westeurope.5.azurestaticapps.net/?path=/story/reviews-drag-and-drop-dispositions--option-b / https://proud-wave-056050103-19.westeurope.5.azurestaticapps.net/?path=/story/reviews-drag-and-drop-dispositions--option-c

Date: 22 October 2026. Origin: flow A/E, milestone M5
([figma-fidelity-and-drift.md](../plans/figma-fidelity-and-drift.md)), node
`760:7432`. Figma was not modified: the measurements below come from the pinned
inventory and the read-only source.

The node stays `pending`. The implementation is
[drag-and-drop.tsx](../../packages/pagopa-ui/src/components/inputs/drag-and-drop.tsx);
the story is
[DragAndDrop.stories.tsx](../../apps/storybook/src/DragAndDrop.stories.tsx).

## Why

`Drag & Drop` is the file and logo upload field. The source set declares three
axes — `Status`, `Disposition` and `Type` — and draws one composition per
combination. The component implements the vertical composition only: the
dropzone is always a single column, the `failed` state replaces the idle content
with an icon and a retry action, and the uploaded files live in internal state.
Three source decisions are therefore not answered by the code, and guessing them
would change the public API.

## Evidence

| Variant                                        | Node         | Box     |
| ---------------------------------------------- | ------------ | ------- |
| `Status=Default, Disposition=Vertical`         | `760:7433`   | 272x260 |
| `Status=Default, Disposition=Horizontal`       | `821:30245`  | 608x120 |
| `Status=DragOver, Disposition=Horizontal`      | `821:30252`  | 596x116 |
| `Status=Processing, Disposition=Vertical`      | `821:30256`  | 272x260 |
| `Status=Processing, Disposition=Horizontal`    | `760:7446`   | 548x120 |
| `Status=Failed, Disposition=Vertical`          | `821:30261`  | 272x260 |
| `Status=Failed, Disposition=Horizontal`        | `816:19023`  | 505x120 |
| `Status=Error, Disposition=Vertical`           | `3437:35495` | 272x260 |
| `Status=Error, Disposition=Horizontal`         | `3437:35488` | 596x120 |
| `Status=Success, Disposition=Vertical, File`   | `10508:9105` | 272x118 |
| `Status=Success, Disposition=Horizontal, File` | `760:7462`   | 548x94  |
| `Status=Success, Disposition=Vertical, Avatar` | `1307:15355` | 272x284 |

The vertical dropzone is 272 wide with a 24px inset and a 236px box; the
horizontal one is 548–608 wide with a 96px box, the progress or error content on
the left and the action on the right. The source Default border is drawn dashed;
the numeric spec records only the 1px stroke, so the dash style was read from
the pinned image.

## Questions

1. **What selects the horizontal composition?**
   - **A (recommended): the container width.** The dropzone switches to the
     horizontal disposition above a threshold, like the other container-driven
     modules. Which threshold: the existing `md` container step (448px) or a
     dedicated one near 505px? The source frames are 505–608 wide, so the
     smallest horizontal frame is the lower bound.
   - **B: a caller-owned `disposition` prop.** The caller selects `vertical` or
     `horizontal`; the source width stops mattering. This adds a public prop and
     removes the responsive behaviour.
   - **C: both.** The container query is the default and the prop overrides it.
2. **Is `Error` a separate state from `Failed`?** The source draws an `Error`
   variant with its own icon, message and action beside the `Failed` one. Today
   the component maps the `error` prop to the failed colours and keeps the idle
   content. Is `Error` a validation state (a rejected format, a missing required
   file) with its own copy and action, or the same retry surface as `Failed`?
3. **Which statuses carry the dashed border?** The pinned Default frame has a
   dashed 1px border; Processing draws a solid 1px neutral border. Is the dashed
   border the resting and drag-over contract only, or every non-processing
   status?
4. **Should the uploaded-file list be controllable?** The success File frames
   (272x118 and 548x94) show the selected file row. The component keeps the
   files in internal state, so the state is reachable only after an upload and
   cannot be captured as a static story. Should the component accept a
   controlled file list (and render the row from it), or is the interactive
   upload enough?

## Why it matters

The node is one of the dependencies the Drawer note names, so it cannot close
until these answers are recorded. A guessed threshold produces the wrong
composition at the widths a drawer, a card and a full page give the field; a
guessed `Error` state changes the public props. The node remains `pending` with
this request in its registry note; the vertical Default review is kept in the
note so the answered part does not need re-measuring.

## What is already fixed

- The vertical Default dropzone (`760:7433`): 24px inset, 236px box, the 24px
  upload icon, the 24px content gap, the 132x48 primary action and the 14/20
  required helper at 24px inline padding.
- The 12px content gaps and the 24px icon/action rhythm follow the source; the
  fixture copy is one line where the source wraps to two, a deliberate copy
  adaptation, not a component defect.
- The low-opacity primary fill of the Default dropzone: the numeric source spec
  reads the raw paint hex without its alpha, so the rendered accent token is the
  measured blend; the residue belongs to the spec, not to a component colour.
