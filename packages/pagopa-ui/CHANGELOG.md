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
- `getControlLabel` on `CarouselStepper`: the announced position name arrives as
  a function returning the whole sentence, so the consumer owns the language.

### Changed

- `CarouselStepper` is the source 96x8 row again: every dot keeps its 16x4 or
  8x8 box and the 44px pointer target comes from the invisible vertical
  `::after` expansion instead of a 44px button that tripled the row width and
  height.
- `Snackbar`: the dismiss-only composition uses the source 16px root gap and the
  close is a 24px source box with the 44px target on the invisible `::after`
  expansion instead of a 44px control that stole 12px from the message column;
  the four `Status` variants have reviewed parity cases.
- `SnackbarErrorCode`: the close and copy actions are 24px source boxes with the
  44px target on the invisible `::after` expansion and the code field keeps the
  source 48px box (`h-12`, 12px top inset) instead of growing by the 1px border;
  the source card has a reviewed parity case.
- `EmptyState`: the message column fills the card like the source frames, so a
  long title wraps at the card width instead of at the widest line.
- `ProgressKpi`: the header artwork keeps its own 24px size in a flex box
  instead of adding its line-box descender, the footer uses the source 2px gap
  and the bars use the 16px radius step; the percentage is the 32/48 Bold step
  of the scale.
- `Badge`: the selected sidenav separation ring uses the `selection-soft` token
  (`#e7ecfc`) instead of the near-match accent, and all six source
  Property/Selected/Background variants have reviewed parity cases.
- `Tooltip`: the close mark is top-aligned with the first text line like the
  source `Close` layer instead of being vertically centred, and both Arrow
  Direction variants have reviewed parity cases.
- `Accordion`: the loading item renders the source `State=Skeleton` composition
  (the header, the 32px step and six placeholder rows with five dividers)
  instead of a generic two-bar card; a disabled item keeps its full-colour
  title and only the chevron takes the muted icon colour, and the header
  title/chip stacks fill their row like the source frames.
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
  by one or two pixels. The `RadioField` skeleton bars carry the 8px radius
  token and the option root exposes `data-slot="radio-field"` for the parity
  capture; the reviewed cases cover the five rich states and the four skeleton
  layouts.
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
- `ListItem` is edge-to-edge like the source row: 12px block padding and no
  inline padding, and the `Informative + CTA` action is a 22px text action with
  its 44px pointer target on the invisible hit area instead of a 48px control.
- `DatePicker` draws the source panel's four-block rhythm: the two-row header
  (label row and month row, its 24px chevrons 4px apart) closed by its
  full-bleed divider, then the calendar, a divider and the 46px footer, with the
  source's 8px stack gap, 8px grid inset and 22px text actions.
- `Button`, `Breadcrumb` and `Pagination` draw the source geometry: outlined
  buttons paint their 2px stroke as an inset ring inside the 24px inset, so a
  contained and an outlined action with the same content share the same box, and
  forced colors falls back to a real border; breadcrumb rows keep the source
  22/24px height with the 44px pointer target on the invisible `::after`
  expansion; pagination controls are 40px wide, with pages hugging their number
  to 46px high and the 44px target on the invisible expansion.
- The `MenuDropDown` panel rows are 46px, the source height: the 48px row
  minimum is gone (12px insets plus the 22px line clear the 44px target), so a
  six-row panel closes at the source 330px instead of 342.
- `SkipToMainContent` is the source's full-width top band: `fixed inset-x-0
  top-0` with the 8/24 insets and no elevation, instead of a floating box at
  16/12 with a shadow; it stays off screen (`-translate-y-full`) until focus.

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
