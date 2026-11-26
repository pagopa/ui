import type { Meta, StoryObj } from "@storybook/react-vite"

import { PagoPAIcon } from "@/components/icons/PagoPAIcon"
import { Button } from "@/components/primitives/button"

// One story per option. Review stories live only on the long-lived review pull
// request (`feedback/previews`) and never merge. The mobile card is a 272 px
// standalone composition.

type Mode = "wrapper" | "card-contract" | "table-owned"

interface Option {
  key: string
  title: string
  summary: string
  mode: Mode
}

const options: Option[] = [
  {
    key: "A",
    title: "A wrapper around the row",
    summary:
      "A 272 px card wraps the row. The cell content carries the labels, and the public API does not change.",
    mode: "wrapper",
  },
  {
    key: "B",
    title: "A card contract on the row",
    summary:
      'The row takes a variant="card" or a labels prop and owns the stacked surface. This is a new public API.',
    mode: "card-contract",
  },
  {
    key: "C",
    title: "The Table owns the card",
    summary:
      "The card stays the Table's mobile composition. The row helper stays desktop-only, and the mobile node is excluded with this reason.",
    mode: "table-owned",
  },
]

function Action() {
  return (
    <Button type="button" variant="ghost" className="self-end px-0">
      Apri
      <PagoPAIcon name="arrow" variant="right" />
    </Button>
  )
}

function WrapperCard() {
  return (
    <div className="w-68 max-w-full rounded-lg border bg-background">
      <div className="flex items-center gap-4 border-b p-4">
        <span className="min-w-0 flex-1 text-body-sb text-foreground">Accertamento TARI</span>
        <span className="text-body-sb text-foreground">€ 744,00</span>
      </div>
      <div className="flex items-center gap-4 p-4">
        <span className="min-w-0 flex-1 text-label-mini text-muted-foreground">Scadenza</span>
        <span className="text-label-mini-sb text-foreground">12/04/2026</span>
      </div>
      <div className="flex justify-end p-4 pt-0">
        <Action />
      </div>
    </div>
  )
}

function CardContract() {
  return (
    <div className="grid w-68 max-w-full gap-4 rounded-lg border bg-background p-4">
      <div className="grid gap-1">
        <span className="text-label-mini text-muted-foreground">Oggetto</span>
        <span className="text-body-sb text-foreground">Accertamento TARI</span>
      </div>
      <div className="grid gap-1">
        <span className="text-label-mini text-muted-foreground">Importo</span>
        <span className="text-body-sb text-foreground">€ 744,00</span>
      </div>
      <div className="grid gap-1">
        <span className="text-label-mini text-muted-foreground">Scadenza</span>
        <span className="text-body-sb text-foreground">12/04/2026</span>
      </div>
      <Action />
    </div>
  )
}

function TableCard() {
  return (
    <div className="w-68 max-w-full rounded-lg border bg-background">
      <div className="grid gap-3 p-4">
        <div className="grid gap-1">
          <span className="text-label-mini text-muted-foreground">Oggetto</span>
          <span className="text-body-sb text-foreground">Accertamento TARI</span>
        </div>
        <div className="grid gap-1">
          <span className="text-label-mini text-muted-foreground">Importo</span>
          <span className="text-body-sb text-foreground">€ 744,00</span>
        </div>
        <div className="grid gap-1">
          <span className="text-label-mini text-muted-foreground">Scadenza</span>
          <span className="text-body-sb text-foreground">12/04/2026</span>
        </div>
      </div>
      <div className="flex justify-end border-t p-4">
        <Action />
      </div>
    </div>
  )
}

function OptionView({ option }: { option: Option }) {
  return (
    <div className="min-h-dvh bg-secondary p-8">
      <p className="text-body-big-sb text-foreground">
        {option.key} — {option.title}
      </p>
      <p className="text-body mt-2 mb-8 max-w-3xl text-foreground">{option.summary}</p>
      {option.mode === "wrapper" ? <WrapperCard /> : null}
      {option.mode === "card-contract" ? <CardContract /> : null}
      {option.mode === "table-owned" ? <TableCard /> : null}
    </div>
  )
}

const meta = {
  title: "Reviews/Table cell row mobile card",
  tags: ["!dev", "!test", "!autodocs", "no-visual"],
  parameters: {
    layout: "fullscreen",
    options: { showPanel: false },
  },
} satisfies Meta

export default meta
type Story = StoryObj<typeof meta>

export const OptionA: Story = {
  name: "A — Wrapper composition",
  render: () => <OptionView option={options[0]} />,
}

export const OptionB: Story = {
  name: "B — Row card contract",
  render: () => <OptionView option={options[1]} />,
}

export const OptionC: Story = {
  name: "C — Table-owned card",
  render: () => <OptionView option={options[2]} />,
}
