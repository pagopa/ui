# Tabs

`Tabs` maps the Figma `TabGroup` component (`1137:8910`): one 658px row of
seven 94x48 `.Tab item` instances, the first active. Each item is a
`Content` frame with 16px inline and 8px block padding, a 24px `kid_star`
artwork, an 8px gap and the 18/26 Semibold `Tab` label. The 2px `Line` at the
bottom of every item is the source indicator: `#e8ebf1` for an inactive tab and
the primary blue for the active one, whose label and artwork turn primary too.
The component has no device axis; the caller's column decides the width.

The source draws the `line` variant only. Pass `variant="line"` on `TabsList`
for that composition; `variant="default"` (the pill list) is a library
extension with no source frame. `orientation` is caller-owned: the source does
not draw the vertical composition.

The caller owns every string: the tab labels are children and the list name is
the consumer's `aria-label`.

```tsx
<Tabs defaultValue="profilo">
  <TabsList variant="line" aria-label="Sezioni del profilo">
    <TabsTrigger value="profilo">Profilo</TabsTrigger>
  </TabsList>
</Tabs>
```

The label never degrades to the artwork: the icon is decorative
(`aria-hidden`), so each tab is announced by its own text. Long labels stay on
one line (`whitespace-nowrap`) and the list scrolls horizontally when the
available width cannot hold every item, keeping the first tab reachable.
