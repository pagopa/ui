import type { Meta, StoryObj } from "@storybook/react-vite"
import { expect, fn, screen, userEvent, within } from "storybook/test"

import { figmaEmbedUrl } from "@/catalog/figma/file"
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
    design: { type: "figma", url: figmaEmbedUrl("824:8838") },
    docs: {
      description: {
        component: `Search with suggestions: the field is an input with an associated listbox, disabled options stay announced but cannot be selected, and the choice happens from keyboard or pointer. The source leading art is the decorative 24px \`account_balance\` glyph; a filled enabled field shows the clear control, while a disabled one keeps the arrow.\n\n${fieldsGuide}`,
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
    await expect(canvas.getByText("hai selezionato Milano")).toBeInTheDocument()
  },
}

// The two filled multiselect types at the source 272x48 frame: `824:8872` keeps
// a removable pill per value with `[clear][chevron]`, `11073:2423` collapses the
// row into the count badge, which carries the clear action, beside the arrow.
export const Fidelity: Story = {
  args: { multiple: true, label: "Erogatori", required: true, description: undefined },
  render: ({ label, options, description, required }) => (
    <div className="grid w-68 max-w-full gap-6">
      <div data-fidelity-variant="824-8872">
        <Autocomplete
          multiple
          label={label}
          options={options}
          description={description}
          required={required}
          defaultValue={["roma", "milano"]}
          onValueChange={fn()}
        />
      </div>
      <div data-fidelity-variant="11073-2423">
        <Autocomplete
          multiple
          multipleDisplay="counter"
          label={label}
          options={options}
          description={description}
          required={required}
          placeholder="Seleziona gli erogatori"
          defaultValue={["roma", "milano", "napoli", "torino"]}
          onValueChange={fn()}
        />
      </div>
    </div>
  ),
  play: async ({ canvasElement }) => {
    const chips = canvasElement.querySelector(
      '[data-fidelity-variant="824-8872"] [data-slot="autocomplete-multiple"]',
    )
    const counter = canvasElement.querySelector(
      '[data-fidelity-variant="11073-2423"] [data-slot="autocomplete-multiple"]',
    )
    if (!(chips instanceof HTMLElement) || !(counter instanceof HTMLElement)) {
      throw new Error("Expected both multiselect fields")
    }
    await expect(within(chips).getByText("Roma")).toBeVisible()
    await expect(within(chips).getByRole("button", { name: "Elimina Roma" })).toBeVisible()
    await expect(within(counter).getByText("4 selezionati")).toBeInTheDocument()
    await expect(
      within(counter).getByRole("button", { name: "Svuota tutti i valori" }),
    ).toBeVisible()
  },
}

export const ClearControl: Story = {
  args: { defaultValue: "milano" },
  render: (args) => (
    <div className="w-68 max-w-full">
      <Autocomplete {...args} />
    </div>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const city = canvas.getByRole("combobox", { name: /Comune/ })
    await expect(city).toHaveValue("Milano")
    const clear = canvas.getByRole("button", { name: "Svuota campo" })
    clear.focus()
    await expect(clear).toHaveFocus()
    await userEvent.keyboard("{Enter}")
    await expect(city).toHaveValue("")
    await expect(city).toHaveFocus()
    await expect(canvas.queryByRole("button", { name: "Svuota campo" })).not.toBeInTheDocument()
    await expect(canvas.getByRole("button", { name: "apri lista" })).toBeVisible()
  },
}

export const OverridableTexts: Story = {
  args: {
    defaultValue: "roma",
    clearLabel: "Cancella il comune",
    openLabel: "Mostra i comuni",
    closeLabel: "Nascondi i comuni",
    listLabel: (label) => `Suggerimenti per ${label}`,
    selectedLabel: (values) => `Comune scelto: ${values.join(" / ")}`,
  },
  render: (args) => (
    <div className="w-68 max-w-full">
      <Autocomplete {...args} />
    </div>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await expect(canvas.getByRole("button", { name: "Cancella il comune" })).toBeVisible()
    await userEvent.click(canvas.getByRole("button", { name: "Cancella il comune" }))
    const trigger = canvas.getByRole("button", { name: "Mostra i comuni" })
    await userEvent.click(trigger)
    const listbox = await screen.findByRole("listbox")
    await expect(listbox).toHaveAccessibleName("Suggerimenti per Comune")
    // Base UI hides the pointer trigger from the accessibility tree while the
    // popup is open; the open state is carried by the input's aria-expanded.
    await expect(
      canvasElement.querySelector('button[aria-label="Nascondi i comuni"]'),
    ).not.toBeNull()
    const input = canvasElement.querySelector('input[role="combobox"]')
    if (!(input instanceof HTMLInputElement)) throw new Error("Expected the combobox input")
    await expect(input).toHaveAttribute("aria-expanded", "true")
    await userEvent.keyboard("{ArrowDown}{Enter}")
    await expect(canvas.getByText("Comune scelto: Roma")).toBeInTheDocument()
  },
}

