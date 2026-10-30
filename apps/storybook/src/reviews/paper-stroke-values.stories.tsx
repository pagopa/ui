import type { Meta, StoryObj } from "@storybook/react-vite"

// One story per option. Review stories live only on the long-lived review pull
// request (`feedback/previews`) and never merge. The papers are static
// compositions of the source element.

type Mode = "stroke-1" | "stroke-16"

interface Option {
  key: string
  title: string
  summary: string
  mode: Mode
}

const options: Option[] = [
  {
    key: "A",
    title: "Stroke 0 and 1 px",
    summary:
      "The card follows the drawing. The stroke stays a 1 px line, and the rule card is corrected to name it.",
    mode: "stroke-1",
  },
  {
    key: "B",
    title: "Stroke 0 and 16 px",
    summary:
      "The card follows the written rule. A 16 px inset stroke takes the place of the padding, and the drawing changes.",
    mode: "stroke-16",
  },
]

function Paper({ stroke }: { stroke: number }) {
  return (
    <div
      className="w-72 max-w-full rounded-2xl bg-background"
      style={stroke > 0 ? { border: `${stroke}px solid var(--color-primary)` } : undefined}
    >
      <div className="grid gap-2 p-6">
        <span className="text-body-sb text-foreground">Titolo della carta</span>
        <span className="text-body text-muted-foreground">
          Il contenuto resta dentro la carta, con lo stesso respiro del disegno.
        </span>
      </div>
    </div>
  )
}

function OptionView({ option }: { option: Option }) {
  const stroke = option.mode === "stroke-16" ? 16 : 1
  return (
    <div className="min-h-dvh bg-secondary p-8">
      <p className="text-body-big-sb text-foreground">
        {option.key} — {option.title}
      </p>
      <p className="text-body mt-2 mb-8 max-w-3xl text-foreground">{option.summary}</p>
      <div className="flex flex-wrap items-start gap-8">
        <div className="grid gap-3">
          <span className="text-label-mini-sb text-muted-foreground">Stroke 0</span>
          <Paper stroke={0} />
        </div>
        <div className="grid gap-3">
          <span className="text-label-mini-sb text-muted-foreground">Stroke {stroke} px</span>
          <Paper stroke={stroke} />
        </div>
        <div className="grid gap-3">
          <span className="text-label-mini-sb text-muted-foreground">Padding 16 px</span>
          <div className="w-72 max-w-full rounded-2xl bg-background p-4">
            <span className="text-label-mini text-muted-foreground">
              La distanza tra bordo e contenuto è 16 px. Con uno stroke di 16 px il bordo occupa
              tutta la distanza.
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}

const meta = {
  title: "Reviews/Paper stroke values",
  tags: ["!dev", "!test", "!autodocs", "no-visual"],
  parameters: {
    layout: "fullscreen",
    options: { showPanel: false },
  },
} satisfies Meta

export default meta
type Story = StoryObj<typeof meta>

export const OptionA: Story = {
  name: "A — 1 px stroke",
  render: () => <OptionView option={options[0]} />,
}

export const OptionB: Story = {
  name: "B — 16 px stroke",
  render: () => <OptionView option={options[1]} />,
}
