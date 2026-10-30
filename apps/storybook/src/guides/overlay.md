<!-- component-rules:start -->

## Component Rules

- The overlay is a plain scrim: it never blurs the screen behind it.

<!-- component-rules:end -->

`Overlay` is the translucent scrim a surface paints over its own content while a
wait is in progress. It positions itself over the nearest positioned ancestor and
is clipped to the containing surface.

## Example

```tsx
<section className="relative">
  <PaymentForm />
  <Overlay visible={isPaying} label="Pagamento in corso" />
</section>
```

## Behaviour

The overlay does not capture focus: the surface underneath stays in the document
and the wait is announced through a visually hidden polite status region
(`role="status"`, `aria-live="polite"`) whose text is `label`. The source veil
carries no content, so the default spinner is a runtime extension;
`showSpinner` turns it off for the source-faithful composition. Content passed as
`children` sits on the scrim with the component's padding; the source draws no
content and so says nothing about that inset.
