<!-- component-rules:start -->

## Component Rules

- Place an alert 24px below the content above it, following the page rhythm, and 40px above the content below it.

<!-- component-rules:end -->

`Alert` maps Figma `Severity=Error|Warning|Info|Success` to
`variant="destructive"|"warning"|"info"|"success"`. The Error to `destructive`
mapping preserves the existing public variant; `default` remains the Info
appearance. `direction="vertical"|"horizontal"` selects the two layouts.

The caller supplies the severity icon in `AlertIcon`, then groups the title and
description in `AlertCopy` and the optional native action in `AlertContent`. Use
`report`, `warning`, filled `info` and `check_circle`; `PagoPAIcon` inherits the
severity foreground. Callers decide the announcement semantics of their update:
`role="alert"` for errors, `role="status"` otherwise.

The action is a text line whose accessible target is an expanded hit area, so it
does not grow the layout. Copy and labels wrap rather than clip, and the
component stays `w-full` and content-driven. In narrow containers
`direction="horizontal"` stacks the action below the copy through a container
query. Native button focus stays visible; monochrome icons follow the system text
colour in forced-colors mode, and the alert introduces no motion.
