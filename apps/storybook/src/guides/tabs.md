`Tabs` maps the Figma `TabGroup` component: a row of tab items whose active item
paints the primary label, artwork and bottom line. The component has no device
axis; the caller's column decides the width.

The source draws the `line` variant only. Pass `variant="line"` on `TabsList`
for that composition; `variant="default"` (the pill list) is a library extension
with no source frame. `orientation` is caller-owned: the source does not draw
the vertical composition.

The caller owns every string: the tab labels are children and the list name is
the consumer's `aria-label`.

```tsx
<Tabs defaultValue="profilo">
  <TabsList variant="line" aria-label="Sezioni del profilo">
    <TabsTrigger value="profilo">Profilo</TabsTrigger>
  </TabsList>
</Tabs>
```

The icon is decorative (`aria-hidden`), so each tab is announced by its own
label. Long labels stay on one line and the list scrolls horizontally when the
available width cannot hold every item, keeping the first tab reachable.
