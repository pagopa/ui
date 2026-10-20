import type { Meta, StoryObj } from "@storybook/react-vite"
import { expect, within } from "storybook/test"

import { Spinner } from "@/components/feedback/spinner"
import { figmaEmbedUrl } from "@/catalog/figma/file"

import loadingGuide from "./guides/loading-indicators.md?raw"

const meta = {
  title: "Components/Feedback/Spinner",
  component: Spinner,
  args: { size: "md", variant: "primary" },
  argTypes: {
    size: { control: "select", options: ["sm", "md", "lg"] },
    variant: { control: "select", options: ["primary", "contrast"] },
    label: { control: "text" },
  },
  parameters: {
    design: { type: "figma", url: figmaEmbedUrl("109:2455") },
    docs: {
      description: {
        component: `Loading indicator. With \`label\` it becomes an announced status region; without a label it is decorative. The animation stays active when the user prefers reduced motion, because it communicates a functional wait.

${loadingGuide}`,
      },
    },
  },
} satisfies Meta<typeof Spinner>

export default meta
type Story = StoryObj<typeof meta>

export const Playground: Story = {}

export const Sizes: Story = {
  // Reflow exemption pending a design request: docs/design-requests/2026-10-16-a11y-reflow-conditions.md.
  parameters: { a11yContract: { reflow: false } },
  render: () => (
    <div className="flex items-center gap-8">
      <Spinner size="sm" label="Caricamento piccolo" />
      <Spinner label="Caricamento medio" />
      <Spinner size="lg" label="Caricamento grande" />
    </div>
  ),
}

export const ContrastSurface: Story = {
  render: () => (
    <div className="w-fit rounded-lg bg-primary p-4">
      <Spinner variant="contrast" label="Caricamento su sfondo primario" />
    </div>
  ),
}

export const SpinnerBrandVariants: Story = {
  tags: ["color-pinned"],
  render: () => (
    <div className="grid gap-4">
      <div data-testid="primary-spinner" aria-busy="true">
        <Spinner label="Caricamento principale" />
      </div>
      <div data-testid="contrast-spinner-surface" className="w-fit rounded-lg bg-primary p-4">
        <Spinner variant="contrast" />
      </div>
      <div data-testid="spinner-size-extensions" className="flex items-center gap-4">
        <Spinner size="sm" />
        <Spinner size="lg" />
      </div>
    </div>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const primary = within(canvas.getByTestId("primary-spinner")).getByRole("status")
    const contrast = canvas
      .getByTestId("contrast-spinner-surface")
      .querySelector<HTMLElement>('[data-slot="spinner"]')
    const primaryIndicator = primary.querySelector<HTMLElement>('[data-slot="spinner-indicator"]')
    const contrastIndicator = contrast?.querySelector<HTMLElement>(
      '[data-slot="spinner-indicator"]',
    )

    if (!contrast || !primaryIndicator || !contrastIndicator) {
      throw new Error("Spinner indicator is missing")
    }

    const primaryRing = primaryIndicator.querySelector<HTMLElement>('[data-slot="spinner-ring"]')
    const primaryMarker = primaryIndicator.querySelector('[data-figma-node-id="5966:24996"]')
    if (!primaryRing || !primaryMarker) {
      throw new Error("Spinner source artwork is missing")
    }

    const sizeExtensions = canvas
      .getByTestId("spinner-size-extensions")
      .querySelectorAll<HTMLElement>('[data-slot="spinner-indicator"]')
    // Rotated bounding boxes are not the source frame's dimensions.
    for (const indicator of [primaryIndicator, contrastIndicator, ...sizeExtensions]) {
      for (const animation of indicator.getAnimations()) {
        animation.pause()
        animation.currentTime = 0
      }
    }
    await expect(canvas.getAllByRole("status")).toHaveLength(1)
    await expect(canvas.getByTestId("primary-spinner")).toHaveAttribute("aria-busy", "true")
    await expect(primary).toHaveTextContent("Caricamento principale")
    await expect(primary).toHaveAttribute("role", "status")
    await expect(primaryIndicator).toHaveAttribute("aria-hidden", "true")
    await expect(contrast).toHaveAttribute("aria-hidden", "true")
    await expect(primaryIndicator.getBoundingClientRect().width).toBe(24)
    await expect(primaryIndicator.getBoundingClientRect().height).toBe(24)
    await expect(contrastIndicator.getBoundingClientRect().width).toBe(24)
    await expect(contrastIndicator.getBoundingClientRect().height).toBe(24)
    await expect(window.getComputedStyle(primaryIndicator).color).toBe("rgb(11, 62, 227)")
    await expect(window.getComputedStyle(contrastIndicator).color).toBe("rgb(255, 255, 255)")
    await expect(window.getComputedStyle(primaryRing).backgroundImage).toContain("conic-gradient")
    await expect(window.getComputedStyle(primaryRing).maskImage).toContain("radial-gradient")
    await expect(primaryMarker).toBeInTheDocument()
    await expect(sizeExtensions).toHaveLength(2)
    await expect(sizeExtensions[0]?.getBoundingClientRect().width).toBe(20)
    await expect(sizeExtensions[1]?.getBoundingClientRect().width).toBe(48)
  },
}
