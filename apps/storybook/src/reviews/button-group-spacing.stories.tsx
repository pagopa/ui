import type { Meta, StoryObj } from "@storybook/react-vite"
import type { ReactNode } from "react"

import { ButtonGroup } from "@/components/inputs/actions"
import { Button } from "@/components/primitives/button"

// One review story per open design question. It lives only on the long-lived
// review pull request (`feedback/previews`), never merges, and answers the
// question with a side-by-side comparison instead of prose.

const VIEWPORTS = [320, 1200] as const

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

function Frame({ width, children }: { width: number; children: ReactNode }) {
  return (
    <div className="shrink-0 rounded-2xl border border-dashed border-border p-4" style={{ width }}>
      <p className="text-label-mini text-foreground mb-3">{width} px</p>
      {children}
    </div>
  )
}

function Stack({ option, width }: { option: Option; width: number }) {
  const inline = option.gap("horizontal", 2)
  const stacked = option.gap("vertical", 2)
  const single = option.gap("vertical", 1)

  return (
    <Frame width={width}>
      <div className="flex flex-col gap-8 bg-secondary p-4">
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
    </Frame>
  )
}

const meta = {
  title: "Reviews/Button group spacing",
  tags: ["!dev", "!test", "!autodocs"],
  parameters: {
    layout: "fullscreen",
    options: { showPanel: false },
  },
} satisfies Meta

export default meta
type Story = StoryObj<typeof meta>

export const Options: Story = {
  render: () => (
    <div className="overflow-x-auto p-8">
      <p className="text-title-sb text-foreground">Button group — 8 px or 24 px between actions?</p>
      <p className="text-body text-foreground mt-2 mb-8">
        The same three action arrangements in every option, rendered at 320 and 1200.
      </p>
      <div className="flex items-start gap-10">
        {options.map((option) => (
          <div key={option.key} className="shrink-0">
            <p className="text-body-sb text-foreground">
              {option.key} — {option.title}
            </p>
            <p className="text-label-mini text-foreground mt-1 mb-4">{option.summary}</p>
            <div className="flex flex-col gap-6">
              {VIEWPORTS.map((width) => (
                <Stack key={width} option={option} width={width} />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  ),
}
