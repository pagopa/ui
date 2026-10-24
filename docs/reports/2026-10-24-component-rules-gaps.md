# Component rules — implementation gap report

| Field        | Value                                                                 |
| ------------ | --------------------------------------------------------------------- |
| Date         | 2026-10-24                                                            |
| Source       | `packages/pagopa-ui/src/catalog/figma/rules.json` (356 cards, 0 pending) |
| Scope        | The 43 `imported` rules, compared with the components they target      |
| Commit       | `2db07ee` on `main`                                                    |
| Status       | Analysis only — no code, guide, ledger or design-request file changed  |

## How to use this report

Every `imported` rule is a sentence a consumer must follow. Some are
**enforceable in the component**, some are **composition or usage guidance**
that a component cannot enforce, and a few are **foundation governance** that
belongs to the token layer. Each rule below carries one verdict:

| Verdict    | Meaning                                                                 |
| ---------- | ----------------------------------------------------------------------- |
| `OK`       | The implementation already satisfies the rule; evidence is cited.      |
| `DOC`      | The rule is caller guidance; the guide is the right home and the component has nothing to change. |
| `GAP`      | The implementation contradicts or misses the rule; a code, prop or test change is needed. |
| `CONFLICT` | The rule contradicts an existing implementation decision; a design owner must decide before code changes. |
| `TOKEN`    | The rule governs the Figma foundations; audit the token manifest, not a component. |

The report does not certify screen-reader or browser-zoom behaviour. Story and
a11y suites were green at the commit above; that is not a manual
accessibility pass.

## Summary

| Verdict    | Rules |
| ---------- | ----- |
| `OK`       | 11    |
| `DOC`      | 14    |
| `GAP`      | 12    |
| `CONFLICT` | 1     |
| `TOKEN`    | 5     |
| **Total**  | **43** |

### The twelve gaps, in suggested work order

| #  | Component | Rule | Type | Effort |
| -- | --------- | ---- | ---- | ------ |
| 1  | `Pagination` | Collapse below 900px; hide when one page | behaviour | S |
| 2  | `ButtonGroup` | 8px between actions | style | XS |
| 3  | `Breadcrumb` | Mobile/tablet portrait use Compact | behaviour, API | M |
| 4  | `Drawer` | Mobile bottom sheet; SM title type | behaviour, breakpoint | M |
| 5  | `IDModule` | Uniform 410px width from 600 to 1440 | style | S |
| 6  | `ProgressKpi` | Group of ≤4, mobile peek carousel | missing component | L |
| 7  | Field label | Required state in words, not only `*` | copy, a11y | S |
| 8  | `Snackbar` | Bottom-right 24/24 placement | missing helper | M |
| 9  | `Snackbar` | Auto-dismiss only when the message is elsewhere | behaviour, API | M |
| 10 | `Button` | Do not use the disabled variant | API decision | S |
| 11 | `Snackbar` | Error never auto-dismisses | behaviour (depends on 9) | XS |
| 12 | `Shadow` | 32px shadow only on modals and drawers | conflict | decision |

