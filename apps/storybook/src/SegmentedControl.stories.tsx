import * as React from "react"
import type { Meta, StoryObj } from "@storybook/react-vite"
import { expect, userEvent, within } from "storybook/test"

import { SegmentedControl } from "@/components/inputs"
import { figmaEmbedUrl } from "@/catalog/figma/file"

import segmentedControlsGuide from "./guides/segmented-controls.md?raw"

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
    design: { type: "figma", url: figmaEmbedUrl("1293:8394") },
    docs: {
      description: {
        component: segmentedControlsGuide,
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
    for (const control of canvas.getAllByRole("button")) {
      const label = document.createRange()
      label.selectNodeContents(control)
      await expect(label.getClientRects()).toHaveLength(1)
    }
    await expect(active).toHaveAttribute("aria-pressed", "true")
    await userEvent.click(canvas.getByRole("button", { name: "Archiviati" }))
    await expect(canvas.getByRole("button", { name: "Archiviati" })).toHaveAttribute(
      "aria-pressed",
      "true",
    )
    await expect(active).toHaveAttribute("aria-pressed", "false")
  },
}

export const LongLabels: Story = {
  parameters: { layout: "fullscreen" },
  render: (args) => (
    <div className="flex min-h-screen items-center justify-center">
      <div className="min-w-0" style={{ width: 320, maxWidth: "100%" }}>
        <ControlledSegmentedControl {...args} />
      </div>
    </div>
  ),
  args: {
    items: [
      { value: "active", label: "Comunicazioni che richiedono ancora una risposta" },
      { value: "archived", label: "Previously archived communications and completed requests" },
      { value: "all", label: "ComunicazioniSenzaSpaziCheRichiedonoUnaRisposta" },
      { value: "pending", label: "In attesa" },
      { value: "closed", label: "Concluse" },
    ],
    value: "active",
    "aria-label": "Scegli le comunicazioni da mostrare",
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const group = canvas.getByRole("group", { name: "Scegli le comunicazioni da mostrare" })
    await expect(getComputedStyle(group).borderTopLeftRadius).toBe("32px")
    const html = document.documentElement
    const fontSize = html.style.getPropertyValue("font-size")
    const priority = html.style.getPropertyPriority("font-size")
    const style = document.createElement("style")
    style.textContent =
      "*{line-height:1.5!important;letter-spacing:0.12em!important;word-spacing:0.16em!important}"
    try {
      html.style.setProperty("font-size", "32px")
      document.head.append(style)
      await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)))
      const controls = canvas.getAllByRole("button")
      const bounds = group.getBoundingClientRect()
      const container = group.parentElement
      if (!container) throw new Error("Expected the narrow story container")
      await expect(bounds.left).toBeGreaterThanOrEqual(-1)
      await expect(bounds.right).toBeLessThanOrEqual(container.getBoundingClientRect().right + 1)
      await expect(bounds.right).toBeLessThanOrEqual(document.documentElement.clientWidth + 1)
      await expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(
        document.documentElement.clientWidth + 1,
      )
      await expect(group.scrollWidth).toBeLessThanOrEqual(group.clientWidth + 1)
      for (const control of controls) {
        const range = document.createRange()
        range.selectNodeContents(control)
        const text = range.getBoundingClientRect()
        const box = control.getBoundingClientRect()
        await expect(box.left).toBeGreaterThanOrEqual(bounds.left - 1)
        await expect(box.right).toBeLessThanOrEqual(bounds.right + 1)
        await expect(text.left).toBeGreaterThanOrEqual(box.left - 1)
        await expect(text.right).toBeLessThanOrEqual(box.right + 1)
        await expect(control.scrollHeight).toBeLessThanOrEqual(control.clientHeight + 1)
        await expect(getComputedStyle(control).textOverflow).not.toBe("ellipsis")
      }
      await userEvent.click(
        canvas.getByRole("button", {
          name: "Previously archived communications and completed requests",
        }),
      )
      await expect(controls[1]).toHaveAttribute("aria-pressed", "true")
      await expect(controls[0]).toHaveAttribute("aria-pressed", "false")
    } finally {
      html.style.setProperty("font-size", fontSize, priority)
      style.remove()
    }
  },
}

const sourceItems = [
  { value: "one", label: "Label button" },
  { value: "two", label: "Label button" },
  { value: "three", label: "Label button" },
  { value: "four", label: "Label button" },
  { value: "five", label: "Label button" },
]

export const SourceFrame: Story = {
  // Reflow exemption: fixture pinned at the source width, not a product surface.
  parameters: { a11yContract: { reflow: false } },
  tags: ["color-pinned"],
  args: { items: sourceItems, value: "one", "aria-label": "Filtro" },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const group = canvas.getByRole("group", { name: "Filtro" })
    const width = group.style.width
    const maxWidth = group.style.maxWidth
    try {
      group.style.width = "748px"
      group.style.maxWidth = "none"
      const controls = canvas.getAllByRole("button")
      const row = controls[0].getBoundingClientRect().top
      for (const control of controls) {
        await expect(Math.abs(control.getBoundingClientRect().top - row)).toBeLessThan(1)
      }
    } finally {
      group.style.width = width
      group.style.maxWidth = maxWidth
    }
  },
}
