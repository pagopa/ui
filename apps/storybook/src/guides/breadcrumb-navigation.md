`Breadcrumb` keeps the existing `items` interface and Extended layout by default.
Ancestors with a destination are real links; an ancestor without `href` is text,
never an invented `#` link. The last item is non-interactive and announces the
current page even if its data contains an `href`.

Use an explicit destination for the source Compact layout:

```tsx
<Breadcrumb
  layout="compact"
  back={{ label: "Torna ai servizi", href: "/servizi" }}
  aria-label="Percorso del servizio"
/>
```

Compact does not infer a parent from unrelated history or incomplete items.
Both layouts use the actual source chevron/back artwork rather than a generic
divider, and keep enlarged native link targets over the source rows. Labels
remain content-driven and wrap within narrow layouts instead of inheriting the
source artboard's fixed dimensions. Decorative separators do not create extra
spoken list items. Native Safari link traversal uses Option-Tab unless its full
Tab navigation setting is enabled; the installed WebKit check follows that
platform convention.
