import * as React from "react"
import type { Meta, StoryObj } from "@storybook/react-vite"
import { expect, fn, userEvent, within } from "storybook/test"

import { CarouselStepper } from "@/components/navigation"

const meta = {
  title: "Components/Navigation/CarouselStepper",
  component: CarouselStepper,
  args: { count: 4, activeIndex: 0, onChange: fn() },
  argTypes: {
    count: { control: { type: "number", min: 1 } },
    activeIndex: { control: { type: "number", min: 0 } },
    label: { control: "text" },
  },
  parameters: {
    docs: {
      description: {
        component:
          "Carousel position indicator with roving tabindex: arrows, Home and End move focus and selection; every control is a native button with a spoken name.",
      },
    },
  },
} satisfies Meta<typeof CarouselStepper>

export default meta
type Story = StoryObj<typeof meta>

export const Playground: Story = {}

function CarouselExample() {
  const [activeIndex, setActiveIndex] = React.useState(0)
  return <CarouselStepper count={4} activeIndex={activeIndex} onChange={setActiveIndex} />
}

export const CarouselTargets: Story = {
  render: () => <CarouselExample />,
  play: async ({ canvasElement }) => {
    const group = within(canvasElement).getByRole("group", { name: "Seleziona contenuto" })
    const controls = within(group).getAllByRole("button")
    for (let index = 0; index < controls.length; index++) {
      const bounds = controls[index].getBoundingClientRect()
      await expect(bounds.width).toBeGreaterThanOrEqual(44)
      await expect(bounds.height).toBeGreaterThanOrEqual(44)
      if (index > 0)
        await expect(bounds.left).toBeGreaterThanOrEqual(
          controls[index - 1].getBoundingClientRect().right,
        )
    }
    await userEvent.click(controls[0])
    await userEvent.keyboard("{ArrowRight}")
    await expect(controls[1]).toHaveFocus()
    await expect(controls[1]).toHaveAttribute("aria-current", "true")
    await userEvent.keyboard("{End}")
    await expect(controls[3]).toHaveFocus()
    await userEvent.keyboard("{ArrowRight}")
    await expect(controls[0]).toHaveFocus()
  },
}
