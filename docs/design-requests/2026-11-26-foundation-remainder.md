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

## Options

## Decision
