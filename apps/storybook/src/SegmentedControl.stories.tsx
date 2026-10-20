import * as React from "react"
import type { Meta, StoryObj } from "@storybook/react-vite"
import { expect, userEvent, within } from "storybook/test"

import { SegmentedControl } from "@/components/inputs"

const options = [
  { value: "attivi", label: "Attivi" },
  { value: "archiviati", label: "Archiviati" },
  { value: "tutti", label: "Tutti" },
]

function ControlledSegmentedControl(props: React.ComponentProps<typeof SegmentedControl>) {
  const [value, setValue] = React.useState(props.value)
  return <SegmentedControl {...props} value={value} onValueChange={setValue} />
}

const meta = {
  title: "Components/Inputs/SegmentedControl",
  component: SegmentedControl,
  render: (args) => <ControlledSegmentedControl {...args} />,
  args: {
    items: options,
    value: "attivi",
    onValueChange: () => undefined,
    "aria-label": "Filtro stato",
  },
  argTypes: {
    items: { control: false },
    onValueChange: { control: false },
  },
  parameters: {
    docs: {
      description: {
        component:
          "Source segmented control: the selected segment carries `aria-pressed`; callers provide the segments and their labels.",
      },
    },
  },
} satisfies Meta<typeof SegmentedControl>

export default meta
type Story = StoryObj<typeof meta>

export const Playground: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const active = canvas.getByRole("button", { name: "Attivi" })
    await expect(active).toHaveAttribute("aria-pressed", "true")
    await userEvent.click(canvas.getByRole("button", { name: "Archiviati" }))
    await expect(canvas.getByRole("button", { name: "Archiviati" })).toHaveAttribute(
      "aria-pressed",
      "true",
    )
    await expect(active).toHaveAttribute("aria-pressed", "false")
  },
}
