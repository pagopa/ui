---
name: figma-to-ui
description: Turn a Figma layout into @pagopa/ui components. Use when a Figma frame, design link or node id must be built with the PagoPA design system; when it is unclear which component draws a part of a layout; when the map answers mocked, pending or excluded for a part; when a component exists in the package but the file never drew it; or when a drawn part has no component at all and the nearest one must be chosen.
---

# Figma to UI

The package ships `figma-map.json`: one row per Figma node the design system implements, carrying the exports that render it, the Storybook story that shows it, a status and, whenever the design declares one, a versioned mapping from the node's Figma variant properties to the props that render them. The rows name what `@pagopa/ui` exports; a node drawn by something the package keeps internal says so on its own line. `pagopa-ui-map` reads that map, so a layout costs one lookup per part instead of a read of the map.

The mapping is a `propsMap` object on the row, with a `version` and a `props` dictionary keyed by Figma property name. Each entry names the `prop` that property fills and, when the Figma option names differ from the values the package expects, a `values` dictionary translating one into the other:

```json
{
  "version": 1,
  "props": {
    "Size": { "prop": "size", "values": { "Small": "sm", "Medium": "md" } },
    "Type": { "prop": "variant" }
  }
}
```

It is declared, never inferred: a row with no `propsMap` key has no mapping at all, an empty `props` dictionary declares that the node was read and no property of it has a prop counterpart — its axes are the content a consumer passes or the viewport the layout draws — and a property or an option the mapping does not name has no declared counterpart, so read that one off the story. The version covers the shape above, so a reader that pins to a version never misreads a newer row.

## Steps

1. **Collect one id per component instance: its source, not its placement.** An instance's own node id names where it sits in this layout, and the map indexes the library file, so that id answers nothing. Ask the Figma tools for the component each instance comes from, and when that component is a variant, take its parent component set's id, which is the level the map holds. Plain frames, autolayout containers and loose text are the layout itself, with no row of their own, and you build them with the primitive components.

2. **Resolve every id you collected**, one command per component instance:

   ```bash
   pnpm exec pagopa-ui-map resolve <nodeId>
   ```

   The answer names the exports to render, the status, and the story id whose stories show the variants and props. A row that declares a mapping prints it as its own `props:` line under `exports:`, one Figma property per line — the property name, the prop it fills, and each option with the value it becomes, such as `Size → size: Small=sm, Medium=md`. A refusal that names another Figma file means the id belongs to the layout's own file rather than the library: go back to step 1. The step is done when every component instance in the layout has a row and every row has been read.

3. **Read the status before you build**, because it says how much of the node you can rely on:

   | Status        | What it asks of the screen you are building                                       |
   | ------------- | --------------------------------------------------------------------------------- |
   | `implemented` | The exports render the node; use them unchanged.                                  |
   | `mocked`      | The export is a stand-in; do not rely on the node's behaviour.                    |
   | `pending`     | The node is decided and not built; ask instead of substituting.                   |
   | `excluded`    | The node is out of the library on purpose; the reason says what the part becomes. |

   The row's reason carries the instruction when the status is not `implemented`, and it decides what the part becomes. A `pending` part has no decision yet: leave it out, name its node, export and reason, and ask which way to go — in a non-interactive session the question sits in the reply that ends the turn. An `excluded` part already carries its decision, so follow the reason: one that prescribes a composition (`Gravatar` as an initials-only avatar, `ProgressKpiGroup` as a CSS grid in app code) is built that way, while one the library does not ship (native OS chrome) leaves the part out. The question is about that part alone: the rest of the frame is still built.

4. **Search when no row answers.** A part drawn as loose shapes has no mapping, and neither does a node the file never published. Search by the name you read in Figma:

   ```bash
   pnpm exec pagopa-ui-map search <name>
   pnpm exec pagopa-ui-map export <ExportName>
   ```

   `search` matches the node name, the export, the story id and the node id. `export` answers the other direction: which nodes one export renders, and an answer that no node renders means the component is public with no Figma source, so the layout is free to place it.

5. **Build from the package.** Import the exports from `@pagopa/ui`, load `@pagopa/ui/styles.css`, and take the props and variants from the story the map named. Translate the instance's Figma variant properties through the row's mapping where it printed one: the option it names is the prop value to write, in the JSON type the mapping printed, so a boolean stays `true` and a number stays `16` rather than a string. An option the mapping omits has no declared counterpart, so choose it from the story. A row whose `also` line names a component without an import is drawn by something the package keeps internal: render the exports the row names and build the rest from them. A part with no component and no close match is a gap in the design system: report it in the pull request rather than reshaping an unrelated component.

Add `--json` to any command you read programmatically.
