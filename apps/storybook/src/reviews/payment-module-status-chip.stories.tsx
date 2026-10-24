import type { Meta, StoryObj } from "@storybook/react-vite"

import { PaymentModule } from "@/components/composites"
import { Chip } from "@/components/inputs/chips"
import { PagoPAIcon } from "@/components/icons/PagoPAIcon"
import { Button } from "@/components/primitives/button"

// One story per option. Review stories live only on the long-lived review pull
// request (`feedback/previews`) and never merge. The module is the live
// component: the option shows where the status sits, not a different API.

type Mode = "module" | "metadata" | "suggestion"

interface Option {
  key: string
  title: string
  summary: string
  mode: Mode
}

const options: Option[] = [
  {
    key: "A",
    title: "The module owns a status chip",
    summary:
      "A first-class chip prop renders the chip in the module tail. The module owns its size and its tooltip. This is a new public API.",
    mode: "module",
  },
  {
    key: "B",
    title: "The product owns the status",
    summary:
      "The product passes a Chip through the metadata value, which already accepts React content. The module stays a layout.",
    mode: "metadata",
  },
  {
    key: "C",
    title: "Only the suggestion line",
    summary:
      "The status is plain text in the suggestion line. No chip, so the state is less prominent.",
    mode: "suggestion",
  },
]

const statusChip = (
  <Chip size="compact" variant="neutral">
    Da pagare
  </Chip>
)

const commonMetadata = [
  { label: "Oggetto", value: "Accertamento TARI 2025 - 00016/2025" },
  { label: "Scade il", value: "12/04/2026" },
]

function Module({ option }: { option: Option }) {
  if (option.mode === "module") {
    return (
      <div className="relative w-full max-w-2xl">
        <PaymentModule
          code="3020 1234 5678 9012 34"
          metadata={commonMetadata}
          actions={
            <Button type="button" className="w-full">
              Paga 744,00 €
            </Button>
          }
        />
        <span className="absolute top-6 right-6">
          <Chip size="compact" variant="neutral">
            Da pagare
          </Chip>
        </span>
      </div>
    )
  }
  if (option.mode === "metadata") {
    return (
      <div className="w-full max-w-2xl">
        <PaymentModule
          code="3020 1234 5678 9012 34"
          metadata={[...commonMetadata, { label: "Stato", value: statusChip }]}
          actions={
            <Button type="button" className="w-full">
              Paga 744,00 €
            </Button>
          }
        />
      </div>
    )
  }
  return (
    <div className="w-full max-w-2xl">
      <PaymentModule
        code="3020 1234 5678 9012 34"
        metadata={commonMetadata}
        suggestion={{
          label: "Da pagare entro il 12/04/2026",
          icon: <PagoPAIcon name="info" size={20} />,
        }}
        actions={
          <Button type="button" className="w-full">
            Paga 744,00 €
          </Button>
        }
      />
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
      <Module option={option} />
    </div>
  )
}

const meta = {
  title: "Reviews/Payment module status chip",
  tags: ["!dev", "!test", "!autodocs"],
  parameters: {
    layout: "fullscreen",
    options: { showPanel: false },
  },
} satisfies Meta

export default meta
type Story = StoryObj<typeof meta>

export const OptionA: Story = {
  name: "A — Module owns the chip",
  render: () => <OptionView option={options[0]} />,
}

export const OptionB: Story = {
  name: "B — Product-owned chip",
  render: () => <OptionView option={options[1]} />,
}

export const OptionC: Story = {
  name: "C — Suggestion line only",
  render: () => <OptionView option={options[2]} />,
}
