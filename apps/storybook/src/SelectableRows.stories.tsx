import * as React from "react"
import { Dialog as DialogPrimitive } from "@base-ui/react/dialog"
import type { Meta, StoryObj } from "@storybook/react-vite"
import { expect, screen, userEvent, waitFor, within } from "storybook/test"

import { Avatar } from "@/components/content"
import {
  Autocomplete,
  Chip,
  DropDown,
  MenuDropDown,
  MultiSelectField,
  SelectField,
} from "@/components/inputs"
import { Button } from "@/components/primitives/button"
import { figmaEmbedUrl } from "@/catalog/figma/file"

const meta = {
  title: "Components/Inputs/SelectableRows",
  component: SelectField,
  args: { label: "Comune", options: [] },
  parameters: {
    layout: "padded",
    design: { type: "figma", url: figmaEmbedUrl("602:9417") },
  },
} satisfies Meta<typeof SelectField>

export default meta
type Story = StoryObj<typeof meta>

const sourceOptions = [
  {
    value: "roma",
    label: "Roma",
    description: "Description",
    leading: <Avatar alt="Identità di Roma" size="compact" />,
    chip: (
      <Chip size="compact" variant="warning">
        Warning
      </Chip>
    ),
  },
  { value: "milano", label: "Milano", description: "Description" },
]

function NativeSourceChoice() {
  const [submitted, setSubmitted] = React.useState("")
  return (
    <form
      className="grid w-[274px] max-w-full gap-4"
      onSubmit={(event) => {
        event.preventDefault()
        setSubmitted(String(new FormData(event.currentTarget).get("city") ?? ""))
      }}
    >
      <SelectField
        label="Comune della riga"
        name="city"
        defaultValue="milano"
        options={sourceOptions}
      />
      <Button type="submit">Invia comune</Button>
      <Button type="reset" variant="outline">
        Ripristina comune
      </Button>
      <output aria-label="Comune inviato">{submitted}</output>
    </form>
  )
}

export const RichSingleChoice: Story = {
  tags: ["color-pinned"],
  render: () => <NativeSourceChoice />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const trigger = canvas.getByRole("combobox", { name: "Comune della riga" })
    await expect(trigger).toHaveTextContent("Milano")
    await userEvent.click(trigger)
    const list = await screen.findByRole("listbox", { name: "Comune della riga" })
    const option = within(list).getByRole("option", { name: "Roma" })
    await expect(within(option).getByText("Description")).toBeVisible()
    await expect(within(option).getByText("Warning")).toBeVisible()
    await expect(option).toHaveAccessibleDescription("Description Warning")
    const chip = within(option).getByText("Warning").parentElement
    if (!(chip instanceof HTMLElement)) throw new Error("Expected the visible source Warning chip")
    await expect(getComputedStyle(chip).backgroundColor).toBe("rgb(255, 245, 218)")
    await expect(getComputedStyle(chip).color).toBe("rgb(97, 76, 21)")
    const avatar = option.querySelector("[data-slot=avatar]")
    if (!(avatar instanceof HTMLElement)) throw new Error("Expected the source Product-row Avatar")
    await expect(avatar.getBoundingClientRect().width).toBe(32)
    await expect(option.getBoundingClientRect().height).toBe(68)
    await userEvent.click(option)
    await expect(trigger).toHaveTextContent("Roma")
    await expect(trigger).not.toHaveTextContent("Description")
    await expect(trigger).not.toHaveTextContent("Warning")
    await userEvent.click(canvas.getByRole("button", { name: "Invia comune" }))
    await expect(canvas.getByRole("status", { name: "Comune inviato" })).toHaveTextContent("roma")
    await userEvent.click(canvas.getByRole("button", { name: "Ripristina comune" }))
    await expect(trigger).toHaveTextContent("Milano")
  },
}

function NativeSourceChoices() {
  const [submitted, setSubmitted] = React.useState("")
  return (
    <form
      className="grid w-[274px] max-w-full gap-4"
      onSubmit={(event) => {
        event.preventDefault()
        setSubmitted(
          new FormData(event.currentTarget).getAll("cities").map(String).sort().join(","),
        )
      }}
    >
      <MultiSelectField
        label="Comuni delle righe"
        name="cities"
        defaultValue={["milano"]}
        options={sourceOptions}
      />
      <Button type="submit">Invia comuni</Button>
      <Button type="reset" variant="outline">
        Ripristina comuni
      </Button>
      <output aria-label="Comuni inviati">{submitted}</output>
    </form>
  )
}

