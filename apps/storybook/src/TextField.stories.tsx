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

// The source state matrix: one field per source variant of `529:6111` that the
// `Playground` case does not already cover, each framed at the source width
// (274) so a parity case maps exactly one row. The copy is the fixture's; the
// state is what the case compares.
const sourceFieldStates: readonly {
  id: string
  props: {
    disabled?: boolean
    defaultValue?: string
    success?: string
    error?: string
    required?: boolean
  }
}[] = [
  { id: "fidelity-disabled-empty", props: { disabled: true } },
  { id: "fidelity-disabled-filled", props: { disabled: true, defaultValue: "Input text" } },
  { id: "fidelity-active-empty", props: {} },
  { id: "fidelity-active-filled", props: { defaultValue: "Input text" } },
  {
    id: "fidelity-success-filled",
    props: { defaultValue: "Input text", success: "Codice riconosciuto." },
  },
  { id: "fidelity-error-empty", props: { error: "Some details error" } },
  {
    id: "fidelity-error-filled",
    props: { defaultValue: "Input text", error: "Some details error" },
  },
  { id: "fidelity-optional-empty", props: { required: false } },
]

export const FigmaStateMatrix: Story = {
  tags: ["color-pinned"],
  parameters: {
    // Reflow exemption: fixture pinned at the source width, not a product surface.
    a11yContract: { reflow: false },
    design: { type: "figma", url: figmaEmbedUrl("529:6111") },
  },
  render: () => (
    <div className="grid gap-6">
      {sourceFieldStates.map((state) => (
        <div key={state.id} className="w-[274px] max-w-full">
          <TextField
            id={state.id}
            data-fidelity-state={state.id}
            label="Label text"
            required
            {...state.props}
          />
        </div>
      ))}
    </div>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    for (const state of sourceFieldStates) {
      const input = canvasElement.querySelector<HTMLInputElement>(`#${state.id}`)
      if (!input) throw new Error(`Missing fidelity field ${state.id}`)
      if (state.props.disabled) await expect(input).toBeDisabled()
      if ("error" in state.props) await expect(input).toHaveAttribute("aria-invalid", "true")
      else await expect(input).not.toHaveAttribute("aria-invalid")
    }
    const optional = canvas.getByRole("textbox", { name: "Label text", exact: true })
    await expect(optional).not.toBeRequired()
  },
}
