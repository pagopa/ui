The library targets **WCAG 2.2 AA** as the working reference: EN 301 549
v4.1.1 (its §9) points at WCAG 2.2, the earlier v3.2.1 pointed at WCAG 2.1 AA,
so 2.2 AA is the stricter superset — and the tags the automated layer runs cover
the WCAG 2.1 AA level the AgID guidelines require. The AgID guidelines and the
ARIA Authoring Practices are the pattern sources. The per-type table below is
written to be reusable as an annex to a product's accessibility statement; a
product still answers for its own content and copy.

## How the criteria are verified

Two layers run automatically on every story:

- **axe** through `@storybook/addon-a11y`, configured with `a11y.test: "error"`
  and the tags `wcag2a`, `wcag2aa`, `wcag21a`, `wcag21aa`, `wcag22aa` and
  `best-practice` in `.storybook/preview.tsx`: a violation of those rules fails
  the story's test run.
- The **shared contract** (`apps/storybook/src/support/a11y-contract.ts`) runs after
  every story and checks the behaviour the story's widgets actually render:
  natural DOM order (no positive `tabindex`), accessible names, painted focus,
  dialog focus ownership and Escape, arrow keys in tab lists, radio groups and
  comboboxes, `aria-expanded`/selected/checked state, live regions with
  content, error association, and `aria-busy` actions that stay focusable.
  A story tagged `live-region` must also leave, after its `play`, a visible
  status, alert or log region carrying the announced message.

The same hook re-runs each story under two accessibility conditions: **320 px**
(WCAG 1.4.10 Reflow) and **increased text spacing with text at 200%** (1.4.12
Text Spacing, 1.4.4 Resize Text). In both, the page must not scroll
horizontally. **Forced colours** and **reduced motion** run in the dedicated
`storybook-conditions` vitest project (`vite.config.ts`), which excludes the
colour-pinned stories — the ones that fix source colours on purpose.

**Manual** criteria — the ones only a screen reader can confirm — use the
checklist template at the end of this page. No manual pass has been executed
yet: the outcome column reports the automatic layer.

Stories that cannot satisfy the reflow conditions yet declare
`a11yContract: { reflow: false }` in their own story — each exemption lives
with the story it belongs to, with its reason beside the flag: source-width
fixtures and the surfaces pending a design request, which carry one request
each in
[the reflow request](../../../../docs/design-requests/2026-10-16-a11y-reflow-conditions.md).
The exemption is temporary: remove the flag when its request lands, and keep
the requests file in sync with the story flags.

## Criteria by component type

Criterion numbers are WCAG 2.2 AA and the titles are shortened; `·` separates
criteria. “Verification” names what runs automatically and marks the criteria
that need the manual checklist.

| Component type            | Criteria                                                                                                                                                    | Verification                                                                                                                       | Current outcome                                                                                                                                           |
| ------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Button                    | 2.1.1 Keyboard · 2.4.7 Focus Visible · 2.5.8 Target Size (Minimum) · 1.4.3 Contrast (Minimum) · 4.1.2 Name, Role, Value                                     | axe; contract: tab order, accessible name, painted focus, busy action stays focusable. Manual: checklist.                          | Passing. A loading or skeleton Button is `aria-disabled` and `aria-busy`: it keeps its tab stop, its name and the announced state.                        |
| Field                     | 1.3.1 Info and Relationships · 3.3.1 Error Identification · 3.3.2 Labels or Instructions · 3.3.3 Error Suggestion · 2.1.1 · 2.4.7 · 4.1.2 · 1.4.10 · 1.4.12 | axe; contract: name, single error announcement, `aria-describedby` association, reflow conditions. Manual: checklist.              | Passing. `ErrorSummary` is the only live region; the per-field message is associated, not live. Rich and state stories are per-story reflow exemptions.   |
| Choice group              | 1.3.1 · 2.1.1 · 2.4.7 · 2.5.8 · 3.3.2 · 4.1.2                                                                                                               | axe; contract: a `radiogroup` answers ArrowDown by moving the checked option or its focus. Manual: checklist.                      | Passing where the story renders a radio group; rich options and the source state matrix are reflow exemptions.                                            |
| Dialog and Drawer         | 2.1.1 · 2.1.2 No Keyboard Trap · 2.4.3 Focus Order · 2.4.7 · 1.3.1 · 4.1.2                                                                                  | axe; contract: focus moves inside, the dialog announces a name, Escape dismisses it; the drawer restores focus. Manual: checklist. | Passing. Static frame stories declare `a11yContract: { dialog: false }`: they render the panel without an open lifecycle to own the focus.                |
| Tab                       | 1.3.1 · 2.1.1 · 2.4.7 · 1.4.3 · 4.1.2                                                                                                                       | axe; contract: ArrowRight moves the selection and focus follows it. Manual: checklist.                                             | Passing on the tab-list stories.                                                                                                                          |
| Combobox and Select       | 1.3.1 · 2.1.1 · 2.4.7 · 2.5.8 · 3.3.2 · 4.1.2 · 1.4.10 · 1.4.12                                                                                             | axe; contract: `aria-expanded` is announced and ArrowDown opens the listbox. Manual: checklist.                                    | Passing on the stories with a live popup; the dropdown, multiselect and select showcases are reflow exemptions.                                           |
| Table                     | 1.3.1 · 2.1.1 · 2.4.7 · 4.1.2 · 1.4.10 · 1.4.12 · 1.4.4                                                                                                     | axe; contract: header cells, names on several landmarks, reflow conditions. Manual: checklist.                                     | Passing; the `Table` title takes a heading tag. `with-controls` is a reflow exemption.                                                                    |
| Notifications and alerts  | 4.1.3 Status Messages · 1.4.1 Use of Color · 2.1.1 · 4.1.2 · 1.4.10 · 1.4.12                                                                                | axe; contract: every visible live region carries content. Manual: checklist.                                                       | Passing; titles take a heading tag (`Heading as`). The alert playground and the header-alert, KO-state and waiting-state showcases are reflow exemptions. |
| Navigation and breadcrumb | 1.3.1 · 2.4.4 Link Purpose (In Context) · 2.4.7 · 2.5.8 · 4.1.2                                                                                             | axe; contract: when a page has several navigations, each announces a name. Manual: checklist.                                      | Passing; the accordion and header stories are reflow exemptions.                                                                                          |
| Header and footer         | 1.3.1 · 2.4.1 Bypass Blocks · 2.4.7 · 1.4.3 · 4.1.2 · 1.4.10 · 1.4.12                                                                                       | axe; contract: named landmarks, visible focus, reflow conditions. Manual: checklist.                                               | Passing; footer column titles take a heading tag. `header--with-actions` is a reflow exemption.                                                           |
| Content display           | 1.1.1 · 1.3.1 · 1.4.1 · 1.4.3 · 1.4.4 · 1.4.10 · 1.4.12 · 4.1.2                                                                                             | axe; contract: names on images and landmark structure, reflow conditions. Manual: checklist.                                       | Passing on the automatic layer.                                                                                                                           |
| State and progress        | 4.1.3 Status Messages · 1.3.1 · 1.4.1 · 1.4.3 · 2.1.1 · 4.1.2 · 1.4.10 · 1.4.12                                                                             | axe; contract: every visible live region carries content, names, reflow conditions. Manual: checklist.                             | Passing on the automatic layer.                                                                                                                           |
| Module                    | 1.3.1 · 2.1.1 · 2.4.7 · 3.3.1 Error Identification · 3.3.2 Labels or Instructions · 4.1.2 · 1.4.10 · 1.4.12                                                 | axe; contract: tab order, names, single error announcement, reflow conditions. Manual: checklist.                                  | Passing on the automatic layer.                                                                                                                           |

