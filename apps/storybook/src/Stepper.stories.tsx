import type { Meta, StoryObj } from "@storybook/react-vite"

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
