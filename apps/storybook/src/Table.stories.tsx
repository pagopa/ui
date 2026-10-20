import * as React from "react"
import type { Meta, StoryObj } from "@storybook/react-vite"
import { expect, userEvent, waitFor, within } from "storybook/test"
import { Paperclip, Tag as TagIcon } from "lucide-react"

import {
  Table,
  TableCellRow,
  TableHeaderField,
  TableListField,
  type TableColumn,
} from "@/components/data-display"
import { MenuDropDown, SelectField, Chip } from "@/components/inputs"
import { Pagination } from "@/components/navigation"
import { Button } from "@/components/primitives/button"
import {
  Table as TablePrimitive,
  TableBody,
  TableCaption,
  TableHeader,
  TableRow,
} from "@/components/primitives/table"
import { figmaEmbedUrl } from "@/catalog/figma/file"

import tablesGuide from "./guides/tables.md?raw"

const meta = {
  title: "Components/Data display/Table",
  component: Table,
  parameters: {
    layout: "padded",
    design: { type: "figma", url: figmaEmbedUrl("1349:22020") },
    docs: {
      description: {
        component: `Responsive semantic table, empty state and composable pagination. Sorting and page selection stay controlled by the application. Title, description and actions above the table are additive compositions; the matching Figma properties concern the empty state. The mobile layout keeps sorting controls visible for accessibility. captionHidden keeps the accessible name without a visible caption.

${tablesGuide}`,
      },
    },
  },
  args: {
    caption: "Notifiche",
    columns: [{ key: "id", label: "Identificativo" }],
    rows: [],
  },
} satisfies Meta<typeof Table>

export default meta
type Story = StoryObj<typeof meta>

export const Empty: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await expect(canvas.getByText("Nessun risultato")).toBeVisible()
    await expect(canvas.queryByRole("table")).not.toBeInTheDocument()
  },
}

export const Mobile: Story = {
  render: () => (
    <div style={{ width: 320 }}>
      <Table
        caption="Pagamenti recenti"
        columns={[
          {
            key: "service",
            label: "Servizio",
            render: () => (
              <a href="/pagamenti/tari" className="block">
                TARI
              </a>
            ),
          },
          { key: "amount", label: "Importo" },
        ]}
        rows={[{ id: "tari", service: "TARI", amount: "42,00 euro" }]}
      />
    </div>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const table = canvas.getByRole("table", { name: "Pagamenti recenti" })
    const fields = within(table)
    await expect(fields.getByText("Servizio", { selector: "span" })).toBeVisible()
    await expect(fields.getByText("Importo", { selector: "span" })).toBeVisible()
    const headers = fields.getAllByRole("columnheader")
    const cells = fields.getAllByRole("cell")
    await expect(headers).toHaveLength(2)
    await expect(cells).toHaveLength(2)
    for (const [index, cell] of cells.entries()) {
      await expect(headers[index].id).not.toBe("")
      await expect(cell).toHaveAttribute("headers", headers[index].id)
    }
    await expect(fields.getAllByRole("link", { name: "TARI" })).toHaveLength(1)
    await expect(
      fields.getByRole("link", { name: "TARI" }).getBoundingClientRect().top -
        fields.getByText("Servizio", { selector: "span" }).getBoundingClientRect().bottom,
    ).toBe(4)
    await expect(table.scrollWidth).toBeLessThanOrEqual(320)
  },
}

function ControlledTable() {
  const [page, setPage] = React.useState(1)
  const [pageSize, setPageSize] = React.useState("10")
  const [action, setAction] = React.useState("")
  return (
    <>
      <Table
        caption="Pagamenti recenti"
        title="Avvisi di pagamento"
        description="Consulta gli avvisi e le ricevute."
        actions={<Button onClick={() => setAction("Esportazione richiesta")}>Esporta</Button>}
        columns={[
          { key: "service", label: "Servizio" },
          { key: "amount", label: "Importo" },
        ]}
        rows={
          page === 1
            ? [{ id: "tari", service: "TARI", amount: "42,00 euro" }]
            : [{ id: "mensa", service: "Mensa scolastica", amount: "18,50 euro" }]
        }
        pagination={
          <div className="flex flex-wrap items-center justify-between gap-4">
            <SelectField
              label="Righe per pagina"
              value={pageSize}
              onValueChange={(next) => {
                setPageSize(next)
                setPage(1)
              }}
              options={[
                { value: "10", label: "10" },
                { value: "20", label: "20" },
              ]}
            />
            <Pagination currentPage={page} totalPages={2} onPageChange={setPage} />
          </div>
        }
      />
      <output>{action}</output>
    </>
  )
}

