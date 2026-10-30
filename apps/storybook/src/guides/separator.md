<!-- component-rules:start -->

## Component Rules

- A list omits the divider after its last item.

<!-- component-rules:end -->

`Separator` draws the divider token as a one-pixel line. The `padding` values 16,
24 and 32 keep that line that far from each edge with unpainted spacers: never a
wider or recoloured line, and never the grey-200 token that belongs to other
strokes.

`label` renders the `With text` composition, one row with the line, the label and
the second line. The label is consumer-owned content, so the application
translates it.

`orientation="vertical"` and the `padding` wrapper are library API: the source
set draws horizontal dividers only. The separator is decorative for assistive
technology and never replaces a heading.
