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
