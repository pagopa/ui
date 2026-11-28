## 0.1.11 (2026-11-28)

### 🚀 Features

- refactor(styles): evict demo and artboard variables from the published stylesheet ([#194](https://github.com/pagopa/ui/pull/194), [#159](https://github.com/pagopa/ui/issues/159), [#160](https://github.com/pagopa/ui/issues/160), [#161](https://github.com/pagopa/ui/issues/161), [#162](https://github.com/pagopa/ui/issues/162), [#163](https://github.com/pagopa/ui/issues/163), [#164](https://github.com/pagopa/ui/issues/164), [#165](https://github.com/pagopa/ui/issues/165), [#166](https://github.com/pagopa/ui/issues/166), [#167](https://github.com/pagopa/ui/issues/167), [#168](https://github.com/pagopa/ui/issues/168), [#169](https://github.com/pagopa/ui/issues/169), [#170](https://github.com/pagopa/ui/issues/170), [#171](https://github.com/pagopa/ui/issues/171), [#172](https://github.com/pagopa/ui/issues/172), [#173](https://github.com/pagopa/ui/issues/173), [#174](https://github.com/pagopa/ui/issues/174), [#176](https://github.com/pagopa/ui/issues/176), [#177](https://github.com/pagopa/ui/issues/177), [#179](https://github.com/pagopa/ui/issues/179), [#180](https://github.com/pagopa/ui/issues/180), [#181](https://github.com/pagopa/ui/issues/181), [#183](https://github.com/pagopa/ui/issues/183), [#184](https://github.com/pagopa/ui/issues/184), [#185](https://github.com/pagopa/ui/issues/185), [#186](https://github.com/pagopa/ui/issues/186), [#187](https://github.com/pagopa/ui/issues/187), [#188](https://github.com/pagopa/ui/issues/188), [#189](https://github.com/pagopa/ui/issues/189), [#190](https://github.com/pagopa/ui/issues/190))

  `@pagopa/ui/styles.css` declares no custom property that only an artboard, a
  demo grid or a sample-width frame reads: the artboard heights, the frame widths
  and the demo grid columns live in the Storybook preview sheet, so a consumer no
  longer receives geometry no shipped component resolves. The packed-artifact
  check asserts the rule from the sources — a published property the demo
  templates read and no library component does fails the build — so a template-only
  value cannot return to the published contract unnoticed.

- feat(tokens): publish the vendor-neutral `--pui-*` contract as CSS, JavaScript and a DTCG projection ([#194](https://github.com/pagopa/ui/pull/194), [#159](https://github.com/pagopa/ui/issues/159), [#160](https://github.com/pagopa/ui/issues/160), [#161](https://github.com/pagopa/ui/issues/161), [#162](https://github.com/pagopa/ui/issues/162), [#163](https://github.com/pagopa/ui/issues/163), [#164](https://github.com/pagopa/ui/issues/164), [#165](https://github.com/pagopa/ui/issues/165), [#166](https://github.com/pagopa/ui/issues/166), [#167](https://github.com/pagopa/ui/issues/167), [#168](https://github.com/pagopa/ui/issues/168), [#169](https://github.com/pagopa/ui/issues/169), [#170](https://github.com/pagopa/ui/issues/170), [#171](https://github.com/pagopa/ui/issues/171), [#172](https://github.com/pagopa/ui/issues/172), [#173](https://github.com/pagopa/ui/issues/173), [#174](https://github.com/pagopa/ui/issues/174), [#176](https://github.com/pagopa/ui/issues/176), [#177](https://github.com/pagopa/ui/issues/177), [#179](https://github.com/pagopa/ui/issues/179), [#180](https://github.com/pagopa/ui/issues/180), [#181](https://github.com/pagopa/ui/issues/181), [#183](https://github.com/pagopa/ui/issues/183), [#184](https://github.com/pagopa/ui/issues/184), [#185](https://github.com/pagopa/ui/issues/185), [#186](https://github.com/pagopa/ui/issues/186), [#187](https://github.com/pagopa/ui/issues/187), [#188](https://github.com/pagopa/ui/issues/188), [#189](https://github.com/pagopa/ui/issues/189), [#190](https://github.com/pagopa/ui/issues/190))

  `@pagopa/ui/styles.css` declares the `--pui-*` contract, `@pagopa/ui/tokens`
  exports it as data and `@pagopa/ui/tokens.dtcg.json` projects it as DTCG. The
  three carry the same resolved values, so an upstream Figma rename moves none of
  them and a consumer never holds a vendor name. The projection has no
  `primitives` group and no `{alias}` references: `$value` is the literal the
  stylesheet resolves. The contract also covers the container steps the layouts
  read, and a consumer overrides a value by declaring the `--pui-*` property on
  `.pagopa-ui-root`.

  No published artifact names a `--figma-*` property: the build substitutes each
  reference with the primitive it names and strips the primitive declarations, so
  that layer is repository-only and `--figma-*` resolves in this repository and
  nowhere a consumer installs the package.

- feat(icons): render pinned source artwork as tree-shakeable inline SVG components and remove `lucide-react` ([#194](https://github.com/pagopa/ui/pull/194), [#159](https://github.com/pagopa/ui/issues/159), [#160](https://github.com/pagopa/ui/issues/160), [#161](https://github.com/pagopa/ui/issues/161), [#162](https://github.com/pagopa/ui/issues/162), [#163](https://github.com/pagopa/ui/issues/163), [#164](https://github.com/pagopa/ui/issues/164), [#165](https://github.com/pagopa/ui/issues/165), [#166](https://github.com/pagopa/ui/issues/166), [#167](https://github.com/pagopa/ui/issues/167), [#168](https://github.com/pagopa/ui/issues/168), [#169](https://github.com/pagopa/ui/issues/169), [#170](https://github.com/pagopa/ui/issues/170), [#171](https://github.com/pagopa/ui/issues/171), [#172](https://github.com/pagopa/ui/issues/172), [#173](https://github.com/pagopa/ui/issues/173), [#174](https://github.com/pagopa/ui/issues/174), [#176](https://github.com/pagopa/ui/issues/176), [#177](https://github.com/pagopa/ui/issues/177), [#179](https://github.com/pagopa/ui/issues/179), [#180](https://github.com/pagopa/ui/issues/180), [#181](https://github.com/pagopa/ui/issues/181), [#183](https://github.com/pagopa/ui/issues/183), [#184](https://github.com/pagopa/ui/issues/184), [#185](https://github.com/pagopa/ui/issues/185), [#186](https://github.com/pagopa/ui/issues/186), [#187](https://github.com/pagopa/ui/issues/187), [#188](https://github.com/pagopa/ui/issues/188), [#189](https://github.com/pagopa/ui/issues/189), [#190](https://github.com/pagopa/ui/issues/190))

  The 348 source SVGs compile into 159 inline SVG components behind `./icons` and
  `./icons/*`: a component imports the glyph it renders, so a bundle carries the
  icons a page uses instead of the whole registry, and there is no `mask-image`
  request for a CSP to refuse. `lucide-react` leaves the dependency list, and a
  third-party icon import fails the build rather than shipping a second icon
  system.

  An unknown icon name renders a development-only warning instead of crashing, a
  size class wins over the glyph's own presentation attributes, the artwork box
  stays off the text scale so 200% text cannot push a control past its container,
  and `PagoPAIcon` carries the whole SVG surface.

- feat(accordion): add a controlled value, multi-open and root forwarding ([#194](https://github.com/pagopa/ui/pull/194), [#159](https://github.com/pagopa/ui/issues/159), [#160](https://github.com/pagopa/ui/issues/160), [#161](https://github.com/pagopa/ui/issues/161), [#162](https://github.com/pagopa/ui/issues/162), [#163](https://github.com/pagopa/ui/issues/163), [#164](https://github.com/pagopa/ui/issues/164), [#165](https://github.com/pagopa/ui/issues/165), [#166](https://github.com/pagopa/ui/issues/166), [#167](https://github.com/pagopa/ui/issues/167), [#168](https://github.com/pagopa/ui/issues/168), [#169](https://github.com/pagopa/ui/issues/169), [#170](https://github.com/pagopa/ui/issues/170), [#171](https://github.com/pagopa/ui/issues/171), [#172](https://github.com/pagopa/ui/issues/172), [#173](https://github.com/pagopa/ui/issues/173), [#174](https://github.com/pagopa/ui/issues/174), [#176](https://github.com/pagopa/ui/issues/176), [#177](https://github.com/pagopa/ui/issues/177), [#179](https://github.com/pagopa/ui/issues/179), [#180](https://github.com/pagopa/ui/issues/180), [#181](https://github.com/pagopa/ui/issues/181), [#183](https://github.com/pagopa/ui/issues/183), [#184](https://github.com/pagopa/ui/issues/184), [#185](https://github.com/pagopa/ui/issues/185), [#186](https://github.com/pagopa/ui/issues/186), [#187](https://github.com/pagopa/ui/issues/187), [#188](https://github.com/pagopa/ui/issues/188), [#189](https://github.com/pagopa/ui/issues/189), [#190](https://github.com/pagopa/ui/issues/190))

  `Accordion` now takes `value` with `onValueChange` and `multiple`, forwards `ref`,
  `className` and the standard `div` attributes to its root, and exports
  `AccordionProps`. `defaultValue` becomes a list of section ids (`string[]`)
  instead of a single id, since the open sections are a value, not a boolean.

- feat(css): layer the library stylesheet, drop the `@scope` dependency and prefix every utility with `pui:` ([#194](https://github.com/pagopa/ui/pull/194), [#159](https://github.com/pagopa/ui/issues/159), [#160](https://github.com/pagopa/ui/issues/160), [#161](https://github.com/pagopa/ui/issues/161), [#162](https://github.com/pagopa/ui/issues/162), [#163](https://github.com/pagopa/ui/issues/163), [#164](https://github.com/pagopa/ui/issues/164), [#165](https://github.com/pagopa/ui/issues/165), [#166](https://github.com/pagopa/ui/issues/166), [#167](https://github.com/pagopa/ui/issues/167), [#168](https://github.com/pagopa/ui/issues/168), [#169](https://github.com/pagopa/ui/issues/169), [#170](https://github.com/pagopa/ui/issues/170), [#171](https://github.com/pagopa/ui/issues/171), [#172](https://github.com/pagopa/ui/issues/172), [#173](https://github.com/pagopa/ui/issues/173), [#174](https://github.com/pagopa/ui/issues/174), [#176](https://github.com/pagopa/ui/issues/176), [#177](https://github.com/pagopa/ui/issues/177), [#179](https://github.com/pagopa/ui/issues/179), [#180](https://github.com/pagopa/ui/issues/180), [#181](https://github.com/pagopa/ui/issues/181), [#183](https://github.com/pagopa/ui/issues/183), [#184](https://github.com/pagopa/ui/issues/184), [#185](https://github.com/pagopa/ui/issues/185), [#186](https://github.com/pagopa/ui/issues/186), [#187](https://github.com/pagopa/ui/issues/187), [#188](https://github.com/pagopa/ui/issues/188), [#189](https://github.com/pagopa/ui/issues/189), [#190](https://github.com/pagopa/ui/issues/190))

  The published stylesheet declares two cascade layers, `pagopa-ui.base` and
  `pagopa-ui.utilities`, instead of wrapping every rule in `@scope
  (.pagopa-ui-root)`: a browser that does not support `@scope` now renders the
  library instead of dropping it, and a host can order its own layers against the
  library. The resets reach only the roots the library renders — every component
  root carries `data-slot`, overlays mount into `[data-pagopa-ui-portal-root]` — so
  legacy host markup inside a `UIProvider` keeps the browser's defaults. The
  artifact contains no `@scope` at-rule.

  Every utility class the components and the guides ship carries the `pui:`
  prefix, and each utility is declared once: a bare spelling such as `flex` or
  `gap-2` no longer resolves inside a component, so a host stylesheet and the
  library stop colliding on the same class names. Authors write the prefixed form
  in the component tree and in the guides.

- feat(types): publish every component's props type and variant helper, with a consumer typecheck gate ([#194](https://github.com/pagopa/ui/pull/194), [#159](https://github.com/pagopa/ui/issues/159), [#160](https://github.com/pagopa/ui/issues/160), [#161](https://github.com/pagopa/ui/issues/161), [#162](https://github.com/pagopa/ui/issues/162), [#163](https://github.com/pagopa/ui/issues/163), [#164](https://github.com/pagopa/ui/issues/164), [#165](https://github.com/pagopa/ui/issues/165), [#166](https://github.com/pagopa/ui/issues/166), [#167](https://github.com/pagopa/ui/issues/167), [#168](https://github.com/pagopa/ui/issues/168), [#169](https://github.com/pagopa/ui/issues/169), [#170](https://github.com/pagopa/ui/issues/170), [#171](https://github.com/pagopa/ui/issues/171), [#172](https://github.com/pagopa/ui/issues/172), [#173](https://github.com/pagopa/ui/issues/173), [#174](https://github.com/pagopa/ui/issues/174), [#176](https://github.com/pagopa/ui/issues/176), [#177](https://github.com/pagopa/ui/issues/177), [#179](https://github.com/pagopa/ui/issues/179), [#180](https://github.com/pagopa/ui/issues/180), [#181](https://github.com/pagopa/ui/issues/181), [#183](https://github.com/pagopa/ui/issues/183), [#184](https://github.com/pagopa/ui/issues/184), [#185](https://github.com/pagopa/ui/issues/185), [#186](https://github.com/pagopa/ui/issues/186), [#187](https://github.com/pagopa/ui/issues/187), [#188](https://github.com/pagopa/ui/issues/188), [#189](https://github.com/pagopa/ui/issues/189), [#190](https://github.com/pagopa/ui/issues/190))
- feat(inputs): give the stateful fields host attributes, a ref and an optional value ([#197](https://github.com/pagopa/ui/pull/197))

  SegmentedControl, SelectField, MultiSelectField, Autocomplete and DatePickerField
  take the standard attributes of a `div`, with `className` on the field's root
  instead of the trigger, and `ref` points at the element that takes focus — the
  group, the trigger or the input — so a caller can move focus to the field.

  SegmentedControl also takes `defaultValue` for an uncontrolled selection, which
  leaves `value` and `onValueChange` optional. With these five the
  `consumer-dx-exceptions.json` list is empty: every stateful component satisfies
  the consumer DX gate.

- feat(tokens): derive the unpublished state steps from their endpoints ([#198](https://github.com/pagopa/ui/pull/198))

  `--pui-destructive-hover` and `--pui-primary-active` are no longer hand-picked
  hexes: the stylesheet derives each from the two published steps that bound it
  (66% of Error 600 over Error 850, 55% of Blue 600 over Blue 850), so no state
  surface introduces a colour the palette does not carry. The contract publishes
  the colour each mix resolves to, which leaves `--pui-primary-active` within a
  delta-E of 0.4 of the value it replaces and retires both literal extensions
  from `foundations.json`.

- feat(pagopa-ui): publish MIT from GitHub Packages on the React 19 peer range ([#194](https://github.com/pagopa/ui/pull/194), [#159](https://github.com/pagopa/ui/issues/159), [#160](https://github.com/pagopa/ui/issues/160), [#161](https://github.com/pagopa/ui/issues/161), [#162](https://github.com/pagopa/ui/issues/162), [#163](https://github.com/pagopa/ui/issues/163), [#164](https://github.com/pagopa/ui/issues/164), [#165](https://github.com/pagopa/ui/issues/165), [#166](https://github.com/pagopa/ui/issues/166), [#167](https://github.com/pagopa/ui/issues/167), [#168](https://github.com/pagopa/ui/issues/168), [#169](https://github.com/pagopa/ui/issues/169), [#170](https://github.com/pagopa/ui/issues/170), [#171](https://github.com/pagopa/ui/issues/171), [#172](https://github.com/pagopa/ui/issues/172), [#173](https://github.com/pagopa/ui/issues/173), [#174](https://github.com/pagopa/ui/issues/174), [#176](https://github.com/pagopa/ui/issues/176), [#177](https://github.com/pagopa/ui/issues/177), [#179](https://github.com/pagopa/ui/issues/179), [#180](https://github.com/pagopa/ui/issues/180), [#181](https://github.com/pagopa/ui/issues/181), [#183](https://github.com/pagopa/ui/issues/183), [#184](https://github.com/pagopa/ui/issues/184), [#185](https://github.com/pagopa/ui/issues/185), [#186](https://github.com/pagopa/ui/issues/186), [#187](https://github.com/pagopa/ui/issues/187), [#188](https://github.com/pagopa/ui/issues/188), [#189](https://github.com/pagopa/ui/issues/189), [#190](https://github.com/pagopa/ui/issues/190))
- feat(overlays): give Dialog, Drawer, Popover, Tooltip and TimelineDrawer a controlled and uncontrolled lifecycle ([#194](https://github.com/pagopa/ui/pull/194), [#159](https://github.com/pagopa/ui/issues/159), [#160](https://github.com/pagopa/ui/issues/160), [#161](https://github.com/pagopa/ui/issues/161), [#162](https://github.com/pagopa/ui/issues/162), [#163](https://github.com/pagopa/ui/issues/163), [#164](https://github.com/pagopa/ui/issues/164), [#165](https://github.com/pagopa/ui/issues/165), [#166](https://github.com/pagopa/ui/issues/166), [#167](https://github.com/pagopa/ui/issues/167), [#168](https://github.com/pagopa/ui/issues/168), [#169](https://github.com/pagopa/ui/issues/169), [#170](https://github.com/pagopa/ui/issues/170), [#171](https://github.com/pagopa/ui/issues/171), [#172](https://github.com/pagopa/ui/issues/172), [#173](https://github.com/pagopa/ui/issues/173), [#174](https://github.com/pagopa/ui/issues/174), [#176](https://github.com/pagopa/ui/issues/176), [#177](https://github.com/pagopa/ui/issues/177), [#179](https://github.com/pagopa/ui/issues/179), [#180](https://github.com/pagopa/ui/issues/180), [#181](https://github.com/pagopa/ui/issues/181), [#183](https://github.com/pagopa/ui/issues/183), [#184](https://github.com/pagopa/ui/issues/184), [#185](https://github.com/pagopa/ui/issues/185), [#186](https://github.com/pagopa/ui/issues/186), [#187](https://github.com/pagopa/ui/issues/187), [#188](https://github.com/pagopa/ui/issues/188), [#189](https://github.com/pagopa/ui/issues/189), [#190](https://github.com/pagopa/ui/issues/190))

  Each overlay takes `open` with `onOpenChange` for a controlled panel and
  `defaultOpen` for an uncontrolled one, and `trigger` becomes optional so a
  caller can open the panel from its own async handler, a form submit or the URL.
  `DialogClose` and `DrawerClose` close from inside the content, `ref` forwards to
  the panel, and `className` and the standard `div` attributes are merged with the
  panel's own instead of replacing them.


### 🩹 Fixes

- fix(switch-field): let the caller size the leading icon (svg:not(.pagopa-icon)) ([#194](https://github.com/pagopa/ui/pull/194), [#159](https://github.com/pagopa/ui/issues/159), [#160](https://github.com/pagopa/ui/issues/160), [#161](https://github.com/pagopa/ui/issues/161), [#162](https://github.com/pagopa/ui/issues/162), [#163](https://github.com/pagopa/ui/issues/163), [#164](https://github.com/pagopa/ui/issues/164), [#165](https://github.com/pagopa/ui/issues/165), [#166](https://github.com/pagopa/ui/issues/166), [#167](https://github.com/pagopa/ui/issues/167), [#168](https://github.com/pagopa/ui/issues/168), [#169](https://github.com/pagopa/ui/issues/169), [#170](https://github.com/pagopa/ui/issues/170), [#171](https://github.com/pagopa/ui/issues/171), [#172](https://github.com/pagopa/ui/issues/172), [#173](https://github.com/pagopa/ui/issues/173), [#174](https://github.com/pagopa/ui/issues/174), [#176](https://github.com/pagopa/ui/issues/176), [#177](https://github.com/pagopa/ui/issues/177), [#179](https://github.com/pagopa/ui/issues/179), [#180](https://github.com/pagopa/ui/issues/180), [#181](https://github.com/pagopa/ui/issues/181), [#183](https://github.com/pagopa/ui/issues/183), [#184](https://github.com/pagopa/ui/issues/184), [#185](https://github.com/pagopa/ui/issues/185), [#186](https://github.com/pagopa/ui/issues/186), [#187](https://github.com/pagopa/ui/issues/187), [#188](https://github.com/pagopa/ui/issues/188), [#189](https://github.com/pagopa/ui/issues/189), [#190](https://github.com/pagopa/ui/issues/190))
- fix(icons): keep the PagoPAIcon dev diagnostics in the published bundle ([#194](https://github.com/pagopa/ui/pull/194), [#159](https://github.com/pagopa/ui/issues/159), [#160](https://github.com/pagopa/ui/issues/160), [#161](https://github.com/pagopa/ui/issues/161), [#162](https://github.com/pagopa/ui/issues/162), [#163](https://github.com/pagopa/ui/issues/163), [#164](https://github.com/pagopa/ui/issues/164), [#165](https://github.com/pagopa/ui/issues/165), [#166](https://github.com/pagopa/ui/issues/166), [#167](https://github.com/pagopa/ui/issues/167), [#168](https://github.com/pagopa/ui/issues/168), [#169](https://github.com/pagopa/ui/issues/169), [#170](https://github.com/pagopa/ui/issues/170), [#171](https://github.com/pagopa/ui/issues/171), [#172](https://github.com/pagopa/ui/issues/172), [#173](https://github.com/pagopa/ui/issues/173), [#174](https://github.com/pagopa/ui/issues/174), [#176](https://github.com/pagopa/ui/issues/176), [#177](https://github.com/pagopa/ui/issues/177), [#179](https://github.com/pagopa/ui/issues/179), [#180](https://github.com/pagopa/ui/issues/180), [#181](https://github.com/pagopa/ui/issues/181), [#183](https://github.com/pagopa/ui/issues/183), [#184](https://github.com/pagopa/ui/issues/184), [#185](https://github.com/pagopa/ui/issues/185), [#186](https://github.com/pagopa/ui/issues/186), [#187](https://github.com/pagopa/ui/issues/187), [#188](https://github.com/pagopa/ui/issues/188), [#189](https://github.com/pagopa/ui/issues/189), [#190](https://github.com/pagopa/ui/issues/190))

### ❤️ Thank You

- Danilo Spinelli @gunzip

## 0.1.10 (2026-11-25)

### 🚀 Features

- feat(table): add mono column typography option and import Table Figma rules ([#152](https://github.com/pagopa/ui/pull/152))

### ❤️ Thank You

- Danilo Spinelli @gunzip

## 0.1.9 (2026-11-20)

### 🩹 Fixes

- fix(figma-map): align the checkbox and radio variants with the 2026-11-20 drift ([#143](https://github.com/pagopa/ui/pull/143))

### ❤️ Thank You

- gunzip

## 0.1.8 (2026-11-11)

### 🩹 Fixes

- fix(switch-field): align source start-row geometry ([#135](https://github.com/pagopa/ui/pull/135))

### ❤️ Thank You

- gunzip

## 0.1.7 (2026-11-10)

### 🩹 Fixes

- docs(catalogue): point the page-surface note at the split reference ([#124](https://github.com/pagopa/ui/pull/124), [#118](https://github.com/pagopa/ui/issues/118), [#119](https://github.com/pagopa/ui/issues/119), [#120](https://github.com/pagopa/ui/issues/120), [#121](https://github.com/pagopa/ui/issues/121), [#122](https://github.com/pagopa/ui/issues/122), [#123](https://github.com/pagopa/ui/issues/123))
- test(figma-to-ui): add harbor-bench evals and the pending/excluded reply rule ([#115](https://github.com/pagopa/ui/pull/115))
- fix(figma-to-ui): an excluded row follows its recorded reason instead of being omitted ([#117](https://github.com/pagopa/ui/pull/117))

### ❤️ Thank You

- Danilo Spinelli @gunzip

## 0.1.6 (2026-11-09)

### 🚀 Features

- feat(pagopa-ui): ship the figma map, its command line and the consumer plugin ([#113](https://github.com/pagopa/ui/pull/113))

### ❤️ Thank You

- Danilo Spinelli @gunzip

## 0.1.5 (2026-11-06)

### 🩹 Fixes

- fix(attachment-module): align wrapped attachment titles ([#106](https://github.com/pagopa/ui/pull/106))

### ❤️ Thank You

- Danilo Spinelli @gunzip

## 0.1.4 (2026-11-05)

### 🚀 Features

- feat(icons): add school, subway and health and safety icons ([#103](https://github.com/pagopa/ui/pull/103))

### ❤️ Thank You

- gunzip

## 0.1.3 (2026-11-04)

### 🚀 Features

- feat(messages): give the last hardcoded copy a dictionary address, and hold the contract with property-based tests ([#99](https://github.com/pagopa/ui/pull/99))

  `Table`, `TableList`, `TableHeaderField`, `Chip`, `InputChip` and `ProgressKpi` now read every string they render or announce from `messages`: `table.emptyStateTitle`, `table.sortLabel`, `tableList.emptyStateTitle`, `chip.removeLabel` and `progressKpi.valueLabel` join the dictionary in both locales, and the visible KPI percentage is no longer a template a consumer cannot reach. A consumer still overrides through the prop where one exists — `emptyState`, `removeLabel` — and through the dictionary otherwise. Italian rendering is unchanged byte for byte, so the stories that assert `Nessun risultato` and `Elimina Roma` still hold.

  `formatFileSize` climbs to the unit that fits instead of rounding into the next one, so no size prints `1024 KB` or `1024.0 MB`, and an unknown or impossible size reads `0 B`. `ProgressKpi` paints and announces a whole percentage inside the range its bar declares, so a zero or unknown total reads `0%` rather than `NaN%` and a negative value no longer contradicts `aria-valuemin`. The Stepper keys its steps by label and index, so two steps sharing a label keep their own state.

  `ui-cli`'s `text-defaults` check now scans the positions that carry copy outside children — `aria-label`, `aria-valuetext`, `alt`, `placeholder`, `title`, `label`, `message` and their siblings — plus destructuring defaults and object-literal defaults such as `{ title: "Nessun risultato" }`, which is how the `Ordina per` and `Elimina` leaks survived it. Soundness is kept: a literal used in a comparison, and a member key such as `props["aria-label"]`, are not copy.

  Four property suites come with `fast-check` as a dev dependency: `progressPercentage` staying in the range its bar declares and never NaN, `formatFileSize`'s magnitude never outgrowing the unit it prints, the Italian and English dictionaries naming the same addresses, and `pageRange` listing each page once with its ends and the current page shown, behind at most two necessary ellipses.

### ❤️ Thank You

- Danilo Spinelli @gunzip

## 0.1.2 (2026-11-04)

### 🚀 Features

- feat(popover): point the indicator at the trigger and keep the Timeline rail straight ([#97](https://github.com/pagopa/ui/pull/97))

  `Popover` draws its arrow through the placement middleware, so the tip tracks the trigger when the popup is shifted to stay in the viewport instead of sitting at the popup centre. `Timeline` reserves the timestamp column for a row that has none when a sibling carries one, and starts a plain row's copy at the row top: every cursor shares one rail and lines up with its title. `DownloadCard` announces `messages.downloadCard.downloadLabel` — `Scarica {file}` in Italian, `Download {file}` in English — and the new `downloadLabel` prop replaces the phrase. The Stepper's upcoming number moves from `muted-soft` to `muted-foreground`: 3.66:1 to 4.59:1 on its disc. The action and banner guides mark the `*-contrast` button family as brand and dark surface only, where its label measured 1.18:1 on the Primary Banner fill. `SectionHeader` defaults `titleAs` to `h2` and takes the shared `HeadingTag` (`h2`…`h6`), so the page keeps its single `h1` and a section title can no longer claim it: `titleAs="h1"` is now a type error, and `level` stays the visual choice. `Footer` pins a column tail to the column bottom only when a body sits above it: a column whose tail is its only content — a language control, say — keeps it under the title, level with the sibling columns' first row.

### ❤️ Thank You

- Danilo Spinelli @gunzip

## 0.1.1 (2026-11-04)

### 🚀 Features

- feat(popper): add an anchored validation message ([#93](https://github.com/pagopa/ui/pull/93))

### 🩹 Fixes

- chore(figma): review renamed Missing element ([#93](https://github.com/pagopa/ui/pull/93))

### ❤️ Thank You

- gunzip

## 0.1.0 (2026-11-02)

### 🩹 Fixes

- fix(select,dropdown-menu): paint keyboard focus distinctly in forced colors ([#89](https://github.com/pagopa/ui/pull/89))
- fix(overlays): mount the shared portal root after mount, not during render ([#89](https://github.com/pagopa/ui/pull/89))
- fix: keep long and translated segmented-control labels visible at narrow widths and enlarged text ([#89](https://github.com/pagopa/ui/pull/89))

### ⚠️  Breaking Changes

- feat(styles)!: scope component styles to UIProvider (breaking); wrap each component tree in UIProvider ([#89](https://github.com/pagopa/ui/pull/89))

### ❤️ Thank You

- Danilo Spinelli @gunzip

## 0.0.5 (2026-10-30)

### 🚀 Features

- feat(autocomplete): own the Figma multiselect types — `multiple` takes a `string[]` and renders both filled types: one removable pill per value (`removeValueLabel`, default `Elimina {value}`) beside the `[clear][chevron]` group, or `multipleDisplay="counter"` collapsing the row into the count badge that carries the clear of every value (`clearAllLabel`, `counterLabel`); the pills stay on one line and scroll when they stop fitting, so the field keeps its 48px frame. Backspace on an empty input removes the last value. Answers [#40](https://github.com/pagopa/ui/issues/40). ([#85](https://github.com/pagopa/ui/pull/85))

### ❤️ Thank You

- Danilo Spinelli @gunzip

## 0.0.4 (2026-10-28)

### 🚀 Features

- feat(timeline): add the source event time under the copy ([#64](https://github.com/pagopa/ui/pull/64))

### ❤️ Thank You

- Danilo Spinelli @gunzip
- gunzip

## 0.0.3 (2026-10-26)

### 🩹 Fixes

- chore(deps): bump the development toolchain (next 16.4.1, vite 8.3.3, vitest 5.0.5) ([#58](https://github.com/pagopa/ui/pull/58))

### ❤️ Thank You

- Danilo Spinelli @gunzip

## 0.0.2 (2026-10-25)

### 🚀 Features

- feat(i18n): add the default dictionary and the English one ([3bee6b2](https://github.com/pagopa/ui/commit/3bee6b2))
- feat(pagopa-ui): switch responsive layouts to the Figma breakpoints ([cabfafc](https://github.com/pagopa/ui/commit/cabfafc))
- feat(tokens): publish the public token contract ([67b6281](https://github.com/pagopa/ui/commit/67b6281))
- feat(api)!: rename exports and add UIProvider ([cd41149](https://github.com/pagopa/ui/commit/cd41149))

### 🩹 Fixes

- build(pagopa-ui): ship one ES module per component ([67b6281](https://github.com/pagopa/ui/commit/67b6281))
- fix(side-nav): keep the condensed toggle's 44px target ([3bee6b2](https://github.com/pagopa/ui/commit/3bee6b2))

### ❤️ Thank You

- gunzip

## 0.0.1 (2026-10-21)

### 🚀 Features

- Publish `@pagopa/ui` on GitHub Packages through the Nx Release pipeline. ([5460336](https://github.com/pagopa/ui/commit/5460336))

### ❤️ Thank You

- gunzip
