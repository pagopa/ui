# Ratified design defaults

- **Status:** Ratified — decision owner @gunzip, 26 November 2026.
- **Authority:** an alignment cites this document and applies the rule it
  carries instead of opening a design request for the same question again.
- **Related:** [ADR-0009](./decisions/0009-ratified-design-defaults.md) — the
  decision record; [the design-request
  flow](../.agents/skills/figma-to-code/references/design-request.md) — how a
  question that this document does **not** answer becomes a request.

## 1. What this decides

Three families of routine choices recur across components and do not need a
per-component decision:

1. **Derived state colours** — which colour a state surface uses when the
   library has no variable for that exact need (§2).
2. **Composite input-plus-icon spacing** — how a control that places an icon
   next to text is measured (§3).
3. **Responsive layout rules** — when a layout may switch, and what reflow,
   text spacing and resize text require (§4).

Everything else stays a component decision: see §5 for what is explicitly out
of scope and remains open in the request queue.

The defaults are **derived read-only** from the library. Ratifying them changed
no Figma file and produced no Figma write.

## 2. Derived state colours

**Rule.** A state surface never introduces a new hex value. It is derived from a
published status base token, using the four roles the semantic layer already
publishes for every state family (`success`, `warning`, `info`, `error`, and the
`destructive` action):

| Role          | Derivation                     | Example token            |
| ------------- | ------------------------------ | ------------------------ |
| solid surface | the family's 600 step          | `--pui-destructive`      |
| soft surface  | the family's 100 step          | `--pui-error-soft`       |
| border        | the family's 400 step          | `--pui-error-border`     |
| text on soft  | the family's 850 step          | `--pui-error-foreground` |
| icon on soft  | the family's icon key          | `--pui-success`          |
| hover step    | the next published darker step | `--pui-primary-hover`    |

The aliases live in `packages/pagopa-ui/src/index.css` and point at the
generated `--figma-color-status-*` and `--figma-color-icon-*` keys. A component
consumes the role (`bg-error-soft`, `text-error-foreground`), never a step
number and never a `--figma-*` name: that layer is internal and deprecated
([ADR-0013](./decisions/0013-semantic-token-contract.md)).

**Derivation when a step is missing.** When the family has no published pointer
or pressed step, derive it with `color-mix` inside the same hue family and
record it as a local extension with its source, as `--destructive-hover` and
`--primary-active` already do:

```css
--primary-active: #072582; /* local extension: pressed step between Blue 600 and Blue 850 */
```

**Contrast.** Every role is verified for WCAG 2.2 AA by the accessibility
contract: 4.5:1 for body text, 3:1 for large text, icons and UI boundaries. A
pairing that fails is a bug in the role mapping, not a reason to add a step.

**Opaque, not translucent.** A state surface is composited to an opaque value
over the page background rather than left as alpha, so text and icons stay
legible when the component is placed on a dark or brand caller surface (the
`--accent` and `--accent-active` precedent).

**Out of scope.** A state family with no published status base token is not
derived: it is a request, because deriving it would invent a hue.

## 3. Composite input-plus-icon spacing

**Rule.** A control that places an icon next to text is a **composition**, not a
single spacing value. It is read from the published scale, never from a new
number:

| Composite              | Composition                  |    Total |
| ---------------------- | ---------------------------- | -------: |
| field, leading icon    | 12 padding + 24 icon + 8 gap |    44 px |
| field, trailing icon   | 24 icon + 8 gap + 12 padding |    44 px |
| field, both icons      | 12 + 24 + 8 … 8 + 24 + 12    | variable |
| chip, leading icon     | 16 padding + 16 icon + 8 gap |    40 px |
| item row, leading icon | 8 gap + 24 icon              |        — |

The composition is written as utilities or as a local geometry token when it is
reused, and each part reads the published spacing scale (1, 2, 3, 4, 6, 8, 10,
12, 14, 16, 20, 24, 32, 40, 48, 56, 64, 80, 132; the primitive names behind it
are `--figma-spacing-*`, internal, so a component reads a utility or a
`--pui-*` token).

**Icon-to-text gap.** 8 px (`--figma-spacing-8`) is the default. 6 px
(`--figma-spacing-6`) is allowed only where the source frames use it — dense
rows and indicator insets — and the alignment records the source node.

**Padding.** 12 px (`--figma-spacing-12`) inside a field, 16 px
(`--figma-spacing-16`) inside a chip. A compact variant that needs 10 px uses
`--figma-spacing-10` and says so in the component guide.

**What is not allowed.** A hand-written composite total (for example `44px`)
with no composition behind it: the total follows the parts, and the parts come
from the scale.

**Generated as tokens.** The scale is published by the token package
(`packages/tokens/src/figma.generated.css`) and is what `foundation:check`
measures against; a composite that needs a value outside the scale is an
exception recorded in the manifest, not a silent literal.

## 4. Responsive layout rules

### 4.1 Which breakpoints a layout reads