export const WithControls: Story = {
  // Reflow exemption pending a design request: docs/design-requests/2026-10-16-a11y-reflow-conditions.md.
  parameters: { a11yContract: { reflow: false } },
  render: () => <ControlledTable />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await expect(canvas.getByRole("heading", { name: "Avvisi di pagamento" })).toBeVisible()
    const table = canvas.getByRole("table", { name: "Pagamenti recenti" })
    await expect(table).toHaveAccessibleDescription("Consulta gli avvisi e le ricevute.")
    await userEvent.click(canvas.getByRole("button", { name: "Esporta" }))
    await expect(canvas.getByRole("status")).toHaveTextContent("Esportazione richiesta")
    const next = canvas.getByRole("button", { name: "Pagina successiva" })
    next.focus()
    await userEvent.keyboard("{Enter}")
    await expect(within(table).getByText("Mensa scolastica")).toBeVisible()
    await expect(next).toBeDisabled()
    await userEvent.click(canvas.getByRole("combobox", { name: "Righe per pagina" }))
    await userEvent.click(await within(document.body).findByRole("option", { name: "20" }))
    await expect(within(table).getByText("TARI")).toBeVisible()
    await expect(canvas.getByRole("combobox", { name: "Righe per pagina" })).toHaveTextContent("20")
  },
}

function EmptyNotifications() {
  const [configured, setConfigured] = React.useState(false)
  return (
    <div style={{ width: 852, maxWidth: "100%" }}>
      <Table
        caption="Notifiche SEND"
        columns={[{ key: "id", label: "Identificativo" }]}
        rows={[]}
        emptyState={{
          title: "Qui vedrai le tue notifiche",
          description:
            "Configura SEND per scegliere come ricevere le comunicazioni a valore legale in digitale e risparmiare.",
          actions: (
            <Button variant="ghost" onClick={() => setConfigured(true)}>
              Configura SEND
            </Button>
          ),
        }}
        pagination={<Pagination currentPage={1} totalPages={2} onPageChange={() => undefined} />}
      />
      <output>{configured ? "Configurazione avviata" : ""}</output>
    </div>
  )
}

export const EmptyWithAction: Story = {
  render: () => <EmptyNotifications />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await expect(
      canvas.getByRole("region", { name: "Notifiche SEND" }).getBoundingClientRect().height,
    ).toBe(236)
    await expect(canvas.getByText("Qui vedrai le tue notifiche")).toBeVisible()
    await expect(
      canvas.getByText(
        "Configura SEND per scegliere come ricevere le comunicazioni a valore legale in digitale e risparmiare.",
      ),
    ).toBeVisible()
    // The Empty artwork is decorative: it carries no img role (asserted below), so
    // it is retrieved from the DOM rather than by role.
    const image = canvasElement.querySelector("img[data-figma-node-id]")
    if (!(image instanceof HTMLImageElement)) throw new Error("Expected source empty artwork")
    await image.decode()
    await expect(image.naturalWidth).toBeGreaterThan(0)
    await expect(image.getBoundingClientRect().width).toBe(56)
    await expect(canvas.queryByRole("img")).not.toBeInTheDocument()
    await expect(canvas.queryByRole("table")).not.toBeInTheDocument()
    await expect(canvas.queryByRole("navigation")).not.toBeInTheDocument()
    canvas.getByRole("button", { name: "Configura SEND" }).focus()
    await userEvent.keyboard("{Enter}")
    await expect(canvas.getByRole("status")).toHaveTextContent("Configurazione avviata")
  },
}

function MobilePayments() {
  const [page, setPage] = React.useState(2)
  return (
    <div style={{ width: 272 }}>
      <Table
        caption="Avvisi di pagamento"
        columns={[{ key: "service", label: "Servizio" }]}
        rows={[{ id: page, service: `Avviso ${page}` }]}
        pagination={<Pagination currentPage={page} totalPages={101} onPageChange={setPage} />}
      />
    </div>
  )
}

