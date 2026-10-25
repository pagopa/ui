# Devices — the `Device`/`Breakpoint` axis is part of the contract

A published set that declares a device axis draws one composition per device.
The alignment covers every declared device, each read from its own variant and
captured at that variant's width; the mobile composition is never inferred from
the desktop one. Nothing here is keyed by a component: the devices come from the
set's axis, the width from the variant's box, the technique from the case.

## Vocabulary

`catalog.devicePolicy` maps every declared axis value (`Desktop`, `MDDesktop`,
`XS Mobile`, `Device5`, …) to `mobile`, `tablet`, `desktop`, or `any` (one
composition everywhere, no case needed). An axis is a device axis by its values,
not its name. The policy is vocabulary only: never a component name, path or
decision.

| Device    | Capture width          | The implementation uses                                         |
| --------- | ---------------------- | --------------------------------------------------------------- |
| `desktop` | the variant's box      | the row composition                                             |
| `tablet`  | the variant's box      | the desktop or the mobile composition: pick and record          |
| `mobile`  | the variant's box      | the collapsed composition                                       |
| `any`     | —                      | one composition everywhere                                      |

The capture width is read from the variant (`nodeSpec(variant).box.width`); the
policy holds a canonical width only for an alias that carries none. A new source
alias goes into the policy; `pnpm nx run pagopa-ui-cli:figma:devices --check` fails until it resolves.
Errors: an unmapped value, a duplicate alias, an unused axis. Warnings: an unused
alias, a device-like value on a non-device axis.

## Two scopes, declared per case and verified

- **viewport** — the page width decides: a surface used once per page and
  spanning it (chrome bands, full-width panels, page-level states). Media
  queries (`max-sm:`, `sm:`, `md:`); the device width is the capture viewport.
- **container** — the space the component receives decides: a module inside a
  column, card, panel or drawer. Container queries (`@container/*`,
  `@max-[…]/*`); the capture sets the root width and keeps the viewport wide.

Decide by one question: **can the component's own width differ from the page
width?** Always the page → viewport. A caller can place it in a narrow column of
a wide page → container; then a source mobile variant describes the narrow
container, not the page. A full-width page is `viewport` even if the container
probe also moves.

`check` verifies the declaration: a `viewport` case must change when only the
viewport changes, a `container` case when only the root width changes at a fixed
viewport. A mismatch is a `responsive.scope.*` finding. Do not declare
`layoutScope` when a prop (orientation, direction, device) picks the composition
or when every device draws one composition; write the reason in the case note.

## The loop

1. **List the variants.** `node packages/ui-cli/src/cli.ts parity source <setId> --depth 1`
   (or `variantsOf()`): each variant's device and box. `any` values need no case.
2. **Read each device's tree** at `--depth 3` or with `get_screenshot`: which
   layers disappear, which sizes and gaps change, one band or a stack.
3. **Capture per device**: `pnpm nx run pagopa-ui-cli:figma:parity:check --node <id> --device <key>`
   (or `--variant <nodeId>`); the viewport follows the variant's width.
4. **Diff device by device**: a layer hidden on one device is not a delta on
   another.
5. **Save one case per device** with its `device` and its own width and viewport,
   the scope declared when the default does not fit.

**Done when** `pnpm nx run pagopa-ui-cli:figma:parity:check --node <id> --devices` shows a reviewed,
passing case for every declared device, or `catalog.deviceExceptions` carries a
reasoned entry for the missing ones.

## Coverage and the burn-down

- An `implemented` node needs one reviewed case per declared device, or a
  reasoned `catalog.deviceExceptions` entry. `figma:check` fails a node that
  enters the live delta or is newly closed `implemented` without it; drift runs
  themselves are never blocked, the gate reads final statuses.
- The historical gap is one `figma:check` warning. Burn it down with
  `pnpm nx run pagopa-ui-cli:figma:parity:queue --uncovered` → `pnpm nx run pagopa-ui-cli:figma:parity:cases --sync` →
  refine each draft → `check --devices`. Drafts never count as coverage.
- The exception list only shrinks: `figma:check` fails an entry whose node no
  longer misses a device.
- The work list is generated; never write a hand-made list of components.
- A case lands after its reviewed render. A case with copied selectors that
  only silences the queue is worse than a missing one.
