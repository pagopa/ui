<!-- component-rules:start -->

## Component Rules

- Place a snackbar at the bottom right of the viewport, 24px from the bottom and 24px from the right edge.
- Size a snackbar between 280px, the mobile XS minimum including 24px side padding, and 560px on desktop.
- Auto-dismiss a snackbar only when the same message is available elsewhere on the page.
- Never auto-dismiss an error snackbar.

<!-- component-rules:end -->

`Snackbar` is a compact status update with a severity icon, optional title,
description, optional caller action and optional dismissal. Error announcements use
`role="alert"`; info, warning and success use `role="status"`. The icon is
decorative because the status role and the caller-owned text carry the
announcement; use the published `report`, `warning`, filled `info` and
`check_circle` artwork for the four severities.

Width stays viewport- and content-driven. The close action is rendered only when
the caller supplies `onDismiss`, and `title` is optional for the same
compatibility reason. Caller-provided actions remain native controls. The close
glyph keeps its box and reaches the accessible pointer target through an invisible
expansion, so the message column keeps its track. Focus uses a visible solid
perimeter, and the component adds no motion.

## Error-code composition

`SnackbarErrorCode` composes an error title and description, a full-width
error-code row and a close action. It keeps its existing `message` prop as the
title-facing value and adds an optional `description`; `Snackbar`'s optional
`footer` slot places the code row beneath the entire message and icon row rather
than nesting it in the text column.

The code row is content-driven; the code remains selectable and wraps instead of
overflowing at narrow widths. Clipboard success, missing API and rejected
permission remain separate native button states; a failure leaves the code visible
for manual copying.
