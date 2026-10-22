# Prop conventions — a source name or property into the API

The agent chooses the props; this page keeps the choice predictable across
components. It applies to a new node and to a node being revised, never to an
already published API. Prop names are camelCase, values kebab-case English. The
render is the proof: every declared variant and state is reachable through
props, attributes or content ([visual-parity.md](visual-parity.md)).

| Property in the source | What to do | Example |
| --- | --- | --- |
| Node or set name | The export is one English PascalCase noun for the component's role; the node name stays its search key. The component's JSDoc ends with `Figma: <node name> (node <id>)`, the story sets `parameters.docs.subtitle` to `Figma: <node name>`. | the export renames a source abbreviation; the JSDoc keeps it findable |
| Visibility flag (`Show …`, `Close`, `CTA`, `Title`) | An optional slot or callback: the part renders only when the caller passes it; no boolean mirror. | `actions?: ReactNode` |
| Instance swap or slot (`INSTANCE_SWAP`, `SLOT`) | One optional `ReactNode` slot; the caller owns the instance. | `icon?: ReactNode` |
| Text (`TEXT`, component copy) | `children` for the one main label; a named text prop for a fixed role. | `title: ReactNode` |
| Device axis (`Device`, `Breakpoint`, or any axis whose values resolve to a device) | Never a prop: the width decides, viewport or container ([devices.md](devices.md)). A composition the caller chooses is that caller prop, not the device. | `orientation?: "horizontal" \| "vertical"` |
| Interaction state (`State`, `Status`, `Selected`, `Checked`, `Open`, `Error`, hover, pressed, disabled) | A native attribute, ARIA or a pseudo-class: `disabled`, `checked`, `open`, `aria-invalid`, `aria-pressed`, `aria-busy`, `:focus-visible`. A load or behaviour flag may become a prop that also sets them. | `error` → `aria-invalid` |
| A value the platform already names (`Required`, `Disabled`) | The native or ARIA spelling, not a synonym prop. | `required`, `disabled` |
| Semantic enumeration (one axis) | One prop named after the axis in camelCase, values in kebab-case English. | `layout?: "compact" \| "extended"` |
| Composite axis (style × colour in one axis, each value combines both) | Fold into one prop with named values; the fold and its reason go in the node's registry `note`. | `variant?: "outline-destructive"` |
| A prop backed by a third-party primitive | Name it for the contract the caller reads; map it to the internal name inside and never re-export that name. | `direction` driving an internal swipe option |

Every departure from this page gets one line in the node's registry `note`: what
departs and why. The note is the record; there is no prop map. A source variant
that no prop, attribute or content can reach is a finding in the report, not an
invented prop.
