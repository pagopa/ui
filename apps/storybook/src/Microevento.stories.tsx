import type { Meta, StoryObj } from "@storybook/react-vite"

import { Microevento } from "@/components/data-display"

const meta = {
  title: "Components/Data display/Microevento",
  component: Microevento,
  args: {
    title: "Raccomandata pronta - La raccomandata è stata preparata per la spedizione.",
    time: "11:20",
    invalid: true,
  },
  argTypes: {
    invalid: { control: "boolean" },
    label: { control: "text" },
    title: { control: "text" },
    time: { control: "text" },
  },
  parameters: {
    docs: {
      description: {
        component:
          "Timeline micro-event with the correction tag (EVENTO NON VALIDO / EVENTO RETTIFICATO) and the event description.",
      },
    },
  },
} satisfies Meta<typeof Microevento>

export default meta
type Story = StoryObj<typeof meta>

export const Playground: Story = { parameters: { a11yContract: { reflow: false } } }

export const Corrected: Story = {
  // Reflow exemption pending a design request: docs/design-requests/2026-10-16-a11y-reflow-conditions.md.
  parameters: { a11yContract: { reflow: false } },
  args: {
    invalid: false,
    title: "Evento rettificato: la raccomandata è stata riconsegnata al mittente.",
  },
}
