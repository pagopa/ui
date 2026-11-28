# Foundation remainder: radii, dimensions, z-index and the listed exceptions

- Type: design
- Issue: https://github.com/pagopa/ui/issues/193
- Status: open
- Ratified defaults: [docs/design-defaults.md](../design-defaults.md) — apply §2–§4 before asking; what they do not decide stays open here.
- Decision owner: @gunzip
- Preview: none

## Context

The ratified defaults (docs/design-defaults.md §3, §4) answer the recurring spacing scale, the composite input-plus-icon composition and the breakpoint and container values that 2026-10-16-foundation-variables.md asked about. They do not decide the radii scale (0/8/16/24 published, 2 and 4 recurring), the dimension scale (icons 16/20/24/32, controls 40/44/48/56), the z-index scale, the 1920 px XXL value, the 18 px regular weight the library does not carry, or the Color/Icon/Disabled icon key that has no public asset. This request is the remainder, re-scoped after the ratification.

One item joins it: the container steps. §4.2 ratifies 640 px (Table,
TableListItem, Pagination) and 432 px (Timeline); the components also switch at
448, 512, 768, 896 and 1152 px — the Alert, PaymentModule, ProductModule,
CheckoutModule, Dialog page template and Footer hand-off widths — which the
code read as Tailwind steps until they were published as `container`
foundations (`compact`, `panel`, `page`, `wide`, `wider`). They are local
extensions, derived read-only from the code and not Figma variables: confirm
the five widths or indicate the correct ones.

#191 settled the derived state colours without a request (§2 of the defaults): the
pointer and pressed steps the palette does not publish are now `color-mix`
derivations of the two steps that bound them, in `packages/pagopa-ui/src/index.css`,
and the contract publishes the colours they resolve to.

The foundation gate has no fixed waivers left in its code: every value that stays
off-scale or arbitrary is registered in
[`packages/tokens/src/foundation-exceptions.json`](../../packages/tokens/src/foundation-exceptions.json)
with its node and reason, and an entry that stops matching fails the check. Six
entries are open, and each one names the token whose absence keeps it alive:

| Rule                  | Component               | Value                                       |
| --------------------- | ----------------------- | ------------------------------------------- |
| `font-weight`         | `LogIn.tsx`             | `font-normal` (18/26 Regular)               |
| `visual-constant`     | `Table.tsx`             | `maxWidth: 16rem` truncated-cell fallback   |
| `arbitrary-depth`     | `SkipToMainContent.tsx` | `z-[100]`                                   |
| `arbitrary-leading`   | `SectionHeader.tsx`     | `leading-[1.2]` (source label 12/14.4)      |
| `arbitrary-animation` | `ProgressLoader.tsx`    | `animate-[pulse_1.4s_ease-in-out_infinite]` |
| `arbitrary-shadow`    | `Timeline.tsx`          | `shadow-[0_0_0_6px_rgb(14_15_19/0.35)]`     |

## Options

1. **Publish a z-index scale.** The library publishes none; `z-50` is the highest
   utility the code uses, and the skip control sits at `z-[100]` so it outranks
   every overlay. Recommend `--z-sticky` 10, `--z-overlay` 50 (today's value),
   `--z-skip-link` 100 — or ratify the alternative (recommendation).
2. **Publish a 12/14.4 label step.** `SectionHeader` draws the source L3 label at
   12/14.4, while `label-mini` carries 12/16. Recommend naming the line height
   (`--leading-label`) so the heading stops overriding its own text style.
3. **Publish the loader's timing.** `ProgressLoader` re-times the built-in pulse
   to 1.4s ease-in-out. Recommend `--duration-loader` (1400 ms) in the motion
   scale — reduced motion is already handled by `motion-reduce:animate-none`.
4. **Publish a ring shadow.** `Timeline` draws the pending dot's halo as a 6 px
   ring of the ink at 35%; the three published shadows are drop shadows, so no
   step carries it. Recommend `--shadow-ring-6`, over a component-local colour.
5. **Publish the truncation cap, or ratify the fallback.** `Table` truncates a
   cell at 16rem unless the caller sets `column.maxWidth`; the source samples its
   columns at 114/153/59/59/59/89/112 px and never states the cap. Recommend
   ratifying 16rem as the component default.

## Decision
