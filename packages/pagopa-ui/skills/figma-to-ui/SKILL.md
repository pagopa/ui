---
name: figma-to-ui
description: Turn a Figma layout into @pagopa/ui components. Use when a Figma frame, design link or node id must be built with the PagoPA design system; when it is unclear which component draws a part of a layout; when the map answers mocked, pending or excluded for a part; when a component exists in the package but the file never drew it; or when a drawn part has no component at all and the nearest one must be chosen.
---

# Figma to UI

The package ships `figma-map.json`: one row per Figma node the design system implements, carrying the exports that render it, the Storybook story that shows it and a status. `pagopa-ui-map` reads that map, so a layout costs one lookup per part instead of a read of the map.

## Steps

1. **List the parts.** Walk the layout and collect the node id of every component instance, in the form the Figma tools report; a design link carries the same pair inside `node-id`, which the command accepts too. Plain frames, autolayout containers and loose text are the layout itself, with no row of their own, and you build them with the primitive components.

2. **Resolve every id you collected**, one command per component instance:

   ```bash
   pnpm exec pagopa-ui-map resolve <nodeId>
   ```

   The answer names the exports to render, the status, and the story id whose stories show the variants and props. The step is done when every component instance in the layout has a row and every row has been read.

3. **Read the status before you build**, because it says how much of the node you can rely on:

   | Status        | What it asks of the screen you are building                     |
   | ------------- | --------------------------------------------------------------- |
   | `implemented` | The exports render the node; use them unchanged.                |
   | `mocked`      | The export is a stand-in; do not rely on the node's behaviour.  |
   | `pending`     | The node is decided and not built; ask instead of substituting. |
   | `excluded`    | The node is out of the library on purpose; the reason says why. |

   The row's reason carries the instruction when the status is not `implemented`, usually the implemented component to render instead.

4. **Search when no row answers.** A part drawn as loose shapes has no mapping, and neither does a node the file never published. Search by the name you read in Figma:

   ```bash
   pnpm exec pagopa-ui-map search <name>
   pnpm exec pagopa-ui-map export <ExportName>
   ```

   `search` matches the node name, the export, the story id and the node id. `export` answers the other direction: which nodes one export renders, and an answer that no node renders means the component is public with no Figma source, so the layout is free to place it.

5. **Build from the package.** Import the exports from `@pagopa/ui`, load `@pagopa/ui/styles.css`, and take the props and variants from the story the map named. A part with no component and no close match is a gap in the design system: report it in the pull request rather than reshaping an unrelated component.

Add `--json` to any command you read programmatically.
