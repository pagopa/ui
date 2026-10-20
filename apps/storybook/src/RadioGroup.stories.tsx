import type { Meta, StoryObj } from "@storybook/react-vite"
import { expect, userEvent, within } from "storybook/test"

import { RadioField, RadioGroup } from "@/components/inputs"

import radioGuide from "./guides/radio-choices.md?raw"

const meta = {
  title: "Components/Inputs/RadioGroup",
  component: RadioGroup,
  args: { legend: "Metodo di contatto preferito" },
  argTypes: {
    description: { control: "text" },
    error: { control: "text" },
    required: { control: "boolean" },
    children: { control: false },
  },
  parameters: {
    docs: {
      description: {
        component: `Radio collection with real fieldset and legend and an announced accessible name; the arrows move the selection following the native behaviour.

${radioGuide}`,
      },
    },
  },
} satisfies Meta<typeof RadioGroup>

export default meta
type Story = StoryObj<typeof meta>

export const Playground: Story = {
  render: (args) => (
    <RadioGroup {...args} name="contact-method" defaultValue="email">
      <RadioField
        value="email"
        label="Email"
        description="Ricevi un messaggio nella tua casella."
      />
      <RadioField
        value="phone"
        label="Telefono"
        description="Ricevi una chiamata da un operatore."
      />
      <RadioField value="office" label="Sportello" disabled />
    </RadioGroup>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const office = canvas.getByRole("radio", { name: /Sportello/ })
    await userEvent.click(office)
    await expect(office).not.toBeChecked()
    const phone = canvas.getByRole("radio", { name: /Telefono/ })
    await userEvent.click(phone)
    await expect(phone).toBeChecked()
  },
}

export const WithError: Story = {
  args: {
    legend: "Canale di pagamento",
    error: "Seleziona un canale per continuare.",
    required: true,
  },
  render: (args) => (
    <RadioGroup {...args}>
      <RadioField value="online" label="Online" />
      <RadioField value="office" label="Presso uno sportello" />
    </RadioGroup>
  ),
}