The one conflict (#12) must be decided before touching shadows; the rest can
be implemented as written.

## Gaps

### 1. `Pagination` — collapse threshold and single-page hiding

- Rule: *Below 900px the middle pages collapse to Previous and Next; when the
  results fit one page the whole control hides.* (`I125:4947;52:895`)
- Guide: `apps/storybook/src/guides/pagination.md`
- Evidence:
  - `src/components/navigation/pagination.tsx:64,82` hides the ellipsis and the
    non-current page numbers at `@max-narrow/pagination`, i.e. the container
    width `--container-narrow: 40rem` = **640px** (`packages/tokens/src/figma.generated.css:186,467`), not 900px.
  - `pagination.tsx:41-44` normalises `totalPages`, but the component always
    renders; there is no `totalPages <= 1` early return.
- Expected: numbers collapse at 900px (container width of the pagination
  region); a one-page result renders nothing.
- Suggested change:
  - Declare a dedicated container size (for example `--container-pagination: 56.25rem`)
    or use the existing `@max-tablet-md/pagination` step (900px, from
    `--breakpoint-tablet-md`) in place of `narrow`.
    Keep the current container-query scope; do not switch to a viewport query
    (`registry` note for `127:1510` records the viewport/container decision).
  - Return `null` when `totalPages <= 1` (still validate the input first).
  - Add a story asserting both behaviours; the pagination a11y contract
    already covers keyboard order.
- Note: `Pagination` is `pending` on `docs/design-requests/2026-10-21-pagination-order-axis.md`.
  The collapse rule is independent of that open decision; the single-page
  hiding is too.

### 2. `ButtonGroup` — 8px between actions

- Rule: *Keep 8px between actions, vertically and horizontally.* (`I123:3565;52:896`)
- Guide: `apps/storybook/src/guides/actions.md`
- Evidence: `src/components/inputs/actions.tsx:29,39` uses `gap-2` (8px) only
  when the group has at most one child, and `gap-6` (24px) for two or more.
- Expected: 8px in both orientations for every group size.
- Suggested change: use `gap-2` unconditionally (or expose the gap through an
  existing spacing prop only if the source has one; it does not). Check the
  `ButtonGroup` and `StickyButtonBar` stories for assertions on 24px and update
  them.
- Risk: the 24px may have been chosen for the `BlockButtons` stacked
  composition. If so, the rule and the source drawing disagree; confirm against
  `123:4498` variants before changing.

### 3. `Breadcrumb` — Compact layout on mobile and tablet portrait

- Rules: *Desktop: ancestor levels are links and the current page is not
  clickable; mobile: one compact back reaches the previous flow level.*
  (`I124:4070;52:895`) and *Mobile and tablet portrait use the Compact layout.*
  (`I124:4070;52:896`)
- Guide: `apps/storybook/src/guides/breadcrumb-navigation.md`
- Evidence: `src/components/navigation/breadcrumb.tsx:26-46` implements both
  layouts, but the caller chooses: `compact` is `props.layout === "compact"`,
  with no breakpoint logic. The set declares no `Device` axis.
- Expected: below the tablet-portrait breakpoint the component renders the
  Compact back link; from MD up the Extended path. The back destination is the
  previous flow level.
- Suggested change: a documented decision is needed on the back destination
  (the consumer passes `back.href`, or the component derives it from history).
  `docs/design-requests/2026-10-22-breadcrumb-description-vs-drawing.md` already
  asks this: read it before coding. If the decision is "automatic", add a
  responsive mode that ignores `layout` below the breakpoint and keeps the
  explicit `back` destination; add a device story at 320/600/900.
- Note: this is the most important gap for the mobile composition; it is
  blocked on the design request, not on implementation difficulty.

### 4. `Drawer` — bottom sheet on mobile and SM title type

- Rules: *Desktop is a fixed-width right panel; mobile is a full-width bottom
  sheet that wraps short content, scrolls tall content and keeps 24px of empty
  space at its top.* (`I1262:6496;52:895`) and *At the SM breakpoint the panel
  keeps the desktop placement and width while the title stays on the mobile
  type scale.* (`I1262:6496;52:896`)
- Guide: `apps/storybook/src/guides/drawer.md`
- Evidence:
  - `src/components/overlays/drawer.tsx:53` defaults `direction = "right"` and
    the caller owns it; nothing switches to `bottom` at a breakpoint.
  - `drawer.tsx:72` switches the title at `md:` (Tailwind's default 768px,
    not overridden here), while the device vocabulary names `tablet` at
    **600px** and `tablet-md` at **900px** (`packages/tokens/src/figma.generated.css:454-456`).
    At exactly 600 the mobile title is correct, but 768–899 is still tablet and
    already gets the desktop title.
  - The bottom-sheet primitive exists and is full width
    (`src/components/primitives/drawer.tsx:34`), so the missing piece is the
    automatic switch, not the sheet itself.
- Expected: the same component picks right panel or bottom sheet from the
  declared device; at SM it keeps the right panel with the mobile title size.
- Suggested change: replace the `md:` switch with the device breakpoints
  (SM 600 / MD 900) and add a responsive direction mode. Keep `direction` as an
  override. Add a device story at 320 (bottom sheet), 600 (right panel, mobile
  title) and 900 (right panel, desktop title).
- Note: the drawer is `pending` with an open width decision; this rule is about
  placement and type, not the 417/416px residue recorded in the registry.

### 5. `IDModule` — uniform 410px width from 600 to 1440

- Rule: *The modal keeps a uniform 410px width from 600px to 1440px.*
  (`I731:13732;52:896`)
- Guide: `apps/storybook/src/guides/id-module.md`
- Evidence: `src/components/composites/id-module.tsx:86` is `w-full`; no width
  cap exists. The spacing rule next to it **is** implemented: `gap-2` (8px) and
  `px-6` (24px) at `id-module.tsx:92,121`.
- Expected: the module is 410px wide while the available width is between 600
  and 1440, and presumably full width below 600.
- Suggested change: add the width cap through a token (the token ladder has no
  410 step; 416/`w-104` exists in the drawer note). Record the 6px residue or
  add the token through `tokens.manifest`. Add a story at 600/900/1200/1440.

### 6. `ProgressKpi` — group of four and mobile peek carousel

- Rule: *Up to four cards per row; on mobile use the mobile variant as a peek
  carousel, never stack; switch the state through the nested instance; the info
  icon opens a tooltip, not a modal.* (`I9698:58982;52:895`)
- Guide: `apps/storybook/src/guides/progress-kpi.md`
- Evidence:
  - `src/components/data-display/progress-kpi.tsx:152` exports only
    `ProgressKpi`; there is no group layout and no carousel.
  - `completed` implements the state switch; `info` is a `ReactNode` slot, so
    the caller decides whether it opens a tooltip.
- Expected: a group container that lays out at most four cards per row and
  turns into a horizontal peek carousel below 900px.
- Suggested change: add `ProgressKpiGroup` (or a documented composition in
  `templates/figma/TemplateShell.tsx:167-169`, which currently renders three
  cards in a plain grid) with container-query layout; keep the card
  single-purpose. The info-tooltip part is consumer guidance: document it and
  use `Tooltip` in the story.
- Risk: the source set `ProgressKpiGroup` is `excluded` in the registry; adding
  a public component needs the person's decision on the public surface.

### 7. Field label — required state in words

- Rule: *An asterisk alone does not state that a field is required: write it in
  words next to the label, for example "(required)".* (`I411:5360;52:896`)
- Guide: `apps/storybook/src/guides/fields.md`
- Evidence: `src/components/inputs/field.tsx:98-116` renders the visible `*`
  and the words `(obbligatorio)` in an `sr-only` span only. Sighted users see
  the asterisk alone.
- Expected: the wording is visible next to the label (or the marker is
  designed so the asterisk is not the only signal). The rule explicitly says
  the asterisk is insufficient.
- Suggested change: render `requiredLabel` visibly after the label (small,
  muted, not inside the label's accessible name twice), keep the native
  `required` and the `sr-only` text out of the visible repetition. Provide a
  story with and without a custom `requiredLabel`.
- Risk: this is a visual change to every field; check the parity cases that
  compare label rows (the marker is inside the HUG row). If the source does not
  draw the words, the rule and the drawing disagree: prefer the accessibility
  rule and record the residue in the guide.

### 8. `Snackbar` — bottom-right placement

- Rule: *A snackbar sits at the bottom right of the viewport, 24px from the
  bottom and 24px from the right edge.* (`I357:4968;52:895`)
- Guide: `apps/storybook/src/guides/snackbars.md`
- Evidence: `src/components/feedback/snackbar.tsx:36-127` is an inline surface
  with no `fixed` positioning; neither the stories nor any component provide a
  region. `index.css:168` only fixes the width.
- Expected: a placement contract (a region/toaster) that pins the surface.
- Suggested change: add a small `SnackbarRegion` (or document a required
  wrapper in the guide with the exact classes) that pins bottom-right at 24/24,
  stacks multiple messages, respects safe-area insets and keeps the surface out
  of the scroll flow. A pure helper keeps the public surface small; a component
  needs the person's approval.
- Note: the width rule is satisfied: `--overlay-width: 512px` is inside the
  280–560 range, capped by `100vw - page-gutter` (`snackbar.tsx:54`).

### 9. `Snackbar` — auto-dismiss only when the message is reachable elsewhere

- Rule: *A snackbar auto-dismisses only when the same message is reachable
  elsewhere on the page.* (`I357:4968;52:897`)
- Guide: `apps/storybook/src/guides/snackbars.md`
- Evidence: `snackbar.tsx:17-35` has no `duration`, timer or auto-dismiss; the
  only exit is `onDismiss`. The stories close it with local state.
- Expected: an explicit timing contract; automatic dismissal is allowed only
  when the information lives elsewhere.
- Suggested change: add an optional `duration` (or `autoDismiss`) prop with no
  default timer, and document that errors never use it. If timing stays
  caller-owned by design, say so in the guide and add a `play()` test showing
  the caller's timer plus pause on hover/focus. Do not default to a timer.
- Note: #11 (error never auto-dismisses) is satisfied trivially today; it
  becomes a real constraint once #9 adds a timer. Implement them together.

### 10. `Button` — the disabled variant

- Rule: *Do not use the disabled variant: it is not accessible. Keep the default
  action and explain the failure with an error toast.* (`I123:3565;52:900`)
- Guide: `apps/storybook/src/guides/actions.md`
- Evidence: `src/components/primitives/button.tsx:10` paints
  `disabled:opacity-50`; `button.tsx:58,74` accept and forward `disabled`.
  The component also supports `loading`/`busy`, which is the accessible
  alternative for a short-lived block.
- Expected: the library does not encourage a dimmed, unfocusable control; the
  guide says what to use instead.
- Suggested change: a product decision, not a silent removal. Options:
  1. keep `disabled` (native semantics) and stop dimming it with opacity, using
     a disabled *surface* that still meets contrast;
  2. deprecate `disabled` in JSDoc and introduce a documented `blocked`/toast
     pattern;
  3. keep as-is and document that the rule is advisory.
  The guide already forbids the variant; the API and the visual state still
  contradict it. Record the decision in the registry note either way.

### 11. `Snackbar` — error messages never auto-dismiss

- Rule: *An error snackbar never auto-dismisses.* (`I357:4968;52:898`)
- Guide: `apps/storybook/src/guides/snackbars.md`
- Evidence: there is no timer at all today (`snackbar.tsx:17-35`), so the rule
  holds trivially; `SnackbarErrorCode` inherits the same surface
  (`snackbar-error-code.tsx:45-68`).
- Expected: once #9 adds a timing contract, the error tone (and any snackbar
  carrying an error code) must refuse it.
- Suggested change: make the timer opt-in per message, and ignore or throw on
  `duration` when `tone === "error"` or the footer is an error code. Test both
  tones.

## Conflict

### 12. `Shadow 32` — scope of the 32px shadow

- Rule: *Only modals and drawers use the 32px shadow.* (`I240:2170;52:896`)
- Guide: `apps/storybook/src/guides/foundations.md`
- Evidence: `shadow-32` is also used by:
  - `src/components/feedback/snackbar.tsx:54`
  - `src/components/feedback/scroll-to-bottom.tsx:34`
  - `src/components/navigation/cookies.tsx:47`
  - `src/components/overlays/tooltip.tsx` and `popover.tsx` (popup classes)
  - `src/components/primitives/tooltip.tsx:47`, `popover.tsx:47`
  - the token itself says *“Shadow 32: overlays, cards, tooltips”*
    (`src/index.css:203`).
- The rule says modals and drawers only; the token comment and the registry
  notes say overlays, cards and snackbars too.
- This is a design-owner decision, not a code fix: either the rule is outdated
  (update the Figma card), or tooltips/popovers/snackbars/cookies/scroll-to-bottom
  move to `shadow-16`/`shadow-1` and the parity cases that assert `shadow-32`
  change with them.
- Suggested action: write a design request that shows the five usages, the
  token comment and the rule, and ask which elevation each surface should use.
  Do not change shadows before the answer.

## Consumer guidance (no component change)

These rules are already in the right place: the guide states them, and the
component cannot enforce a composition chosen by the page. An implementing
agent should leave the code alone; if a story is missing, add the usage example
to the guide/story only.

| Rule | Card | Guide | Where it lands |
| ---- | ---- | ----- | -------------- |
| Distance from the content above (24/32px) | `I123:3565;52:899` | actions.md | Page composition; `ButtonGroup` owns only its internal gap. |
| Alert spacing 24 above / 40 below | `I218:2540;52:895` | alerts.md | Page composition. |
| Banner spacing 24 all around | `I261:6606;52:895` | banners.md | Page composition. |
| Field spacing 24px | `I411:5360;52:895` | fields.md | Page composition; also imported on the Select page. |
| Select spacing 24px | `I602:9291;52:895` | select-choices.md | Same composition rule, restated for selects. |
| Identity Provider module spacing 8/24 | `I731:13732;52:895` | id-module.md | **Implemented** (`gap-2`, `px-6`); listed here because it is composition, not a prop. |
| Logos placement 24px from bottom/right | `I382:7643;52:895` | loghi-psp.md | Page composition; `LoghiPSP` is a logo list, not a fixed layer. |
| Row list versus table | `I9520:40254;52:895` | tables.md | Usage choice between two existing components. |
| Scroll-to-bottom purpose | `I180:4348;52:895` | scroll-to-bottom.md | Usage; the component already hides when the end is reached. |
| Tooltip versus Popover | `I9927:37034;52:895` | tooltips.md | Usage. API note: `children` is `ReactNode` (`overlays/tooltip.tsx:17`) while the rule says one short string; typing it as `string` would be a breaking change, so keep guidance. |
| Tooltip trigger is an information icon | `I9927:37034;52:896` | tooltips.md | Usage; the trigger is a caller `render` element. |
| Pin point shows an outcome | `I920:7326;52:895` | pin-point.md | Usage; the marker is generic by design. |
| FeedbackPage shows an outcome | `I1904:8511;52:895` | templates.md | Usage; the page takes the state block in `children`. |
| DialogTemplate confirms or cancels | `I1909:98994;52:895` | templates.md | Usage; `actions` is a slot. |

## Satisfied by the implementation

| Rule | Card | Evidence |
| ---- | ---- | -------- |
| Overlay is a plain scrim, no blur | `I67:3790;52:895` | `overlays/overlay.tsx:20-24`: `bg-overlay`, no backdrop filter. |
| Feedback uses four icons; notice is legacy | `I99:3347;52:895` | No `notice` icon exists in `components/` or the icon manifest; feedback maps to `check_circle`, `info`, `warning`, `report`. |
| Empty state text and pictogram are caller-owned | `I11149:7732;52:895` | `feedback/empty-state.tsx:6-12`: `title`, `icon`, `actions` are required/optional props; no default copy. |
| Authentication code width follows the character count | `I198:1615;52:895` | `text-fields.tsx:254,290-313` renders `length` fixed-width slots (`otp-field.tsx:122`, `w-2.75` each); width scales with the count. |
| Drawer action row stays anchored; content scrolls | `I1262:6496;52:898` | `drawer.tsx:103-114`: the content is the only `overflow-y-auto` region; the footer sits outside it. |
| Snackbar width 280–560 | `I357:4968;52:896` | `index.css:168` `--overlay-width: 512px`; `snackbar.tsx:54` caps it at the viewport minus the gutter. |
| Error snackbar never auto-dismisses | `I357:4968;52:898` | No auto-dismiss exists at all (`snackbar.tsx:17-35`); becomes a constraint with #9. |
| Divider after the last item is omitted | `I61:2990;52:897` | `data-display/timeline.tsx:187,196` render `Separator` only for `index > 0`. No generic list draws its own dividers. |
| Buttons keep solid backgrounds and AA contrast | `I123:3565;52:897` | `primitives/button.tsx:15-31`: every enabled variant paints `bg-*`; the only opacity is the disabled state (#10). |
| Foundation colour function is expressed through tokens | `I68:2775;52:900` | Components use semantic classes (`bg-primary`, `text-muted-foreground`, `border-input`); no hex values in the components scanned. |

## Foundation governance (no component change)

These rules describe the Figma foundations. The repository can only check the
token manifest and the generated CSS, not the palette's authoring order.

| Rule | Card | What to audit |
| ---- | ---- | ------------- |
| Corner radius follows elevation | `I52:1381;52:895` | `packages/tokens/src/manifest.json` has radius and elevation as separate foundations; no link exists. Decide whether a component may pick a radius independently of its shadow (today they do: `rounded-lg` + `shadow-32`). |
| Text colour follows the background's accessible pair | `I68:2775;52:895` | The semantic pairs exist (`*-foreground`); the check is contrast per pair, already covered by the a11y suite for rendered stories. No per-token pairing metadata is committed. |
| Prefer tone-on-tone pairings | `I68:2775;52:896` | Governance of new pairs; no code surface. |
| Palette ordered darkest to lightest | `I68:2775;52:898` | Figma-side ordering; `manifest.json` keeps variable names, not palette order. |
| Colour named by hue and saturation | `I68:2775;52:899` | `cssName` follows the Figma name (`--figma-color-*`); a rename is a tokens refresh, not a component change. |

## Reproduction

```bash
# The imported rules and their targets
python3 - <<'PY'
import json
ledger = json.load(open("packages/pagopa-ui/src/catalog/figma/rules.json"))
for cid, card in ledger["cards"].items():
    if card["disposition"] == "imported":
        print(cid, card["titleEn"], "->", card["targets"], card.get("guide"))
PY

# The implementation brief of one node (offline, local snapshots)
pnpm nx run pagopa-ui-cli:figma:brief --node <nodeId>
```

## Out of scope

- The 3 `deferred` and 1 `conflict` cards from the migration: this report
  compares the `imported` rules only. The open items are Dialog usage, OK/KO
  usage (no guide imported by their stories), the Pagination handoff note and
  the Paper stroke request.
- Changing Figma. Every finding is reconciled in the repository.
- Screen-reader and browser-zoom certification.
