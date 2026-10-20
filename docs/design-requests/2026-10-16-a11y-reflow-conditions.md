# Design request — reflow conditions (WCAG 1.4.10, 1.4.12, 1.4.4)

Date: 16 October 2026. Origin: flow D (`docs/plans/d-accessibility-contract.md`).
Figma was not modified: the request comes from the test contract, not from a
change to the library. The stories below are the ones that declare
`a11yContract: { reflow: false }` in their `parameters`
(`src/stories/*.stories.tsx`), each with the reason next to the flag; the
fidelity fixtures (fidelity matrices and catalogues) stay outside this request.

## Why

The shared contract runs every story at **320 px** (1.4.10 Reflow) and then with
**increased text spacing and text at 200%** (1.4.12 Text Spacing and 1.4.4
Resize Text): in both passes the page must not scroll horizontally. The stories
listed below cannot yet satisfy the condition and have been exempted so as not to
block the suite: each one is a request for a decision. When a request is closed
(fix or documented exception), the `reflow: false` flag must be removed from the
story and the entry from this file.

## Criteria and tested condition

- **1.4.10 Reflow**: at 320 px CSS the content reflows and there is no horizontal
  scrolling. Two-dimensional scrolling is allowed only for content that requires
  two dimensions (images, maps, videos, data tables).
- **1.4.12 Text Spacing**: with line-height 1.5, letter-spacing 0.12em and
  word-spacing 0.16em the content neither overlaps nor requires horizontal
  scrolling.
- **1.4.4 Resize Text**: text up to 200% stays readable and usable without
  assistive technology, at the same width.

For every group we list all three criteria: the exemption covers the whole
condition, so the criterion that actually fails must be re-measured on the
individual story before closing the request. Where the wide part is a table or an
image, the technical exception of 1.4.10 must be stated explicitly in the
solution.

## Requests per component/family

1. **Alert** — `components-alert--playground`.
   Criteria: 1.4.10, 1.4.12, 1.4.4.
   What we ask: fix the layout so it holds up at 320 px and with 200% text, or
   document the exception.

2. **IDModule** — `components-composites-idmodule--desktop`,
   `components-composites-idmodule--playground`,
   `components-composites-idmodule--single-provider`,
   `components-composites-idmodule--configurable-heading`.
   Criteria: 1.4.10, 1.4.12, 1.4.4.
   What we ask: establish whether the composition must reflow at 320 px, hand
   the wide part to a dedicated container, or document the exception.

3. **OrganizationModule** — `components-composites-organizationmodule--playground`,
   `components-composites-organizationmodule--with-caller-content`,
   `components-composites-organizationmodule--without-membership-claim`.
   Criteria: 1.4.10, 1.4.12, 1.4.4.
   What we ask: establish whether the composition must reflow at 320 px, hand
   the wide part to a dedicated container, or document the exception.

4. **PaymentModule** — `components-composites-paymentmodule--loading`.
   Criteria: 1.4.10, 1.4.12, 1.4.4.
   What we ask: establish whether the composition must reflow at 320 px, hand
   the wide part to a dedicated container, or document the exception.

5. **ProductModule** — `components-composites-productmodule--radio`.
   Criteria: 1.4.10, 1.4.12, 1.4.4.
   What we ask: establish whether the composition must reflow at 320 px, hand
   the wide part to a dedicated container, or document the exception.

6. **FeatureList** — `components-content-featurelist--playground`.
   Criteria: 1.4.10, 1.4.12, 1.4.4.
   What we ask: fix the layout so it holds up at 320 px and with 200% text, or
   document the exception.

7. **ListItem** — `components-content-listitem--actionable`,
   `components-content-listitem--link`, `components-content-listitem--loading`,
   `components-content-listitem--playground`,
   `components-content-listitem--transactional`,
   `components-content-listitem--with-action`,
   `components-content-listitem--with-avatar`.
   Criteria: 1.4.10, 1.4.12, 1.4.4.
   What we ask: fix the layout so it holds up at 320 px and with 200% text, or
   document the exception.

8. **StatusTile** — `components-content-statustile--orientations`.
   Criteria: 1.4.10, 1.4.12, 1.4.4.
   What we ask: confirm the behaviour of the two orientations at 320 px (stack or
   scroll), or document the exception.