The map in `apps/storybook/src/a11y/conformance.json` assigns every public
component to one of these rows, and `a11y:conformance:check` fails when a
component or a type is missing.

## What this flow changed

- A busy Button keeps the tab order and announces its state: `disabled` became
  `aria-disabled` + `aria-busy` with `focusableWhenDisabled`.
- Errors are announced once. `ErrorSummary` renders the only `role="alert"`,
  its items link each field, and the field message is an associated
  description (`data-slot="field-error"`) instead of a second live region.
  The announcement belongs to the form: a form that shows field messages
  without a summary announces nothing, and a per-field message that changes
  alone (async validation on blur, a server response) does not re-announce —
  the caller updates the summary with it. `ErrorSummary` moves the focus to
  the entry's target, giving a tabindex to a composite target that has none.
- Component titles take a heading level. `Heading as` (`titleAs`, default
  `h2`) replaced the fixed `h2` in Footer, Table, IdentityProviderPicker, CheckoutModule and
  the other components that render a title: the caller owns the outline.
- Visible **and** assistive strings are props with an Italian default,
  replaceable from outside: visible labels, hints, state and error copy,
  `aria-label`, `sr-only` announcements. Where the text depends on data, the
  caller composes the complete sentence (`pageLabel`, `slotLabel`, `stepLabel`,
  `statusLabel`, `fileMeta`, `removeFileLabel`, `announcement`…). The date and
  number formatting language is a prop too (`locale` on the date picker and the
  progress KPI), with the calendar's day grid as a `calendarLocale`
  passthrough.

## Manual screen reader checklist (template)

### Technologies to cover

Record the tool version, the OS and the browser version at test time: a pass
without them cannot be reproduced. One pass per row is the minimum matrix.

| Technology        | Platform          | Browser         | Version recorded at test time |
| ----------------- | ----------------- | --------------- | ----------------------------- |
| NVDA              | Windows 11        | Firefox, Chrome |                               |
| JAWS              | Windows 11        | Chrome          |                               |
| VoiceOver (macOS) | macOS (current)   | Safari          |                               |
| VoiceOver (iOS)   | iOS (current)     | Safari          |                               |
| TalkBack          | Android (current) | Chrome          |                               |

### Steps for one pass

1. Record the environment: tool and version, OS, browser, zoom level and font
   settings.
2. Navigate the outline by headings and landmarks with the screen off and
   confirm the reading order.
3. Run the keyboard walk: Tab and Shift+Tab through the surface, activate the
   controls, and check that each one announces name, role and state and paints
   focus.
4. Exercise the widget pattern: arrows in a radio group or tab list, ArrowDown
   on a combobox, Enter and Escape on a dialog, an invalid form submission and
   its announcement.
5. Compare the announcement with the criterion's expectation for that
   component type in the table above; the automatic layer already covers
   names, focus paint and state, so a failure here points at the announcement
   itself.
6. Record the pass below. On a failure, open an issue and — when the expected
   behaviour is a design decision — a request in `docs/design-requests/`.

### Record template

One table per pass; a criterion can need several passes, one per technology.
Leave the cells empty until the pass is executed.

| Field                              | Value |
| ---------------------------------- | ----- |
| Story / surface                    |       |
| Component type and criterion       |       |
| Technology, version, OS, browser   |       |
| Steps executed                     |       |
| Expected announcement              |       |
| Observed announcement              |       |
| Outcome (pass / fail / blocked)    |       |
| Date                               |       |
| Follow-up (issue / design request) |       |

Screen-reader support is claimed only from recorded passes. Browser zoom and
screen-reader specific settings stay manual by design; the automated contract
never replaces them.
