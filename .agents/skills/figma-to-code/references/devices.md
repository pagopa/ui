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
alias goes into the policy; `pnpm nx run pagopa-ui-cli:check:devices` fails until it resolves.
Errors: an unmapped value, a duplicate alias, an unused axis. Warnings: an unused
alias, a device-like value on a non-device axis.

## Two scopes, declared per case and verified

- **viewport** — the page width decides: a surface used once per page and
  spanning it (chrome bands, full-width panels, page-level states). Media
  queries (`tablet:`, `tablet-md:`, `desktop:`, `desktop-xl:`, `desktop-xxl:`);
  the device width is the capture viewport.
- **container** — the space the component receives decides: a module inside a
  column, card, panel or drawer. Container queries (`@container/*`,
  `@max-[…]/*`); the capture sets the root width and keeps the viewport wide.

Read the viewport breakpoint values from the token layer: the Figma scale,
not Tailwind defaults. The theme resets Tailwind's scale, and the foundation
check's `default-breakpoint` rejects `sm:`, `md:`, `lg:`, `xl:`, `2xl:` and
their `max-` forms.

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

1. **Order device work.** `pnpm ui-cli parity align --node <setId>`
   lists declared devices, source variants and exact check commands. Read the
   variant's box with `parity source`. `any` values need no device case.
2. **Read each device's tree** at `--depth 3` or with `get_screenshot`: which
   layers disappear, which sizes and gaps change, one band or a stack.
3. **Capture per device** with the generated command, refining its story/state
   and subjects. Name `--device` or `--variant` explicitly; the viewport follows
   the variant's width.
4. **Diff device by device**: a layer hidden on one device is not a delta on
   another.
5. **Save one case per device** with its `device` and its own width and viewport,
   the scope declared when the default does not fit.

**Done when** `pnpm ui-cli parity check --node <id> --saved` shows a reviewed,
passing case for every declared device, or `catalog.deviceExceptions` carries a
reasoned entry for the missing ones.

## Coverage and the burn-down

- An `implemented` node needs one reviewed case per declared device, or a
  reasoned `catalog.deviceExceptions` entry. `check:catalogue` fails a node that
  enters the live delta or is newly closed `implemented` without it; drift runs
  themselves are never blocked, the gate reads final statuses.
- The historical gap is one `check:catalogue` warning. Burn it down with
  `pnpm ui-cli parity queue --uncovered` → `pnpm ui-cli parity cases --sync` →
  refine each draft → `check --devices`. Drafts never count as coverage.
- The exception list only shrinks: `check:catalogue` fails an entry whose node no
  longer misses a device.
- The work list is generated; never write a hand-made list of components.
- A case lands after its reviewed render. A case with copied selectors that
  only silences the queue is worse than a missing one.
- Three devices and `any`: add an alias to the policy, never a fourth device
  class or a per-breakpoint matrix.

## Traps

### The first variant is the desktop one

An unscoped `check` can select the first variant rather than the intended
device. Follow `align`'s explicit per-device command. `--device mobile` resolves through
the policy; `--state mobile` is the raw substring escape hatch.

### `visible: false` is the device contract

Hiding a layer is per variant, inside the tree. Read
`node.children[].visible` for every device (`nodeSpec()` does not carry it) and
expect a mobile variant to drop whole blocks: a text stack replaced by its
avatar, a labelled link by its icon, a chevron. A size-only diff misses all of
it.

### The device is a composition, not a width

Some mobile variants are drawn 848–1200px wide. The axis value names the
composition; a wide frame does not make it the desktop one.

### Hidden per device is not hidden in the DOM

Artwork one device drops (`hidden tablet:block`) is expected to be `display:none` in
the other capture. The defect is the inverse: content clipped
(`scrollWidth > clientWidth`), painted outside its container, or ellipsised with
no reason.

### Collapsed content keeps its accessible name

- Collapsing text stays in the DOM as `sr-only` and returns above the breakpoint
  (`sr-only tablet:not-sr-only tablet:flex`, or the container equivalent).
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

- A centred scrollable list uses `justify-center-safe`; the foundation check
  rejects the unsafe form (`center-overflow`).

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

### The tablet device has no exact frame width

A source tablet frame is drawn at its design width, which need not coincide with
the token breakpoint. Decide per
case — viewport for a page surface, container for a module — and record the
choice in the registry note or the case. With several tablet frames, take the one
nearest the midpoint above `tablet` and skip frames that exercise the same
branch. Never add a breakpoint for a variant nobody renders.

### Story tests run at one viewport

The Storybook test project sets no viewport, so every story test runs one
desktop composition. Device verification is `check --devices` and the
narrow-viewport assertions of `library:check`, never a `play()` test that does
not set its own viewport. Never encode a source frame width as a component
dimension: force the root width in the capture.

### The story draws the frame the capture measures

A `container`-scoped case forces the story root to the source width before it
measures, so the capture is right even when the story renders something else:
the global `centered` layout shrinks the root to a few pixels, every
`@container` variant flips to its tight branch, and the reader — and the visual
snapshot — see a composition the source never draws. The two renders must be
one. A story whose parity case is `container`-scoped wraps its composition in
`SourceFrame` (`apps/storybook/src/support/source-frame.tsx`) and declares
`layout: "fullscreen"`; the helper reads the width from
`src/catalog/figma/parity-cases.json`, so no story copies a source number and no
component grows a width prop.

```tsx
parameters: { layout: "fullscreen" },
// the node id and the device are the case's own: never copied, never a literal
render: (args) => (
  <SourceFrame nodeId={caseNodeId} device="desktop">
    <Story {...args} />
  </SourceFrame>
),
```

`parity capture` reads `[data-source-frame]` before forcing anything and fails
`story-collapsed` when a container-scoped story draws no frame or draws one that
is none of its node's case widths. The stories that still owed one were listed
in `src/catalog/figma/frame-baseline.json`, and the list is empty: the corpus
paid that debt one composition at a time. A story that draws no frame today is a
capture failure to fix in the story, not an entry to add — `check parity` fails
when an entry outlives the debt it records, so the file cannot quietly refill.

A surface that paints its own backdrop — a dialog template, a full-page
template — is a frame too: the panel inside it answers the frame width (the
`@container` query on the page element), so the story draws the frame exactly
as a card does, one `SourceFrame` per device story. `max-width: 100%` keeps the
same story usable at the narrower device of its node, where the capture forces a
root below the declared width.

The [completion report](definition-of-done.md#closing-and-delivery) includes
each device's source dimensions, saved cases and verdict; "responsive" without
its source-width render remains unverified.
