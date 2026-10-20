import type { Meta, StoryObj } from "@storybook/react-vite"
import { expect, fn, screen, userEvent, within } from "storybook/test"

import { Autocomplete } from "@/components/inputs"

import fieldsGuide from "./guides/fields.md?raw"

const municipalities = [
  { value: "roma", label: "Roma" },
  { value: "milano", label: "Milano" },
  { value: "napoli", label: "Napoli" },
  { value: "torino", label: "Torino" },
  { value: "palermo", label: "Palermo" },
]

const meta = {
  title: "Components/Inputs/Autocomplete",
  component: Autocomplete,
  args: {
    label: "Comune",
    options: municipalities,
    description: "Digita almeno una parte del nome.",
  },
  argTypes: {
    options: { control: false },
    onValueChange: { control: false },
  },
  parameters: {
    docs: {
      description: {
        component: `Search with suggestions: the field is an input with an associated listbox, disabled options stay announced but cannot be selected, and the choice happens from keyboard or pointer.\n\n${fieldsGuide}`,
      },
    },
  },
} satisfies Meta<typeof Autocomplete>

export default meta
type Story = StoryObj<typeof meta>

// Source frame: 272x48 (`824:8839`). The story carries the source width.
export const Playground: Story = {
  render: (args) => (
    <div className="w-68 max-w-full">
      <Autocomplete {...args} />
    </div>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const city = canvas.getByRole("combobox", { name: /Comune/ })
    await userEvent.click(city)
    await userEvent.type(city, "mil")
    await userEvent.keyboard("{ArrowDown}{Enter}")
    await expect(city).toHaveValue("Milano")
  },
}

const selectUnavailableCity = fn()

export const AutocompleteDisabledOptions: Story = {
  render: () => (
    <Autocomplete
      label="Comuni non disponibili"
      options={[
        { value: "roma", label: "Roma", disabled: true },
        { value: "milano", label: "Milano", disabled: true },
      ]}
      onValueChange={selectUnavailableCity}
      className="max-w-md"
    />
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const city = canvas.getByRole("combobox", { name: "Comuni non disponibili" })
    await userEvent.click(city)
    const listbox = await screen.findByRole("listbox")
    await expect(listbox).toHaveAccessibleName("Comuni non disponibili")
    await userEvent.keyboard("{ArrowDown}{ArrowUp}{Enter}")
    await expect(city).not.toHaveAttribute("aria-activedescendant")
    await expect(city).toHaveValue("")
    await expect(selectUnavailableCity).not.toHaveBeenCalled()
  },
}
