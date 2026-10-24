import type { Meta, StoryObj } from "@storybook/react-vite"
import { expect, fn, userEvent, within } from "storybook/test"

import { Chip } from "@/components/inputs/chips"

const chipSourceVariants = [
  {
    variant: "default",
    label: "Default",
    solidBackground: "rgb(231, 236, 252)",
    solidForeground: "rgb(3, 19, 68)",
    outlineForeground: "rgb(9, 50, 182)",
  },
  {
    variant: "error",
    label: "Error",
    solidBackground: "rgb(255, 217, 217)",
    solidForeground: "rgb(93, 19, 19)",
    outlineForeground: "rgb(209, 51, 51)",
  },
  {
    variant: "highlight",
    label: "Highlight",
    solidBackground: "rgb(219, 249, 250)",
    solidForeground: "rgb(0, 59, 61)",
    outlineForeground: "rgb(0, 59, 61)",
  },
  {
    variant: "informative",
    label: "Info",
    solidBackground: "rgb(225, 245, 254)",
    solidForeground: "rgb(33, 92, 118)",
    outlineForeground: "rgb(33, 92, 118)",
  },
  {
    variant: "neutral",
    label: "Neutral",
    solidBackground: "rgb(232, 235, 241)",
    solidForeground: "rgb(14, 15, 19)",
    outlineForeground: "rgb(14, 15, 19)",
  },
  {
    variant: "success",
    label: "Success",
    solidBackground: "rgb(225, 244, 225)",
    solidForeground: "rgb(34, 64, 33)",
    outlineForeground: "rgb(34, 64, 33)",
  },
  {
    variant: "warning",
    label: "Warning",
    solidBackground: "rgb(255, 245, 218)",
    solidForeground: "rgb(97, 76, 21)",
    outlineForeground: "rgb(97, 76, 21)",
  },
] as const

const removeChip = fn()
const submitChipForm = fn()
import { figmaEmbedUrl } from "@/catalog/figma/file"

import chipsGuide from "./guides/chips.md?raw"

const meta = {
  title: "Components/Inputs/Chip",
  component: Chip,
  // The source chip is the 24px compact box (197:1986, pad 3/8, 12/18 label);
  // the larger `default` size is a library extension, so the primary preview
  // carries the source state.
  args: { children: "Roma", size: "compact" },
  argTypes: {
    variant: {
      control: "select",
      options: [
        "default",
        "error",
        "highlight",
        "informative",
        "neutral",
        "primary",
        "success",
        "warning",
      ],
    },
    appearance: { control: "select", options: ["solid", "outline"] },
    size: { control: "select", options: ["default", "compact"] },
    onRemove: { control: false },
    removeLabel: { control: "text" },
  },
  parameters: {
    design: { type: "figma", url: figmaEmbedUrl("197:1985") },
    docs: {
      description: {
        component: `Status or filter label. The compact size is static; with \`onRemove\` the chip keeps an accessible action and does not submit the form.

${chipsGuide}`,
      },
    },
  },
} satisfies Meta<typeof Chip>

export default meta
type Story = StoryObj<typeof meta>

export const Playground: Story = {}

export const ChipSourceVariantMatrix: Story = {
  tags: ["color-pinned"],
  render: () => (
    <div className="grid gap-2">
      {chipSourceVariants.map(({ variant, label }) => (
        <div key={variant} className="flex flex-wrap items-center gap-3">
          <Chip data-testid={`chip-${variant}-solid`} size="compact" variant={variant}>
            {label}
          </Chip>
          <Chip
            data-testid={`chip-${variant}-outline`}
            size="compact"
            variant={variant}
            appearance="outline"
          >
            {label}
          </Chip>
        </div>
      ))}
    </div>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    for (const {
      variant,
      label,
      solidBackground,
      solidForeground,
      outlineForeground,
    } of chipSourceVariants) {
      const solid = canvas.getByTestId(`chip-${variant}-solid`)
      const outline = canvas.getByTestId(`chip-${variant}-outline`)
      const solidStyle = window.getComputedStyle(solid)
      const outlineStyle = window.getComputedStyle(outline)

      await expect(solid).toHaveTextContent(label)
      await expect(solid.dataset.variant).toBe(variant)
      await expect(solid.dataset.appearance).toBe("solid")
      await expect(solid.getBoundingClientRect().height).toBe(24)
      await expect(solidStyle.backgroundColor).toBe(solidBackground)
      await expect(solidStyle.color).toBe(solidForeground)
      await expect(solidStyle.borderTopWidth).toBe("0px")

      await expect(outline).toHaveTextContent(label)
      await expect(outline.dataset.variant).toBe(variant)
      await expect(outline.dataset.appearance).toBe("outline")
      await expect(outline.getBoundingClientRect().height).toBe(24)
      await expect(outlineStyle.backgroundColor).toBe("rgba(0, 0, 0, 0)")
      await expect(outlineStyle.color).toBe(outlineForeground)
      await expect(outlineStyle.borderTopColor).toBe(outlineForeground)
      await expect(outlineStyle.borderTopWidth).toBe("1px")
    }
  },
}

export const ChipRemovalAction: Story = {
  beforeEach: () => {
    removeChip.mockClear()
    submitChipForm.mockClear()
  },
  render: () => (
    <form
      aria-label="Rimozione chip"
      onSubmit={(event) => {
        event.preventDefault()
        submitChipForm()
      }}
    >
      <Chip data-testid="removable-chip" size="compact" onRemove={removeChip}>
        Roma
      </Chip>
    </form>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const form = canvas.getByRole("form", { name: "Rimozione chip" })
    const chip = within(form).getByTestId("removable-chip")
    const remove = within(chip).getByRole("button", { name: "Elimina Roma" })

    await expect(chip.dataset.variant).toBe("default")
    await expect(chip.dataset.appearance).toBe("solid")
    // Source-exact compact chip: 24px tall. The remove action keeps its 44px
    // pointer target through the invisible ::after expansion (24 + 2×10),
    // so the chip no longer inflates to host the target.
    await expect(chip.getBoundingClientRect().height).toBe(24)
    const removeBox = remove.getBoundingClientRect()
    const removeExpansion = getComputedStyle(remove, "::after")
    await expect(removeBox.width - 2 * parseFloat(removeExpansion.left)).toBeGreaterThanOrEqual(44)
    await expect(removeBox.height - 2 * parseFloat(removeExpansion.top)).toBeGreaterThanOrEqual(44)
    await expect(
      canvasElement.ownerDocument.elementFromPoint(
        removeBox.left - 8,
        removeBox.top + removeBox.height / 2,
      ),
    ).toBe(remove)

    await userEvent.tab()
    await expect(remove).toHaveFocus()
    await userEvent.keyboard("{Enter}")
    await expect(removeChip).toHaveBeenCalledTimes(1)
    await expect(submitChipForm).not.toHaveBeenCalled()

    await userEvent.keyboard(" ")
    await expect(removeChip).toHaveBeenCalledTimes(2)
    await expect(submitChipForm).not.toHaveBeenCalled()
  },
}
