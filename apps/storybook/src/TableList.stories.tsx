import * as React from "react"
import type { Meta, StoryObj } from "@storybook/react-vite"
import { expect, userEvent, within } from "storybook/test"

import { TableList, type TableListItemField } from "@/components/data-display"
import { PagoPAIcon } from "@/components/icons/PagoPAIcon"
import { PagoPAPictogram } from "@/components/icons/PagoPAPictogram"
import { Pagination } from "@/components/navigation"
import { Button } from "@/components/primitives/button"
import { figmaEmbedUrl } from "@/catalog/figma/file"

import tablesGuide from "./guides/tables.md?raw"

interface CampaignRow {
  id: number
  date: string
  title: string
  code: string
  messages: string
}

const campaigns: CampaignRow[] = [
  {
    id: 1,
    date: "22/11/2025",
    title: "Campagna di avvisi di pagamento",
    code: "000000000",
    messages: "000000000",
  },
  {
    id: 2,
    date: "22/11/2025",
    title: "Titolo campagna molto lungo che va su due righe",
    code: "000000001",
    messages: "000000001",
  },
  {
    id: 3,
    date: "22/11/2025",
    title: "Campagna di comunicazioni di servizio",
    code: "000000002",
    messages: "000000002",
  },
  {
    id: 4,
    date: "22/11/2025",
    title: "Campagna di promemoria scadenze",
    code: "000000003",
    messages: "000000003",
  },
  {
    id: 5,
    date: "23/11/2025",
    title: "Campagna di notifiche SEND",
    code: "000000004",
    messages: "000000004",
  },
  {
    id: 6,
    date: "23/11/2025",
    title: "Campagna di avvisi TARI",
    code: "000000005",
    messages: "000000005",
  },
]

function campaignFields(row: CampaignRow): TableListItemField[] {
  return [
    { label: row.date, value: row.title },
    { label: "Codice ID", value: row.code, mono: true },
    {
      label: "Comunicazioni",
      value: row.messages,
      mono: true,
      icon: <PagoPAIcon name="mail" />,
    },
  ]
}

const meta = {
  title: "Components/Data display/TableList",
  component: TableList<CampaignRow>,
  args: {
    label: "Campagne",
    rows: campaigns.slice(0, 4),
    fields: campaignFields,
    action: (row) => ({
      label: "Apri",
      ariaLabel: `Apri ${row.title}`,
      href: `/campagne/${row.id}`,
    }),
  },
  argTypes: {
    action: { control: false },
    fields: { control: false },
    rows: { control: false },
  },
  parameters: {
    layout: "padded",
    design: { type: "figma", url: figmaEmbedUrl("9624:10625") },
    docs: {
      description: {
        component: `Card list: every row is a \`TableListItem\` with labelled fields and a text action. Pagination is a caller node (as in \`Table\`) and disappears in the empty state, which shows the Message pictogram with an optional title, subtitle and action.

${tablesGuide}`,
      },
    },
  },
} satisfies Meta<typeof TableList<CampaignRow>>

export default meta
type Story = StoryObj<typeof meta>

export const Playground: Story = {
  render: (args) => <TableList {...args} />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await expect(canvas.getAllByRole("listitem")).toHaveLength(4)
    await expect(canvas.getAllByRole("link", { name: /^Apri / })).toHaveLength(4)
  },
}

const campaignsPerPage = 4

function PaginatedList() {
  const [page, setPage] = React.useState(1)
  const totalPages = Math.ceil(campaigns.length / campaignsPerPage)
  const visible = campaigns.slice((page - 1) * campaignsPerPage, page * campaignsPerPage)
  return (
    <div className="w-[min(53.25rem,calc(100vw-2rem))] max-w-full">
      <TableList
        label="Campagne"
        rows={visible}
        fields={campaignFields}
        action={(row) => ({
          label: "Apri",
          ariaLabel: `Apri ${row.title}`,
          href: `/campagne/${row.id}`,
        })}
        pagination={
          <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} />
        }
      />
    </div>
  )
}

export const Paginated: Story = {
  render: () => <PaginatedList />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await expect(canvas.queryByText("Campagna di notifiche SEND")).not.toBeInTheDocument()
    await userEvent.click(canvas.getByRole("button", { name: "Pagina successiva" }))
    await expect(canvas.getByText("Campagna di notifiche SEND")).toBeVisible()
    await expect(canvas.getAllByRole("listitem")).toHaveLength(2)
    await expect(canvas.getByRole("button", { name: "Pagina successiva" })).toBeDisabled()
    await userEvent.click(canvas.getByRole("button", { name: "Pagina precedente" }))
    await expect(canvas.getAllByRole("listitem")).toHaveLength(4)
  },
}

function EmptyCampaigns() {
  const [configured, setConfigured] = React.useState(false)
  return (
    <div className="w-[min(53.25rem,calc(100vw-2rem))] max-w-full">
      <TableList
        label="Campagne"
        rows={[]}
        fields={campaignFields}
        pagination={<Pagination currentPage={1} totalPages={2} onPageChange={() => undefined} />}
        emptyState={{
          title: "Qui vedrai le campagne inviate dall'ente",
          description: "Le campagne compariranno qui non appena saranno programmate o inviate.",
          actions: (
            <Button variant="ghost" onClick={() => setConfigured(true)}>
              Scopri come creare una campagna
            </Button>
          ),
        }}
      />
      <output>{configured ? "Guida alle campagne aperta" : ""}</output>
    </div>
  )
}

export const Empty: Story = {
  render: () => <EmptyCampaigns />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await expect(canvas.queryAllByRole("listitem")).toHaveLength(0)
    await expect(canvas.queryByRole("navigation", { name: "Paginazione" })).not.toBeInTheDocument()
    const region = canvas.getByRole("region", { name: "Campagne" })
    await expect(within(region).getByText("Qui vedrai le campagne inviate dall'ente")).toBeVisible()
    await userEvent.click(canvas.getByRole("button", { name: "Scopri come creare una campagna" }))
    await expect(canvas.getByText("Guida alle campagne aperta")).toBeVisible()
  },
}

export const StaticRows: Story = {
  args: { action: undefined },
  render: (args) => <TableList {...args} />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await expect(canvas.queryAllByRole("link")).toHaveLength(0)
    await expect(canvas.queryAllByRole("button")).toHaveLength(0)
    await expect(canvas.getAllByRole("listitem")).toHaveLength(4)
  },
}

// A row action without a label announces the fallback text: the caller owns
// the word, also through the composed list.
export const ActionFallbackLabel: Story = {
  render: () => (
    <TableList
      label="Campagne"
      rows={campaigns.slice(0, 2)}
      fields={campaignFields}
      actionFallbackLabel="Dettagli campagna"
      action={(row) => ({ href: `/campagne/${row.id}` })}
    />
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const links = canvas.getAllByRole("link", { name: "Dettagli campagna" })
    await expect(links).toHaveLength(2)
  },
}

export const EmptyCustomPictogram: Story = {
  args: {
    rows: [],
    emptyState: { pictogram: <PagoPAPictogram name="Envelope" size={56} /> },
  },
  render: (args) => <TableList {...args} />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const region = canvas.getByRole("region", { name: "Campagne" })
    await expect(within(region).getByText("Nessun risultato")).toBeInTheDocument()
    await expect(region.querySelector("img")?.dataset.figmaNodeId).toBe("329:1700")
  },
}