export const MobileWithControls: Story = {
  render: () => <MobilePayments />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const container = canvas.getByRole("region", { name: "Avvisi di pagamento" })
    const navigation = within(canvas.getByRole("navigation", { name: "Paginazione" }))
    await expect(navigation.getAllByRole("button")).toHaveLength(3)
    await expect(navigation.getByRole("button", { name: "Pagina 2" })).toHaveAttribute(
      "aria-current",
      "page",
    )
    await expect(container.scrollWidth).toBeLessThanOrEqual(272)
    navigation.getByRole("button", { name: "Pagina successiva" }).focus()
    await userEvent.keyboard("{Enter}")
    await expect(canvas.getByText("Avviso 3")).toBeVisible()
    await expect(navigation.getByRole("button", { name: "Pagina 3" })).toHaveAttribute(
      "aria-current",
      "page",
    )
    await userEvent.click(navigation.getByRole("button", { name: "Pagina precedente" }))
    await expect(canvas.getByText("Avviso 2")).toBeVisible()
  },
}

function PaymentActions() {
  const [action, setAction] = React.useState("")
  return (
    <div style={{ width: 852 }}>
      <Table
        caption="Pagamenti con azioni"
        captionHidden
        columns={[
          {
            key: "service",
            label: "Servizio",
            render: () => (
              <a href="/pagamenti/tari" className="text-primary underline underline-offset-4">
                TARI
              </a>
            ),
          },
          { key: "amount", label: "Importo" },
        ]}
        rows={[{ id: "tari", service: "TARI", amount: "42,00 euro" }]}
        rowActions={(row) => (
          <>
            <Button variant="ghost" onClick={() => setAction(`Ricevuta ${row.service}`)}>
              Ricevuta
            </Button>
            <MenuDropDown
              accessibleLabel={`Altre azioni per ${row.service}`}
              label="Azioni pagamento"
              items={[
                {
                  id: "details",
                  label: "Apri dettagli",
                  onSelect: () => setAction(`Dettagli ${row.service}`),
                },
              ]}
            />
          </>
        )}
      />
      <output>{action}</output>
    </div>
  )
}

export const RowActions: Story = {
  // Reflow exemption: fixture pinned at the source width, not a product surface.
  parameters: { a11yContract: { reflow: false } },
  render: () => <PaymentActions />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const element = canvas.getByRole("table", { name: "Pagamenti con azioni" })
    const table = within(element)
    await expect(
      table.getByRole("caption", { name: "Pagamenti con azioni" }).getBoundingClientRect().width,
    ).toBeLessThanOrEqual(1)
    await expect(getComputedStyle(table.getByRole("cell", { name: "42,00 euro" })).fontSize).toBe(
      "16px",
    )
    for (const row of table.getAllByRole("row")) {
      await expect(row.getBoundingClientRect().height).toBeGreaterThanOrEqual(48)
      await expect(row.getBoundingClientRect().height).toBeLessThanOrEqual(49)
    }
    await expect(table.getAllByRole("link", { name: "TARI" })).toHaveLength(1)
    table.getByRole("button", { name: "Ricevuta" }).focus()
    await userEvent.keyboard("{Enter}")
    await expect(canvas.getByRole("status")).toHaveTextContent("Ricevuta TARI")
    const trigger = table.getByRole("button", { name: "Altre azioni per TARI" })
    trigger.focus()
    await userEvent.keyboard("{ArrowDown}")
    const item = await within(document.body).findByRole("menuitem", { name: "Apri dettagli" })
    await waitFor(() => expect(item).toHaveFocus())
    await waitFor(() =>
      expect(within(document.body).getByRole("group", { name: "Azioni pagamento" })).toBeVisible(),
    )
    await userEvent.keyboard("{Escape}")
    await waitFor(() => expect(trigger).toHaveFocus())
    await userEvent.keyboard("{ArrowDown}")
    const reopenedItem = await within(document.body).findByRole("menuitem", {
      name: "Apri dettagli",
    })
    await waitFor(() => expect(reopenedItem).toHaveFocus())
    await userEvent.click(reopenedItem)
    await expect(canvas.getByRole("status")).toHaveTextContent("Dettagli TARI")
    await waitFor(() => expect(trigger).toHaveFocus())
  },
}

