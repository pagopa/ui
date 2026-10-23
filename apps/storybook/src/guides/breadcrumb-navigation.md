<!-- component-rules:start -->

## Component Rules

- Desktop: ancestor levels are links and the current page is not clickable; mobile: one compact back reaches the previous flow level.
- Mobile and tablet portrait use the Compact layout.

<!-- component-rules:end -->

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
divider, and keep the source row heights (22px Extended, 24px Compact): each
native link expands its pointer target invisibly to at least 44px over that row,
without making the visible row taller. Labels
remain content-driven and wrap within narrow layouts instead of inheriting the
source artboard's fixed dimensions. Decorative separators do not create extra
spoken list items. Native Safari link traversal uses Option-Tab unless its full
Tab navigation setting is enabled; the installed WebKit check follows that
platform convention.

## Figma source mapping

Node `123:7768` (`Breadcrumbs`) supplies the `Layout` axis: `Layout=Extended`
(`123:7769`) renders with `layout="extended"`, the default, and
`Layout=Compact` (`123:7777`) with `layout="compact"`.

In `Layout=Extended`, the `Level 1` frame and the hidden `Level 2`, `Level 3`,
`Level 4` and `Level 5` frames, revealed by `Show Level 2` to `Show Level 5`,
map to the ancestor entries of `items`: each entry is one level, so the
caller's data sets the depth instead of four booleans. Every level after the
first carries the `.Separator` (`chevron`, `chevron_forward`) as a decorative
16px separator. The `Current` frame maps to the last entry of `items`, rendered
as text with `aria-current="page"`. Each `.Breadcrumb single element` with
`Link` text is the entry's `label`; its destination is `href`.

In `Layout=Compact`, the single `.Breadcrumb single element` with the `arrow`
(`arrow_back`) artwork and the `Back` text maps to `back`: `back.label` is the
text and `back.href` the destination. The private hover variants of
`.Breadcrumb single element` map to `:hover` on the native link.
