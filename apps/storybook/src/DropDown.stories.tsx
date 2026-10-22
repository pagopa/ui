import * as React from "react"
import type { Meta, StoryObj } from "@storybook/react-vite"
import { expect, fn, screen, userEvent, waitFor, within } from "storybook/test"

import { Copy, Trash2 } from "lucide-react"

import { Avatar } from "@/components/content"
import { PagoPAIcon } from "@/components/icons/PagoPAIcon"
import { Chip, DropDown, type DropDownItem } from "@/components/inputs"
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuTrigger,
} from "@/components/primitives/dropdown-menu"
import { Button } from "@/components/primitives/button"
import { figmaEmbedUrl } from "@/catalog/figma/file"

const copyMenuItem = fn()
const deleteMenuItem = fn()
const checkboxChanged = fn()
const globalCheckboxChanged = fn()
const mixedCheckboxChanged = fn()
const mixedAction = fn()
const backAction = fn()

function MultiSelectExample() {
  const [checked, setChecked] = React.useState(false)
  return (
    <DropDown
      triggerLabel="Filtri"
      items={[
        {
          id: "favorite",
          label: "Preferito",
          description: "Mostra solo gli elementi preferiti.",
          multiple: true,
          checked,
          onCheckedChange: (nextChecked) => {
            checkboxChanged(nextChecked)
            setChecked(nextChecked)
          },
        },
      ]}
    />
  )
}

const meta = {
  title: "Components/Inputs/DropDown",
  component: DropDown,
  args: {
    triggerLabel: "Gestisci",
    items: [
      { id: "copy", label: "Copia", icon: Copy, onSelect: copyMenuItem },
      {
        id: "delete",
        label: "Elimina",
        icon: Trash2,
        destructive: true,
        onSelect: deleteMenuItem,
      },
    ],
  },
  argTypes: {
    items: { control: false },
    label: { control: "text" },
  },
  parameters: {
    design: { type: "figma", url: figmaEmbedUrl("616:3864") },
    docs: {
      description: {
        component:
          'Accessible menu with rich actions and options. `multiple` items control `checked`/`onCheckedChange` as `menuitemcheckbox` without closing the menu. Global `multiselect` keeps the `checked`/`onSelect(checked)` items; explicit per-item callbacks stay the priority. `level="second"` and `indent` keep the indentation, `selected` marks the item, `leadingAlignment="label"` aligns the leading artwork with its label, and `type="cta"`/`back` stay actions in multiselect too. `dividers` controls the separators.',
      },
    },
  },
} satisfies Meta<typeof DropDown>

export default meta
type Story = StoryObj<typeof meta>

export const Playground: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const trigger = canvas.getByRole("button", { name: /Gestisci/ })
    await userEvent.click(trigger)
    const menu = await screen.findByRole("menu")
    await userEvent.click(within(menu).getByRole("menuitem", { name: /Copia/ }))
    await expect(copyMenuItem).toHaveBeenCalled()
    await waitFor(() => expect(screen.queryByRole("menu")).not.toBeInTheDocument())
    // The source DropDown (616:3864) is the open panel: leave the preview in
    // that state so the primary story shows the menu, not just the trigger.
    await userEvent.click(trigger)
    await screen.findByRole("menu")
  },
}

export const DestructiveItem: Story = {
  args: {
    items: [{ id: "delete", label: "Elimina", destructive: true, onSelect: deleteMenuItem }],
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await userEvent.click(canvas.getByRole("button", { name: /Gestisci/ }))
    const menu = await screen.findByRole("menu")
    await userEvent.click(within(menu).getByRole("menuitem", { name: /Elimina/ }))
    await expect(deleteMenuItem).toHaveBeenCalled()
  },
}

export const MultiSelect: Story = {
  tags: ["color-pinned"],
  render: () => <MultiSelectExample />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await userEvent.click(canvas.getByRole("button", { name: /Filtri/ }))
    const menu = await screen.findByRole("menu")
    const item = within(menu).getByRole("menuitemcheckbox", { name: "Preferito" })
    await expect(item).toHaveAttribute("aria-checked", "false")
    await waitFor(() => expect(menu).toHaveFocus())
    await userEvent.keyboard("{ArrowDown}")
    await waitFor(() => expect(item).toHaveFocus())

    await userEvent.keyboard(" ")
    await waitFor(() => expect(item).toHaveAttribute("aria-checked", "true"))
    await expect(checkboxChanged).toHaveBeenLastCalledWith(true)
    await expect(menu).toBeInTheDocument()

    await userEvent.keyboard(" ")
    await waitFor(() => expect(item).toHaveAttribute("aria-checked", "false"))
    await expect(checkboxChanged).toHaveBeenLastCalledWith(false)
    await expect(menu).toBeInTheDocument()
  },
}

