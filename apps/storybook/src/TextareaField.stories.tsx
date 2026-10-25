import type { Meta, StoryObj } from "@storybook/react-vite"
import { expect, within } from "storybook/test"

import { TextareaField } from "@/components/inputs"
import { figmaEmbedUrl } from "@/catalog/figma/file"

import fieldsGuide from "./guides/fields.md?raw"

const meta = {
  title: "Components/Inputs/TextareaField",
  component: TextareaField,
  args: {
    label: "Note",
    description: "Massimo 500 caratteri.",
    maxLength: 500,
  },
  parameters: {
    design: { type: "figma", url: figmaEmbedUrl("10585:80643") },
    docs: {
      description: {
        component: `Multiline text area with the same semantics as TextField: label, description, validation and caller-owned count.\n\n${fieldsGuide}`,
      },
      subtitle: "Figma: TextArea",
    },
  },
} satisfies Meta<typeof TextareaField>

export default meta
type Story = StoryObj<typeof meta>

// Source frame: 274x92 (`10585:80644`). The story carries the source width.
export const Playground: Story = {
  render: (args) => (
    <div className="w-68 max-w-full">
      <TextareaField {...args} />
    </div>
  ),
}

export const Disabled: Story = {
  args: { label: "Motivazione", disabled: true, value: "Campo non modificabile", readOnly: true },
}

// The source state matrix: one field per source variant of `10585:80643`, each
// framed at the source width (274) so a parity case maps exactly one row. The
// copy is the fixture's; the state is what the case compares.
const sourceAreaStates: readonly {
  id: string
  props: {
    disabled?: boolean
    defaultValue?: string
    success?: string
    error?: string
    required?: boolean
  }
}[] = [
  { id: "fidelity-area-enabled-empty", props: {} },
  { id: "fidelity-area-enabled-filled", props: { defaultValue: "Input text" } },
  { id: "fidelity-area-active-empty", props: {} },
  { id: "fidelity-area-active-filled", props: { defaultValue: "Input text" } },
  {
    id: "fidelity-area-success-filled",
    props: { defaultValue: "Input text", success: "Note salvate." },
  },
  { id: "fidelity-area-error-empty", props: { error: "Some details error" } },
  {
    id: "fidelity-area-error-filled",
    props: { defaultValue: "Input text", error: "Some details error" },
  },
  { id: "fidelity-area-optional-empty", props: { required: false } },
]

export const FigmaStateMatrix: Story = {
  tags: ["color-pinned"],
  parameters: {
    // Reflow exemption: fixture pinned at the source width, not a product surface.
    a11yContract: { reflow: false },
    design: { type: "figma", url: figmaEmbedUrl("10585:80643") },
  },
  render: () => (
    <div className="grid gap-6">
      {sourceAreaStates.map((state) => (
        <div key={state.id} className="w-[274px] max-w-full">
          <TextareaField
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
    for (const state of sourceAreaStates) {
      const control = canvasElement.querySelector<HTMLTextAreaElement>(`#${state.id}`)
      if (!control) throw new Error(`Missing fidelity field ${state.id}`)
      if (state.props.disabled) await expect(control).toBeDisabled()
      if (state.props.error) await expect(control).toHaveAttribute("aria-invalid", "true")
      else await expect(control).not.toHaveAttribute("aria-invalid")
    }
    await expect(canvas.getByRole("textbox", { name: "Label text" })).not.toBeRequired()
  },
}
