import type { Meta, StoryObj } from "@storybook/react-vite"
import { expect, screen, userEvent, waitFor, within } from "storybook/test"

import { MultiSelectField } from "@/components/inputs"

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
  // Reflow exemption pending a design request: docs/design-requests/2026-10-16-a11y-reflow-conditions.md.
  parameters: { a11yContract: { reflow: false } },
  render: (args) => (
    <div className="w-68 max-w-full">
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
