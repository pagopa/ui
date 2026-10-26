import type { Meta, StoryObj } from "@storybook/react-vite"

import { ButtonGroup } from "@/components/inputs/actions"
import { Button } from "@/components/primitives/button"

// One story per option, so a designer can open a single spacing rule at the
// real viewport. Review stories live only on the long-lived review pull request
// (`feedback/previews`) and never merge.

interface Option {
  key: string
  title: string
  summary: string
  gap: (orientation: "horizontal" | "vertical", actions: number) => "gap-2" | "gap-6"
}

const options: Option[] = [
  {
    key: "A",
    title: "8 px everywhere",
    summary: "The rule wins: one 8 px gap between actions, vertically and horizontally.",
    gap: () => "gap-2",
  },
  {
    key: "B",
    title: "24 px for more than one",
    summary: "The drawing wins: a single action keeps 8 px, two or more actions take 24 px.",
    gap: (_orientation, actions) => (actions > 1 ? "gap-6" : "gap-2"),
  },
  {
    key: "C",
    title: "8 px inline, 24 px stacked",
    summary:
      "Context wins: actions side by side keep 8 px, stacked actions take 24 px vertically and horizontally.",
    gap: (orientation) => (orientation === "horizontal" ? "gap-2" : "gap-6"),
  },
]

function Stack({ option }: { option: Option }) {
  const inline = option.gap("horizontal", 2)
  const stacked = option.gap("vertical", 2)
  const single = option.gap("vertical", 1)

  return (
    <div className="flex flex-col gap-8 bg-secondary p-6">
      <div>
        <p className="text-label-mini text-foreground mb-3">Two actions side by side</p>
        <ButtonGroup aria-label="Azioni affiancate" className={inline} orientation="horizontal">
          <Button type="button" variant="outline">
            Annulla
          </Button>
          <Button type="button">Conferma</Button>
        </ButtonGroup>
      </div>
      <div>
        <p className="text-label-mini text-foreground mb-3">Two actions stacked</p>
        <ButtonGroup aria-label="Azioni impilate" className={stacked} orientation="vertical">
          <Button type="button" variant="outline">
            Indietro
          </Button>
          <Button type="button">Conferma</Button>
        </ButtonGroup>
      </div>
      <div>
        <p className="text-label-mini text-foreground mb-3">One action</p>
        <ButtonGroup aria-label="Azione singola" className={single} orientation="vertical">
          <Button type="button">Conferma</Button>
        </ButtonGroup>
      </div>
    </div>
  )
}

function OptionView({ option }: { option: Option }) {
  return (
    <div className="min-h-dvh p-8">
      <p className="text-title-sb text-foreground">
        {option.key} — {option.title}
      </p>
      <p className="text-body text-foreground mt-2 mb-8 max-w-3xl">{option.summary}</p>
      <div className="max-w-3xl">
        <Stack option={option} />
      </div>
    </div>
  )
}

const meta = {
  title: "Reviews/Button group spacing",
  tags: ["!dev", "!test", "!autodocs", "no-visual"],
  parameters: {
    layout: "fullscreen",
    options: { showPanel: false },
  },
} satisfies Meta

export default meta
type Story = StoryObj<typeof meta>

export const OptionA: Story = {
  name: "A — 8 px everywhere",
  render: () => <OptionView option={options[0]} />,
}

export const OptionB: Story = {
  name: "B — 24 px for more than one",
  render: () => <OptionView option={options[1]} />,
}

export const OptionC: Story = {
  name: "C — 8 px inline, 24 px stacked",
  render: () => <OptionView option={options[2]} />,
}