export const RichMultipleChoices: Story = {
  render: () => <NativeSourceChoices />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const trigger = canvas.getByRole("combobox", { name: "Comuni delle righe" })
    await userEvent.click(trigger)
    const list = await screen.findByRole("listbox", { name: "Comuni delle righe" })
    await expect(list).toHaveAttribute("aria-multiselectable", "true")
    const option = within(list).getByRole("option", { name: "Roma" })
    await waitFor(() => expect(within(option).getByText("Description")).toBeVisible())
    await expect(option).toHaveAccessibleDescription("Description Warning")
    await expect(option).toHaveAttribute("aria-selected", "false")
    await waitFor(() => expect(option.getBoundingClientRect().height).toBe(96))
    const uncheckedGlyph = option.querySelector("[data-figma-node-id='96:666']")
    if (!(uncheckedGlyph instanceof HTMLElement))
      throw new Error("Expected the visible source unchecked square, not a second form control")
    await expect(uncheckedGlyph).toBeVisible()
    await expect(uncheckedGlyph.getBoundingClientRect().width).toBe(24)
    await expect(uncheckedGlyph.getBoundingClientRect().height).toBe(24)
    await expect(within(option).queryByRole("checkbox")).not.toBeInTheDocument()
    const chip = within(option).getByText("Warning").parentElement
    if (!(chip instanceof HTMLElement)) throw new Error("Expected the complete source status chip")
    await expect(
      chip.getBoundingClientRect().top -
        within(option).getByText("Description").getBoundingClientRect().bottom,
    ).toBe(4)
    await userEvent.click(option)
    await expect(option).toHaveAttribute("aria-selected", "true")
    const checkedGlyph = option.querySelector("[data-figma-node-id='96:667']")
    if (!(checkedGlyph instanceof HTMLElement))
      throw new Error("Expected the source checked square")
    await expect(checkedGlyph).toBeVisible()
    await expect(checkedGlyph.getBoundingClientRect().width).toBe(24)
    await expect(list).toBeVisible()
    await userEvent.keyboard("{Escape}")
    await userEvent.click(canvas.getByRole("button", { name: "Invia comuni" }))
    await expect(canvas.getByRole("status", { name: "Comuni inviati" })).toHaveTextContent(
      "milano,roma",
    )
    await userEvent.click(canvas.getByRole("button", { name: "Ripristina comuni" }))
    await expect(trigger).toHaveTextContent("Milano")
    await expect(trigger).not.toHaveTextContent("Roma")
    await userEvent.click(canvas.getByRole("button", { name: "Invia comuni" }))
    await expect(canvas.getByRole("status", { name: "Comuni inviati" })).toHaveTextContent("milano")
  },
}

function NativeSourceAutocomplete() {
  const [submitted, setSubmitted] = React.useState("")
  return (
    <form
      className="grid w-[274px] max-w-full gap-4"
      onSubmit={(event) => {
        event.preventDefault()
        setSubmitted(String(new FormData(event.currentTarget).get("city") ?? ""))
      }}
    >
      <Autocomplete
        label="Comune da cercare"
        name="city"
        defaultValue="milano"
        options={sourceOptions}
      />
      <Button type="submit">Invia ricerca</Button>
      <Button type="reset" variant="outline">
        Ripristina ricerca
      </Button>
      <output aria-label="Comune cercato">{submitted}</output>
    </form>
  )
}

export const RichSearchableChoice: Story = {
  render: () => <NativeSourceAutocomplete />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const input = canvas.getByRole("combobox", { name: "Comune da cercare" })
    await expect(input).toHaveValue("Milano")
    await userEvent.clear(input)
    await userEvent.type(input, "Ro")
    const list = await screen.findByRole("listbox", { name: "Lista Comune da cercare" })
    const option = within(list).getByRole("option", { name: "Roma" })
    await waitFor(() => expect(within(option).getByText("Description")).toBeVisible())
    await expect(option).toHaveAccessibleDescription("Description Warning")
    await expect(within(list).queryByRole("option", { name: "Milano" })).not.toBeInTheDocument()
    await waitFor(() => expect(option.getBoundingClientRect().height).toBe(68))
    await userEvent.click(option)
    await expect(input).toHaveValue("Roma")
    await userEvent.click(canvas.getByRole("button", { name: "Invia ricerca" }))
    await expect(canvas.getByRole("status", { name: "Comune cercato" })).toHaveTextContent("roma")
    await userEvent.click(canvas.getByRole("button", { name: "Ripristina ricerca" }))
    await expect(input).toHaveValue("Milano")
  },
}

