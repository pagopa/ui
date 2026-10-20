# Prop conventions — a part, a state or a choice into the API

The agent chooses the props; this page keeps the choice predictable across
components. It applies to a new component and to one being revised, never to an
already published API. Prop names are camelCase, values kebab-case English.
Every variant and state the component has is reachable through props,
attributes or content.

| What the component has | What to do | Example |
| --- | --- | --- |
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
