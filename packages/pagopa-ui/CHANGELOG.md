## 0.0.1 (2026-10-21)

### 🚀 Features

- Publish `@pagopa/ui` on GitHub Packages through the Nx Release pipeline. ([5460336](https://github.com/pagopa/ui/commit/5460336))

### ❤️ Thank You

- gunzip

## Unreleased

### Added

- `ErrorSummary`: the form-level error strategy. It announces once
  (`role="alert"`), lists the caller-owned messages and links each one back to
  its control (clicking moves the focus to the field, a composite target gets
  a tabindex); per-field messages are no longer live regions and stay
  associated through `aria-describedby`. The announcement belongs to the form
  that renders the summary: without one nothing announces, and an error that
  changes without changing the summary does not re-announce.
- `titleAs` on Table, Footer, IDModule and CheckoutModule (via the internal
  `Heading` primitive): the caller owns the heading level, `h2` by default.
- Text props with Italian defaults for every user-facing string, visible or
  announced: overlay close labels, navigation names, pagination controls,
  download actions, upload and error copy, progress and loading
  announcements, avatars and empty states. Phrases that depend on data arrive
  as functions returning the complete text (`pageLabel`, `slotLabel`,
  `stepLabel`, `statusLabel`, `fileMeta`, `removeFileLabel`,
  `invalidFormatError`, `announcement`); a default no consumer can replace no
  longer exists in the field family (`requiredLabel`).

- `locale` on DatePicker, DatePickerField and ProgressKpi: the application owns
  the date and number formatting (BCP 47, `it-IT` by default), and the day-grid
  language of the calendar remains a `calendarLocale` passthrough.

### Changed

- A busy button (loading or skeleton) keeps its place in the tab order and
  announces its state (`aria-disabled` + `aria-busy` instead of `disabled`);
  the skeleton keeps the label announced while the skeleton bar stays
  decorative.
- The design tokens are keyed by their published Figma variable or style key: a
  rename in the source keeps the generated CSS name and the text alias, and the
  refresh reports it as a delta.
- The Figma device widths are exposed as named breakpoint tokens (`tablet`,
  `tablet-md`, `desktop`, `desktop-xl`, `desktop-xxl`) next to Tailwind's
  defaults, which stay in place: the components keep the reviewed rendering at
  every width.
- The foundation layer gains the spacing scale (4/8/16/24/32/40/48 plus the
  recurring 1/2/3/6/10/12/14/20/56/64/80/132 values), the icon and control
  sizes, `Shadow 16`, the 2px and 4px radii and the 27rem/40rem container
  thresholds; each entry records its source and, when it has no published
  variable, the reason.
- The components read named tokens instead of inline values: the container
  thresholds, the 2px/4px radii, the circle radii and the exact sizing steps;
  component and page geometry (dialog, drawer, states, header, menus, camera,
  demo grids) lives in documented local extensions in `src/index.css`.
- The payment and radio skeletons use the shared skeleton widths
  (240/356/168 and 180/244 px); the previous 241/357/170/179/243 values differed
  by one or two pixels.
- Secondary text, decorative strokes, drag-and-drop surfaces, selected rows and
  white surfaces use semantic aliases instead of raw Figma variables or
  Tailwind's `white`.
- The components use the generated type-scale classes — size, line height and
  source weight in one token — instead of Tailwind's default text sizes and
  separate `font-*` weights; the section titles, hero copy and list labels move
  to their source values (a few line heights and sizes change).
- The published stylesheet carries only the utilities the shipped components
  reference: the Tailwind scan no longer reads the stories, the demo screens,
  the Figma catalogue or the tooling, so the payload drops from 149 kB
  (24 kB gzip) to 125 kB (21 kB gzip). The ceilings in
  `scripts/check-library/css-budget.json` keep it there.

### Removed

Retired public exports, before the first publication. The package exposes
behaviour, not one interface per Figma subnode:

- `AuthenticationCodeSingleInput`, `TextFieldHelperText`, `TextAreaHelperText`:
  use `AuthenticationCodeInput`, or the field's associated
  `description`/`error`/`success` props.
- `SwitchSingleElement`: use `Switch` or `SwitchField`.
- Runtime `BreadcrumbItem`, `PaginationItem`, `AccordionItem`: use `Breadcrumb`,
  `Pagination`, `Accordion`; the `BreadcrumbItem` data type remains.
- `StepDesktop`, `StepMobile`, `Connector`, `NumberedPlaceholder`: use `Stepper`.
- `SideNavItem`, `SideNavProfileItem`, `FooterCompanyInformation`: use `SideNav`
  and `Footer`; the richer source profile and legal contracts remain pending.
- `KpiBody`, `KpiData` and the five standalone `Timeline*` shape and text
  helpers: use `ProgressKpi` and `Timeline`.
- `AvatarSmall`, `AvatarBig`, the email-derived `Gravatar`: use `Avatar` with
  explicit `size`, `src` and `initials`.
- `UnstyledButton`, `RetryAction`, `ExternalLinkLabel`: use `Button` or a
  semantic native link with caller-owned content.
- `ProductCardImage`: use `ProductCard image={...}` for the complete source
  card, `Image` for media alone.
- `RowsPerPage`: retired with its unpublished source helper.

This is interface simplification, not completion of unsupported source states:
unfinished contracts stay `pending` in the registry instead of being claimed
through aliases.