export const EmptyState: Story = {
  args: {
    items: [],
    emptyTitle: "Non ci sono corrispondenze",
    emptyDescription: "Controlla i dati inseriti e riprova.",
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await userEvent.click(canvas.getByRole("button", { name: /Gestisci/ }))
    const menu = await screen.findByRole("menu")
    await waitFor(() => expect(menu).toHaveTextContent("Non ci sono corrispondenze"))
    await expect(menu).toHaveTextContent("Controlla i dati inseriti e riprova.")
    const emptyItem = within(menu).getByRole("menuitem")
    await expect(emptyItem).toHaveAttribute("aria-disabled", "true")
  },
}

export const Loading: Story = {
  args: { loading: true, items: [] },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await userEvent.click(canvas.getByRole("button", { name: /Gestisci/ }))
    const menu = await screen.findByRole("menu")
    const skeleton = menu.querySelector('[data-slot="dropdown-skeleton"]')
    if (!skeleton) throw new Error("Expected the dropdown skeleton")
    await waitFor(() => expect(skeleton).toBeVisible())
    await expect(within(menu).getByRole("menuitem")).toHaveAttribute("aria-disabled", "true")
  },
}

function SourceSingleSelect() {
  const [selected, setSelected] = React.useState("anagrafe")
  const items: DropDownItem[] = [
    {
      id: "anagrafe",
      label: "Anagrafe",
      selected: selected === "anagrafe",
      onSelect: () => setSelected("anagrafe"),
    },
    {
      id: "scuola",
      label: "Scuola",
      selected: selected === "scuola",
      onSelect: () => setSelected("scuola"),
    },
    {
      id: "tributi",
      label: "Tributi",
      selected: selected === "tributi",
      onSelect: () => setSelected("tributi"),
    },
  ]
  return (
    <DropDown
      triggerLabel="Servizio"
      items={items}
      back={{ label: "Tutti i servizi", onSelect: () => setSelected("") }}
    />
  )
}

export const SingleSelect: Story = {
  tags: ["color-pinned"],
  render: () => <SourceSingleSelect />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await userEvent.click(canvas.getByRole("button", { name: /Servizio/ }))
    const menu = await screen.findByRole("menu")
    const options = within(menu).getAllByRole("menuitem")
    await expect(options[0]).toHaveTextContent("Tutti i servizi")
    await userEvent.click(within(menu).getByRole("menuitem", { name: "Scuola" }))
    await waitFor(() => expect(screen.queryByRole("menu")).not.toBeInTheDocument())
    await userEvent.click(canvas.getByRole("button", { name: /Servizio/ }))
    const reopened = await screen.findByRole("menu")
    await expect(within(reopened).getByRole("menuitem", { name: "Scuola" })).toHaveClass(
      "bg-accent",
    )
  },
}

function MultiselectServices() {
  const [checked, setChecked] = React.useState<string[]>(["anagrafe"])
  const toggle = (id: string) => (next?: boolean) =>
    setChecked((previous) => (next ? [...previous, id] : previous.filter((entry) => entry !== id)))
  return (
    <DropDown
      multiselect
      triggerLabel="Filtra per servizio"
      back={{ label: "Tutti i servizi", onSelect: () => setChecked([]) }}
      items={[
        {
          id: "anagrafe",
          label: "Anagrafe",
          description: "Certificati e stati di famiglia",
          leading: <Avatar size="compact" alt="Anagrafe" initials="AN" />,
          chip: (
            <Chip size="compact" variant="warning">
              In scadenza
            </Chip>
          ),
          checked: checked.includes("anagrafe"),
          selected: checked.includes("anagrafe"),
          onSelect: toggle("anagrafe"),
        },
        {
          id: "certificati",
          label: "Certificati",
          description: "Righe di secondo livello",
          indent: true,
          checked: checked.includes("certificati"),
          selected: checked.includes("certificati"),
          onSelect: toggle("certificati"),
        },
      ]}
    />
  )
}

