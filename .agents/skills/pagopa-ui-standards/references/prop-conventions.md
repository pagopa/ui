# Prop conventions — a name, a part, a state or a choice into the API

The agent chooses the props; this page keeps the choice predictable across
components. It applies to a new component and to one being revised, never to an
already published API. Prop names are camelCase, values kebab-case English.
Every variant and state the component has is reachable through props,
attributes or content.

| What the component has | What to do | Example |
| --- | --- | --- |
| The component itself | One English PascalCase noun for the role it plays for the user, cased like its family's exports. The name carries the role; a colour, a source label or an internal code stays out of it. | `EmptyState` |
| An optional part (actions, a close control, a title) | An optional slot or callback: the part renders only when the caller passes it; no boolean mirror. | `actions?: ReactNode` |
| Content the caller supplies (an icon, a media) | One optional `ReactNode` slot; the caller owns the element. | `icon?: ReactNode` |
| Text | `children` for the one main label; a named text prop for a fixed role. | `title: ReactNode` |
| A layout that changes with the available width | Never a prop: the width decides, viewport or container. A composition the caller chooses is that caller prop, not the width. | `orientation?: "horizontal" \| "vertical"` |
| An interaction state (selected, checked, open, error, hover, pressed, disabled) | A native attribute, ARIA or a pseudo-class: `disabled`, `checked`, `open`, `aria-invalid`, `aria-pressed`, `aria-busy`, `:focus-visible`. A load or behaviour flag may become a prop that also sets them. | `error` → `aria-invalid` |
| A value the platform already names (required, disabled) | The native or ARIA spelling, not a synonym prop. | `required`, `disabled` |
| One semantic choice | One prop named after the choice in camelCase, values in kebab-case English. | `layout?: "compact" \| "extended"` |
| Two choices that only exist in fixed pairs (style × colour) | One prop with named values, each combining both. | `variant?: "outline-destructive"` |
| A prop backed by a third-party primitive | Name it for the contract the caller reads; map it to the internal name inside and never re-export that name. | `direction` driving an internal swipe option |

Every departure from this page is one line in the node's registry `note` when a
source node backs the component, and one line in its guide when none does: what
departs and why. A state the design asks for that no prop, attribute or content
can reach is a finding to report, not an invented prop.

## From a source node

The node name stays the search key while the export carries the role: the
component's JSDoc ends with `Figma: <node name> (node <id>)` and its story sets
`parameters.docs.subtitle` to `Figma: <node name>`.

| Property in the source | What to do | Example |
| --- | --- | --- |
| Visibility flag (`Show …`, `Close`, `CTA`, `Title`) | The optional slot or callback above; no boolean mirror. | `actions?: ReactNode` |
| Instance swap or slot (`INSTANCE_SWAP`, `SLOT`) | One optional `ReactNode` slot; the caller owns the instance. | `icon?: ReactNode` |
| Device axis (`Device`, `Breakpoint`, any axis resolving to a device) | Never a prop: the width decides. A composition the caller chooses is that caller prop. | `orientation?: "horizontal" \| "vertical"` |
| Interaction state (`State`, `Status`, `Selected`, `Checked`, `Open`, `Error`) | The native attribute, ARIA or pseudo-class above. | `error` → `aria-invalid` |
| Semantic enumeration (one axis) | One prop named after the axis, values in kebab-case English. | `layout?: "compact" \| "extended"` |
| Composite axis (style × colour in one axis) | One prop with named values, each combining both; the fold and its reason go in the registry `note`. | `variant?: "outline-destructive"` |

A source variant that no prop, attribute or content can reach is a finding in
the report, not an invented prop.
