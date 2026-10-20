## Floating labels

Text fields, text areas, the autocomplete, the selects and the date field share
one floating label. Source fields keep the label **inside** the control when
empty and unfocused (centred in short fields, top-aligned in text areas) and
float it into the **top border notch** when focused or filled. A label that
stays inset while the field is filled is a defect, not a variant.

The label is the source HUG container: one flex row that centres the label text
and the required marker on the same axis, with the generated type-scale tokens
for the resting and floated states and the source resting/floated gaps. The
floated box stays centred on the frame's top edge whatever its tallest child
measures.

- Native date and time editors keep the same pattern. Their `:placeholder-shown`
  never matches, so the filled state is tracked in React, and the browser's
  empty-editor text stays hidden until focus.
- Select triggers are caller-driven: an empty select keeps the full-size label
  while open and floats it only when a value is selected.
- The autocomplete's empty live region adds no layout band above the results.

## Feedback and fixtures

Errors are associated with the control and use the source `report` glyph;
success is announced as an associated description with a decorative icon.
Status icons and decorative adornments never replace native actions.

The field stories render at the source frame width so the preview matches it;
the components themselves stay `w-full` and content-driven.
