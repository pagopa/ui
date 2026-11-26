import type { Meta, StoryObj } from "@storybook/react-vite"

import { InputChip } from "@/components/inputs"
import { PagoPAIcon } from "@/components/icons/PagoPAIcon"
import { ChevronDown } from "@/components/primitives/icons"

// One story per option. Review stories live only on the long-lived review pull
// request (`feedback/previews`) and never merge. All three are static
// compositions of the same 272x48 field holding five values: what differs is
// what happens to the values that do not fit, which the source never draws.

interface Option {
  key: string
  title: string
  summary: string
}

const options: Option[] = [
  {
    key: "A",
    title: "La riga scorre",
    summary:
      "Le pill restano tutte nella riga da 48 px: quelle oltre il bordo si raggiungono scorrendo in orizzontale. Ogni valore conserva la sua X.",
  },
  {
    key: "B",
    title: "Il contatore prende il posto delle pill",
    summary:
      "Quando le pill non entrano più il campo passa al tipo con il contatore: una pill con il numero dei valori e la X che li toglie tutti. Nessuno scorrimento, e nessuna X per il singolo valore.",
  },
  {
    key: "C",
    title: "Il campo cresce e le pill vanno a capo",
    summary:
      "La riga si allunga quanto serve e le pill occupano due linee. Ogni valore conserva la sua X, ma il campo non è più alto 48 px.",
  },
]

const values = ["Roma", "Milano", "Napoli", "Torino", "Palermo"]

const noop = () => {}

function Pills({ count }: { count: number }) {
  return (
    <>
      {values.slice(0, count).map((value) => (
        <InputChip key={value} onRemove={noop}>
          {value}
        </InputChip>
      ))}
    </>
  )
}

function LeadingIcon() {
  return <PagoPAIcon name="account_balance" size={24} className="shrink-0 text-choice-icon" />
}

function ClearControl() {
  return (
    <span className="grid size-6 shrink-0 place-items-center rounded-full text-foreground">
      <PagoPAIcon name="close" size={24} variant="small" />
    </span>
  )
}

function Scroll() {
  return (
    <div className="flex h-12 w-68 max-w-full items-center gap-2 rounded-lg border-2 border-primary bg-background pr-3 pl-3">
      <LeadingIcon />
      <span className="flex min-w-0 flex-1 flex-nowrap items-center gap-2 overflow-x-auto">
        <Pills count={5} />
      </span>
      <span className="flex shrink-0 items-center gap-1">
        <ClearControl />
        <ChevronDown aria-hidden="true" className="size-6 text-foreground" />
      </span>
    </div>
  )
}

function Collapse() {
  return (
    <div className="flex h-12 w-68 max-w-full items-center gap-2 rounded-lg border-2 border-primary bg-background pr-3 pl-3">
      <LeadingIcon />
      <span className="flex min-w-0 flex-1 items-center">
        <span className="inline-flex h-6 items-center rounded-full bg-secondary text-caption-sb text-foreground">
          <span className="pl-2 pr-1">5</span>
          <span className="grid size-6 shrink-0 place-items-center rounded-full">
            <PagoPAIcon name="close" size={24} variant="small" />
          </span>
        </span>
      </span>
      <ChevronDown aria-hidden="true" className="size-6 shrink-0 text-foreground" />
    </div>
  )
}

function Wrap() {
  return (
    <div className="flex min-h-12 w-68 max-w-full items-start gap-2 rounded-lg border-2 border-primary bg-background p-3">
      <LeadingIcon />
      <span className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
        <Pills count={5} />
      </span>
      <span className="flex shrink-0 items-center gap-1">
        <ClearControl />
        <ChevronDown aria-hidden="true" className="size-6 text-foreground" />
      </span>
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
      <div className="rounded-2xl border bg-background p-6">
        <div className="grid gap-1.5">
          <span className="text-label-mini text-muted-foreground">Erogatori</span>
          {option.key === "A" ? <Scroll /> : null}
          {option.key === "B" ? <Collapse /> : null}
          {option.key === "C" ? <Wrap /> : null}
        </div>
      </div>
    </div>
  )
}

const meta = {
  title: "Reviews/Autocomplete multiselect overflow",
  tags: ["!dev", "!test", "!autodocs", "no-visual"],
  parameters: {
    layout: "fullscreen",
    options: { showPanel: false },
  },
} satisfies Meta

export default meta
type Story = StoryObj<typeof meta>

export const OptionA: Story = {
  name: "A — The row scrolls",
  render: () => <OptionView option={options[0]} />,
}

export const OptionB: Story = {
  name: "B — The counter replaces the pills",
  render: () => <OptionView option={options[1]} />,
}

export const OptionC: Story = {
  name: "C — The field grows and the pills wrap",
  render: () => <OptionView option={options[2]} />,
}
