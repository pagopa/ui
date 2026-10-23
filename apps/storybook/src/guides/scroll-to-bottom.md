# Scroll to bottom

`ScrollToBottom` implements the Figma component `ScrollToBottom` (`180:3931`):
a 56px floating action that returns to the end of a scrollable region or of the
page.

| Source layer | Source property                  | Implementation                                        |
| ------------ | -------------------------------- | ----------------------------------------------------- |
| root         | 56×56, radius 56, `#0b3ee3`      | `Button size="icon"` at `size-14 rounded-full`        |
| root         | Shadow 32 (`0 4 32` at 10%)      | `shadow-32`                                           |
| `arrow`      | 24×24 instance, `arrow_downward` | `PagoPAIcon name="arrow" variant="down"`              |
| —            | label                            | `label`, the accessible name (default “Vai in fondo”) |

## Example

```tsx
const target = useRef<HTMLDivElement>(null)

<div ref={target} className="h-64 overflow-auto">
  {/* long content */}
</div>
<ScrollToBottom target={target} label="Vai in fondo" />
```

## Behaviour

Without `target` the component watches the window; with it, it watches that
element and stays inside the caller's layout. It hides itself when the region is
within 8px of its end and returns as soon as the reader scrolls back up. The
scroll is smooth, and instant when the reader prefers reduced motion
(`prefers-reduced-motion: reduce`). `label` is the button's accessible name, and
the arrow is decorative: the name never comes from the artwork.