function SortedPayments() {
  const [ascending, setAscending] = React.useState(false)
  const rows = [
    { id: "mensa", service: "Mensa scolastica", amount: "18,50 euro" },
    { id: "tari", service: "TARI", amount: "42,00 euro" },
  ]
  return (
    <div style={{ width: 320 }}>
      <Table
        caption="Pagamenti ordinabili"
        columns={[
          {
            key: "service",
            label: "Servizio",
            sort: {
              direction: ascending ? "ascending" : "descending",
              onChange: () => setAscending(!ascending),
            },
          },
          { key: "amount", label: "Importo" },
        ]}
        rows={ascending ? rows : rows.toReversed()}
      />
    </div>
  )
}

export const Sorting: Story = {
  render: () => <SortedPayments />,
  play: async ({ canvasElement }) => {
    const table = within(within(canvasElement).getByRole("table", { name: "Pagamenti ordinabili" }))
    const sort = table.getByRole("button", { name: "Ordina per Servizio" })
    await expect(sort).toBeVisible()
    await expect(sort.getBoundingClientRect().height).toBeGreaterThanOrEqual(44)
    const descendingGlyph = sort.lastElementChild
    if (!descendingGlyph) throw new Error("Expected the visible descending sort glyph")
    await expect(descendingGlyph.getBoundingClientRect().width).toBe(24)
    await expect(descendingGlyph.getBoundingClientRect().height).toBe(24)
    await expect(table.getByRole("columnheader", { name: "Servizio" })).toHaveAttribute(
      "aria-sort",
      "descending",
    )
    await expect(table.getAllByRole("cell")[0]).toHaveTextContent("TARI")
    sort.focus()
    await userEvent.keyboard("{Enter}")
    await expect(table.getAllByRole("cell")[0]).toHaveTextContent("Mensa scolastica")
    await expect(table.getByRole("columnheader", { name: "Servizio" })).toHaveAttribute(
      "aria-sort",
      "ascending",
    )
    const ascendingGlyph = sort.lastElementChild
    if (!ascendingGlyph) throw new Error("Expected the visible ascending sort glyph")
    await expect(ascendingGlyph.getBoundingClientRect().width).toBe(24)
    await expect(ascendingGlyph.getBoundingClientRect().height).toBe(24)
    await expect(sort).toHaveFocus()
  },
}

interface SourceRow {
  id: string
  reference: string
  category: string
  date: string
  name: string
  label: string
  status: string
}

const sourceRowsPerPage = 15

