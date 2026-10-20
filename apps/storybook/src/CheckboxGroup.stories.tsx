import type { Meta, StoryObj } from "@storybook/react-vite"
import { expect, userEvent, within } from "storybook/test"

import { CheckboxField, CheckboxGroup } from "@/components/inputs"

const meta = {
  title: "Components/Inputs/CheckboxGroup",
  component: CheckboxGroup,
  args: { legend: "Consensi" },
  argTypes: {
    description: { control: "text" },
    error: { control: "text" },
    required: { control: "boolean" },
    children: { control: false },
  },
  parameters: {
    docs: {
      description: {
        component:
          "Choice box collection with real fieldset and legend, description and error associated with the group; requiredness is announced and enforced by the controls.",
      },
    },
  },
} satisfies Meta<typeof CheckboxGroup>

export default meta
type Story = StoryObj<typeof meta>

export const Playground: Story = {
  // Reflow exemption pending a design request: docs/design-requests/2026-10-16-a11y-reflow-conditions.md.
  parameters: { a11yContract: { reflow: false } },
  render: (args) => (
    <CheckboxGroup {...args}>
      <CheckboxField name="consents" value="service" label="Comunicazioni di servizio" />
      <CheckboxField name="consents" value="research" label="Ricerca e miglioramento" />
    </CheckboxGroup>
  ),
}

export const WithError: Story = {
  args: {
    legend: "Documenti allegati",
    error: "Seleziona almeno un documento.",
    required: true,
  },
  render: (args) => (
    <CheckboxGroup {...args}>
      <CheckboxField label="Documento di identità" />
      <CheckboxField label="Ricevuta di pagamento" />
    </CheckboxGroup>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const document = canvas.getByRole("checkbox", { name: /Documento di identità/ })
    await userEvent.click(document)
    await expect(document).toBeChecked()
  },
}
