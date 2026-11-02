The library targets **WCAG 2.2 AA** as the working reference: EN 301 549 v4.1.1
(its §9) points at WCAG 2.2, and the AgID guidelines and the ARIA Authoring
Practices are the pattern sources. The per-type table below is written to be
reusable as an annex to a product's accessibility statement; a product still
answers for its own content and copy.

## How the criteria are verified

Every story runs under an automated layer: axe, plus a shared contract that checks
the behaviour the story's widgets actually render — natural DOM order (no positive
`tabindex`), accessible names, painted focus, dialog focus ownership and Escape,
arrow keys in tab lists, radio groups and comboboxes,
`aria-expanded`/selected/checked state, live regions with content, error
association, and `aria-busy` actions that stay focusable. A story tagged
`live-region` must leave a visible status, alert or log region carrying the
announced message after its `play`.

The same layer re-runs each story at **320 px** (WCAG 1.4.10 Reflow) and with
**increased text spacing at 200%** (1.4.12 Text Spacing, 1.4.4 Resize Text); in
both the page must not scroll horizontally. **Forced colours** and **reduced
motion** run in their own project, which excludes the colour-pinned stories — the
ones that fix source colours on purpose.

Conditions a story cannot satisfy yet are declared on the story itself, with the
reason beside the flag:
`a11yContract: { reflow: false }` for source-width fixtures and surfaces pending a
design request, which carry one request each in
[the reflow request](../../../../docs/design-requests/2026-10-16-a11y-reflow-conditions.md).
The exemption is temporary: it goes when its request lands.

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

## Manual verification

The criteria only a screen reader can confirm stay manual, and no manual pass has
been recorded yet: the outcome column above reports the automatic layer.

Cover NVDA on Windows 11 (Firefox, Chrome), JAWS on Windows 11 (Chrome), VoiceOver
on macOS and iOS (Safari) and TalkBack on Android (Chrome), and record the tool, OS
and browser versions at test time so the pass can be reproduced.

| Screen reader | Operating system | Browser | Outcome      |
| ------------- | ---------------- | ------- | ------------ |
| NVDA          | Windows 11       | Firefox | Not executed |
| NVDA          | Windows 11       | Chrome  | Not executed |
| JAWS          | Windows 11       | Chrome  | Not executed |
| VoiceOver     | macOS            | Safari  | Not executed |
| VoiceOver     | iOS              | Safari  | Not executed |
| TalkBack      | Android          | Chrome  | Not executed |

For each pass, record the versions, locale, story or consumer page, actions and
observed result alongside the outcome. Walk headings and named landmarks with
the screen off, then traverse every interactive control by keyboard or the
screen reader's equivalent. Check that focus remains visible when the screen is
on. Browser zoom and resize-text checks are also **not executed** until recorded:
at 200% text and 400% zoom, verify that content and controls remain available,
and record any justified two-dimensional scrolling exception.

The expected information is semantic, not a prescribed phrase: speech varies
with the screen reader, browser and locale. Record what was actually announced.

| Representative interaction | Expected information and operation                                                                                                                   |
| -------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| Button or toggle           | Consumer-supplied name and button role; unavailable, busy or pressed state when applicable; Enter or Space activates an enabled action.              |
| Segmented control          | Consumer-supplied group name, each choice's name and pressed state; keyboard activation updates the state without losing its label.                  |
| Field and invalid submit   | Field name, required/invalid state and associated error; the error summary announces the submission error without a competing per-field live region. |
| Radio group or tabs        | Group or tab-list name, option/tab name and selected state; arrow keys move through the relevant choices.                                            |
| Combobox or select         | Field name, expanded state, active option and selection; keyboard operation opens, navigates and closes the popup.                                   |
| Dialog or drawer           | Dialog name and role, focus moved inside and contained while open; Escape closes it and focus returns to its trigger.                                |
| Navigation and table       | Distinct landmark names and meaningful links; table headers remain associated with their cells.                                                      |
| Status or alert            | The changed message is announced without unexpectedly moving focus.                                                                                  |

A failure opens an issue and — when the expected behaviour is a design decision —
a request in `docs/design-requests/`.

Screen-reader support is claimed only from recorded passes. Browser zoom and
screen-reader specific settings stay manual by design; the automated layer never
replaces them.
