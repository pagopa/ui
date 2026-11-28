import * as React from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it } from "vitest"

import { Table } from "@/components/data-display/table"
import { PagoPAPictogram } from "@/components/icons/PagoPAPictogram"

interface Row {
  id: string
  label: string
}

const EmptyTable: (props: React.ComponentProps<typeof Table<Row>>) => React.ReactNode = Table

describe("Pictogram markup", () => {
  it("keeps the figure the named component publishes", () => {
    const html = renderToStaticMarkup(<PagoPAPictogram label="Nessun messaggio" name="Message" />)

    expect(html).toContain('data-slot="pago-pa-pictogram"')
    expect(html).toContain('data-figma-node-id="329:2119"')
    expect(html).toContain('alt=""')
    expect(html).toContain("pui:size-20")
    expect(html).toContain("<figcaption")
  })

  it("draws the same figure in the table empty state, at the requested size", () => {
    const html = renderToStaticMarkup(
      React.createElement(EmptyTable, {
        caption: "Pagamenti",
        columns: [{ key: "label", label: "Servizio" }],
        rows: [],
      }),
    )

    expect(html).toContain('data-slot="pago-pa-pictogram"')
    expect(html).toContain('data-figma-node-id="329:2119"')
    expect(html).toMatch(/data-figma-node-id="329:2119"[^>]*style="width:56px;height:56px"/)
  })
})
