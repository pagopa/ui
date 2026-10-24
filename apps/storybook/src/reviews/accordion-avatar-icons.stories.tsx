import type { Meta, StoryObj } from "@storybook/react-vite"

import { Avatar } from "@/components/content/avatar"
import { PagoPAIcon } from "@/components/icons/PagoPAIcon"
import { ChevronUpIcon } from "@/components/primitives/icons"

// One story per option. Review stories live only on the long-lived review pull
// request (`feedback/previews`) and never merge. The header is a composition:
// the live Accordion takes an icon, a chip and a description, not an avatar.

type HeaderKind = "grey-icon" | "avatar" | "colour-icon"

interface Option {
  key: string
  title: string
  summary: string
  kind: HeaderKind
}

const options: Option[] = [
  {
    key: "A",
    title: "Only the grey decorative icon",
    summary:
      "The header keeps one 24 px grey glyph. A product that needs an identity places its own content elsewhere.",
    kind: "grey-icon",
  },
  {
    key: "B",
    title: "An optional avatar slot",
    summary:
      "A 40 px avatar takes the icon position. The title and the chevron keep their place, and the icon stays the fallback.",
    kind: "avatar",
  },
  {
    key: "C",
    title: "A coloured icon, no avatar",
    summary:
      "The icon slot accepts a status colour. The size stays 24 px, so the header rhythm does not change.",
    kind: "colour-icon",
  },
]

function Header({ kind }: { kind: HeaderKind }) {
  return (
    <div className="flex min-h-12 w-full items-start gap-3 rounded-lg border bg-background px-6 py-6">
      {kind === "avatar" ? (
        <Avatar alt="Maria Rossi" initials="MR" size="medium" className="size-10" />
      ) : (
        <span
          aria-hidden="true"
          className={
            kind === "colour-icon"
              ? "flex size-6 shrink-0 items-center justify-center text-destructive [&>svg]:size-6"
              : "flex size-6 shrink-0 items-center justify-center text-choice-icon [&>svg]:size-6"
          }
        >
          <PagoPAIcon name="photo" />
        </span>
      )}
      <span className="min-w-0 flex-1 text-body-sb text-foreground">
        Documenti del nucleo familiare
      </span>
      <ChevronUpIcon aria-hidden="true" className="size-6 shrink-0 text-choice-icon" />
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
      <div className="grid max-w-2xl gap-3">
        <Header kind={option.kind} />
        <div className="rounded-lg border bg-background px-6 py-6">
          <div className="flex items-start gap-3">
            <span className="min-w-0 flex-1 text-body-sb text-foreground">
              Come richiedere un rimborso
            </span>
            <ChevronUpIcon aria-hidden="true" className="size-6 shrink-0 text-choice-icon" />
          </div>
          <p className="text-body mt-4 text-muted-foreground">
            Apri la ricevuta, scegli «Richiedi rimborso» e indica l’IBAN.
          </p>
        </div>
      </div>
    </div>
  )
}

const meta = {
  title: "Reviews/Accordion avatar icons",
  tags: ["!dev", "!test", "!autodocs"],
  parameters: {
    layout: "fullscreen",
    options: { showPanel: false },
  },
} satisfies Meta

export default meta
type Story = StoryObj<typeof meta>

export const OptionA: Story = {
  name: "A — Grey icon only",
  render: () => <OptionView option={options[0]} />,
}

export const OptionB: Story = {
  name: "B — Avatar slot",
  render: () => <OptionView option={options[1]} />,
}

export const OptionC: Story = {
  name: "C — Coloured icon",
  render: () => <OptionView option={options[2]} />,
}