The device scale is ratified as **600 / 900 / 1200 / 1536 px**
(`--figma-breakpoint-sm`, `-md`, `-lg`, `-xl`, the internal primitive names);
1920 px belongs to the XXL
variant of the White Template only and is not a component breakpoint.

A component that switches its own layout uses the published device scale. The
Tailwind utility scale (640 / 768 / 1024) stays available for the code's own
composition needs, but a switch that follows a Figma device variant reads the
`--figma-breakpoint-*` token, and the alignment states which of the two axes the
variant belongs to ([ADR-0004](./decisions/0004-device-axis.md)).

**Responsive typography.** The library publishes a `• Mobile` build of every
heading step (`Heading/XS…XXL title • Mobile`), so a responsive title is two
published text tokens rather than one token resized by a Tailwind size class:
the mobile token applies from 320 px and the device variant swaps it at the
breakpoint that owns the pair, `text-title-xs-mobile tablet-md:text-title-xs`.
The swap is a device decision ([ADR-0004](./decisions/0004-device-axis.md)), so
the pair names one axis and the alignment records it.

### 4.2 Container switches

A container switch measures a component's own box, not the viewport, so each one
reads a published `container` foundation step rather than a Tailwind step or a
literal. Every step a component queries is a token:

| Step      |  Width | Components                             | Source                |
| --------- | -----: | -------------------------------------- | --------------------- |
| `tight`   | 432 px | Timeline, TableListItem                | ratified here         |
| `narrow`  | 640 px | Table, Pagination                      | ratified here         |
| `compact` | 448 px | Alert, PaymentModule, ProductModule    | local extension       |
| `panel`   | 512 px | CheckoutModule                         | local extension       |
| `page`    | 768 px | the Dialog page template               | local extension       |
| `wide`    | 896 px | Footer, link-column grid               | local extension       |
| `wider`   | 1152 px| Footer, side padding                   | local extension       |

A query names the step and, where the component declares a named container, its
own box: `@min-wide/footer:` reads `--container-wide` on the `footer` container.
`@container` alone scopes the switch to the nearest container, so a component
that queries an unnamed container writes the step alone (`@min-panel:`).

The two ratified steps are the widths §4.2 already named. A **local extension**
is a width the components already switched at, published so that a query is
token usage instead of a Tailwind step: it is derived read-only from the code,
none of it is a Figma variable, and each foundation entry carries
`source.kind: code` and the reason it is a local extension. The five extension
steps are part of the request in
[2026-11-26-foundation-remainder.md](./design-requests/2026-11-26-foundation-remainder.md);
until design answers, a component reads them and does not add an eighth. A new
step is a request, not a new literal.

### 4.3 Reflow (WCAG 1.4.10)

Every component reflows at **320 px CSS width** with no horizontal scrolling of
the page. Two-dimensional scrolling is permitted only for content that requires
two dimensions — data tables, images, maps and video — and only when the story
declares the technical exception next to the flag.

A wide element inside a reflowing component is placed in its own horizontally
scrollable container; the page never scrolls sideways. Wrap before you shrink:
`flex-wrap`, `min-w-0` on flex children and a wrapping label are the tools, not
a fixed `min-width`.

### 4.4 Text spacing and resize text (WCAG 1.4.12, 1.4.4)

With `line-height: 1.5`, `letter-spacing: 0.12em`, `word-spacing: 0.16em` and
text at **200%**, the content neither clips, nor overlaps, nor requires
horizontal scrolling at the same width. Text containers are sized in `em`/`rem`
or by content, not by a pixel height that clips when the text grows.

### 4.5 The exemption is debt, not a default

A story that cannot yet satisfy 4.3 or 4.4 carries
`parameters: { a11yContract: { reflow: false } }` and is listed in
[2026-10-16-a11y-reflow-conditions.md](./design-requests/2026-10-16-a11y-reflow-conditions.md).
The exemption is not a ratified exception: it is a debt that this policy
answers, so the flag is removed and the record updated as each family is fixed.
No new `reflow: false` is added without a request that the design owner answers.

## 5. What this does **not** decide

These stay component decisions and remain in the queue as re-scoped requests:

- per-component geometry (widths, heights, artboard dimensions) that the source
  frames carry;
- artwork, illustration and pictogram alignment;
- the [design request] remainder that the defaults do not answer — radii and
  dimension scales, the z-index scale, the 18 px regular weight, the
  `Color/Icon/Disabled icon` key, and the derived-colour families with no
  published status token;
- copy, naming and the per-component interaction decisions (drag and drop,
  segmented control minimum size, focus perimeter, and the rest of the queue).

An alignment answers a question from this document only when the question falls
inside §2–§4. Otherwise it follows the request flow.

## 6. How an alignment applies the defaults

1. Open the component's guide and its record in `docs/design-requests/`.
2. Check the question against §2, §3 and §4 **before** opening a request.
3. If a rule covers it, apply the rule and cite this document in the alignment's
   notes — no request, no decision-owner round trip.
4. If a rule covers it partly, apply the part and open a request only for the
   remainder, quoting the section that stops short.
5. If no rule covers it, follow the request flow as before.
