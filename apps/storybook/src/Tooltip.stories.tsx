import type { Meta, StoryObj } from "@storybook/react-vite"
import { expect, screen, userEvent, waitFor, within } from "storybook/test"

import { Tooltip } from "@/components/overlays/tooltip"
import { Button } from "@/components/primitives/button"
import { figmaEmbedUrl } from "@/catalog/figma/file"

const meta = {
  title: "Components/Overlays/Tooltip",
  component: Tooltip,
  args: {
    trigger: <Button variant="outline">Passa il mouse</Button>,
    children: "Dettagli utili",
    side: "bottom",
    showClose: true,
  },
  argTypes: {
    trigger: { control: false },
    side: { control: "select", options: ["top", "right", "bottom", "left"] },
    showClose: { control: "boolean" },
  },
  parameters: {
    design: { type: "figma", url: figmaEmbedUrl("230:1317") },
    docs: {
      description: {
        component:
          'Non-essential hint: it opens on hover and focus and closes with Escape. `side` indicates the trigger side where the content appears: the source `Arrow Direction=Top` maps to `side="bottom"`, while `Arrow Direction=Bottom` maps to `side="top"`. `showClose` keeps the source mark visible; it stays decorative because the tooltip contains no actions and the source declares no interaction.',
      },
    },
  },
} satisfies Meta<typeof Tooltip>

export default meta
type Story = StoryObj<typeof meta>

export const Playground: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const trigger = canvas.getByRole("button", { name: "Passa il mouse" })

    await userEvent.tab()
    await expect(trigger).toHaveFocus()

    const tooltip = await screen.findByRole("tooltip")
    await waitFor(() => expect(tooltip).toBeVisible())
    await expect(tooltip).toHaveTextContent("Dettagli utili")

    await userEvent.keyboard("{Escape}")
    await waitFor(() => expect(screen.queryByRole("tooltip")).not.toBeInTheDocument())
    await expect(trigger).toHaveFocus()
  },
}

export const Sides: Story = {
  render: () => (
    <div className="flex flex-wrap gap-6 p-12">
      {(["top", "right", "bottom", "left"] as const).map((side) => (
        <Tooltip key={side} side={side} trigger={<Button variant="outline">{side}</Button>}>
          Suggerimento su {side}
        </Tooltip>
      ))}
    </div>
  ),
}

const sourceDescription = "Descrizione di approfondimento su più righe più righe più righe"

function SourceTooltip({ side }: { side: "top" | "bottom" }) {
  return (
    <div className="grid min-h-60 place-items-center p-6">
      <Tooltip
        side={side}
        trigger={
          <Button data-testid="tooltip-source-trigger" variant="outline">
            Apri suggerimento
          </Button>
        }
      >
        {sourceDescription}
      </Tooltip>
    </div>
  )
}

export const SourceArrowTop: Story = {
  name: "Source: Arrow Direction=Top",
  render: () => <SourceTooltip side="bottom" />,
}

export const SourceArrowBottom: Story = {
  name: "Source: Arrow Direction=Bottom",
  render: () => <SourceTooltip side="top" />,
}
