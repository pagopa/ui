import * as React from "react"
import type { Meta, StoryObj } from "@storybook/react-vite"
import { expect, screen, userEvent, waitFor, within } from "storybook/test"

import { MultiSelectField } from "@/components/inputs/multi-select-field"

const serviceOptions = [
  { value: "tributi", label: "Tributi locali" },
  { value: "scuola", label: "Servizi scolastici" },
  { value: "mobilita", label: "Mobilità" },
  { value: "anagrafe", label: "Servizi anagrafici" },
]

import selectGuide from "./guides/select-choices.md?raw"

const meta = {
  title: "Components/Inputs/MultiSelectField",
  component: MultiSelectField,
  args: {
    label: "Servizi di interesse",
    options: serviceOptions,
    defaultValue: ["tributi", "scuola"],
    description: "Puoi scegliere più opzioni.",
  },
  argTypes: {
    options: { control: false },
    action: { control: false },
    onValueChange: { control: false },
  },
  parameters: {
    docs: {
      description: {
        component: `Multi-select with a listbox whose selection is announced: the trigger summarises the chosen labels, the arrows and Home/End move focus, Enter toggles the option.

${selectGuide}`,
      },
    },
  },
} satisfies Meta<typeof MultiSelectField>

export default meta
type Story = StoryObj<typeof meta>

// Source frame: 274x48 (`617:19990`). The story carries the source width.
export const Playground: Story = {
  // Reflow exemption debt, tracked in https://github.com/pagopa/ui/issues/192.
  parameters: { a11yContract: { reflow: false } },
  render: (args) => (
    <div className="pui:w-68 pui:max-w-full">
      <MultiSelectField {...args} />
    </div>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const categories = canvas.getByRole("combobox", { name: /Servizi di interesse/ })
    await userEvent.click(categories)
    const listbox = await screen.findByRole("listbox", { name: "Servizi di interesse" })
    const firstOption = within(listbox).getByRole("option", { name: "Tributi locali" })
    await expect(firstOption).toHaveAttribute("aria-selected", "true")
    await userEvent.keyboard("{Home}")
    await waitFor(() => expect(firstOption).toHaveFocus())
    await userEvent.keyboard("{Enter}")
    await expect(firstOption).toHaveAttribute("aria-selected", "false")
    await userEvent.keyboard("{Escape}")
    await waitFor(() => expect(screen.queryByRole("listbox")).not.toBeInTheDocument())
  },
}

function FocusableMultiSelectField() {
  const ref = React.useRef<HTMLButtonElement>(null)
  return (
    <div className="pui:grid pui:w-68 pui:max-w-full pui:gap-2">
      <p id="servizi-note">Puoi selezionare più di un servizio.</p>
      <MultiSelectField
        ref={ref}
        className="pui:min-w-0"
        data-testid="servizi"
        aria-describedby="servizi-note"
        label="Servizi di interesse"
        options={serviceOptions}
      />
      <button type="button" onClick={() => ref.current?.focus()}>
        Vai al campo
      </button>
    </div>
  )
}

export const HostAttributes: Story = {
  render: () => <FocusableMultiSelectField />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await expect(canvas.getByTestId("servizi")).toHaveClass("pui:min-w-0")
    const trigger = canvas.getByRole("combobox", { name: /Servizi di interesse/ })
    // The caller's description joins the field's own, on the control.
    await expect(trigger).toHaveAttribute("aria-describedby", expect.stringMatching(/servizi-note/))
    await userEvent.click(canvas.getByRole("button", { name: "Vai al campo" }))
    await expect(trigger).toHaveFocus()
  },
}
