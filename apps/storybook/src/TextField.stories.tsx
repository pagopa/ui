import type { Meta, StoryObj } from "@storybook/react-vite"
import { expect, within } from "storybook/test"

import { Search, UserRound } from "lucide-react"

import { TextField } from "@/components/inputs"
import { figmaEmbedUrl } from "@/catalog/figma/file"

import fieldsGuide from "./guides/fields.md?raw"

const meta = {
  title: "Components/Inputs/TextField",
  component: TextField,
  args: {
    label: "Indirizzo email",
    type: "email",
    description: "Useremo questo indirizzo per le comunicazioni di servizio.",
  },
  argTypes: {
    leadingIcon: { control: false },
    trailingIcon: { control: false },
    type: {
      control: "select",
      options: ["text", "email", "tel", "url", "search", "password"],
    },
  },
  parameters: {
    design: { type: "figma", url: figmaEmbedUrl("529:6111") },
    docs: {
      description: {
        component: `Text field with a native input and a floating label. Adornments and validation states are configurable; required, disabled, errors and values keep the native semantics.\n\n${fieldsGuide}`,
      },
    },
  },
} satisfies Meta<typeof TextField>

export default meta
type Story = StoryObj<typeof meta>

// Source frame: 274x48 (`529:6123`). The story carries the source width so the
// preview a human opens is the source frame, not a fit-content box.
export const Playground: Story = {
  render: (args) => (
    <div className="w-68 max-w-full">
      <TextField {...args} />
    </div>
  ),
}

export const WithIcons: Story = {
  args: { leadingIcon: <Search /> },
}

export const WithTrailingIcon: Story = {
  args: { trailingIcon: <UserRound />, defaultValue: "RSSMRA80A01H501" },
}

export const Validation: Story = {
  render: () => (
    <div className="grid max-w-xl gap-6">
      <TextField
        label="Cerca una pratica"
        leadingIcon={<Search />}
        description="La ricerca non distingue tra maiuscole e minuscole."
      />
      <TextField
        label="Email"
        type="email"
        defaultValue="nome@"
        error="Inserisci un indirizzo email valido."
        required
      />
      <TextField
        label="Codice avviso"
        defaultValue="302000100000019421"
        success="Codice avviso riconosciuto."
      />
    </div>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const email = canvas.getByRole("textbox", { name: /^Email/ })
    await expect(email).toBeRequired()
    await expect(email).toHaveAttribute("aria-invalid", "true")
    await expect(email).toHaveAccessibleDescription("Inserisci un indirizzo email valido.")

    const successInput = canvas.getByRole("textbox", { name: "Codice avviso" })
    await expect(successInput).toHaveAccessibleDescription("Codice avviso riconosciuto.")

    const successId = successInput.getAttribute("aria-describedby")
    if (!successId) throw new Error("Expected the success message to describe the input")
    const successMessage = canvasElement.ownerDocument.getElementById(successId)
    if (!successMessage) throw new Error("Expected the accessible success message")
    await expect(successMessage).toHaveClass("sr-only")

    const successRoot = successInput.closest(".relative")?.parentElement
    if (!successRoot) throw new Error("Expected the TextField root")
    await expect(successRoot.getBoundingClientRect().height).toBe(
      successInput.getBoundingClientRect().height,
    )
  },
}

export const ReadOnly: Story = {
  args: { label: "Identificativo pratica", defaultValue: "PAGOPA-2026-0192", readOnly: true },
}
