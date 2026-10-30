<!-- component-rules:start -->

## Component Rules

- Below 900px the middle pages collapse to Previous and Next; when the results fit one page the whole control hides.

<!-- component-rules:end -->

`Pagination` is controlled by the application: it receives `currentPage` and
`totalPages` and reports the chosen page through `onPageChange`. An out-of-range
`currentPage` is clamped to the available pages; a negative or fractional
`totalPages` throws. Every control is a native button: previous and next are
disabled on the edge pages, the current page carries `aria-current="page"`, and the
ellipses are decorative and not announced.

The list keeps the first page, the last page, the current page and its neighbours;
the gaps become an ellipsis. Below the `tablet-md` container step only previous, the
current page and next remain. That step measures the pagination region, not the
viewport, so the component collapses inside a narrow column on a wide screen. When
the results fit one page (`totalPages` is 1 or 0) the whole control renders nothing.

Every announced string is a prop with an Italian default, so the application can
translate it. `pageLabel` receives the page number and returns the whole phrase:

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

Each control reaches the accessible pointer target through an invisible expansion,
without growing the drawn box. Rows per page is not part of the component: the
application supplies its own control next to it.

## Open design questions

Recorded in `docs/design-requests/2026-10-21-pagination-order-axis.md`:

- `Order=Mobile`: whether the compact composition is a state, a width behaviour or
  a device. Today it follows the container width, not a prop.
- Rows per page and the right alignment of the group: the component renders neither
  and centres its controls.
- The edge window: the source draws `1 2 3 … 101` and `1 … 99 100 101`, the
  component `1 2 … 101` and `1 … 100 101`.
- The edge arrow: the source hides it, the component renders it disabled.
