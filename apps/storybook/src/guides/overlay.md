# Overlay

`Overlay` implements the Figma component `Overlay` (`67:3964`): the translucent
scrim a surface paints over its own content while a wait is in progress.

| Source property         | Implementation                                                 |
| ----------------------- | -------------------------------------------------------------- |
| 320×568 frame, radius 0 | `absolute inset-0`, clipped to the containing surface          |
| `#0e0f13` fill at 35%   | `bg-overlay`, the shared `Color/Surface/Surface overlay` token |
| no blur                 | no backdrop filter                                             |
| no children             | the source draws an empty veil                                 |

## Example

```tsx
<section className="relative">
  <PaymentForm />
  <Overlay visible={isPaying} label="Pagamento in corso" />
</section>
```

## Behaviour

The overlay positions itself over the nearest positioned ancestor and does not
capture focus: the surface underneath stays in the document and the request is
announced through a visually hidden polite status region (`role="status"`,
`aria-live="polite"`), whose label is the `label` prop. The source veil carries
no content, so the default spinner is a runtime extension, and `showSpinner`
turns it off for the source-faithful composition. Content passed as `children`
sits on the scrim with the component's 24px padding; the source draws no
content and so says nothing about that inset.
