<!-- component-rules:start -->

## Component Rules

- Place an alert 24px below the content above it, following the page rhythm, and 40px above the content below it.

<!-- component-rules:end -->

`Alert` maps Figma `Severity=Error|Warning|Info|Success` to
`variant="destructive"|"warning"|"info"|"success"`. The Error→`destructive`
mapping preserves the existing public variant; `default` remains the Info
appearance. `direction="vertical"|"horizontal"` selects the two source layouts.

The caller supplies the decorative severity icon in `AlertIcon`, then groups the
title and description in `AlertCopy` and the optional native action in
`AlertContent`. The four source icons are `report`, `warning`, filled `info` and
`check_circle`; `PagoPAIcon` uses the pinned artwork and inherits the severity
foreground. Error updates use `role="alert"` and other updates use `role="status"`
in the stories; callers decide the announcement semantics for their update.

The status semantic tokens reproduce the source treatments, and the retained
border keeps system-color visibility rather than being compensated with one-off
padding. The action is a source text line whose accessible pointer target is an
expanded hit area, so it does not grow the layout. The Figma specimen widths
appear only as story fixtures; previewing an alert at an invented width or with
an inflated action box is fixture drift.
The component remains `w-full` and content-driven.

`direction="horizontal"` uses a named container query to stack the action below
the copy in narrow containers; `WithAction` exercises that reflow. Long copy and
labels wrap rather than clip. Native button focus remains visible and is
keyboard-tested; monochrome icons inherit system text color in forced-colors
mode, and the alert introduces no motion.
