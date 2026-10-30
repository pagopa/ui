import type { Meta, StoryObj } from "@storybook/react-vite"

import { Button } from "@/components/primitives/button"
import { ChevronRightIcon } from "@/components/primitives/icons"

// One story per option. Review stories live only on the long-lived review pull
// request (`feedback/previews`) and never merge. The skeleton is a standalone
// composition of the table list.

type Mode = "none" | "list" | "item"

interface Option {
  key: string
  title: string
  summary: string
  mode: Mode
}

const options: Option[] = [
  {
    key: "A",
    title: "No skeleton in the design system",
    summary:
      "A product composes Skeleton inside its own row. No new API and no source variant, but every product repeats the composition.",
    mode: "none",
  },
  {
    key: "B",
    title: "TableList owns the skeleton",
    summary:
      "The list renders three placeholder rows. Each row keeps the label and value columns and a 48 px action placeholder.",
    mode: "list",
  },
  {
    key: "C",
    title: "Only the item owns the skeleton",
    summary:
      "The product renders as many placeholder rows as it needs. The API is smaller, but every product repeats the count.",
    mode: "item",
  },
]

function SkeletonRow({ action = true }: { action?: boolean }) {
  return (
    <li className="rounded-lg border bg-background p-6" aria-hidden="true">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:gap-8">
        <div className="flex min-w-0 flex-1 flex-col gap-3">
          <span className="h-3 w-24 animate-pulse rounded-full bg-secondary" />
          <span className="h-4 w-56 max-w-full animate-pulse rounded-full bg-secondary" />
        </div>
        <div className="flex min-w-0 flex-1 flex-col gap-3">
          <span className="h-3 w-20 animate-pulse rounded-full bg-secondary" />
          <span className="h-4 w-40 max-w-full animate-pulse rounded-full bg-secondary" />
        </div>
        {action ? <span className="h-12 w-24 animate-pulse rounded-lg bg-secondary" /> : null}
      </div>
    </li>
  )
}

function LoadedRow({ inline }: { inline?: boolean }) {
  return (
    <li className="rounded-lg border bg-background p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:gap-8">
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <span className="text-body-small text-muted-foreground">Oggetto</span>
          {inline ? (
            <span className="h-4 w-52 max-w-full animate-pulse rounded-full bg-secondary" />
          ) : (
            <span className="text-body-sb text-foreground">Accertamento TARI 2025</span>
          )}
        </div>
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <span className="text-body-small text-muted-foreground">Scadenza</span>
          <span className="text-body-sb text-foreground">12/04/2026</span>
        </div>
        <Button type="button" variant="ghost" className="self-end px-0 sm:self-auto">
          Apri
          <ChevronRightIcon aria-hidden="true" />
        </Button>
      </div>
    </li>
  )
}

function List({ option }: { option: Option }) {
  return (
    <section aria-label="Elenco pagamenti" className="grid w-full max-w-3xl gap-4">
      <ul className="grid gap-4">
        <LoadedRow inline={option.mode === "none"} />
        {option.mode === "list" ? (
          <>
            <SkeletonRow />
            <SkeletonRow />
            <SkeletonRow />
          </>
        ) : null}
        {option.mode === "item" ? (
          <>
            <SkeletonRow />
            <SkeletonRow />
          </>
        ) : null}
      </ul>
      <div className="flex items-center justify-between">
        <span className="text-label-mini text-muted-foreground">1–10 di 24</span>
        <span className="flex gap-2">
          <Button type="button" variant="ghost" size="icon" disabled aria-label="Pagina precedente">
            ‹
          </Button>
          <Button type="button" variant="ghost" size="icon" aria-label="Pagina successiva">
            ›
          </Button>
        </span>
      </div>
    </section>
  )
}

function OptionView({ option }: { option: Option }) {
  return (
    <div className="min-h-dvh bg-secondary p-8">
      <p className="text-body-big-sb text-foreground">
        {option.key} — {option.title}
      </p>
      <p className="text-body mt-2 mb-8 max-w-3xl text-foreground">{option.summary}</p>
      <List option={option} />
    </div>
  )
}

const meta = {
  title: "Reviews/Table list skeleton",
  tags: ["!dev", "!test", "!autodocs", "no-visual"],
  parameters: {
    layout: "fullscreen",
    options: { showPanel: false },
  },
} satisfies Meta

export default meta
type Story = StoryObj<typeof meta>

export const OptionA: Story = {
  name: "A — No skeleton",
  render: () => <OptionView option={options[0]} />,
}

export const OptionB: Story = {
  name: "B — List skeleton",
  render: () => <OptionView option={options[1]} />,
}

export const OptionC: Story = {
  name: "C — Item skeleton",
  render: () => <OptionView option={options[2]} />,
}