9. **MicroEvento** — `components-data-display-microevento--corrected`,
   `components-data-display-microevento--playground`.
   Criteria: 1.4.10, 1.4.12, 1.4.4.
   What we ask: fix the layout so it holds up at 320 px and with 200% text, or
   document the exception.

10. **ProductCard** — `components-data-display-productcard--catalogue-card-slots`,
    `components-data-display-productcard--logo-and-chip`,
    `components-data-display-productcard--native-product-links`,
    `components-data-display-productcard--optional-slots-and-catalogue-content`.
    Criteria: 1.4.10, 1.4.12, 1.4.4.
    What we ask: fix the layout so it holds up at 320 px and with 200% text, or
    document the exception.

11. **Table** — `components-data-display-table--with-controls`.
    Criteria: 1.4.10, 1.4.12, 1.4.4.
    What we ask: confirm that the tabular part may scroll inside a dedicated
    container (1.4.10 allows it for two-dimensional content) and fix the rest, or
    document the exception.

12. **Timeline** — `components-data-display-timeline--multidestinatario`,
    `components-data-display-timeline--plain-items`,
    `components-data-display-timeline--playground`,
    `components-data-display-timeline--touchpoints`.
    Criteria: 1.4.10, 1.4.12, 1.4.4.
    What we ask: establish whether the timeline must reflow at 320 px, scroll
    inside a dedicated container, or document the exception.

13. **HeaderAlert** — `components-feedback-headeralert--all-tones`.
    Criteria: 1.4.10, 1.4.12, 1.4.4.
    What we ask: fix the layout so it holds up at 320 px and with 200% text, or
    document the exception.

14. **KOState** — `components-feedback-kostate--playground`,
    `components-feedback-kostate--with-action`,
    `components-feedback-kostate--with-code`.
    Criteria: 1.4.10, 1.4.12, 1.4.4.
    What we ask: fix the layout so it holds up at 320 px and with 200% text, or
    document the exception.

15. **ScrollToBottom** — `components-feedback-scrolltobottom--playground`,
    `components-feedback-scrolltobottom--reduced-motion-scroll`.
    Criteria: 1.4.10, 1.4.12, 1.4.4.
    What we ask: fix the layout so it holds up at 320 px and with 200% text, or
    document the exception.

16. **WaitingState** — `components-feedback-waitingstate--playground`.
    Criteria: 1.4.10, 1.4.12, 1.4.4.
    What we ask: fix the layout so it holds up at 320 px and with 200% text, or
    document the exception.

17. **AuthenticationCodeInput** —
    `components-inputs-authenticationcodeinput--masked-native-code`,
    `components-inputs-authenticationcodeinput--masked-native-paste`,
    `components-inputs-authenticationcodeinput--narrow-source-code`,
    `components-inputs-authenticationcodeinput--slot-labels-and-frame-press`.
    Criteria: 1.4.10, 1.4.12, 1.4.4.
    What we ask: confirm the cell width at 320 px and with text at 200% (reduce
    the number of visible digits or scroll), or document the exception.

18. **CheckboxField** — `components-inputs-checkboxfield--playground`,
    `components-inputs-checkboxfield--rich-option`,
    `components-inputs-checkboxfield--with-description`.
    Criteria: 1.4.10, 1.4.12, 1.4.4.
    What we ask: fix the layout so it holds up at 320 px and with 200% text, or
    document the exception.

19. **CheckboxGroup** — `components-inputs-checkboxgroup--playground`.
    Criteria: 1.4.10, 1.4.12, 1.4.4.
    What we ask: fix the layout so it holds up at 320 px and with 200% text, or
    document the exception.

20. **DatePicker** — `components-inputs-datepicker--field-native-form`,
    `components-inputs-datepicker--field-states`.
    Criteria: 1.4.10, 1.4.12, 1.4.4.
    What we ask: establish whether the calendar must reflow or scroll inside its
    panel, or document the exception.

21. **DragAndDrop** — `components-inputs-draganddrop--failed`,
    `components-inputs-draganddrop--processing`.
    Criteria: 1.4.10, 1.4.12, 1.4.4.
    What we ask: fix the layout so it holds up at 320 px and with 200% text, or
    document the exception.

