import type { Meta, StoryObj } from "@storybook/react-vite"
import { expect, userEvent, within } from "storybook/test"

import { Checkbox } from "@/components/primitives/checkbox"
import { Label } from "@/components/primitives/label"
import { figmaEmbedUrl } from "@/catalog/figma/file"

import checkboxGuide from "./guides/checkbox-choices.md?raw"

const meta = {
  title: "Components/Checkbox",
  component: Checkbox,
  parameters: {
    design: { type: "figma", url: figmaEmbedUrl("194:3654") },
    docs: {
      description: {
        component: `Native choice box (Base UI): the real control is an input whose accessible name comes from the caller through an associated label; form reset follows the native behaviour.\n\n${checkboxGuide}`,
      },
    },
  },
} satisfies Meta<typeof Checkbox>

export default meta
type Story = StoryObj<typeof meta>

export const Playground: Story = {
  args: { defaultChecked: false, disabled: false },
  argTypes: {
    defaultChecked: { control: "boolean" },
  },
  render: ({ defaultChecked, disabled }) => (
    <div className="flex items-center gap-3">
      <Checkbox id="consent" defaultChecked={defaultChecked} disabled={disabled} />
      <Label htmlFor="consent">Accetto i termini del servizio</Label>
    </div>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const checkbox = canvas.getByRole("checkbox", { name: "Accetto i termini del servizio" })
    await userEvent.click(checkbox)
    await expect(checkbox).toBeChecked()
  },
}

export const CheckedByDefault: Story = {
  render: () => (
    <div className="flex items-center gap-3">
      <Checkbox id="prechecked" defaultChecked />
      <Label htmlFor="prechecked">Consenso facoltativo</Label>
    </div>
  ),
}

export const Disabled: Story = {
  render: () => (
    <div className="flex items-center gap-3">
      <Checkbox id="unavailable" disabled />
      <Label htmlFor="unavailable">Opzione non disponibile</Label>
    </div>
  ),
}

export const SourceDefault: Story = {
  render: () => <Checkbox aria-label="Consenso" />,
  play: async ({ canvasElement }) => {
    const checkbox = within(canvasElement).getByRole("checkbox", { name: "Consenso" })
    await expect(checkbox).not.toBeChecked()
    await expect(checkbox.getBoundingClientRect().width).toBe(24)
    const target = getComputedStyle(checkbox, "::after")
    await expect(Number.parseFloat(target.width)).toBe(44)
    await expect(Number.parseFloat(target.height)).toBe(44)
  },
}

export const SourceSelected: Story = {
  render: () => <Checkbox aria-label="Consenso" defaultChecked />,
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).getByRole("checkbox", { name: "Consenso" })).toBeChecked()
  },
}

export const SourceFocused: Story = {
  tags: ["color-pinned"],
  render: () => <Checkbox aria-label="Consenso" />,
  play: async ({ canvasElement }) => {
    const checkbox = within(canvasElement).getByRole("checkbox", { name: "Consenso" })
    await userEvent.tab()
    await expect(checkbox).toHaveFocus()
    // Focus alone is not an error: the red belongs to `aria-invalid` only.
    await expect(getComputedStyle(checkbox).color).not.toBe("rgb(209, 51, 51)")
    const focus = getComputedStyle(checkbox)
    await expect(focus.outlineStyle).toBe("solid")
    await expect(Number.parseFloat(focus.outlineWidth)).toBeGreaterThanOrEqual(2)
    await expect(focus.outlineColor).toBe("rgb(11, 62, 227)")
  },
}

export const Invalid: Story = {
  tags: ["color-pinned"],
  render: () => <Checkbox aria-label="Consenso" aria-invalid="true" />,
  play: async ({ canvasElement }) => {
    const checkbox = within(canvasElement).getByRole("checkbox", { name: "Consenso" })
    await expect(getComputedStyle(checkbox).color).toBe("rgb(209, 51, 51)")
    await userEvent.click(checkbox)
    await expect(checkbox).toBeChecked()
    await expect(getComputedStyle(checkbox).color).toBe("rgb(11, 62, 227)")
  },
}

export const Indeterminate: Story = {
  render: () => <Checkbox aria-label="Alcune righe" indeterminate />,
  play: async ({ canvasElement }) => {
    const checkbox = within(canvasElement).getByRole("checkbox", { name: "Alcune righe" })
    await expect(checkbox).toHaveAttribute("aria-checked", "mixed")
  },
}