function NativeSourceActionMenus() {
  const [action, setAction] = React.useState("")
  const [submitted, setSubmitted] = React.useState(false)
  const items: React.ComponentProps<typeof DropDown>["items"] = [
    { ...sourceOptions[0], id: "rome", onSelect: () => setAction("Comando per Roma ricevuto") },
    { id: "unavailable", label: "Comando non disponibile", disabled: true },
  ]
  return (
    <form
      className="grid w-[274px] max-w-full gap-4"
      onSubmit={(event) => {
        event.preventDefault()
        setSubmitted(true)
      }}
    >
      <DropDown triggerLabel="Comandi della riga" items={items} />
      <MenuDropDown accessibleLabel="Altri comandi della riga" items={items} />
      <output aria-label="Comando della riga">{action}</output>
      <output aria-label="Invio del menu">{submitted ? "Inviato" : "Non inviato"}</output>
    </form>
  )
}

export const RichActionMenus: Story = {
  render: () => <NativeSourceActionMenus />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    for (const name of ["Comandi della riga", "Altri comandi della riga"]) {
      const trigger = canvas.getByRole("button", { name })
      trigger.focus()
      await userEvent.keyboard("{Enter}")
      const menu = await screen.findByRole("menu")
      const command = within(menu).getByRole("menuitem", { name: "Roma" })
      await waitFor(() => expect(within(command).getByText("Description")).toBeVisible())
      await expect(command).toHaveAccessibleDescription("Description Warning")
      await expect(
        within(menu).getByRole("menuitem", { name: "Comando non disponibile" }),
      ).toHaveAttribute("aria-disabled", "true")
      command.focus()
      await userEvent.keyboard("{Enter}")
      await expect(canvas.getByRole("status", { name: "Comando della riga" })).toHaveTextContent(
        "Comando per Roma ricevuto",
      )
      await waitFor(() => expect(screen.queryByRole("menu")).not.toBeInTheDocument())
      await expect(trigger).toHaveFocus()
      await expect(canvas.getByRole("status", { name: "Invio del menu" })).toHaveTextContent(
        "Non inviato",
      )
    }
  },
}

function SourceChoiceCommand({
  actionDisabled = false,
  openDialogOnAction = false,
}: {
  actionDisabled?: boolean
  openDialogOnAction?: boolean
} = {}) {
  const [command, setCommand] = React.useState("")
  const [commandCount, setCommandCount] = React.useState(0)
  const [submitted, setSubmitted] = React.useState("")
  const [submitCount, setSubmitCount] = React.useState(0)
  const [dialogOpen, setDialogOpen] = React.useState(false)
  return (
    <>
      <form
        className="grid w-[274px] max-w-full gap-4"
        onSubmit={(event) => {
          event.preventDefault()
          setSubmitCount((count) => count + 1)
          setSubmitted(String(new FormData(event.currentTarget).get("city") ?? ""))
        }}
      >
        <SelectField
          label="Comune con comando"
          name="city"
          defaultValue="milano"
          options={sourceOptions}
          action={{
            label: "Usa posizione attuale",
            disabled: actionDisabled,
            onAction: () => {
              setCommandCount((count) => count + 1)
              setCommand(
                screen.queryByRole("listbox")
                  ? "Comando ricevuto con popup aperto"
                  : "Comando ricevuto dopo la chiusura",
              )
              if (openDialogOnAction) setDialogOpen(true)
            },
          }}
        />
        <Button type="submit">Invia senza nuova scelta</Button>
        <output aria-label="Comando del chooser">{command}</output>
        <output aria-label="Numero di comandi">{commandCount}</output>
        <output aria-label="Valore dopo il comando">{submitted}</output>
        <output aria-label="Numero di invii">{submitCount}</output>
      </form>
      <DialogPrimitive.Root open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogPrimitive.Portal>
          <DialogPrimitive.Backdrop className="fixed inset-0 z-40 bg-black/45" />
          <DialogPrimitive.Popup className="fixed top-1/2 left-1/2 z-50 grid -translate-x-1/2 -translate-y-1/2 gap-4 rounded-lg bg-background p-6 shadow-lg">
            <DialogPrimitive.Title>Comando completato</DialogPrimitive.Title>
            <Button type="button">Continua nel dialog</Button>
          </DialogPrimitive.Popup>
        </DialogPrimitive.Portal>
      </DialogPrimitive.Root>
    </>
  )
}