- Three devices and `any`: add an alias to the policy, never a fourth device
  class or a per-breakpoint matrix.

## Traps

### The first variant is the desktop one

`variantsOf()[0]` and a `check` without `--state`/`--device` return the set's
first child, a desktop variant in every set of this file. A review that does not
name the device reviews the desktop twice. `--device mobile` resolves through
the policy; `--state mobile` is the raw substring escape hatch.

### `visible: false` is the device contract

Hiding a layer is per variant, inside the tree. Read
`node.children[].visible` for every device (`nodeSpec()` does not carry it) and
expect a mobile variant to drop whole blocks: a text stack replaced by its
avatar, a labelled link by its icon, a chevron. A size-only diff misses all of
it.

### A stale screenshot lies

A saved set render or a hand-made PNG can predate the pin and show a layer the
pin marks hidden. The pinned export is the truth: re-shoot with the read-only
MCP `get_screenshot` when the two disagree. The Design-panel thumbnail is never
evidence.

### The device is a composition, not a width

Some mobile variants are drawn 848–1200px wide. The axis value names the
composition; a wide frame does not make it the desktop one.

### Hidden per device is not hidden in the DOM

Artwork one device drops (`hidden sm:block`) is expected to be `display:none` in
the other capture. The defect is the inverse: content clipped
(`scrollWidth > clientWidth`), painted outside its container, or ellipsised with
no reason.

### Collapsed content keeps its accessible name

- Collapsing text stays in the DOM as `sr-only` and returns above the breakpoint
  (`sr-only sm:not-sr-only sm:flex`, or the container equivalent).
- A link collapsing to its icon keeps its label as `sr-only`; a link that also
  carries an avatar paints the avatar collapsed and the icon above it.
- The accessible name never degrades to an avatar `alt` or an icon.

### A band stays one band

Read from the spec whether the root children lie on one axis (a row) or stack.
A single-row source rendered on two lines is a defect; a stack rendered as a row
is too. The growing slot is `min-w-0 flex-1`, the caller-owned trailing slot
`shrink-0`, and text truncates last: the trailing action never gives way. On
mobile stack only the group the source stacks, never the whole band.

### `min-h` and the divider share the box

Preflight is `box-sizing: border-box`: a `min-h` and the element's own 1px
`border-b` together make the source band height. Split across two elements, the
band gains a pixel. Source band = content + divider.

### `justify-center` with overflow hides the first item

A centred scrollable list loses its start beyond the scroll origin. Use
`justify-center-safe`.

### A narrow container is not a narrow viewport

A viewport-scoped surface keeps its desktop composition in a narrow column of a
wide page, by design: shrinking only a container tests nothing, set the page
viewport. The inverse is a defect: a container-scoped module that reads the
viewport collapses inside a wide card.

### Pointer targets in bands

Rows keep the source line heights and take the 44px target from the invisible
`::after` expansion (grep `after:-inset-y`). A `min-h` that inflates a row in a
list band is rhythm drift.

### `sr-only` boxes are not overflow

Before calling something clipped, skip: `.sr-only` subtrees, container-variant
`sr-only` classes (they compile outside the literal class name), content inside
`details:not([open])`, `content-visibility: hidden`, `position: fixed` subtrees,
and elements whose own `overflow` is `auto|scroll` (`scrollable`, not clipped).
Without that allowlist a sweep is mostly noise.

### The tablet device has no exact breakpoint

Source tablet frames and the library breakpoints (`sm` 640, `md` 768) do not
coincide. Decide per case — viewport for a page surface, container for a module —
and record the choice in the registry note or the case. With several tablet
frames, take the one nearest the midpoint above `sm` and skip frames that
exercise the same branch. Never add a breakpoint for a variant nobody renders.

### Story tests run at one viewport

The Storybook test project sets no viewport, so every story test runs one
desktop composition. Device verification is `check --devices` and the
narrow-viewport assertions of `library:check`, never a `play()` test that does
not set its own viewport. Never encode a source frame width as a component
dimension: force the root width in the capture.

## Reporting

Per node: the declared devices · one capture per device (source width, height or
band height) · the per-device verdict · residues with reasons · the cases saved.
"Responsive" without a render at the source mobile width is an unverified claim.
