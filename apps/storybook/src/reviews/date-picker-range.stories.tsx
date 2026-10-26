import type { Meta, StoryObj } from "@storybook/react-vite"
import type { ReactNode } from "react"

import { DatePickerField } from "@/components/inputs"
import { PagoPAIcon } from "@/components/icons/PagoPAIcon"
import { CalendarDays } from "@/components/primitives/icons"

// One story per option, so a designer can open a single field shape at the real
// viewport. Review stories live only on the long-lived review pull request
// (`feedback/previews`) and never merge. Option A is the live field; option B
// shows the visual consequence of a range trigger that is not implemented yet.

const trigger =
  "peer flex min-h-12 w-full items-center gap-2 rounded-lg border border-input bg-background px-3 py-2 text-left text-body transition-[color,background-color,border-color] outline-none select-none focus-visible:border-ring focus-visible:outline-2 focus-visible:outline-solid focus-visible:outline-offset-1 focus-visible:outline-ring disabled:cursor-not-allowed disabled:bg-muted disabled:text-muted-foreground aria-invalid:border-destructive aria-invalid:outline-destructive aria-expanded:border-2 aria-expanded:border-primary [&_svg]:pointer-events-none [&_svg]:shrink-0"

interface Option {
  key: string
  title: string
  summary: string
  render: () => ReactNode
}

function SingleDayField() {
  return (
    <div className="grid max-w-md gap-2">
      <DatePickerField label="Data" value="2026-03-12" readOnly />
      <p className="text-label-mini text-muted-foreground">
        One ISO day, one label, one error state.
      </p>
    </div>
  )
}

function RangeField() {
  return (
    <div className="grid max-w-md gap-2">
      <div className="relative">
        <button type="button" className={trigger} aria-label="Periodo">
          <span
            aria-hidden="true"
            className="inline-flex size-6 shrink-0 items-center justify-center text-choice-icon"
          >
            <CalendarDays />
          </span>
          <span className="flex-1 truncate text-label-sb">1 mar 2026 – 31 mar 2026</span>
          <PagoPAIcon name="chevron" variant="down" size={24} />
        </button>
        <span className="pointer-events-none absolute top-px left-3 inline-flex -translate-y-1/2 items-center gap-0.5 bg-background px-1 text-caption-sb text-muted-foreground">
          Periodo
        </span>
      </div>
      <p className="text-label-mini text-muted-foreground">
        One period, one label, one error state; it opens the existing range panel.
      </p>
    </div>
  )
}

const options: Option[] = [
  {
    key: "A",
    title: "Keep the single-day field",
    summary:
      'A period stays a product composition of Popover and DatePicker mode="range". No new public API.',
    render: () => <SingleDayField />,
  },
  {
    key: "B",
    title: "Add a range trigger to the field",
    summary:
      "The field accepts from and to, formats the period, keeps the hidden form values and opens the existing range panel.",
    render: () => <RangeField />,
  },
]

function OptionView({ option }: { option: Option }) {
  return (
    <div className="min-h-dvh p-8">
      <p className="text-title-sb text-foreground">
        {option.key} — {option.title}
      </p>
      <p className="mt-2 mb-8 max-w-3xl text-body text-foreground">{option.summary}</p>
      <div className="max-w-3xl rounded-lg border border-border bg-background p-6">
        {option.render()}
      </div>
    </div>
  )
}

const meta = {
  title: "Reviews/Date picker range",
  tags: ["!dev", "!test", "!autodocs", "no-visual"],
  parameters: {
    layout: "fullscreen",
    options: { showPanel: false },
  },
} satisfies Meta

export default meta
type Story = StoryObj<typeof meta>

export const OptionA: Story = {
  name: "A — Single-day field",
  render: () => <OptionView option={options[0]} />,
}

export const OptionB: Story = {
  name: "B — Range trigger",
  render: () => <OptionView option={options[1]} />,
}
