import type { Meta, StoryObj } from "@storybook/react-vite"

import { SegmentedControl } from "@/components/inputs"
import { ChevronDown } from "@/components/primitives/icons"

// One story per option. Review stories live only on the long-lived review pull
// request (`feedback/previews`) and never merge. Option A uses the live
// control for the default form and a static composition for the compact one.

type Mode = "item-mode" | "automatic" | "truncation"

interface Option {
  key: string
  title: string
  summary: string
  mode: Mode
}

const options: Option[] = [
  {
    key: "A",
    title: "A compact item mode",
    summary:
      "An item can be icon-only with an accessible name. The caller places it, so the source composition is reproduced exactly.",
    mode: "item-mode",
  },
  {
    key: "B",
    title: "Automatic narrow composition",
    summary:
      "Below a breakpoint the control collapses the trailing segments into the chevron segment. The control must own the popup or the scroll.",
    mode: "automatic",
  },
  {
    key: "C",
    title: "Keep truncation",
    summary:
      "The library keeps every label announced and truncates it. Size=Minimum stays illustrative and unimplemented.",
    mode: "truncation",
  },
]

const items = [
  { value: "attivi", label: "Attivi" },
  { value: "archiviati", label: "Archiviati" },
  { value: "tutti", label: "Tutti" },
]

function CompactPill() {
  return (
    <div className="inline-flex min-h-16 w-fit max-w-full items-center gap-2 rounded-full border bg-muted p-2">
      <span className="inline-flex min-h-12 items-center truncate rounded-full bg-primary px-6 text-label-sb text-primary-foreground">
        Attivi
      </span>
      <span className="inline-flex size-12 shrink-0 items-center justify-center rounded-full text-foreground">
        <ChevronDown aria-hidden="true" className="size-6" />
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
      <div className="grid max-w-3xl gap-8">
        <div className="grid gap-3 rounded-xl border bg-background p-6">
          <span className="text-label-mini-sb text-muted-foreground">
            {option.mode === "automatic" ? "320 px — automatic compact" : "Size=Default"}
          </span>
          <div className={option.mode === "automatic" ? "w-80 max-w-full" : undefined}>
            <SegmentedControl
              items={items}
              value="attivi"
              onValueChange={() => undefined}
              aria-label="Filtro stato"
            />
          </div>
        </div>
        {option.mode === "item-mode" ? (
          <div className="grid gap-3 rounded-xl border bg-background p-6">
            <span className="text-label-mini-sb text-muted-foreground">
              Size=Minimum — icon-only item
            </span>
            <CompactPill />
          </div>
        ) : null}
        {option.mode === "automatic" ? (
          <div className="grid gap-3 rounded-xl border bg-background p-6">
            <span className="text-label-mini-sb text-muted-foreground">
              Size=Minimum — collapsed by the control
            </span>
            <CompactPill />
          </div>
        ) : null}
        {option.mode === "truncation" ? (
          <div className="grid gap-3 rounded-xl border bg-background p-6">
            <span className="text-label-mini-sb text-muted-foreground">
              320 px — labels truncated
            </span>
            <div className="w-80 max-w-full overflow-hidden">
              <SegmentedControl
                items={items}
                value="attivi"
                onValueChange={() => undefined}
                aria-label="Filtro stato"
              />
            </div>
          </div>
        ) : null}
      </div>
    </div>
  )
}

const meta = {
  title: "Reviews/Segmented control minimum size",
  tags: ["!dev", "!test", "!autodocs", "no-visual"],
  parameters: {
    layout: "fullscreen",
    options: { showPanel: false },
  },
} satisfies Meta

export default meta
type Story = StoryObj<typeof meta>

export const OptionA: Story = {
  name: "A — Compact item mode",
  render: () => <OptionView option={options[0]} />,
}

export const OptionB: Story = {
  name: "B — Automatic narrow",
  render: () => <OptionView option={options[1]} />,
}

export const OptionC: Story = {
  name: "C — Keep truncation",
  render: () => <OptionView option={options[2]} />,
}
