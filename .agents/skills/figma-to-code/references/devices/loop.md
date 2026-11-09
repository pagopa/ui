# The device loop

1. **Order device work.** `pnpm ui-cli parity align --node <setId>` lists declared
   devices, source variants and exact check commands; `parity source` reads the
   variant's box. `any` values need no device case.
2. **Read each device's tree** at `--depth 3` or with `get_screenshot`: which
   layers disappear, which sizes and gaps change, one band or a stack.
3. **Capture per device** with the generated command, refining its story, state
   and subjects. Name `--device` or `--variant` explicitly.
4. **Diff device by device**: a layer hidden on one device is not a delta on
   another.
5. **Save one case per device** with its `device`, its own width and viewport, and
   the scope declared when the default does not fit.

**Done when** `pnpm ui-cli parity check --node <id> --saved` shows a reviewed
passing case for every declared device, or `catalog.deviceExceptions` carries a
reasoned entry for the missing ones.

## Coverage and the burn-down

- An `implemented` node needs one reviewed case per declared device or a reasoned
  exception. `check:catalogue` fails a node entering the live delta or newly closed
  `implemented` without it; drift runs are never blocked.
- The historical gap is one warning. Burn it down with
  `pnpm ui-cli parity queue --uncovered` → `parity cases --sync` → refine each
  draft → `check --devices`. Drafts never count as coverage, the exception list
  only shrinks, and the work list is generated: never write a hand-made list of
  components. A case with copied selectors that only silences the queue is worse
  than a missing one.
- Three devices and `any`: add an alias, never a fourth device class.

## What a reviewer decides

The checks own the mechanics — `align` prints the per-device command, a
`container`-scoped story that draws no frame fails `story-collapsed`, and the
foundation check rejects the unsafe centring. What remains is judgement:

- **`visible: false` is the device contract.** Read `node.children[].visible` for
  every device and expect a mobile variant to drop whole blocks: a text stack
  replaced by its avatar, a labelled link by its icon, a chevron.
- **The device is a composition, not a width.** Some mobile variants are drawn
  848–1200px wide; the axis names the composition, not the frame size.
- **Hidden per device is not hidden in the DOM.** Artwork one device drops
  (`hidden tablet:block`) is expected to be `display:none` in the other capture.
  The defect is the inverse: content clipped or painted outside its container.
- **Collapsed content keeps its accessible name.** Collapsing text stays in the
  DOM as `sr-only` and returns above the breakpoint; a link collapsing to its icon
  keeps its label as `sr-only`, never an avatar `alt` or an icon.
- **A band stays one band.** Read from the spec whether the root children lie on
  one axis or stack: a single-row source rendered on two lines is a defect, and so
  is the inverse. The growing slot is `min-w-0 flex-1`, the trailing slot
  `shrink-0`, and text truncates last. On mobile stack only what the source stacks.
- **`min-h` and the divider share the box.** Preflight is
  `box-sizing: border-box`: a `min-h` and the element's own 1px `border-b` make the
  source band height together; split across two elements, the band gains a pixel.
- **The story draws the frame the capture measures.** A `container`-scoped case
  forces the story root to the source width, so a story rendering under the global
  `centered` layout shows a composition the source never draws. Wrap it in
  `SourceFrame` (`apps/storybook/src/support/source-frame.tsx`) with
  `layout: "fullscreen"`; the helper reads the width from
  `src/catalog/figma/parity-cases.json`, so no story copies a source number and no
  component grows a width prop. A story that draws no frame is a capture failure
  to fix in the story, not a baseline entry to add.
- **Story tests run at one viewport.** Device verification is `check --devices`
  and `library:check`'s narrow-viewport assertions, never a source width encoded
  as a component dimension.