export const ChoiceCommandDoesNotSelect: Story = {
  render: () => <SourceChoiceCommand />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const trigger = canvas.getByRole("combobox", { name: "Comune con comando" })
    await userEvent.click(trigger)
    const list = await screen.findByRole("listbox", { name: "Comune con comando" })
    const command = await screen.findByRole("button", { name: "Usa posizione attuale" })
    await expect(list).not.toContainElement(command)
    await userEvent.click(command)
    await waitFor(() =>
      expect(canvas.getByRole("status", { name: "Comando del chooser" })).toHaveTextContent(
        "Comando ricevuto dopo la chiusura",
      ),
    )
    await expect(canvas.getByRole("status", { name: "Numero di comandi" })).toHaveTextContent("1")
    await expect(screen.queryByRole("listbox")).not.toBeInTheDocument()
    await expect(trigger).toHaveTextContent("Milano")
    await expect(canvas.getByRole("status", { name: "Numero di invii" })).toHaveTextContent("0")
    await userEvent.click(canvas.getByRole("button", { name: "Invia senza nuova scelta" }))
    await expect(canvas.getByRole("status", { name: "Valore dopo il comando" })).toHaveTextContent(
      "milano",
    )
    await expect(canvas.getByRole("status", { name: "Numero di invii" })).toHaveTextContent("1")

    await userEvent.click(trigger)
    await screen.findByRole("listbox", { name: "Comune con comando" })
    const keyboardCommand = screen.getByRole("button", { name: "Usa posizione attuale" })
    keyboardCommand.focus()
    await userEvent.keyboard("{Enter}")
    await waitFor(() =>
      expect(canvas.getByRole("status", { name: "Numero di comandi" })).toHaveTextContent("2"),
    )
    await expect(canvas.getByRole("status", { name: "Comando del chooser" })).toHaveTextContent(
      "Comando ricevuto dopo la chiusura",
    )
    await expect(screen.queryByRole("listbox")).not.toBeInTheDocument()
    await expect(trigger).toHaveTextContent("Milano")
    await expect(canvas.getByRole("status", { name: "Numero di invii" })).toHaveTextContent("1")
  },
}

export const DisabledChoiceCommand: Story = {
  render: () => <SourceChoiceCommand actionDisabled />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await userEvent.click(canvas.getByRole("combobox", { name: "Comune con comando" }))
    const list = await screen.findByRole("listbox", { name: "Comune con comando" })
    const disabledCommand = screen.getByRole("button", { name: "Usa posizione attuale" })
    await expect(disabledCommand).toBeDisabled()
    await expect(canvas.getByRole("status", { name: "Numero di comandi" })).toHaveTextContent("0")
    await expect(list).toBeVisible()
    await expect(canvas.getByRole("status", { name: "Numero di invii" })).toHaveTextContent("0")
  },
}

export const ChoiceCommandOpensOverlay: Story = {
  render: () => <SourceChoiceCommand openDialogOnAction />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await userEvent.click(canvas.getByRole("combobox", { name: "Comune con comando" }))
    await screen.findByRole("listbox", { name: "Comune con comando" })
    await userEvent.click(screen.getByRole("button", { name: "Usa posizione attuale" }))
    const dialog = await screen.findByRole("dialog", { name: "Comando completato" })
    await expect(screen.queryByRole("listbox")).not.toBeInTheDocument()
    // The action opens the dialog one commit after the chooser popup closed:
    // give the focus handover a budget the loaded CI runner can meet.
    await waitFor(
      () => {
        const focused = document.activeElement
        if (!(focused instanceof HTMLElement)) throw new Error("Expected dialog focus to be set")
        expect(dialog).toContainElement(focused)
      },
      { timeout: 5000 },
    )
    const commandCount = canvasElement.querySelector<HTMLOutputElement>(
      'output[aria-label="Numero di comandi"]',
    )
    const submitCount = canvasElement.querySelector<HTMLOutputElement>(
      'output[aria-label="Numero di invii"]',
    )
    if (!commandCount || !submitCount) throw new Error("Expected chooser action form outputs")
    await expect(commandCount).toHaveTextContent("1")
    await expect(submitCount).toHaveTextContent("0")
  },
}

