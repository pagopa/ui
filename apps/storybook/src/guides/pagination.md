<!-- component-rules:start -->

## Component Rules

- Below 900px the middle pages collapse to Previous and Next; when the results fit one page the whole control hides.

<!-- component-rules:end -->

`Pagination` is controlled by the application: it receives `currentPage` and
`totalPages` and reports the chosen page through `onPageChange`. An out-of-range
`currentPage` is clamped to the available pages; a negative or fractional
`totalPages` throws. Every control is a native button: previous and next are
disabled on the edge pages, the current page carries `aria-current="page"` and
the ellipses are decorative, so they are not announced.

The list keeps the first page, the last page, the current page and its
neighbours; the gaps become an ellipsis. Below the `narrow` container threshold
only previous, the current page and next remain.

Every announced string is a prop with an Italian default, so the application
can translate it. `pageLabel` receives the page number and returns the whole
phrase:

```tsx
<Pagination
  currentPage={page}
  totalPages={12}
  onPageChange={setPage}
  label="Pagination"
  previousLabel="Previous page"
  nextLabel="Next page"
  pageLabel={(page) => `Page ${page}`}
/>
```

The drawn elements keep the source sizes: a page is 40 wide and hugs its number
to 46 high (wider for three digits), previous and next are 40x40 with a 2px
border, and the ellipsis is 40x40. Each control reaches a 44px pointer target
through an invisible expansion, without growing the drawn box. Rows per page is
not part of the component: the application supplies its own control next to it.

## Figma source mapping

Node `127:1510` (`Pagination`) has one `Order` axis. Its page-position values
map to `currentPage` and `totalPages`; the stories use 101 pages:

| Source variant                            | Story        | Props                                |
| ----------------------------------------- | ------------ | ------------------------------------ |
| `Order=First page` (`126:5056`)           | `FirstPage`  | `currentPage={1} totalPages={101}`   |
| `Order=Second page and more` (`127:1511`) | `SecondPage` | `currentPage={2} totalPages={101}`   |
| `Order=Last page` (`127:1535`)            | `LastPage`   | `currentPage={101} totalPages={101}` |

Inside the `Pagination group` frame, each `.Pagination single element` maps to
one control: with the `chevron` artwork it is the previous or next button
(named by `previousLabel` and `nextLabel`); with the `Button` text it is a page
button whose text is the page number and whose accessible name comes from
`pageLabel`; the filled one is the current page; the one holding `Frame 2` (the
three dots) is the decorative ellipsis.

Still open, in the design request
`docs/design-requests/2026-10-21-pagination-order-axis.md`, so the node stays
pending:

- `Order=Mobile` (`130:1899`): whether it is a compact state, a width behaviour
  or a device. Today the compact composition follows the container width, not
  a prop.
- `.Rows per page` and the right alignment of the `Pagination group`: the
  component renders neither and centres its controls.
- The edge window: the source draws `1 2 3 … 101` and `1 … 99 100 101`, the
  component `1 2 … 101` and `1 … 100 101`.
- `Show left arrow`: whether the edge arrow is hidden, as the source draws it,
  or disabled, as the component renders it.