22. **Dropdown** — `components-inputs-dropdown--multiselect`,
    `components-inputs-dropdown--static-indicator`.
    Criteria: 1.4.10, 1.4.12, 1.4.4.
    What we ask: fix the layout so it holds up at 320 px and with 200% text, or
    document the exception.

23. **Form behaviours** —
    `components-inputs-form-behaviors--authentication-code-reflow`,
    `components-inputs-form-behaviors--cancelled-form-reset`,
    `components-inputs-form-behaviors--native-editor-keyboard-focus`,
    `components-inputs-form-behaviors--painted-keyboard-perimeters`,
    `components-inputs-form-behaviors--upload-mime-and-drag-states`,
    `components-inputs-form-behaviors--upload-rejects-invalid-files`.
    Criteria: 1.4.10, 1.4.12, 1.4.4.
    What we ask: these are test surfaces rather than product renderings: confirm
    whether the condition must be solved in the fixture layout, or whether a
    design request is needed.

24. **InputChip** — `components-inputs-inputchip--removable`.
    Criteria: 1.4.10, 1.4.12, 1.4.4.
    What we ask: fix the layout so it holds up at 320 px and with 200% text, or
    document the exception.

25. **MultiSelectField** — `components-inputs-multiselectfield--playground`.
    Criteria: 1.4.10, 1.4.12, 1.4.4.
    What we ask: fix the layout so it holds up at 320 px and with 200% text, or
    document the exception.

26. **RadioField** — `components-inputs-radiofield--radio-loading-states`,
    `components-inputs-radiofield--radio-source-state-matrix`,
    `components-inputs-radiofield--rich-radio-options`.
    Criteria: 1.4.10, 1.4.12, 1.4.4.
    What we ask: fix the layout so it holds up at 320 px and with 200% text, or
    document the exception.

27. **SelectField** — `components-inputs-selectfield--selection-controls`.
    Criteria: 1.4.10, 1.4.12, 1.4.4.
    What we ask: fix the layout so it holds up at 320 px and with 200% text, or
    document the exception.

28. **SwitchField** — `components-inputs-switchfield--fidelity-start-states`.
    Criteria: 1.4.10, 1.4.12, 1.4.4.
    What we ask: fix the layout so it holds up at 320 px and with 200% text, or
    document the exception.

29. **Accordion** — `components-navigation-accordion--loading`,
    `components-navigation-accordion--playground`,
    `components-navigation-accordion--with-disabled-item`.
    Criteria: 1.4.10, 1.4.12, 1.4.4.
    What we ask: fix the layout so it holds up at 320 px and with 200% text, or
    document the exception.

30. **Header** — `components-navigation-header--with-actions`.
    Criteria: 1.4.10, 1.4.12, 1.4.4.
    What we ask: establish how the header actions stack or scroll at 320 px, or
    document the exception.

31. **Popover** — `components-overlays-popover--open-keyboard-audit`.
    Criteria: 1.4.10, 1.4.12, 1.4.4.
    What we ask: fix the panel layout so it holds up at 320 px and with 200%
    text, or document the exception.

32. **Feedback page (template)** — `components-templates-feedback-page--waiting`.
    Criteria: 1.4.10, 1.4.12, 1.4.4.
    What we ask: establish whether the template page must reflow at 320 px, hand
    the wide part to a dedicated container, or document the exception.

33. **Spinner** — `components-feedback-spinner--sizes` (added after the first
    draft, together with the text-contract stories).
    Criteria: 1.4.10, 1.4.12, 1.4.4.
    What we ask: fix the container of the sizes so it holds up with 200% text, or
    document the exception.

34. **Text contract (verification stories)** —
    `components-accessibility--notice-labels`,
    `components-accessibility--navigation-texts`,
    `components-accessibility--content-announcements`,
    `components-accessibility--field-texts`.
    Criteria: 1.4.10, 1.4.12, 1.4.4.
    What we ask: the same compositions (Banner, Footer, Stepper, Table, required
    fields) repeat the limitations already listed above; the entry is closed
    together with the corresponding groups.

## What we are asking for, in short

For every group: fix the layout, or document the exception with the reason.
**Total number of requests: 75**, across 34 groups. Every request corresponds to
removing the `reflow: false` flag from the exempted story.