export const ChoiceCommandSurfacesCallbackErrors: Story = {
  parameters: {
    // The story lets the callback error reach the window on purpose, proving
    // the field does not swallow it. Chromatic's runner reports that as an
    // unhandled error and fails the story, so the opt-in visual run skips it;
    // the browser suite still asserts the surfacing behaviour.
    chromatic: { disableSnapshot: true },
  },
  render: () => (
    <SelectField
      label="Comune con callback fallibile"
      options={sourceOptions}
      action={{
        label: "Avvia comando fallibile",
        onAction: () => {
          throw new Error("Errore del comando")
        },
      }}
    />
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const errors: Error[] = []
    const captureError = (event: ErrorEvent) => {
      if (event.error instanceof Error && event.error.message === "Errore del comando") {
        errors.push(event.error)
        event.preventDefault()
      }
    }

    window.addEventListener("error", captureError)
    try {
      await userEvent.click(canvas.getByRole("combobox", { name: "Comune con callback fallibile" }))
      await screen.findByRole("listbox", { name: "Comune con callback fallibile" })
      await userEvent.click(screen.getByRole("button", { name: "Avvia comando fallibile" }))
      await waitFor(() => expect(errors).toHaveLength(1))
      await expect(screen.queryByRole("listbox")).not.toBeInTheDocument()
    } finally {
      window.removeEventListener("error", captureError)
    }
  },
}

function SourceMultiChoiceCommand({
  openDialogOnAction = false,
}: {
  openDialogOnAction?: boolean
}) {
  const [command, setCommand] = React.useState("")
  const [commandCount, setCommandCount] = React.useState(0)
  const [submitted, setSubmitted] = React.useState("")
  const [submitCount, setSubmitCount] = React.useState(0)
  const [dialogOpen, setDialogOpen] = React.useState(false)
  return (
    <>
      <form
        className="grid w-[274px] max-w-full gap-4"
        aria-label="Comuni con comando"
        onSubmit={(event) => {
          event.preventDefault()
          setSubmitCount((count) => count + 1)
          setSubmitted(
            new FormData(event.currentTarget).getAll("cities").map(String).sort().join(","),
          )
        }}
      >
        <MultiSelectField
          label="Comuni con comando"
          name="cities"
          defaultValue={["milano"]}
          options={sourceOptions}
          action={{
            label: "Usa posizione attuale",
            onAction: () => {
              setCommandCount((count) => count + 1)
              setCommand(
                screen.queryByRole("listbox")
                  ? "Comando ricevuto con popup aperto"
                  : "Comando ricevuto dopo la chiusura",
              )
              if (openDialogOnAction) setDialogOpen(true)
            },
          }}
        />
        <Button type="submit">Invia comuni</Button>
        <output aria-label="Comando del multichooser">{command}</output>
        <output aria-label="Numero di comandi del multichooser">{commandCount}</output>
        <output aria-label="Comuni inviati">{submitted}</output>
        <output aria-label="Numero di invii dei comuni">{submitCount}</output>
      </form>
      <DialogPrimitive.Root open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogPrimitive.Portal>
          <DialogPrimitive.Backdrop className="fixed inset-0 z-40 bg-black/45" />
          <DialogPrimitive.Popup className="fixed top-1/2 left-1/2 z-50 grid -translate-x-1/2 -translate-y-1/2 gap-4 rounded-lg bg-background p-6 shadow-lg">
            <DialogPrimitive.Title>Comando dei comuni completato</DialogPrimitive.Title>
            <Button type="button">Continua con i comuni</Button>
          </DialogPrimitive.Popup>
        </DialogPrimitive.Portal>
      </DialogPrimitive.Root>
    </>
  )
}