function SourceTable({ width }: { width: number }) {
  const [page, setPage] = React.useState(1)
  const [action, setAction] = React.useState("")
  const [sort, setSort] = React.useState<{
    key: "reference" | "date" | "status"
    direction: "ascending" | "descending"
  }>({ key: "reference", direction: "descending" })
  const columns: TableColumn<SourceRow>[] = [
    {
      key: "reference",
      label: "ID",
      render: (value, row) => (
        <div className="flex min-w-0 items-center gap-2">
          {row.id.endsWith("-0") ? (
            <span
              role="img"
              aria-label="Non letta"
              className="size-2 shrink-0 rounded-full bg-primary"
            />
          ) : null}
          {row.id.endsWith("-0") ? (
            <a href={`#notifica-${row.id}`} className="text-primary underline underline-offset-4">
              {value}
            </a>
          ) : (
            <span className="font-mono">{value}</span>
          )}
          <Paperclip
            aria-hidden="true"
            className="ml-auto hidden size-5 shrink-0 text-primary @max-[40rem]/table:block"
          />
        </div>
      ),
    },
    { key: "category", label: "Category" },
    { key: "date", label: "Date" },
    { key: "name", label: "Name" },
    {
      key: "label",
      label: "Category",
      render: (value) => (
        <span className="inline-flex items-center gap-1">
          <TagIcon aria-hidden="true" className="hidden size-4 @max-[40rem]/table:block" />
          {value}
        </span>
      ),
    },
    {
      key: "status",
      label: "Status",
      render: (value) => (
        <Chip variant="primary" size="compact" data-testid="notification-status">
          {value}
        </Chip>
      ),
    },
  ]
  const sortableColumns = columns.map((column) => {
    const key = column.key
    if (key !== "reference" && key !== "date" && key !== "status") return column
    return {
      ...column,
      sort: {
        direction: sort.key === key ? sort.direction : "none",
        onChange: () =>
          setSort({
            key,
            direction:
              sort.key === key && sort.direction === "ascending" ? "descending" : "ascending",
          }),
      },
    }
  }) satisfies TableColumn<SourceRow>[]
  const rows: SourceRow[] = Array.from({ length: sourceRowsPerPage }, (_, index) => ({
    id: `${page}-${index}`,
    reference: index === 0 ? "Cell" : String(123456 + index),
    category: "Label",
    date: "31/12/2028",
    name: "Name",
    label: "LOREM",
    status: "Default",
  }))
  rows.sort((a, b) => {
    const comparison = a[sort.key].localeCompare(b[sort.key])
    return sort.direction === "ascending" ? comparison : -comparison
  })
  return (
    <div style={{ width, maxWidth: "100%" }}>
      <Table
        caption="Notifiche: composizione Figma"
        captionHidden
        columns={sortableColumns}
        rows={rows}
        rowActions={(row) => (
          <>
            <Button variant="ghost" onClick={() => setAction(`Notifica ${row.reference}`)}>
              Action
            </Button>
            <MenuDropDown
              accessibleLabel={`Altre azioni per ${row.reference}`}
              items={[
                {
                  id: "details",
                  label: "Dettagli",
                  onSelect: () => setAction(`Dettagli ${row.reference}`),
                },
              ]}
            />
          </>
        )}
        pagination={<Pagination currentPage={page} totalPages={101} onPageChange={setPage} />}
      />
      <output>{action}</output>
    </div>
  )
}

export const SourceDesktop: Story = {
  tags: ["color-pinned"],
  render: () => <SourceTable width={852} />,
  play: async ({ canvasElement }) => {
    const table = within(
      within(canvasElement).getByRole("table", { name: "Notifiche: composizione Figma" }),
    )
    const status = table.getAllByTestId("notification-status")[0]
    await expect(status.getBoundingClientRect().height).toBe(24)
    await expect(getComputedStyle(status).backgroundColor).toBe("rgb(231, 236, 252)")
    await expect(getComputedStyle(status).color).toBe("rgb(3, 19, 68)")
  },
}

export const SourceMobile: Story = {
  render: () => <SourceTable width={272} />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const region = canvas.getByRole("region", { name: "Notifiche: composizione Figma" })
    const table = within(canvas.getByRole("table", { name: "Notifiche: composizione Figma" }))
    await expect(region.scrollWidth).toBeLessThanOrEqual(272)
    await expect(table.getAllByRole("columnheader")).toHaveLength(7)
    const row = within(table.getAllByRole("row")[1])
    await expect(row.getByRole("link", { name: "Cell" })).toBeVisible()
    await expect(row.getByText("ID", { selector: "span" })).toBeVisible()
    await expect(row.getByText("Status", { selector: "span" })).toBeVisible()
    await expect(row.getAllByRole("cell")).toHaveLength(7)
    const actions = row.getAllByRole("button")
    await expect(actions).toHaveLength(2)
    for (const action of actions) {
      await expect(action.getBoundingClientRect().width).toBeGreaterThanOrEqual(44)
      await expect(action.getBoundingClientRect().height).toBeGreaterThanOrEqual(44)
    }
    actions[0].focus()
    await userEvent.keyboard("{Enter}")
    await expect(canvas.getByRole("status")).toHaveTextContent("Notifica Cell")
    const navigation = within(canvas.getByRole("navigation", { name: "Paginazione" }))
    await expect(navigation.getAllByRole("button")).toHaveLength(3)
    const next = navigation.getByRole("button", { name: "Pagina successiva" })
    next.focus()
    await userEvent.keyboard("{Enter}")
    await expect(navigation.getByRole("button", { name: "Pagina 2" })).toHaveAttribute(
      "aria-current",
      "page",
    )
    await expect(next).toHaveFocus()
  },
}