export const Multiselect: Story = {
  // Reflow exemption pending a design request: docs/design-requests/2026-10-16-a11y-reflow-conditions.md.
  parameters: { a11yContract: { reflow: false } },
  tags: ["color-pinned"],
  render: () => <MultiselectServices />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await userEvent.click(canvas.getByRole("button", { name: /Filtra per servizio/ }))
    const menu = await screen.findByRole("menu")
    await waitFor(() => expect(menu).toBeVisible())
    const anagrafe = within(menu).getByRole("menuitemcheckbox", { name: "Anagrafe" })
    const certificati = within(menu).getByRole("menuitemcheckbox", { name: "Certificati" })
    await expect(anagrafe).toHaveAttribute("aria-checked", "true")
    await expect(certificati).toHaveAttribute("aria-checked", "false")
    await userEvent.click(certificati)
    await expect(certificati).toHaveAttribute("aria-checked", "true")
    await expect(screen.getByRole("menu")).toBeVisible()
    await userEvent.click(anagrafe)
    await expect(anagrafe).toHaveAttribute("aria-checked", "false")
    await expect(screen.getByRole("menu")).toBeVisible()
  },
}

function MixedMultiselectExample() {
  const [globalChecked, setGlobalChecked] = React.useState(false)
  const [explicitChecked, setExplicitChecked] = React.useState(false)
  return (
    <DropDown
      triggerLabel="Opzioni miste"
      multiselect
      dividers={false}
      back={{ onSelect: backAction }}
      items={[
        {
          id: "global",
          label: "Opzione globale",
          checked: globalChecked,
          onSelect: (next) => {
            if (next === undefined) throw new Error("Expected a checkbox value")
            globalCheckboxChanged(next)
            setGlobalChecked(next)
          },
        },
        {
          id: "explicit",
          label: "Opzione esplicita",
          multiple: true,
          checked: explicitChecked,
          onCheckedChange: (next) => {
            mixedCheckboxChanged(next)
            setExplicitChecked(next)
          },
        },
        { id: "action", label: "Gestisci filtri", type: "cta", onSelect: mixedAction },
      ]}
    />
  )
}

export const MixedMultiselect: Story = {
  tags: ["color-pinned"],
  render: () => <MixedMultiselectExample />,
  play: async ({ canvasElement }) => {
    globalCheckboxChanged.mockClear()
    mixedCheckboxChanged.mockClear()
    mixedAction.mockClear()
    backAction.mockClear()
    const trigger = within(canvasElement).getByRole("button", { name: /Opzioni miste/ })
    await userEvent.click(trigger)
    const menu = await screen.findByRole("menu")
    await waitFor(() => expect(menu).toBeVisible())
    await expect(within(menu).queryAllByRole("separator")).toHaveLength(0)
    await userEvent.click(within(menu).getByRole("menuitemcheckbox", { name: "Opzione globale" }))
    await expect(globalCheckboxChanged).toHaveBeenLastCalledWith(true)
    await userEvent.click(within(menu).getByRole("menuitemcheckbox", { name: "Opzione esplicita" }))
    await expect(mixedCheckboxChanged).toHaveBeenLastCalledWith(true)
    await expect(menu).toBeVisible()
    await userEvent.click(within(menu).getByRole("menuitem", { name: "Gestisci filtri" }))
    await expect(mixedAction).toHaveBeenCalledTimes(1)
    await waitFor(() => expect(screen.queryByRole("menu")).not.toBeInTheDocument())
    await userEvent.click(trigger)
    const reopened = await screen.findByRole("menu")
    await userEvent.click(within(reopened).getByRole("menuitem", { name: "Indietro" }))
    await expect(backAction).toHaveBeenCalledTimes(1)
  },
}

