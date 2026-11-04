import type { Meta, StoryObj } from "@storybook/react-vite"
import { expect } from "storybook/test"

import { figmaEmbedUrl } from "@/catalog/figma/file"
import { Stepper } from "@/components/navigation"

const meta = {
  title: "Components/Navigation/Stepper",
  component: Stepper,
  args: {
    items: [
      { label: "Dati", status: "complete" },
      { label: "Riepilogo", status: "current" },
      { label: "Pagamento", status: "upcoming" },
    ],
  },
  argTypes: {
    items: { control: false },
  },
  parameters: {
    // The source draws both device compositions in a 1200 frame (the device is
    // the axis, not the width): the mobile capture forces the 1200 root at the
    // 320 viewport, so the story root must not be flex-shrunk by the centered
    // layout (the Dialog/PaymentModule reading).
    layout: "fullscreen",
    design: { type: "figma", url: figmaEmbedUrl("1314:10512") },
    docs: {
      description: {
        component:
          "Sequential progress: on wide screens the numbered sequence in columns, on narrow screens the current step with title and description plus the compact numbered row; every state is announced with spoken text beyond colour.",
      },
    },
  },
} satisfies Meta<typeof Stepper>

export default meta
type Story = StoryObj<typeof meta>

export const Playground: Story = {}

export const WithDescriptions: Story = {
  args: {
    items: [
      { label: "Dati", description: "Anagrafica e contatti", status: "complete" },
      { label: "Riepilogo", description: "Controlla i dati inseriti", status: "current" },
      { label: "Pagamento", description: "Paga con il metodo preferito", status: "upcoming" },
    ],
  },
}

// The numbered disc is 12px text on a filled circle: axe samples a circle's
// corners, cannot resolve the fill behind the glyph and records the run as
// incomplete, so the state pairing is measured here. Upcoming once paired
// `muted-soft` with this disc: 3.66:1, below the 4.5:1 AA floor for its size.
function luminance(color: string) {
  const match = color.match(/^rgba?\(([^)]+)\)$/)
  if (!match) throw new Error(`Unreadable computed colour: ${color}`)
  const channels = match[1]
    .split(/[\s,/]+/)
    .filter(Boolean)
    .map(Number)
  const channel = (index: number) => {
    const value = (channels[index] ?? 0) / 255
    return value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4
  }
  return 0.2126 * channel(0) + 0.7152 * channel(1) + 0.0722 * channel(2)
}

function contrastRatio(element: Element) {
  const style = getComputedStyle(element)
  const values = [luminance(style.color), luminance(style.backgroundColor)].sort((a, b) => b - a)
  const light = values[0] ?? 0
  const dark = values[1] ?? 0
  return (light + 0.05) / (dark + 0.05)
}

export const StepContrast: Story = {
  args: {
    items: [
      { label: "Dati", status: "complete" },
      { label: "Riepilogo", status: "current" },
      { label: "Pagamento", status: "upcoming" },
      { label: "Conferma", status: "upcoming" },
    ],
  },
  play: async ({ canvasElement }) => {
    // Both device compositions are in the DOM: every upcoming disc is measured.
    const discs = [
      ...canvasElement.querySelectorAll<HTMLElement>("span.rounded-full.bg-border-strong"),
    ]
    await expect(discs.length).toBeGreaterThan(0)
    for (const disc of discs) {
      await expect(contrastRatio(disc)).toBeGreaterThanOrEqual(4.5)
    }
  },
}
