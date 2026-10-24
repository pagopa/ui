# Component rules — open decisions

The import of the Figma `.Regole` boxes is complete: 356 cards, every one with a
disposition. The [gap report](../reports/2026-10-24-component-rules-gaps.md)
compares the 43 imported rules with the implementation. The actionable gaps are
closed; this file tracks what still waits on a decision, so nothing gets lost
between the ledger and the code.

Status: open. A decision is closed when the answer is recorded in the file it
points at and the code or guide follows it.

## Design-owner questions

| Decision                                                                                                                         | Blocks                                                          | Tracked in                                                                                                                                  |
| -------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| Breadcrumb: does the component switch to Compact automatically on mobile, and what is the back destination?                      | `Breadcrumb` responsive layout                                  | [`2026-10-22-breadcrumb-description-vs-drawing.md`](../design-requests/2026-10-22-breadcrumb-description-vs-drawing.md)                     |
| Drawer: does `direction` stay caller-owned or follow a device breakpoint (bottom sheet below 600)?                               | `Drawer` automatic bottom sheet                                 | [`2026-10-21-timeline-drawer-width-and-mobile.md`](../design-requests/2026-10-21-timeline-drawer-width-and-mobile.md), question 2, option C |
| Pagination: is the compact state a `layout="compact"` prop, a container behaviour or a device axis? Confirm the 900px threshold. | `Pagination` compact trigger                                    | [`2026-10-21-pagination-order-axis.md`](../design-requests/2026-10-21-pagination-order-axis.md), questions 1–4                              |
| Shadow 32: modals and drawers only, or every floating layer?                                                                     | tooltip, popover, snackbar, cookies, scroll-to-bottom elevation | [`2026-10-24-shadow-32-scope.md`](../design-requests/2026-10-24-shadow-32-scope.md)                                                         |
| ButtonGroup: 8px rule or 24px drawing?                                                                                           | `ButtonGroup` gap and parity residues                           | [`2026-10-24-button-group-spacing.md`](../design-requests/2026-10-24-button-group-spacing.md)                                               |
| ProgressKpi: is the group a public component or a composition, and does it own the mobile carousel?                              | `ProgressKpiGroup`                                              | [`2026-10-24-progress-kpi-group.md`](../design-requests/2026-10-24-progress-kpi-group.md)                                                   |

## Product and API decisions

These are not design questions: the behaviour is already specified by the
imported rules, and the open part is the public surface or the product
behaviour. The owner is the library owner (the person), with a design review
only where a visual change follows.

| Decision                                                                                                            | Why it is open                                                                                                                                                                                                                            | Blocks                                                       |
| ------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------ |
| Required wording in the choice fields (`CheckboxField`, `CheckboxGroup`, `RadioField`, `RadioGroup`, `SwitchField`) | The rule says the asterisk alone is not enough; these fields render `(obbligatorio)` in `sr-only` only and the string is hardcoded Italian. Making it visible needs an overridable text prop (for example `requiredLabel`) on each field. | visible required state parity across all fields              |
| `Snackbar` placement                                                                                                | The rule pins bottom-right 24/24; the component is an inline surface. A region/toaster helper is new public surface; a documented wrapper is not.                                                                                         | where the snackbar mounts and how multiple messages stack    |
| `Snackbar` timing                                                                                                   | The rule allows auto-dismiss only when the same message is reachable elsewhere; the component has no timer. An opt-in `duration`/`autoDismiss` prop is an API change; keeping timing caller-owned is a documentation change.              | auto-dismiss and the "errors never auto-dismiss" consequence |
| `Button` disabled variant                                                                                           | The rule says do not use it; the API exposes `disabled` and paints it with `opacity-50`. Options: keep and fix the contrast, deprecate with a blocked/toast pattern, or document the rule as advisory.                                    | the button contract and the guide                            |
| `Drawer` automatic direction                                                                                        | The bottom-sheet primitive exists; the switch would stop `direction` being caller-owned. The design request above asks whether that is wanted; the implementation shape is a product decision.                                            | automatic mobile placement                                   |
| `ProgressKpiGroup` public export                                                                                    | The source set is `excluded`; a group component or a documented composition changes the public surface.                                                                                                                                   | the group API and its a11y contract                          |

## Closed with this import

The five gaps that needed no decision were implemented and are covered by tests:
Pagination threshold and single-page hiding, `ButtonGroup` gap, Drawer title
scale at the tablet step, `IDModule` 410px width, and the visible required
wording in the text/select/autocomplete/date fields. The parity and story
suites were re-run with them; see the gap report for the per-gap evidence.
