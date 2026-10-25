import type { Meta, StoryObj } from "@storybook/react-vite"

import { Overlay } from "@/components/overlays/overlay"
import { figmaEmbedUrl } from "@/catalog/figma/file"

import overlayGuide from "./guides/overlay.md?raw"

const meta = {
  title: "Components/Overlays/Overlay",
  component: Overlay,
  args: { visible: true },
  argTypes: {
    visible: { control: "boolean" },
    label: { control: "text" },
    showSpinner: { control: "boolean" },
  },
  parameters: {
    design: { type: "figma", url: figmaEmbedUrl("67:3964") },
    docs: {
      description: {
        component: `Contextual blocking veil. It announces the wait with a status region and does not capture focus. The default spinner is a runtime extension; Fidelity turns it off to show the source veil with no content.

${overlayGuide}`,
      },
    },
  },
} satisfies Meta<typeof Overlay>

export default meta
type Story = StoryObj<typeof meta>

export const Playground: Story = {
  render: (args) => (
    <div className="relative min-h-64 w-[min(32rem,calc(100vw-2rem))] rounded-xl border bg-muted">
      <div className="p-6 text-muted-foreground">Contenuto che resta visibile sotto il velo.</div>
      <Overlay {...args} />
    </div>
  ),
}

export const Hidden: Story = {
  args: { visible: false },
}

export const Fidelity: Story = {
  args: { visible: true, showSpinner: false },
  parameters: { layout: "fullscreen" },
  render: (args) => (
    <div id="overlay-fidelity" className="relative h-[568px] w-[320px] bg-white">
      <Overlay {...args} />
    </div>
  ),
}
