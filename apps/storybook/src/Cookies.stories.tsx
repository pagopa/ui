import * as React from "react"
import type { Meta, StoryObj } from "@storybook/react-vite"
import { expect, userEvent, within } from "storybook/test"

import { figmaEmbedUrl } from "@/catalog/figma/file"
import { Cookies } from "@/components/navigation"

const meta = {
  title: "Components/Navigation/Cookies",
  component: Cookies,
  args: {
    onAccept: () => undefined,
    onReject: () => undefined,
    onLearnMore: () => undefined,
    children:
      "Questo sito utilizza cookies tecnici e, con il tuo consenso, cookies facoltativi per migliorare il servizio.",
  },
  argTypes: {
    onAccept: { control: false },
    onReject: { control: false },
    onLearnMore: { control: false },
    onDismiss: { control: false },
    children: { control: "text" },
  },
  decorators: [
    // The banner is `fixed`: the preview needs a page for it to float over and
    // the story root needs a box (a fixed-only body leaves it zero tall, which
    // the capture preflight reads as missing).
    (Story) => (
      <div className="min-h-dvh bg-muted/40">
        <Story />
      </div>
    ),
  ],
  parameters: {
    // `fullscreen` keeps the preview body a block so the capture can force the
    // story root width (the centered layout makes the root a shrinkable flex
    // item).
    layout: "fullscreen",
    design: { type: "figma", url: figmaEmbedUrl("1360:23904") },
    docs: {
      description: {
        component:
          "Cookie preferences bar on a white surface: the text action “Scopri di più”, “Rifiuta tutti” and “Accetta tutti”, and an optional close; no implicit action. Up to the desktop breakpoint the source stacks (`Device=Mobile` `1360:12856` and `Device=Tablet` `1360:12844`): the close stays next to the text and the action block wraps below the copy — on mobile the two filled actions take the full width while the text action stays centred; from `lg` the source single row `Device=Desktop` (`1360:23903`) brings the close into the action group.",
      },
    },
  },
} satisfies Meta<typeof Cookies>

export default meta
type Story = StoryObj<typeof meta>

export const Playground: Story = {}

function AcceptFlow() {
  const [visible, setVisible] = React.useState(true)
  if (!visible) return <output>Preferenze confermate</output>
  return (
    <Cookies
      onAccept={() => setVisible(false)}
      onReject={() => setVisible(false)}
      onLearnMore={() => undefined}
    >
      Usiamo cookie tecnici e, con il tuo consenso, cookie facoltativi per migliorare il servizio.
    </Cookies>
  )
}

export const AcceptFlowStory: Story = {
  name: "Accetta tutti chiude il banner",
  render: () => <AcceptFlow />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await userEvent.click(canvas.getByRole("button", { name: "Accetta tutti" }))
    await expect(canvas.queryByRole("button", { name: "Accetta tutti" })).not.toBeInTheDocument()
    await expect(canvas.getByText("Preferenze confermate")).toBeVisible()
  },
}

export const WithClose: Story = {
  args: { onDismiss: () => undefined },
}
