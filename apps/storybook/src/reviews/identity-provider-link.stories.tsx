import type { Meta, StoryObj } from "@storybook/react-vite"

import { PagoPAIcon } from "@/components/icons/PagoPAIcon"
import { ChevronRightIcon } from "@/components/primitives/icons"

// One story per option. Review stories live only on the long-lived review pull
// request (`feedback/previews`) and never merge. The provider panel is a
// standalone composition of the mock identity selector.

type Placement = "below" | "none" | "header"

interface Option {
  key: string
  title: string
  summary: string
  placement: Placement
}

const options: Option[] = [
  {
    key: "A",
    title: "Keep the link below the list",
    summary:
      "The link «Non hai SPID? Scopri di più» stays next to the choice it explains, below the provider rows.",
    placement: "below",
  },
  {
    key: "B",
    title: "Remove the link",
    summary:
      "The panel ends after the provider list. The page owns the SPID help, so there is one link and no duplicate.",
    placement: "none",
  },
  {
    key: "C",
    title: "Move the link to the panel header",
    summary: "The link stays visible while the list scrolls, but it sits farther from the choice.",
    placement: "header",
  },
]

const providers = [
  { name: "Poste Italiane", initials: "PI", detail: "Attivo" },
  { name: "Aruba", initials: "AR", detail: "Attivo" },
  { name: "TIM", initials: "TI", detail: "Attivo" },
  { name: "InfoCert", initials: "IN", detail: "Attivo" },
]

function HelpLink() {
  return (
    <a
      href="#spid-help"
      className="inline-flex items-center gap-1 rounded-sm text-body-link text-primary underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
    >
      Non hai SPID? Scopri di più
      <PagoPAIcon name="arrow" variant="right" size={16} />
    </a>
  )
}

function Panel({ option }: { option: Option }) {
  return (
    <div className="grid w-90 max-w-full gap-6 rounded-2xl border bg-background p-6">
      <header className="grid gap-2">
        <h2 className="text-title-sm-mobile text-foreground">Scegli il gestore di identità</h2>
        <p className="text-body text-muted-foreground">
          Accedi con SPID selezionando il provider con cui hai attivato la tua identità digitale.
        </p>
        {option.placement === "header" ? <HelpLink /> : null}
      </header>
      <ul className="grid gap-2">
        {providers.map((provider) => (
          <li key={provider.name}>
            <button
              type="button"
              className="flex w-full items-center gap-3 rounded-lg border bg-background p-3 text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
            >
              <span
                aria-hidden="true"
                className="grid size-10 shrink-0 place-items-center rounded-full bg-secondary text-label-mini-sb text-foreground"
              >
                {provider.initials}
              </span>
              <span className="grid min-w-0 flex-1 gap-0.5">
                <span className="truncate text-body-sb text-foreground">{provider.name}</span>
                <span className="text-label-mini text-muted-foreground">{provider.detail}</span>
              </span>
              <ChevronRightIcon aria-hidden="true" className="size-5 shrink-0 text-foreground" />
            </button>
          </li>
        ))}
      </ul>
      {option.placement === "below" ? <HelpLink /> : null}
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
  title: "Reviews/Identity provider link",
  tags: ["!dev", "!test", "!autodocs"],
  parameters: {
    layout: "fullscreen",
    options: { showPanel: false },
  },
} satisfies Meta

export default meta
type Story = StoryObj<typeof meta>

export const OptionA: Story = {
  name: "A — Link below the list",
  render: () => <OptionView option={options[0]} />,
}

export const OptionB: Story = {
  name: "B — No link",
  render: () => <OptionView option={options[1]} />,
}

export const OptionC: Story = {
  name: "C — Link in the header",
  render: () => <OptionView option={options[2]} />,
}