function StaticIndicatorExample() {
  const [checked, setChecked] = React.useState(true)
  return (
    <DropdownMenu>
      <DropdownMenuTrigger render={<Button type="button" />}>
        Indicatore statico
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuGroup>
          <DropdownMenuCheckboxItem
            checked={checked}
            onCheckedChange={setChecked}
            indicator={
              <span data-static-indicator aria-hidden="true">
                <PagoPAIcon name="check_box" variant="checked" />
              </span>
            }
          >
            Preferito
          </DropdownMenuCheckboxItem>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

// The source panel (`616:3864`): a location action row followed by five rich
// option rows with their dividers. The mockup repeats one row; the fixture keeps
// the count so the panel is the source's content-driven sample. `selected` and
// the multiselect check states are the source `Status`/`Checked` axes.
type SourcePanelMode = "single" | "single-selected" | "multi" | "multi-selected" | "multi-all"

function SourcePanel({ mode }: { mode: SourcePanelMode }) {
  const multiple = mode === "multi" || mode === "multi-selected" || mode === "multi-all"
  const initial = mode === "multi-all" ? [1, 2, 3, 4, 5] : mode === "multi-selected" ? [1] : []
  const [checked, setChecked] = React.useState<number[]>(initial)
  const options: DropDownItem[] = [1, 2, 3, 4, 5].map((index) => {
    const common = {
      id: `option-${index}`,
      label: "Value",
      description: "Description",
      leading: <PagoPAIcon name="location_on" size={16} />,
      chip: (
        <Chip variant="warning" size="compact" data-slot="chip">
          <span data-slot="chip-label" className="font-medium">
            Warning
          </span>
        </Chip>
      ),
      leadingAlignment: "label" as const,
    }
    return multiple
      ? {
          ...common,
          multiple: true as const,
          checked: checked.includes(index),
          onCheckedChange: (next: boolean) =>
            setChecked((previous) =>
              next ? [...previous, index] : previous.filter((entry) => entry !== index),
            ),
        }
      : {
          ...common,
          multiple: false as const,
          selected: mode === "single-selected" && index === 1,
          onSelect: () => undefined,
        }
  })
  const items: DropDownItem[] = [
    {
      id: "location",
      label: "Usa posizione attuale",
      leading: <PagoPAIcon name="my_location" size={24} className="text-primary" />,
      type: "cta",
      onSelect: () => undefined,
    },
    ...options,
  ]
  return (
    <div className="w-[274px] max-w-full">
      <DropDown triggerLabel="Open options" className="w-full" items={items} />
    </div>
  )
}

export const SourcePanelDefault: Story = {
  tags: ["color-pinned"],
  render: () => <SourcePanel mode="single" />,
}

export const SourcePanelSelected: Story = {
  tags: ["color-pinned"],
  render: () => <SourcePanel mode="single-selected" />,
}

export const SourcePanelMultiselect: Story = {
  tags: ["color-pinned"],
  render: () => <SourcePanel mode="multi" />,
}

export const SourcePanelMultiselectSelected: Story = {
  tags: ["color-pinned"],
  render: () => <SourcePanel mode="multi-selected" />,
}

export const SourcePanelMultiselectAll: Story = {
  tags: ["color-pinned"],
  render: () => <SourcePanel mode="multi-all" />,
}

export const SourcePanelEmpty: Story = {
  tags: ["color-pinned"],
  render: () => (
    <div className="w-[274px] max-w-full">
      <DropDown
        triggerLabel="Open options"
        className="w-full"
        items={[]}
        emptyTitle="Non ci sono corrispondenze da mostrare"
        emptyDescription="Controlla i dati inseriti oppure inserisci un altro indirizzo o città."
      />
    </div>
  ),
}

export const SourcePanelSkeleton: Story = {
  tags: ["color-pinned"],
  render: () => (
    <div className="w-[274px] max-w-full">
      <DropDown triggerLabel="Open options" className="w-full" items={[]} loading />
    </div>
  ),
}

export const StaticIndicator: Story = {
  // Reflow exemption pending a design request: docs/design-requests/2026-10-16-a11y-reflow-conditions.md.
  parameters: { a11yContract: { reflow: false } },
  render: () => <StaticIndicatorExample />,
  play: async ({ canvasElement }) => {
    await userEvent.click(within(canvasElement).getByRole("button", { name: "Indicatore statico" }))
    const menu = await screen.findByRole("menu")
    const indicator = menu.querySelector("[data-static-indicator]")
    if (!indicator) throw new Error("Static checkbox indicator was not rendered")
    await waitFor(() => expect(indicator).toBeVisible())
    const checkbox = within(menu).getByRole("menuitemcheckbox", { name: "Preferito" })
    await userEvent.click(checkbox)
    await expect(checkbox).toHaveAttribute("aria-checked", "false")
    await waitFor(() => expect(indicator).not.toBeInTheDocument())
    await expect(menu).toBeVisible()
  },
}
