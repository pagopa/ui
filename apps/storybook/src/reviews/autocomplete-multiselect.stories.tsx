import type { Meta, StoryObj } from "@storybook/react-vite"

import { Autocomplete, InputChip, MultiSelectField } from "@/components/inputs"
import { PagoPAIcon } from "@/components/icons/PagoPAIcon"
import { ChevronDown } from "@/components/primitives/icons"

// One story per option. Review stories live only on the long-lived review pull
// request (`feedback/previews`) and never merge. Option A is a static
// composition of the field the source draws; B and C use the live components.

type Mode = "multiselect-api" | "multi-select-field" | "excluded"

interface Option {
  key: string
  title: string
  summary: string
  mode: Mode
}

const options: Option[] = [
  {
    key: "A",
    title: "Autocomplete gains a multiselect API",
    summary:
      "One component holds a list of pills and keeps the search input editable inside the same frame.",
    mode: "multiselect-api",
  },
  {
    key: "B",
    title: "The types map to MultiSelectField",
    summary:
      "The node declares MultiSelectField as an additional target, as SelectField already does. No new public API.",
    mode: "multi-select-field",
  },
  {
    key: "C",
    title: "The multiselect types are excluded",
    summary:
      "Only the single-value type stays. The node closes on Type=Default, and the multiselect types belong to another node.",
    mode: "excluded",
  },
]

const municipalities = [
  { value: "roma", label: "Roma" },
  { value: "milano", label: "Milano" },
  { value: "napoli", label: "Napoli" },
]

const services = [
  { value: "tributi", label: "Tributi locali" },
  { value: "scuola", label: "Servizi scolastici" },
  { value: "mobilita", label: "Mobilità" },
]

function MultiSelectApi() {
  return (
    <div className="grid w-68 max-w-full gap-1.5">
      <span className="text-label-mini text-muted-foreground">Servizi di interesse</span>
      <div className="flex min-h-12 flex-wrap items-center gap-2 rounded-lg border-2 border-primary bg-background p-2">
        <InputChip removeLabel="Elimina Tributi locali">Tributi locali</InputChip>
        <InputChip removeLabel="Elimina Servizi scolastici">Servizi scolastici</InputChip>
        <span className="flex min-w-16 flex-1 items-center gap-2 px-1">
          <PagoPAIcon name="account_balance" size={24} className="shrink-0 text-choice-icon" />
          <span className="text-body text-muted-foreground">Cerca un servizio…</span>
        </span>
        <ChevronDown aria-hidden="true" className="mr-1 size-6 shrink-0 text-foreground" />
      </div>
      <p className="px-1 text-label-mini text-muted-foreground">
        Il campo resta digitabile accanto alle pill.
      </p>
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
        {option.mode === "multiselect-api" ? <MultiSelectApi /> : null}
        {option.mode === "multi-select-field" ? (
          <div className="w-68 max-w-full">
            <MultiSelectField
              label="Servizi di interesse"
              options={services}
              defaultValue={["tributi", "scuola"]}
            />
          </div>
        ) : null}
        {option.mode === "excluded" ? (
          <div className="w-68 max-w-full">
            <Autocomplete
              label="Comune"
              options={municipalities}
              defaultValue="milano"
              description="Digita almeno una parte del nome."
            />
          </div>
        ) : null}
      </div>
    </div>
  )
}

const meta = {
  title: "Reviews/Autocomplete multiselect",
  tags: ["!dev", "!test", "!autodocs"],
  parameters: {
    layout: "fullscreen",
    options: { showPanel: false },
  },
} satisfies Meta

export default meta
type Story = StoryObj<typeof meta>

export const OptionA: Story = {
  name: "A — Multiselect API",
  render: () => <OptionView option={options[0]} />,
}

export const OptionB: Story = {
  name: "B — MultiSelectField",
  render: () => <OptionView option={options[1]} />,
}

export const OptionC: Story = {
  name: "C — Default type only",
  render: () => <OptionView option={options[2]} />,
}
