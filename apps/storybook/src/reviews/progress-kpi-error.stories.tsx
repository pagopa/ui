import type { Meta, StoryObj } from "@storybook/react-vite"

import { ProgressKpi } from "@/components/data-display"
import { PagoPAIcon } from "@/components/icons/PagoPAIcon"

// One story per option. Review stories live only on the long-lived review pull
// request (`feedback/previews`) and never merge. The error tone is painted
// statically because the component does not own it yet.

type Mode = "error-tone" | "second-value" | "no-change"

interface Option {
  key: string
  title: string
  summary: string
  mode: Mode
}

const options: Option[] = [
  {
    key: "A",
    title: "An error tone on the completed state",
    summary:
      "The bar, the percentage and the footer icon use the error tokens. The count stays complete at 100%.",
    mode: "error-tone",
  },
  {
    key: "B",
    title: "Failed as a second value",
    summary:
      "The card shows the success and the failure counts side by side. More data, a larger API and a new source layout.",
    mode: "second-value",
  },
  {
    key: "C",
    title: "No change in the design system",
    summary:
      "The green completed state stays the only one. A product that needs an error card composes it.",
    mode: "no-change",
  },
]

function ErrorKpiCard() {
  return (
    <section
      aria-label="Notifiche inviate"
      className="grid w-full max-w-sm gap-3 rounded-3xl border bg-background p-6"
    >
      <header className="flex items-center gap-2">
        <span className="min-w-0 flex-1 text-label-sb text-muted-foreground">
          Notifiche inviate
        </span>
      </header>
      <div className="grid gap-3">
        <p className="text-title-xl-mobile text-error-foreground">100%</p>
        <div className="grid gap-2">
          <div
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={100}
            aria-label="100%"
            className="h-4 w-full overflow-hidden rounded-2xl bg-secondary"
          >
            <div className="h-full w-full rounded-2xl bg-error-foreground" />
          </div>
          <div className="flex items-center gap-0.5">
            <span className="text-body-sb text-foreground">1.204</span>
            <span className="text-label-mini text-foreground">/ 1.204</span>
            <PagoPAIcon name="error" size={16} className="text-error-foreground" />
          </div>
        </div>
      </div>
      <p className="text-label-mini text-muted-foreground">
        Tutte le notifiche sono state rifiutate. Controlla i recapiti.
      </p>
    </section>
  )
}

function Card({ option }: { option: Option }) {
  if (option.mode === "error-tone") return <ErrorKpiCard />
  if (option.mode === "second-value") {
    return (
      <ProgressKpi
        label="Notifiche inviate"
        value={1204}
        total={1204}
        completed
        details={[
          { label: "Riuscite", value: 0, total: 1204 },
          { label: "Fallite", value: 1204, total: 1204 },
        ]}
      />
    )
  }
  return <ProgressKpi label="Notifiche inviate" value={1204} total={1204} completed />
}

function OptionView({ option }: { option: Option }) {
  return (
    <div className="min-h-dvh bg-secondary p-8">
      <p className="text-body-big-sb text-foreground">
        {option.key} — {option.title}
      </p>
      <p className="text-body mt-2 mb-8 max-w-3xl text-foreground">{option.summary}</p>
      <div className="max-w-sm">
        <Card option={option} />
      </div>
    </div>
  )
}

const meta = {
  title: "Reviews/Progress KPI error",
  tags: ["!dev", "!test", "!autodocs"],
  parameters: {
    layout: "fullscreen",
    options: { showPanel: false },
  },
} satisfies Meta

export default meta
type Story = StoryObj<typeof meta>

export const OptionA: Story = {
  name: "A — Error tone",
  render: () => <OptionView option={options[0]} />,
}

export const OptionB: Story = {
  name: "B — Second value",
  render: () => <OptionView option={options[1]} />,
}

export const OptionC: Story = {
  name: "C — No change",
  render: () => <OptionView option={options[2]} />,
}