export const EmptyOptions: Story = {
  render: () => (
    <div className="flex max-w-3xl flex-col gap-4">
      <Table
        caption="Solo descrizione"
        rows={[]}
        columns={[{ key: "id", label: "ID" }]}
        emptyState={{ description: "Le notifiche saranno disponibili qui." }}
      />
      <Table
        caption="Solo titolo"
        rows={[]}
        columns={[{ key: "id", label: "ID" }]}
        emptyState={{ title: "Nessuna notifica" }}
      />
      <Table
        caption="Senza contenuto visivo"
        rows={[]}
        columns={[{ key: "id", label: "ID" }]}
        emptyState={{}}
      />
    </div>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const description = within(canvas.getByRole("region", { name: "Solo descrizione" }))
    await expect(description.getByText("Le notifiche saranno disponibili qui.")).toBeVisible()
    await expect(description.queryByText("Nessun risultato")).not.toBeInTheDocument()
    const title = within(canvas.getByRole("region", { name: "Solo titolo" }))
    await expect(title.getByText("Nessuna notifica")).toBeVisible()
    const empty = within(canvas.getByRole("region", { name: "Senza contenuto visivo" }))
    await expect(
      empty.getByText("Nessun risultato").getBoundingClientRect().width,
    ).toBeLessThanOrEqual(1)
    await expect(canvas.queryByRole("button")).not.toBeInTheDocument()
    await expect(canvas.queryByRole("table")).not.toBeInTheDocument()
  },
}

function PublicCells() {
  const [sorted, setSorted] = React.useState(false)
  const id = React.useId()
  return (
    <>
      <TablePrimitive variant="data">
        <TableCaption>Dettaglio pagamenti</TableCaption>
        <TableHeader>
          <TableRow>
            <TableHeaderField
              id={`${id}-service`}
              aria-label="Servizio"
              sort={{
                direction: sorted ? "ascending" : "none",
                onChange: () => setSorted(true),
              }}
            >
              Servizio
            </TableHeaderField>
            <TableHeaderField id={`${id}-amount`}>Importo</TableHeaderField>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableCellRow
            header={
              <a href="#mensa" className="text-primary underline underline-offset-4">
                Mensa scolastica
              </a>
            }
            cells={["Mensa scolastica", "18,50 euro"]}
          />
          <TableRow>
            <TableListField headers={`${id}-service`}>
              <a href="#tari">TARI</a>
            </TableListField>
            <TableListField headers={`${id}-amount`}>42,00 euro</TableListField>
          </TableRow>
        </TableBody>
      </TablePrimitive>
      <output>{sorted ? "Ordinamento richiesto" : ""}</output>
    </>
  )
}

export const CellComposition: Story = {
  parameters: { design: { type: "figma", url: figmaEmbedUrl("1344:40672") } },
  render: () => <PublicCells />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const table = within(canvas.getByRole("table", { name: "Dettaglio pagamenti" }))
    await expect(table.getByRole("rowheader", { name: "Mensa scolastica" })).toHaveAttribute(
      "scope",
      "row",
    )
    await expect(table.getByRole("cell", { name: "42,00 euro" })).toHaveAttribute(
      "headers",
      table.getByRole("columnheader", { name: "Importo" }).id,
    )
    const sort = table.getByRole("button", { name: "Ordina per Servizio" })
    sort.focus()
    await userEvent.keyboard("{Enter}")
    await expect(canvas.getByRole("status")).toHaveTextContent("Ordinamento richiesto")
    await expect(table.getByRole("columnheader", { name: "Servizio" })).toHaveAttribute(
      "aria-sort",
      "ascending",
    )
    await expect(sort).toHaveFocus()
  },
}

export const ConfigurableHeading: Story = {
  args: { title: "Pagamenti", titleAs: "h3" },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    // The caller owns the outline: the table title renders at the requested
    // level instead of a fixed h2.
    await expect(canvas.getByRole("heading", { level: 3, name: "Pagamenti" })).toBeVisible()
    await expect(canvas.queryByRole("heading", { level: 2 })).not.toBeInTheDocument()
  },
}
