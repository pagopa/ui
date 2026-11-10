import type { Meta, StoryObj } from "@storybook/react-vite"

import { Spinner } from "@/components/feedback"

// One story per option. Review stories live only on the long-lived review pull
// request (`feedback/previews`) and never merge. The skeleton is a standalone
// composition of the mock identity selector.

type Mode = "rows" | "block" | "spinner"

interface Option {
  key: string
  title: string
  summary: string
  mode: Mode
}

const options: Option[] = [
  {
    key: "A",
    title: "Three row skeletons",
    summary:
      "Each row keeps the provider icon, the name and the status slot. The panel keeps the height of the list that replaces it.",
    mode: "rows",
  },
  {
    key: "B",
    title: "One block skeleton",
    summary:
      "A single block covers the whole list. It is simpler, but it hides the rhythm of the rows.",
    mode: "block",
  },
  {
    key: "C",
    title: "A spinner only",
    summary:
      "The panel keeps its height while the spinner turns. The rows arrive without a placeholder, so the panel may jump.",
    mode: "spinner",
  },
]

function RowSkeleton() {
  return (
    <li className="flex items-center gap-3 rounded-lg border p-3" aria-hidden="true">
      <span className="size-10 shrink-0 animate-pulse rounded-full bg-secondary" />
      <span className="grid min-w-0 flex-1 gap-2">
        <span className="h-4 w-32 animate-pulse rounded-full bg-secondary" />
        <span className="h-3 w-16 animate-pulse rounded-full bg-secondary" />
      </span>
      <span className="size-5 shrink-0 animate-pulse rounded-sm bg-secondary" />
    </li>
  )
}

function Panel({ option }: { option: Option }) {
  return (
    <div className="grid w-90 max-w-full gap-6 rounded-2xl border bg-background p-6">
      <header className="grid gap-2">
        <h2 className="text-title-sm-mobile text-foreground">Scegli il gestore di identità</h2>
        <p className="text-body text-muted-foreground">
          Caricamento dei gestori di identità disponibili.
        </p>
      </header>
      <div role="status" aria-live="polite" className="sr-only">
        Caricamento in corso
      </div>
      {option.mode === "rows" ? (
        <ul className="grid gap-2">
          <RowSkeleton />
          <RowSkeleton />
          <RowSkeleton />
        </ul>
      ) : null}
      {option.mode === "block" ? (
        <div aria-hidden="true" className="h-52 animate-pulse rounded-lg bg-secondary" />
      ) : null}
      {option.mode === "spinner" ? (
        <div className="grid h-52 place-items-center">
          <Spinner size="md" label="Caricamento dei gestori di identità" />
        </div>
      ) : null}
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
      <Panel option={option} />
    </div>
  )
}

const meta = {
  title: "Reviews/Identity provider skeleton",
  tags: ["!dev", "!test", "!autodocs", "no-visual"],
  parameters: {
    layout: "fullscreen",
    options: { showPanel: false },
  },
} satisfies Meta

export default meta
type Story = StoryObj<typeof meta>

export const OptionA: Story = {
  name: "A — Row skeletons",
  render: () => <OptionView option={options[0]} />,
}

export const OptionB: Story = {
  name: "B — Block skeleton",
  render: () => <OptionView option={options[1]} />,
}

export const OptionC: Story = {
  name: "C — Spinner only",
  render: () => <OptionView option={options[2]} />,
}
