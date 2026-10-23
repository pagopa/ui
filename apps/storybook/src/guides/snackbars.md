<!-- component-rules:start -->

## Component Rules

- Place a snackbar at the bottom right of the viewport, 24px from the bottom and 24px from the right edge.
- Size a snackbar between 280px, the mobile XS minimum including 24px side padding, and 560px on desktop.
- Auto-dismiss a snackbar only when the same message is available elsewhere on the page.
- Never auto-dismiss an error snackbar.

<!-- component-rules:end -->

# Snackbar

`Snackbar` is a compact status update with a severity icon, optional title,
description, optional caller action and optional dismissal. Error announcements
use `role="alert"`; info, warning and success use `role="status"`. The icon is
decorative because the status role and caller-owned text carry the announcement.

## Figma source mapping

Node `357:4970` supplies four `Status` variants: Error, Warning, Info and
Success. Their icons map to the published `report`, `warning`, filled `info`
and `check_circle` artwork. The message and title remain props rather than
product copy. The status fills, borders and foregrounds use the existing
semantic tokens.

The source frame is a sample, not a fixed runtime size: width remains viewport-
and content-driven, and at a narrow viewport the existing width rule provides
the source track. The close action keeps the source glyph inside its frame,
expanded to an accessible target through outer padding.

The close action is rendered only when the caller supplies `onDismiss`,
preserving existing callers. `title` is optional for the same compatibility
reason; the source-matched story shows it. Caller-provided actions remain native
controls. Focus uses a visible solid perimeter; the component adds no motion, so
reduced-motion settings do not alter it.

The source `Content` row separates the message from the `Close` layer by 16px and
that is the root gap of every composition. The close is a 24px source box; the
44px pointer target is its invisible `::after` expansion, so the message column
keeps the source 176px track instead of losing 12px to a 44px control.

## Error-code composition

Node `392:4667` composes an error title and description, a full-width error-code
row and a close action. `SnackbarErrorCode` keeps its existing `message` prop as
the title-facing value and adds an optional `description`. `Snackbar`'s optional
`footer` slot places the code row beneath the entire message/icon row rather
than nesting it in the text column.

The code row is content-driven; the code remains selectable and wraps instead of
overflowing at narrow widths. Clipboard success, missing API and rejected
permission remain separate native button states; failure leaves the code visible
for manual copying.

The error-code field is the source 48px box: `h-12` with a 12px top inset and a
24px copy box whose 44px pointer target is its invisible `::after` expansion.
The 1px CSS border sits inside the source stroke, so the field keeps the source
height instead of growing by it.
