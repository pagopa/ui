import * as React from "react"
import type { Meta, StoryObj } from "@storybook/react-vite"
import { expect, userEvent, within } from "storybook/test"

import { PinPoint } from "@/components/overlays"

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
    docs: {
      description: {
        component:
          "Map pin: native button with `aria-pressed` and an accessible target; the caller provides the position.",
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
