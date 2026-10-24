import type { Meta, StoryObj } from "@storybook/react-vite"
import { expect, fn, userEvent, within } from "storybook/test"

import { InputChip } from "@/components/inputs/chips"
import { figmaEmbedUrl } from "@/catalog/figma/file"

import chipsGuide from "./guides/chips.md?raw"

const meta = {
  title: "Components/Inputs/InputChip",
  component: InputChip,
  args: { children: "Servizi scolastici" },
  argTypes: {
    children: { control: "text" },
    onRemove: { control: false },
  },
  parameters: {
    design: { type: "figma", url: figmaEmbedUrl("422:16012") },
    docs: {
      description: {
        component: `Neutral chip of the multi-select field with a close control and an adequate hit area; without \`onRemove\` it stays a static label.

${chipsGuide}`,
      },
    },
  },
} satisfies Meta<typeof InputChip>

export default meta
type Story = StoryObj<typeof meta>

export const Playground: Story = {
  render: (args) => (
    <div className="flex flex-wrap gap-3">
      <InputChip {...args} />
      <InputChip>Commercio</InputChip>
    </div>
  ),
}

// The set `422:16012` publishes one variant, `422:16019`
// (`Type=Neutral, Style=Solid`), a 93x24 pill. The source tab is a last element
// of the sample, so the fixture renders the chip with its live remove control.
export const NeutralSolid: Story = {
  args: {
    children: "Input chip",
    onRemove: fn(),
  },
  render: (args) => (
    <div data-fidelity-variant="422-16019" className="w-[93px]">
      <InputChip {...args} />
    </div>
  ),
}

export const Removable: Story = {
  // Reflow exemption pending a design request: docs/design-requests/2026-10-16-a11y-reflow-conditions.md.
  parameters: { a11yContract: { reflow: false } },
  args: { onRemove: fn() },
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement)
    const remove = canvas.getByRole("button", { name: "Elimina Servizi scolastici" })
    const hitTarget = window.getComputedStyle(remove, "::after")
    await expect(hitTarget.width).toBe("44px")
    await expect(hitTarget.height).toBe("44px")
    remove.focus()
    await expect(remove).toHaveAttribute("type", "button")
    await expect(remove).toHaveFocus()
    await userEvent.click(remove)
    await expect(args.onRemove).toHaveBeenCalledTimes(1)
  },
}
