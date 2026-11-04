<!-- component-rules:start -->

## Component Rules

- Anchor the temporary validation message to its field and associate it with the field so it is announced with that field.
- Dismiss the message when the field is corrected or the close action is activated.

<!-- component-rules:end -->

`Popper` is a distinct, non-modal validation message, not `Popover` or an inline
`Alert`. Its caller owns validation, visibility and placement: render it next to
the field in a positioned container, and remove it when validation succeeds or
`onDismiss` is called. The message's `id` must be included in the field's
`aria-describedby` while visible; set `aria-invalid` for a validation error.
Keep existing description IDs when adding the message ID. When dismissal removes
the focused close button, return focus to the related field. Dismissing a message
does not make an invalid value valid; keep the field's invalid state until the
value is corrected.

The surface itself is not a dialog and does not move focus or announce itself
as a live region. Follow the form's existing announcement strategy, such as a
single error summary on submission, rather than adding an alert for every field.
On failed validation, focus the related field after its description is updated,
or use the form's error summary to direct the user to it.
Use message text that communicates the status without relying on the decorative
icon or colour.

The caller positions the surface against the field and keeps it within the
available viewport; its width is fluid, so narrow containers wrap the message.
`pointer` chooses the source's left, center or right position; `tone` selects
the four source statuses. `dismissLabel` overrides the close button's accessible
name; `UIProvider` also supports overriding `messages.popper.dismissLabel`.
