<!-- component-rules:start -->

## Component Rules

- Use `DialogTemplate` to confirm or cancel an operation.
- Use `FeedbackPage` to show the positive or negative outcome of a process, such as a wizard.

<!-- component-rules:end -->

The `Components/Templates` pages are page fragments: `Dialog`, `Security Code
Dialog`, `Informative Drawer` and `Feedback Page`. They are private modules, not
part of the public entry, and they compose the library components the same way an
application would.

**A template owns layout, not copy.** Titles, descriptions, messages and actions
are caller-owned slots; the story copy is sample content.

**Each template answers its own frame.** The layout switches on container queries
on the page element, not on the browser viewport, so the narrow and wide stories
render both devices from the same component. The dialog templates point the Base UI
portal at the page element instead of the document body, so the panel stays a DOM
descendant of the frame and the container queries apply.

- `DialogTemplate` owns the shared panel: the surface overlay backdrop and a rounded
  panel, with a narrow frame (stacked actions) and a wide frame (end-aligned action
  row). Its slots are the message block (`children`), a panel-level block (`blocks`)
  and the footer `actions` (primary first). The panel takes focus on open instead of
  painting a ring on its first control.
- `SecurityCodeDialog` is the shared dialog panel with the code control and its
  helper copy as a panel-level block.
- `InformativeDrawer` uses the library `Drawer`: a bottom sheet on the narrow frame
  (without the drag handle) and a side panel on the wide frame. The caller passes
  the edge its frame uses.
- `FeedbackPage` is the application chrome (preheader, header, footer) around one
  `SuccessState`, `ErrorState` or `WaitingState` block; its height is content-driven.
