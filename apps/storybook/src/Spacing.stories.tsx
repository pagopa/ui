import type { Meta, StoryObj } from "@storybook/react-vite"
import { expect, within } from "storybook/test"

import { figmaEmbedUrl } from "@/catalog/figma/file"
import { Spacing, type SpacingSize } from "@/components/content"

import spacingGuide from "./guides/spacing.md?raw"

// Source `Dimensione` options (237:1307), smallest first: the ladder order of
// the Spacing page, not a component state.
const steps: SpacingSize[] = [4, 8, 16, 24, 32, 40, 48]

const meta = {
  title: "Components/Content/Spacing",
  component: Spacing,
  args: { size: 4 },
  argTypes: {
    size: { control: "select", options: steps },
  },
  parameters: {
    design: { type: "figma", url: figmaEmbedUrl("237:1307") },
    docs: {
      description: {
        component: `Invisible source spacer: each \`Dimensione\` step paints nothing and takes its own height; it is \`aria-hidden\`, so it exposes no role. The scale is documented on a surface (\`Ladder\` story): bars, guides and labels belong to the narrative, not to the component.

${spacingGuide}`,
      },
    },
  },
} satisfies Meta<typeof Spacing>

export default meta
type Story = StoryObj<typeof meta>

export const Ladder: Story = {
  tags: ["color-pinned"],
  render: () => (
    <div className="bg-secondary p-6">
      <figure className="mx-auto flex w-full max-w-md flex-col gap-3 rounded-lg bg-background p-6">
        <figcaption className="text-label-sb text-foreground">Scala di spaziatura</figcaption>
        {steps.map((step) => (
          <div key={step} className="flex items-center gap-3">
            <span className="w-12 text-right text-label-mini text-muted-foreground">{step}px</span>
            <div className="flex-1">
              <div className="border-t border-dashed border-border-strong" />
              <Spacing size={step} />
              <div className="border-t border-dashed border-border-strong" />
            </div>
          </div>
        ))}
      </figure>
    </div>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await expect(canvas.getByText("Scala di spaziatura")).toBeVisible()
    const spacers = [...canvasElement.querySelectorAll("[data-slot=spacing]")]
    await expect(spacers).toHaveLength(steps.length)
    for (const [index, step] of steps.entries()) {
      const spacer = spacers[index]
      if (!(spacer instanceof HTMLElement)) throw new Error("spacer not rendered")
      const bounds = spacer.getBoundingClientRect()
      await expect(bounds.height).toBeCloseTo(step, 0)
      await expect(bounds.width).toBeGreaterThan(0)
      const style = getComputedStyle(spacer)
      await expect(style.backgroundColor).toBe("rgba(0, 0, 0, 0)")
      await expect(style.backgroundImage).toBe("none")
      await expect(style.borderTopWidth).toBe("0px")
      await expect(style.borderLeftWidth).toBe("0px")
      await expect(style.boxShadow).toBe("none")
      await expect(spacer).toHaveAttribute("aria-hidden", "true")
      await expect(spacer.getAttribute("role")).toBeNull()
    }
  },
}

export const Playground: Story = {
  tags: ["color-pinned"],
  play: async ({ canvasElement }) => {
    const spacer = canvasElement.querySelector("[data-slot=spacing]")
    if (!(spacer instanceof HTMLElement)) throw new Error("spacer not rendered")
    await expect(Math.round(spacer.getBoundingClientRect().height)).toBe(4)
    const style = getComputedStyle(spacer)
    await expect(style.backgroundColor).toBe("rgba(0, 0, 0, 0)")
    await expect(style.backgroundImage).toBe("none")
    await expect(style.borderTopWidth).toBe("0px")
    await expect(spacer).toHaveAttribute("aria-hidden", "true")
    await expect(spacer.getAttribute("role")).toBeNull()
  },
}
