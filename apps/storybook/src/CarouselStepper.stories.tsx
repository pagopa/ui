import * as React from "react"
import type { Meta, StoryObj } from "@storybook/react-vite"
import { expect, fn, userEvent, within } from "storybook/test"

import { figmaEmbedUrl } from "@/catalog/figma/file"
import { CarouselStepper } from "@/components/navigation"

import carouselStepperGuide from "./guides/carousel-stepper.md?raw"

// The source draws 8px dots on a 16px pitch, so the pointer target is the dot
// plus its invisible vertical ::after expansion (the source row stays 8px).
function hitTargetHeight(control: HTMLElement) {
  const target = getComputedStyle(control, "::after")
  return (
    control.getBoundingClientRect().height -
    Number.parseFloat(target.top) -
    Number.parseFloat(target.bottom)
  )
}

const meta = {
  title: "Components/Navigation/CarouselStepper",
  component: CarouselStepper,
  args: { count: 4, activeIndex: 0, onChange: fn() },
  argTypes: {
    count: { control: { type: "number", min: 1 } },
    activeIndex: { control: { type: "number", min: 0 } },
    label: { control: "text" },
    getControlLabel: { control: false },
  },
  parameters: {
    design: { type: "figma", url: figmaEmbedUrl("10169:11964") },
    docs: {
      description: {
        component: carouselStepperGuide,
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
  name: "Doppio bersaglio e tastiera",
  render: () => <CarouselExample />,
  play: async ({ canvasElement }) => {
    const group = within(canvasElement).getByRole("group", { name: "Seleziona contenuto" })
    const controls = within(group).getAllByRole("button")
    for (let index = 0; index < controls.length; index++) {
      await expect(hitTargetHeight(controls[index])).toBeGreaterThanOrEqual(44)
      if (index > 0)
        await expect(controls[index].getBoundingClientRect().left).toBeGreaterThanOrEqual(
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

export const Fidelity: Story = {
  name: "Pinned source anatomy",
  parameters: {
    design: { type: "figma", url: figmaEmbedUrl("10169:11964") },
  },
  render: () => (
    <div data-fidelity-variant="10169-11964">
      <CarouselStepper count={6} activeIndex={0} onChange={() => {}} />
    </div>
  ),
  play: async ({ canvasElement }) => {
    const group = within(canvasElement).getByRole("group", { name: "Seleziona contenuto" })
    const controls = within(group).getAllByRole("button")

    // 96x8 source row: one 16x4 active dot and five 8x8 outlined dots on an 8px gap.
    await expect(group.getBoundingClientRect().height).toBe(8)
    await expect(controls).toHaveLength(6)
    const first = controls[0].getBoundingClientRect()
    const last = controls[controls.length - 1].getBoundingClientRect()
    await expect(last.right - first.left).toBe(96)
    for (const [index, control] of controls.entries()) {
      const bounds = control.getBoundingClientRect()
      await expect(bounds.height).toBe(index === 0 ? 4 : 8)
      await expect(bounds.width).toBe(index === 0 ? 16 : 8)
      await expect(hitTargetHeight(control)).toBeGreaterThanOrEqual(44)
    }
    await expect(controls[0]).toHaveAttribute("aria-current", "true")
    await expect(controls[0]).toHaveAccessibleName("Contenuto 1 di 6")
    await expect(controls[0].className).toContain("bg-primary")
    await expect(controls[1].className).toContain("border-input")
  },
}

export const ControlLabels: Story = {
  name: "Etichette dei controlli tradotte",
  args: {
    count: 3,
    activeIndex: 1,
    getControlLabel: (index, count) => `Slide ${index + 1}/${count}`,
  },
  play: async ({ canvasElement }) => {
    const group = within(canvasElement).getByRole("group", { name: "Seleziona contenuto" })
    const controls = within(group).getAllByRole("button")
    await expect(controls[0]).toHaveAccessibleName("Slide 1/3")
    await expect(controls[2]).toHaveAccessibleName("Slide 3/3")
    await expect(controls[1]).toHaveAttribute("aria-current", "true")
  },
}
