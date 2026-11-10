import type { Meta, StoryObj } from "@storybook/react-vite"

import { Spinner } from "@/components/feedback"
import { PagoPAIcon } from "@/components/icons/PagoPAIcon"
import { Button } from "@/components/primitives/button"
import { ChevronRightIcon } from "@/components/primitives/icons"

// One story per option. Review stories live only on the long-lived review pull
// request (`feedback/previews`) and never merge. The panel is a standalone
// composition of the mock identity selector.

type Mode = "row" | "panel" | "button"

interface Option {
  key: string
  title: string
  summary: string
  mode: Mode
}

const options: Option[] = [
  {
    key: "A",
    title: "Replace the provider icon in the selected row",
    summary:
      "The row keeps its size and the spinner sits where the provider mark was. The other rows stay stable.",
    mode: "row",
  },
  {
    key: "B",
    title: "Cover the whole panel",
    summary:
      "A loading layer covers the list. It is clear, but it is heavy for one slow provider and it hides the other choices.",
    mode: "panel",
  },
  {
    key: "C",
    title: "No spinner in the list",
    summary:
      "The continue button owns the busy state. The list stays readable, but the selected row gives no feedback.",
    mode: "button",
  },
]

const providers = [
  { name: "Poste Italiane", initials: "PI", selected: true },
  { name: "Aruba", initials: "AR", selected: false },
  { name: "TIM", initials: "TI", selected: false },
]

function Row({ provider, option }: { provider: (typeof providers)[number]; option: Option }) {
  const selected = provider.selected
  const showSpinner = selected && option.mode === "row"
  return (
    <li>
      <div
        className={
          selected
            ? "flex w-full items-center gap-3 rounded-lg border-2 border-primary bg-background p-3 text-left"
            : "flex w-full items-center gap-3 rounded-lg border bg-background p-3 text-left"
        }
      >
        <span
          aria-hidden="true"
          className="grid size-10 shrink-0 place-items-center rounded-full bg-secondary text-label-mini-sb text-foreground"
        >
          {showSpinner ? <Spinner size="sm" /> : provider.initials}
        </span>
        <span className="grid min-w-0 flex-1 gap-0.5">
          <span className="truncate text-body-sb text-foreground">{provider.name}</span>
          <span className="text-label-mini text-muted-foreground">
            {selected && option.mode === "row" ? "Connessione in corso" : "Attivo"}
          </span>
        </span>
        {selected ? (
          <PagoPAIcon name="check_circle" size={24} className="shrink-0 text-primary" />
        ) : (
          <ChevronRightIcon aria-hidden="true" className="size-5 shrink-0 text-foreground" />
        )}
      </div>
    </li>
  )
}

function Panel({ option }: { option: Option }) {
  return (
    <div className="relative grid w-90 max-w-full gap-6 rounded-2xl border bg-background p-6">
      <header className="grid gap-2">
        <h2 className="text-title-sm-mobile text-foreground">Scegli il gestore di identità</h2>
        <p className="text-body text-muted-foreground">
          Accedi con SPID selezionando il provider con cui hai attivato la tua identità digitale.
        </p>
      </header>
      <ul className="grid gap-2">
        {providers.map((provider) => (
          <Row key={provider.name} provider={provider} option={option} />
        ))}
      </ul>
      <Button type="button" disabled={option.mode === "button"}>
        {option.mode === "button" ? <Spinner size="sm" variant="contrast" /> : null}
        Continua
      </Button>
      {option.mode === "panel" ? (
        <div
          role="status"
          className="absolute inset-0 grid place-items-center rounded-2xl bg-background/80"
        >
          <Spinner size="lg" label="Connessione al gestore di identità in corso" />
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
  title: "Reviews/Identity provider spinner",
  tags: ["!dev", "!test", "!autodocs", "no-visual"],
  parameters: {
    layout: "fullscreen",
    options: { showPanel: false },
  },
} satisfies Meta

export default meta
type Story = StoryObj<typeof meta>

export const OptionA: Story = {
  name: "A — Spinner in the row",
  render: () => <OptionView option={options[0]} />,
}

export const OptionB: Story = {
  name: "B — Panel loading layer",
  render: () => <OptionView option={options[1]} />,
}

export const OptionC: Story = {
  name: "C — Button busy state",
  render: () => <OptionView option={options[2]} />,
}
