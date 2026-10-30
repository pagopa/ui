<!-- component-rules:start -->

## Component Rules

- Desktop: ancestor levels are links and the current page is not clickable; mobile: one compact back reaches the previous flow level.
- Mobile and tablet portrait use the Compact layout.

<!-- component-rules:end -->

`Breadcrumb` keeps the existing `items` interface and the Extended layout by
default. Ancestors with a destination are real links; an ancestor without `href`
is text, never an invented `#` link. The last item is non-interactive and
announces the current page even if its data contains an `href`.

Use an explicit destination for the Compact layout:

```tsx
<Breadcrumb
  layout="compact"
  back={{ label: "Torna ai servizi", href: "/servizi" }}
  aria-label="Percorso del servizio"
/>
```

Compact does not infer a parent from unrelated history or incomplete items.

Both layouts use the source chevron and back artwork rather than a generic
divider. Each native link expands its pointer target invisibly to the accessible
minimum without making the visible row taller. Labels remain content-driven and
wrap within narrow layouts instead of inheriting a fixed width. Decorative
separators do not create extra spoken list items. Native Safari link traversal
uses Option-Tab unless its full Tab navigation setting is enabled; the installed
WebKit check follows that platform convention.
