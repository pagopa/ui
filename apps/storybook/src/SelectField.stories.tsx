import type { Meta, StoryObj } from "@storybook/react-vite"
import { expect, screen, userEvent, waitFor, within } from "storybook/test"

import { figmaEmbedUrl } from "@/catalog/figma/file"
import { PagoPAIcon } from "@/components/icons/PagoPAIcon"
import { Autocomplete, DatePickerField, MultiSelectField, SelectField } from "@/components/inputs"

const municipalities = [
  { value: "roma", label: "Roma" },
  { value: "milano", label: "Milano" },
  { value: "napoli", label: "Napoli" },
  { value: "torino", label: "Torino" },
  { value: "palermo", label: "Palermo" },
]

const serviceOptions = [
  { value: "tributi", label: "Tributi locali" },
  { value: "scuola", label: "Servizi scolastici" },
  { value: "mobilita", label: "Mobilità" },
  { value: "anagrafe", label: "Servizi anagrafici" },
]

import selectGuide from "./guides/select-choices.md?raw"

const meta = {
  title: "Components/Inputs/SelectField",
  component: SelectField,
  args: {
    label: "Provincia",
    options: [
      { value: "rm", label: "Roma" },
      { value: "mi", label: "Milano" },
      { value: "to", label: "Torino" },
    ],
  },
  argTypes: {
    options: { control: false },
    action: { control: false },
    onValueChange: { control: false },
  },
  parameters: {
    design: { type: "figma", url: figmaEmbedUrl("602:9417") },
    docs: {
      description: {
        component: `Single-select field with an associated label, validation state and native trigger; the option shows a label and rich content, and the value stays controlled by the application.

${selectGuide}`,
      },
    },
  },
} satisfies Meta<typeof SelectField>

export default meta
type Story = StoryObj<typeof meta>

// Source frame: 274x48 (`602:9418`). The story carries the source width.
export const Playground: Story = {
  render: (args) => (
    <div className="w-68 max-w-full">
      <SelectField {...args} />
    </div>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const typology = canvas.getByRole("combobox", { name: /Provincia/ })
    await userEvent.click(typology)
    await userEvent.click(await screen.findByRole("option", { name: "Milano" }))
    await expect(typology).toHaveTextContent("Milano")
  },
}

export const WithValidation: Story = {
  args: { error: "Seleziona una provincia per continuare.", required: true },
}

export const SelectionControls: Story = {
  // Reflow exemption pending a design request: docs/design-requests/2026-10-16-a11y-reflow-conditions.md.
  parameters: { a11yContract: { reflow: false } },
  render: () => (
    <div className="grid max-w-xl gap-6">
      <Autocomplete label="Comune di residenza" options={municipalities} />
      <SelectField label="Tipologia" options={serviceOptions} />
      <MultiSelectField label="Categorie" options={serviceOptions} defaultValue={["mobilita"]} />
      <DatePickerField label="Data di nascita" name="birth-date" defaultValue="1990-01-01" />
    </div>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    // Autocomplete: type, keyboard-select.
    const city = canvas.getByRole("combobox", { name: /Comune di residenza/ })
    await userEvent.click(city)
    await userEvent.type(city, "mil")
    await userEvent.keyboard("{ArrowDown}{Enter}")
    await expect(city).toHaveValue("Milano")

    // SelectField: pick with the pointer, verify the trigger label.
    const typology = canvas.getByRole("combobox", { name: /Tipologia/ })
    await userEvent.click(typology)
    const typologyPopup = (await screen.findByRole("listbox", { name: /Tipologia/ })).closest(
      '[data-slot="select-content"]',
    )
    if (!(typologyPopup instanceof HTMLElement)) throw new Error("Expected the select popup")
    // The chooser opens right below the trigger (the 4px side offset) instead
    // of overlapping the selected option like a menu.
    await expect(
      Math.abs(
        typologyPopup.getBoundingClientRect().top - typology.getBoundingClientRect().bottom - 4,
      ),
    ).toBeLessThanOrEqual(1)
    await userEvent.click(await screen.findByRole("option", { name: "Tributi locali" }))
    await expect(typology).toHaveTextContent("Tributi locali")

    // MultiSelectField: listbox keyboard navigation and toggling.
    const categories = canvas.getByRole("combobox", { name: /Categorie/ })
    await userEvent.click(categories)
    const listbox = await screen.findByRole("listbox", { name: "Categorie" })
    const firstOption = within(listbox).getByRole("option", { name: "Tributi locali" })
    await waitFor(() =>
      expect(within(listbox).getByRole("option", { name: "Mobilità" })).toHaveFocus(),
    )
    await userEvent.keyboard("{Home}")
    await waitFor(() => expect(firstOption).toHaveFocus())
    await userEvent.keyboard("{Enter}")
    await expect(firstOption).toHaveAttribute("aria-selected", "true")
    await userEvent.keyboard("{Escape}")
    await waitFor(() => expect(screen.queryByRole("listbox")).not.toBeInTheDocument())
    await expect(categories).toHaveTextContent(/Tributi locali/)

    // DatePickerField: the custom calendar panel replaces the browser picker.
    const birthDate = canvas.getByRole("button", { name: "Data di nascita" })
    await expect(birthDate).toHaveTextContent("1 gen 1990")
    await userEvent.click(birthDate)
    const panel = within(canvasElement.ownerDocument.body).getByRole("group", {
      name: "Seleziona data",
    })
    await userEvent.click(within(panel).getByRole("button", { name: /15 gennaio 1990/i }))
    await userEvent.click(within(panel).getByRole("button", { name: "Salva" }))
    await expect(birthDate).toHaveTextContent("15 gen 1990")
    const submitted = canvasElement.querySelector<HTMLInputElement>('input[name="birth-date"]')
    if (!submitted) throw new Error("Expected the named form control")
    await expect(submitted.value).toBe("1990-01-15")
  },
}

// Source frame 274px (`602:9418`). The published set `602:9417` has two real
// implementations, so this export renders both and carries the design panel and
// the registry `storyExports` evidence. The empty state keeps the source
// decorative leading icon (`account_balance`, 24px) and its chevron.
export const SourceFrame: Story = {
  render: () => (
    <div className="grid w-68 max-w-full gap-6">
      <SelectField
        id="source-select"
        label="Label text"
        leadingIcon={<PagoPAIcon name="account_balance" />}
        options={[{ value: "value", label: "Value" }]}
        required
      />
      <MultiSelectField
        id="source-select-multiple"
        label="Label text"
        options={[
          { value: "first", label: "Value" },
          { value: "second", label: "Value" },
        ]}
        defaultValue={["first", "second"]}
        required
      />
    </div>
  ),
}

// The source states at the source width: enabled empty and filled, disabled and
// error (`602:9413`–`602:9430`). They stay one export: the parity pass captures
// the state it needs from this fixture instead of one story per variant.
export const SourceStates: Story = {
  render: () => (
    <div className="grid w-68 max-w-full gap-6">
      <SelectField
        id="source-states-empty"
        label="Label text"
        options={[{ value: "value", label: "Value" }]}
        required
      />
      <SelectField
        id="source-states-filled"
        label="Label text"
        options={[{ value: "value", label: "Value" }]}
        defaultValue="value"
        required
      />
      <SelectField
        id="source-states-disabled"
        label="Label text"
        options={[{ value: "value", label: "Value" }]}
        disabled
      />
      <SelectField
        id="source-states-error"
        label="Label text"
        options={[{ value: "value", label: "Value" }]}
        defaultValue="value"
        error="Some details error"
      />
    </div>
  ),
}
