# The device loop

1. **Order device work.** The inventory records the devices each set declares;
   `pnpm ui-cli parity source <setId>` reads the variant's box per device. `any`
   values carry no device axis.
2. **Read each device's tree** at `--depth 3` or with `get_screenshot`: which
   layers disappear, which sizes and gaps change, one band or a stack.
3. **Compare per device**, one run each: `pnpm ui-cli align <nodeId> --device
   <name>` reads the target and the declared devices, resolves the declared width
   and viewport together, then refines its story, state and subjects
   ([commands](../commands.md)). Name `--device` or `--variant` explicitly;
   without one you are measuring the frame the story happens to draw.
4. **Diff device by device**: a layer hidden on one device is not a delta on
   another.
5. **Close each device on its own terms.** A declared device is compared once per
   declared device in the session that aligns the node; the run writes nothing, so
   the device verdict is the numbers you report, not an entry anyone can read
   later.

**Done when** every declared device has a closing run with no unexplained delta —
each remaining residue carrying a reason — or the divergence is recorded as a
justified exception in the device policy.

## No ration, no burn-down

- A node owes no comparison the repository does not store: `check:catalogue`
  validates the device vocabulary and fails a value it cannot resolve, never a
  node that lacks a device case. Nothing accumulates, so there is no coverage
  count, no queue and no draft to promote.
- The device dimension is an instruction, not a denominator. Read the declared
  devices from the inventory, compare on each of them, and say in the report which
  device each result was measured on.
- Three devices and `any`: add an alias, never a fourth device class.

## What a reviewer decides

The checks own the mechanics — a `container`-scoped story that draws no frame
fails `story-collapsed`, and the foundation check rejects the unsafe centring.
What remains is judgement:

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
- **The story draws the frame the capture measures.** A `container`-scoped
  comparison forces the story root to the source width, so a story rendering under
  the global `centered` layout shows a composition the source never draws. Wrap it
  in `SourceFrame` (`apps/storybook/src/support/source-frame.tsx`) with
  `layout: "fullscreen"`; the helper reads the width from the generated inventory
  and the committed device policy, so no story copies a source number and no
  component grows a width prop. A story that draws no frame is a capture failure
  to fix in the story, not a width to hardcode.
- **Story tests run at one viewport.** Device verification is the per-device run
  and `library:check`'s narrow-viewport assertions, never a source width encoded
  as a component dimension.
