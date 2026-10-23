<!-- component-rules:start -->

## Component Rules

- A list omits the divider after its last item.

<!-- component-rules:end -->

# Separator

`Separator` implements the divider set `61:2786` at its 320px source width. The
five source variants map to the component:

| Source variant              | Code                         |
| --------------------------- | ---------------------------- |
| `Padding=0, Type=Line`      | `<Separator />`              |
| `Padding=16, Type=Line`     | `<Separator padding={16} />` |
| `Padding=24, Type=Line`     | `<Separator padding={24} />` |
| `Padding=32, Type=Line`     | `<Separator padding={32} />` |
| `Padding=0, Type=With text` | `<Separator label="…" />`    |

The line is the `Color/Border/Border fill` token #e8ebf1 (grey-100), one pixel
tall; the padded variants keep it 16/24/32px from each edge with unpainted
spacers, never a wider or recoloured line. Do not use grey-200 (#d2d6e3), which
belongs to nodes whose source stroke is grey-200.

The `Type=With text` composition is one row on the source's 8px gap: a one-pixel
line, the label, the second line. The label uses the `text-label-mini` 14/20
token in `text-muted-foreground` (grey-700 #555c70). It is consumer-owned
content, so the application translates it.

`orientation="vertical"` and the `padding` wrapper are library API: the source
set draws horizontal dividers only. The separator is decorative for assistive
technology; it never replaces a heading.
