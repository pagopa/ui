import type { Meta, StoryObj } from "@storybook/react-vite"

import { TextAreaField } from "@/components/inputs"

import fieldsGuide from "./guides/fields.md?raw"

const meta = {
  title: "Components/Inputs/TextAreaField",
  component: TextAreaField,
  args: {
    label: "Note",
    description: "Massimo 500 caratteri.",
    maxLength: 500,
  },
  parameters: {
    docs: {
      description: {
        component: `Multiline text area with the same semantics as TextField: label, description, validation and caller-owned count.\n\n${fieldsGuide}`,
      },
    },
  },
} satisfies Meta<typeof TextAreaField>

export default meta
type Story = StoryObj<typeof meta>

// Source frame: 274x92 (`10585:80644`). The story carries the source width.
export const Playground: Story = {
  render: (args) => (
    <div className="w-68 max-w-full">
      <TextAreaField {...args} />
    </div>
  ),
}

export const Disabled: Story = {
  args: { label: "Motivazione", disabled: true, value: "Campo non modificabile", readOnly: true },
}
