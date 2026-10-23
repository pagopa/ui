import * as React from "react"
import type { Meta, StoryObj } from "@storybook/react-vite"
import { expect, userEvent, within } from "storybook/test"

import { PagoPAIcon } from "@/components/icons/PagoPAIcon"
import { PinPoint } from "@/components/overlays"
import { figmaEmbedUrl } from "@/catalog/figma/file"

import pinPointGuide from "./guides/pin-point.md?raw"

const meta = {
  title: "Components/Overlays/PinPoint",
  component: PinPoint,
  args: { label: "Sede del Comune", x: 38, y: 54 },
  argTypes: {
    x: { control: { type: "range", min: 0, max: 100, step: 1 } },
    y: { control: { type: "range", min: 0, max: 100, step: 1 } },
    active: { control: "boolean" },
    onPressedChange: { control: false },
  },
  parameters: {
    design: { type: "figma", url: figmaEmbedUrl("920:7219") },
    docs: {
      description: {
        component: `Map pin: native button with \`aria-pressed\` and an accessible target; the caller provides the position.

${pinPointGuide}`,
      },
    },
  },
} satisfies Meta<typeof PinPoint>

export default meta
type Story = StoryObj<typeof meta>

function MapSurface({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative min-h-72 w-[min(32rem,calc(100vw-2rem))] rounded-xl bg-blue-50">
      {children}
    </div>
  )
}

export const Playground: Story = {
  render: (args) => (
    <MapSurface>
      <PinPoint {...args} />
    </MapSurface>
  ),
}

function PinPointToggle() {
  const [active, setActive] = React.useState(false)
  return (
    <MapSurface>
      <PinPoint label="Sede del Comune" x={38} y={54} active={active} onPressedChange={setActive} />
    </MapSurface>
  )
}

export const PinPointSelection: Story = {
  render: () => <PinPointToggle />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const pin = canvas.getByRole("button", { name: "Sede del Comune" })
    await expect(pin).toHaveAttribute("aria-pressed", "false")
    await userEvent.click(pin)
    await expect(pin).toHaveAttribute("aria-pressed", "true")
  },
}

// The source set frames every variant in the same 48x61 box and draws no map
// surface around it: the fixture is that frame alone.
function SourceFrame({ children }: { children: React.ReactNode }) {
  return <div className="relative h-[61px] w-12 bg-white">{children}</div>
}

export const SourceDefault: Story = {
  parameters: { layout: "fullscreen" },
  render: () => (
    <SourceFrame>
      <PinPoint label="Sede del Comune" />
    </SourceFrame>
  ),
}

export const SourceNumbered: Story = {
  parameters: { layout: "fullscreen" },
  render: () => (
    <SourceFrame>
      <PinPoint label="Sportello 5" variant="numbered">
        5
      </PinPoint>
    </SourceFrame>
  ),
}

export const SourcePlaceholder: Story = {
  parameters: { layout: "fullscreen" },
  render: () => (
    <SourceFrame>
      <PinPoint label="Posizione non disponibile" variant="placeholder" />
    </SourceFrame>
  ),
}

export const SourceSelected: Story = {
  parameters: { layout: "fullscreen" },
  render: () => (
    <SourceFrame>
      <PinPoint label="Sede del Comune" active>
        <PagoPAIcon name="storefront" size={28} />
      </PinPoint>
    </SourceFrame>
  ),
}
