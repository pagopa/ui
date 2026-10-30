<!-- component-rules:start -->

## Component Rules

- Treat both the text and the pictogram as caller-owned: the component ships no copy and no artwork of its own.

<!-- component-rules:end -->

`EmptyState` is the empty surface of a section: it says why there is nothing and
proposes the next step. The title, the description, the pictogram and the actions
are all caller props, so the application owns the language.

## Behaviour and accessibility

- The title is a real heading (`titleAs`, `h2` by default) and the description is
  a paragraph; the section is a plain `section`, so it does not claim a landmark
  name the caller did not set.
- The pictogram slot is `aria-hidden`: the artwork is decorative and the title
  carries the meaning. A meaningful image belongs to the caller's own content.
- The actions sit in one wrapping row, centred. A shared text action keeps its
  native box and reaches the accessible pointer target through an invisible
  vertical expansion instead of inflating the card.
- The surface is the source card, and the message block and the action row are
  separated by the source gap.