export const Loading: Story = {
  args: { options: [], loading: true },
  render: (args) => (
    <div className="w-68 max-w-full">
      <Autocomplete {...args} />
    </div>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await userEvent.click(canvas.getByRole("combobox", { name: /Comune/ }))
    const listbox = await screen.findByRole("listbox")
    await expect(listbox).toHaveAttribute("aria-busy", "true")
    await expect(canvas.getByText(/Caricamento lista in corso/)).toBeInTheDocument()
    await expect(canvasElement.querySelector('button[aria-label="chiudi lista"]')).not.toBeNull()
    // The modal popup marks the field label aria-hidden while focus is in the
    // list; close it so the shared axe pass evaluates the resting field.
    await userEvent.keyboard("{Escape}")
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
    await expect(listbox).toHaveAccessibleName("Lista Comuni non disponibili")
    await userEvent.keyboard("{ArrowDown}{ArrowUp}{Enter}")
    await expect(city).not.toHaveAttribute("aria-activedescendant")
    await expect(city).toHaveValue("")
    await expect(selectUnavailableCity).not.toHaveBeenCalled()
  },
}

const pickCities = fn()
const collapseCities = fn()

// Source frame: 272x48 (`824:8872`), Multiselect=True. Every value keeps its
// own pill and its own remove control, next to `[clear][chevron]`.
export const Multiselect: Story = {
  args: { multiple: true, onValueChange: pickCities, label: "Erogatori" },
  render: (args) => (
    <div className="w-68 max-w-full">
      <Autocomplete {...args} />
    </div>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const field = canvas.getByRole("combobox", { name: /Erogatori/ })
    const group = canvasElement.querySelector('[data-slot="autocomplete-multiple"]')
    if (!(group instanceof HTMLElement)) throw new Error("Expected the chips row")
    // The open list marks the field aria-hidden, so the trailing controls are
    // read from the DOM instead of the accessibility tree.
    const actions = () => [
      ...canvasElement.querySelectorAll('[data-slot="autocomplete-actions"] button'),
    ]

    await userEvent.click(field)
    await userEvent.type(field, "rom")
    await userEvent.keyboard("{ArrowDown}{Enter}")
    await expect(within(group).getByText("Roma")).toBeVisible()
    // One value keeps its name and the group keeps `[clear][chevron]`.
    await expect(actions()).toHaveLength(2)
    await expect(actions()[0]).toHaveAttribute("aria-label", "Svuota campo")

    await userEvent.type(field, "mil")
    await userEvent.keyboard("{ArrowDown}{Enter}")
    // Two values stay two pills, each with its own control.
    await expect(within(group).getByText("Roma")).toBeVisible()
    await expect(within(group).getByText("Milano")).toBeVisible()
    await expect(group.querySelector('[data-slot="autocomplete-counter"]')).toBeNull()
    await expect(actions()).toHaveLength(2)

    await userEvent.click(within(group).getByRole("button", { name: "Elimina Roma" }))
    await expect(within(group).queryByText("Roma")).toBeNull()
    await expect(within(group).getByText("Milano")).toBeVisible()
    await expect(pickCities).toHaveBeenLastCalledWith(["milano"])
  },
}

// Source frame: 272x48 (`11073:2423`), Multiselect counter=True. Two values
// collapse into a badge whose own control clears them all.
export const MultiselectCounter: Story = {
  args: {
    multiple: true,
    multipleDisplay: "counter",
    onValueChange: collapseCities,
    label: "Erogatori",
  },
  render: (args) => (
    <div className="w-68 max-w-full">
      <Autocomplete {...args} />
    </div>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const field = canvas.getByRole("combobox", { name: /Erogatori/ })
    const group = canvasElement.querySelector('[data-slot="autocomplete-multiple"]')
    if (!(group instanceof HTMLElement)) throw new Error("Expected the chips row")
    const actions = () => [
      ...canvasElement.querySelectorAll('[data-slot="autocomplete-actions"] button'),
    ]

    await userEvent.click(field)
    await userEvent.type(field, "rom")
    await userEvent.keyboard("{ArrowDown}{Enter}")
    // A single value is never a count of one: it keeps its full name.
    await expect(within(group).getByText("Roma")).toBeVisible()
    await expect(group.querySelector('[data-slot="autocomplete-counter"]')).toBeNull()

    await userEvent.type(field, "mil")
    await userEvent.keyboard("{ArrowDown}{Enter}")
    const counter = group.querySelector('[data-slot="autocomplete-counter"]')
    if (!(counter instanceof HTMLElement)) throw new Error("Expected the count badge")
    await expect(counter).toHaveTextContent("2")
    await expect(within(counter).getByText("2 selezionati")).toBeInTheDocument()
    await expect(within(group).queryByText("Roma")).toBeNull()
    // The badge carries the clear control, so the group keeps the arrow alone.
    await expect(actions()).toHaveLength(1)
    await expect(
      within(counter).getByRole("button", { name: "Svuota tutti i valori" }),
    ).toBeVisible()
    await expect(collapseCities).toHaveBeenLastCalledWith(["roma", "milano"])
  },
}

