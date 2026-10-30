<!-- component-rules:start -->

## Component Rules

- Use Scroll to bottom when the reader must see the whole content before tapping the call to action that advances the flow, typically before accepting the terms of service.

<!-- component-rules:end -->

`ScrollToBottom` is a floating action that returns to the end of a scrollable
region or of the page.

## Example

```tsx
const target = useRef<HTMLDivElement>(null)

<div ref={target} className="h-64 overflow-auto">
  {/* long content */}
</div>
<ScrollToBottom target={target} label="Vai in fondo" />
```

## Behaviour

Without `target` the component watches the window; with it, it watches that element
and stays inside the caller's layout. It hides itself when the region is within 8px
of its end and returns as soon as the reader scrolls back up. The scroll is smooth,
and instant when the reader prefers reduced motion. `label` is the button's
accessible name (default "Vai in fondo") and the arrow is decorative: the name never
comes from the artwork.
