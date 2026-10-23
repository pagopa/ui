<!-- component-rules:start -->

## Component Rules

- Treat both the text and the pictogram as caller-owned: the component ships no copy and no artwork of its own.

<!-- component-rules:end -->

# EmptyState

`EmptyState` is the empty surface of a section: it says why there is nothing and
proposes the next step. The title, the description, the pictogram and the
actions are all caller props, so the application owns the language.

## Behaviour and accessibility

- The title is a real heading (`titleAs`, `h2` by default) and the description is
  a paragraph; the section is a plain `section`, so it does not claim a landmark
  name the caller did not set.
- The pictogram slot is `aria-hidden`: the artwork is decorative and the title
  carries the meaning. A meaningful image belongs to the caller's own content.
- The actions sit in one wrapping row, centred. The shared text action keeps its
  24px native box where the source action is a 22px row, and reaches the 44px
  pointer target through the invisible vertical `::after` expansion instead of
  inflating the card.
- The surface is the source card: 8px radius, 1px `#e8ebf1` border, white fill,
  16px padding and a 16px gap between the message block and the action row.

## Figma source mapping

Node `11149:7765` (`Empty state`, 832x184) is a plain component: no variant axis
and no device axis, so one composition and one case.

- The root 832x184 card (`r=8`, 1px `#e8ebf1` stroke, `#ffffff` fill, 16px
  padding, 16px vertical gap, both axes centred) maps to the `section` and its
  spacing classes.
- `EmptyStateWrapper` (800x152, 16px vertical gap) is the message column plus the
  action row; `Container` (800x114, 8px vertical gap) is the pictogram and the
  text pair.
- `Error` (56x56) is the optional `icon` slot: the caller passes the pictogram,
  the component owns the 56x56 box.
- `Title` (16px Semibold, line height 22, `#636b82`) maps to `title` with
  `text-label-sb text-muted-soft`; `Subtitle` (14px Regular, line height 20,
  `#555c70`) maps to `description` with `text-body-small text-muted-foreground`.
- `Button` (48x22, the `.UnstyledButton` instance with the `Button` text:
  16px Semibold, `#0b3ee3`) is the caller's `actions` slot; the source text
  action is the `link` button variant without padding, whose 24px native box
  measures 2px above the source 22 and takes the 44px target from the invisible
  `::after` expansion — the recorded residue.
- The source artboard's 832px width is forced by the capture, never baked into
  the component: `className="w-208"` only frames the fidelity story.