export const MultiselectClearAll: Story = {
  args: {
    multiple: true,
    multipleDisplay: "counter",
    defaultValue: ["roma", "milano", "napoli"],
    label: "Erogatori",
  },
  render: (args) => (
    <div className="w-68 max-w-full">
      <Autocomplete {...args} />
    </div>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const group = canvasElement.querySelector('[data-slot="autocomplete-multiple"]')
    if (!(group instanceof HTMLElement)) throw new Error("Expected the chips row")
    await expect(group.querySelector('[data-slot="autocomplete-counter"]')).toHaveTextContent("3")
    await userEvent.click(canvas.getByRole("button", { name: "Svuota tutti i valori" }))
    await expect(group.querySelector('[data-slot="autocomplete-counter"]')).toBeNull()
    await expect(canvas.getByRole("combobox", { name: /Erogatori/ })).toHaveValue("")
    await expect(canvas.getByRole("button", { name: "apri lista" })).toBeVisible()
  },
}

export const MultiselectBackspace: Story = {
  args: { multiple: true, defaultValue: ["roma"], label: "Erogatori" },
  render: (args) => (
    <div className="w-68 max-w-full">
      <Autocomplete {...args} />
    </div>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const field = canvas.getByRole("combobox", { name: /Erogatori/ })
    const group = canvasElement.querySelector('[data-slot="autocomplete-multiple"]')
    if (!(group instanceof HTMLElement)) throw new Error("Expected the chips row")
    await expect(within(group).getByText("Roma")).toBeVisible()
    field.focus()
    await userEvent.keyboard("{Backspace}")
    // The only value is gone, so the field is back to its resting label.
    await expect(within(group).queryByText("Roma")).toBeNull()
    await expect(canvas.getByRole("button", { name: "apri lista" })).toBeVisible()
  },
}

export const MultiselectSelectAll: Story = {
  args: {
    multiple: true,
    multipleDisplay: "counter",
    label: "Erogatori",
    selectAllLabel: "Seleziona tutti",
  },
  render: (args) => (
    <div className="w-68 max-w-full">
      <Autocomplete {...args} />
    </div>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await userEvent.click(canvas.getByRole("combobox", { name: /Erogatori/ }))
    await userEvent.click(await screen.findByRole("button", { name: "Seleziona tutti" }))
    const group = canvasElement.querySelector('[data-slot="autocomplete-multiple"]')
    if (!(group instanceof HTMLElement)) throw new Error("Expected the chips row")
    await expect(group.querySelector('[data-slot="autocomplete-counter"]')).toHaveTextContent("5")
    await userEvent.keyboard("{Escape}")
  },
}

const removeCity = fn()

export const MultiselectRemoveValue: Story = {
  args: {
    multiple: true,
    defaultValue: ["roma", "milano"],
    label: "Erogatori",
    removeValueLabel: (value) => `Togli ${value}`,
    onValueChange: removeCity,
  },
  render: (args) => (
    <div className="w-68 max-w-full">
      <Autocomplete {...args} />
    </div>
  ),
  play: async ({ canvasElement }) => {
    const group = canvasElement.querySelector('[data-slot="autocomplete-multiple"]')
    if (!(group instanceof HTMLElement)) throw new Error("Expected the chips row")
    await userEvent.click(within(group).getByRole("button", { name: "Togli Roma" }))
    await expect(within(group).queryByText("Roma")).toBeNull()
    await expect(within(group).getByText("Milano")).toBeVisible()
    await expect(removeCity).toHaveBeenLastCalledWith(["milano"])
  },
}

export const MultiselectOverridableTexts: Story = {
  args: {
    multiple: true,
    multipleDisplay: "counter",
    defaultValue: ["roma", "milano"],
    label: "Erogatori",
    clearLabel: "Cancella l'erogatore",
    clearAllLabel: "Azzera gli erogatori",
    counterLabel: (count) => `${count} erogatori scelti`,
    openLabel: "Mostra gli erogatori",
    closeLabel: "Nascondi gli erogatori",
    listLabel: (label) => `Suggerimenti per ${label}`,
    selectedLabel: (values) => `Erogatori scelti: ${values.join(" / ")}`,
    selectAllLabel: "Scegli tutti",
  },
  render: (args) => (
    <div className="w-68 max-w-full">
      <Autocomplete {...args} />
    </div>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await expect(canvas.getByText("2 erogatori scelti")).toBeInTheDocument()
    await userEvent.click(canvas.getByRole("button", { name: "Mostra gli erogatori" }))
    const listbox = await screen.findByRole("listbox")
    await expect(listbox).toHaveAccessibleName("Suggerimenti per Erogatori")
    await expect(await screen.findByRole("button", { name: "Scegli tutti" })).toBeVisible()
    await userEvent.keyboard("{Escape}")
    await userEvent.click(canvas.getByRole("button", { name: "Azzera gli erogatori" }))
    await userEvent.click(canvas.getByRole("button", { name: "Mostra gli erogatori" }))
    await userEvent.keyboard("{ArrowDown}{Enter}")
    await expect(canvas.getByText("Erogatori scelti: Roma")).toBeInTheDocument()
    await userEvent.keyboard("{Escape}")
    await expect(canvas.getByRole("button", { name: "Cancella l'erogatore" })).toBeVisible()
  },
}