export const MultiSelectChoiceCommandDoesNotSelect: Story = {
  render: () => <SourceMultiChoiceCommand />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const form = canvas.getByRole("form", { name: "Comuni con comando" })
    if (!(form instanceof HTMLFormElement)) throw new Error("Expected a native form")
    const trigger = canvas.getByRole("combobox", { name: "Comuni con comando" })
    await userEvent.click(trigger)
    const list = await screen.findByRole("listbox", { name: "Comuni con comando" })
    await expect(list).toHaveAttribute("aria-multiselectable", "true")
    await userEvent.click(within(list).getByRole("option", { name: "Roma" }))
    const selectedValues = new FormData(form).getAll("cities")
    await expect(selectedValues).toEqual(["milano", "roma"])

    const command = screen.getByRole("button", { name: "Usa posizione attuale" })
    await expect(list).not.toContainElement(command)
    await userEvent.click(command)
    await waitFor(() =>
      expect(canvas.getByRole("status", { name: "Comando del multichooser" })).toHaveTextContent(
        "Comando ricevuto dopo la chiusura",
      ),
    )
    await expect(screen.queryByRole("listbox")).not.toBeInTheDocument()
    await expect(new FormData(form).getAll("cities")).toEqual(selectedValues)
    await expect(
      canvas.getByRole("status", { name: "Numero di comandi del multichooser" }),
    ).toHaveTextContent("1")
    await expect(
      canvas.getByRole("status", { name: "Numero di invii dei comuni" }),
    ).toHaveTextContent("0")

    await userEvent.click(canvas.getByRole("button", { name: "Invia comuni" }))
    await expect(canvas.getByRole("status", { name: "Comuni inviati" })).toHaveTextContent(
      "milano,roma",
    )
    await expect(
      canvas.getByRole("status", { name: "Numero di invii dei comuni" }),
    ).toHaveTextContent("1")

    trigger.focus()
    await userEvent.keyboard("{Enter}")
    const keyboardList = await screen.findByRole("listbox", { name: "Comuni con comando" })
    const keyboardCommand = screen.getByRole("button", { name: "Usa posizione attuale" })
    await expect(keyboardCommand).toHaveAttribute("tabindex", "0")
    await userEvent.keyboard("{ArrowDown}")
    const focusedOption = document.activeElement
    if (!(focusedOption instanceof HTMLElement))
      throw new Error("Expected a focused multiselect option")
    await expect(keyboardList).toContainElement(focusedOption)
    await userEvent.keyboard("{Shift>}{Tab}{/Shift}")
    await expect(keyboardCommand).toHaveFocus()
    await userEvent.keyboard(" ")
    await waitFor(() =>
      expect(
        canvas.getByRole("status", { name: "Numero di comandi del multichooser" }),
      ).toHaveTextContent("2"),
    )
    await expect(screen.queryByRole("listbox")).not.toBeInTheDocument()
    await expect(new FormData(form).getAll("cities")).toEqual(selectedValues)
    await expect(
      canvas.getByRole("status", { name: "Numero di invii dei comuni" }),
    ).toHaveTextContent("1")
  },
}

export const MultiSelectChoiceCommandOpensOverlay: Story = {
  render: () => <SourceMultiChoiceCommand openDialogOnAction />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const form = canvas.getByRole("form", { name: "Comuni con comando" })
    if (!(form instanceof HTMLFormElement)) throw new Error("Expected a native multiselect form")
    const trigger = canvas.getByRole("combobox", { name: "Comuni con comando" })
    await userEvent.click(trigger)
    const list = await screen.findByRole("listbox", { name: "Comuni con comando" })
    await userEvent.click(within(list).getByRole("option", { name: "Roma" }))
    const selectedValues = new FormData(form).getAll("cities")
    await expect(selectedValues).toEqual(["milano", "roma"])

    await userEvent.click(screen.getByRole("button", { name: "Usa posizione attuale" }))
    const dialog = await screen.findByRole("dialog", { name: "Comando dei comuni completato" })
    await expect(screen.queryByRole("listbox")).not.toBeInTheDocument()
    // The action opens the dialog one commit after the chooser popup closed:
    // give the focus handover a budget the loaded CI runner can meet.
    await waitFor(
      () => {
        const focused = document.activeElement
        if (!(focused instanceof HTMLElement)) throw new Error("Expected dialog focus to be set")
        expect(dialog).toContainElement(focused)
      },
      { timeout: 5000 },
    )
    await expect(new FormData(form).getAll("cities")).toEqual(selectedValues)
    const commandCount = canvasElement.querySelector<HTMLOutputElement>(
      'output[aria-label="Numero di comandi del multichooser"]',
    )
    const submitCount = canvasElement.querySelector<HTMLOutputElement>(
      'output[aria-label="Numero di invii dei comuni"]',
    )
    if (!commandCount || !submitCount) throw new Error("Expected multiselect command form outputs")
    await expect(commandCount).toHaveTextContent("1")
    await expect(submitCount).toHaveTextContent("0")

    await userEvent.keyboard("{Escape}")
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument())
    await expect(trigger).toHaveFocus()
  },
}
