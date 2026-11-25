import * as React from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it } from "vitest"

import { SelectField } from "../inputs/select-field"
import { Pagination } from "../navigation/pagination"
import { Table } from "./table"

interface PaymentRow {
  id: string
  service: string
  amount?: string
}

const PaymentTable: (props: React.ComponentProps<typeof Table<PaymentRow>>) => React.ReactNode =
  Table

describe("Table rules alignment", () => {
  it("applies monospace typography classes only to columns marked mono", () => {
    const html = renderToStaticMarkup(
      React.createElement(PaymentTable, {
        caption: "Pagamenti",
        columns: [
          { key: "service", label: "Servizio" },
          { key: "amount", label: "Importo", mono: true },
        ],
        rows: [{ id: "1", service: "TARI", amount: "42,00 €" }],
      }),
    )

    expect(html).toContain('<td data-slot="table-cell"')
    expect(html).toMatch(/class="[^"]*font-mono text-mono[^"]*"[^>]*>.*?42,00 €/)
    expect(html).not.toMatch(/class="[^"]*font-mono[^"]*"[^>]*><span[^>]*>Servizio<\/span>/)
  })

  it("renders the sortable column label and sort indicator inside one clickable button", () => {
    const handleSort = () => undefined
    const html = renderToStaticMarkup(
      React.createElement(PaymentTable, {
        caption: "Pagamenti ordinabili",
        columns: [
          {
            key: "service",
            label: "Servizio",
            sort: { direction: "none", onChange: handleSort },
          },
          { key: "amount", label: "Importo" },
        ],
        rows: [{ id: "1", service: "TARI", amount: "42,00 €" }],
      }),
    )

    expect(html).toMatch(
      /<button type="button"[^>]*aria-label="Ordina per Servizio"[^>]*>Servizio<svg/,
    )
  })

  it("hides Pagination numbers and arrows when totalPages is 1 while keeping the rows-per-page select visible", () => {
    const handleChange = () => undefined
    const html = renderToStaticMarkup(
      React.createElement(PaymentTable, {
        caption: "Pagina unica",
        columns: [{ key: "service", label: "Servizio" }],
        rows: [{ id: "1", service: "TARI" }],
        pagination: React.createElement(
          "div",
          null,
          React.createElement(SelectField, {
            label: "Righe per pagina",
            value: "10",
            onValueChange: handleChange,
            options: [{ value: "10", label: "10" }],
          }),
          React.createElement(Pagination, {
            currentPage: 1,
            totalPages: 1,
            onPageChange: handleChange,
          }),
        ),
      }),
    )

    expect(html).toContain("Righe per pagina")
    expect(html).not.toContain("<nav")
    expect(html).not.toContain("Pagina successiva")
    expect(html).not.toContain("Pagina precedente")
  })
})
