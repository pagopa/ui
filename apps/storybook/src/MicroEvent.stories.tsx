import type { Meta, StoryObj } from "@storybook/react-vite"

import { figmaEmbedUrl } from "@/catalog/figma/file"
import { MicroEvent } from "@/components/data-display"

import microeventoGuide from "./guides/microevento.md?raw"

const meta = {
  title: "Components/Data display/MicroEvent",
  component: MicroEvent,
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
    design: { type: "figma", url: figmaEmbedUrl("9676:5633") },
    docs: {
      description: {
        component: `Timeline micro-event with the correction tag (EVENTO NON VALIDO / EVENTO RETTIFICATO) and the event description.

${microeventoGuide}`,
      },
      subtitle: "Figma: Microevento",
    },
  },
} satisfies Meta<typeof MicroEvent>

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

// The source `9676:5633` sample: a 725x91 row whose leading 21x20 slot is an
// empty `Description` text and whose description copies the source placeholder
// copy, so the two 14/20 lines wrap as drawn. The source draws no visible time,
// so the capture omits the component's optional `time`.
const sourceDescription =
  "Raccomandata pronta - La raccomandata  {type} numero {numero raccomandata} per {name} ({CF}) è stata stampata e imbustata ed è pronta per essere spedita. 01 FEB, 14:30"

export const Source: Story = {
  // Reflow exemption: fixture pinned at the source width, not a product surface.
  parameters: { layout: "fullscreen", a11yContract: { reflow: false } },
  args: { time: undefined, invalid: true, title: sourceDescription },
  render: (args) => (
    <div data-fidelity-variant="default" className="w-[725px] max-w-full">
      <MicroEvent {...args} />
    </div>
  ),
}
