import { useState } from "react"
import type { Meta, StoryObj } from "@storybook/react-vite"
import { expect, fn, screen, userEvent, waitFor, within } from "storybook/test"
import type { DateRange } from "react-day-picker"

import { DatePicker, DatePickerField } from "@/components/inputs"
import { Button } from "@/components/primitives/button"
import { Calendar } from "@/components/primitives/calendar"
import { figmaEmbedUrl } from "@/catalog/figma/file"

import datesGuide from "./guides/dates-and-ranges.md?raw"
import { fieldError } from "./support/a11y-contract"

const meta = {
  title: "Components/Inputs/DatePicker",
  component: DatePicker,
  parameters: {
    design: { type: "figma", url: figmaEmbedUrl("8049:39452") },
    docs: {
      description: {
        component: datesGuide,
      },
    },
  },
  args: { onConfirm: fn(), onCancel: fn() },
} satisfies Meta<typeof DatePicker>

export default meta
type Story = StoryObj<typeof meta>

function SingleDateExample() {
  const [value, setValue] = useState(new Date(2026, 4, 11))
  return (
    <div className="grid w-[310px] max-w-full gap-4">
      <DatePicker value={value} onConfirm={setValue} onCancel={fn()} />
      <output aria-label="Data confermata">
        {value.toLocaleDateString("it-IT", {
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
        })}
      </output>
    </div>
  )
}

export const SingleDateConfirmation: Story = {
  tags: ["color-pinned"],
  name: "Conferma data singola",
  render: () => <SingleDateExample />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const calendar = within(canvas.getByRole("grid", { name: /maggio 2026/i }))
    await userEvent.click(calendar.getByRole("button", { name: /12 maggio 2026/i }))
    await expect(canvas.getByRole("status", { name: "Data confermata" })).toHaveTextContent(
      "11/05/2026",
    )
    await userEvent.click(canvas.getByRole("button", { name: "Salva" }))
    await expect(canvas.getByRole("status", { name: "Data confermata" })).toHaveTextContent(
      "12/05/2026",
    )
    // The source panel's block rhythm (8049:39452): a 44px label row, the 42px
    // month row with its full-bleed divider, an 8px inset date grid and 36px
    // day rows whose 44px pointer target is the invisible expansion.
    const panel = canvas.getByRole("group", { name: "Seleziona data" })
    const panelBox = panel.getBoundingClientRect()
    const grid = panel.querySelector("table")
    const month = grid?.parentElement
    const caption = month?.firstElementChild
    if (!(grid instanceof HTMLTableElement) || !(caption instanceof HTMLElement)) {
      throw new Error("Expected the source calendar panel")
    }
    const round = (value: number) => Math.round(value)
    const labelRow = panel.querySelector('[id$="-label"]')
    if (!(labelRow instanceof HTMLElement)) throw new Error("Expected the panel label row")
    await expect(round(labelRow.getBoundingClientRect().height)).toBe(36)
    await expect(round(caption.getBoundingClientRect().top - panelBox.top)).toBe(44)
    await expect(round(caption.getBoundingClientRect().height)).toBe(43)
    await expect(round(caption.getBoundingClientRect().width)).toBe(round(panelBox.width))
    await expect(round(caption.getBoundingClientRect().left - panelBox.left)).toBe(0)
    await expect(round(grid.getBoundingClientRect().left - panelBox.left)).toBe(8)
    const firstWeekday = grid.querySelector("thead th")
    const firstRow = grid.querySelector("tbody tr")
    const firstDay = grid.querySelector("tbody td")
    if (
      !(firstWeekday instanceof HTMLElement) ||
      !(firstRow instanceof HTMLTableRowElement) ||
      !(firstDay instanceof HTMLTableCellElement)
    ) {
      throw new Error("Expected the parsed date grid")
    }
    await expect(round(firstWeekday.getBoundingClientRect().left - panelBox.left)).toBe(8)
    await expect(round(firstRow.getBoundingClientRect().height)).toBe(44)
    await expect(round(firstDay.getBoundingClientRect().height)).toBe(44)
    // The source footer and month navigation keep their own geometry: a 46px
    // footer with 22px text actions and two 24px chevrons 4px apart.
    const footer = panel.lastElementChild
    if (!(footer instanceof HTMLElement)) throw new Error("Expected the panel footer")
    await expect(round(footer.getBoundingClientRect().height)).toBe(46)
    const actions = [...footer.querySelectorAll("button")]
    await expect(actions).toHaveLength(2)
    for (const action of actions) {
      await expect(round(action.getBoundingClientRect().height)).toBe(22)
      await expect(round(action.getBoundingClientRect().width)).toBeGreaterThanOrEqual(40)
    }
    const nav = panel.querySelector("nav")
    const navButtons = nav ? [...nav.querySelectorAll("button")] : []
    await expect(navButtons).toHaveLength(2)
    for (const button of navButtons) {
      await expect(round(button.getBoundingClientRect().width)).toBe(24)
      await expect(round(button.getBoundingClientRect().height)).toBe(24)
    }
    await expect(round(panelBox.right - navButtons[1].getBoundingClientRect().right)).toBe(16)
  },
}

function RangeDateExample() {
  const [value, setValue] = useState<{ from: Date; to: Date }>()
  const format = new Intl.DateTimeFormat("it-IT", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  })

  return (
    <div className="grid w-[310px] max-w-full gap-4">
      <DatePicker
        mode="range"
        label="Seleziona intervallo"
        value={value}
        today={new Date(2026, 4, 11)}
        onConfirm={setValue}
        onCancel={fn()}
      />
      <output aria-label="Intervallo confermato">
        {value
          ? `${format.format(value.from)} - ${format.format(value.to)}`
          : "Nessun intervallo confermato"}
      </output>
    </div>
  )
}

export const RangeDateConfirmation: Story = {
  tags: ["color-pinned"],
  name: "Conferma intervallo",
  render: () => <RangeDateExample />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const calendar = within(canvas.getByRole("grid", { name: /maggio 2026/i }))
    await userEvent.click(calendar.getByRole("button", { name: /12 maggio 2026/i }))
    await userEvent.click(calendar.getByRole("button", { name: /15 maggio 2026/i }))
    await expect(calendar.getAllByRole("gridcell", { selected: true })).toHaveLength(4)
    await expect(canvas.getByRole("status", { name: "Intervallo confermato" })).toHaveTextContent(
      "Nessun intervallo confermato",
    )
    await userEvent.click(canvas.getByRole("button", { name: "Salva" }))
    await expect(canvas.getByRole("status", { name: "Intervallo confermato" })).toHaveTextContent(
      "12/05/2026 - 15/05/2026",
    )
  },
}

function ControlledDateExample() {
  const [value, setValue] = useState<Date | undefined>(new Date(2026, 4, 11))
  const [action, setAction] = useState("")
  return (
    <div className="grid w-[310px] max-w-full gap-4">
      <DatePicker
        value={value}
        today={new Date(2026, 4, 11)}
        onConfirm={setValue}
        onCancel={() => setAction("Annullato")}
      />
      <Button onClick={() => setValue(new Date(2026, 5, 20))}>Imposta data esterna</Button>
      <Button onClick={() => setValue(undefined)}>Rimuovi data</Button>
      <output aria-label="Azione calendario">{action}</output>
    </div>
  )
}

export const ControlledDateLifecycle: Story = {
  name: "Annullamento e valore controllato",
  render: () => <ControlledDateExample />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const calendar = within(canvas.getByRole("grid", { name: /maggio 2026/i }))
    await userEvent.click(calendar.getByRole("button", { name: /12 maggio 2026/i }))
    await userEvent.click(canvas.getByRole("button", { name: "Annulla" }))
    await expect(calendar.getByRole("gridcell", { selected: true })).toHaveTextContent("11")
    await expect(canvas.getByRole("status", { name: "Azione calendario" })).toHaveTextContent(
      "Annullato",
    )

    await userEvent.click(canvas.getByRole("button", { name: "Rimuovi data" }))
    await userEvent.click(canvas.getByRole("button", { name: "Salva" }))
    const group = canvas.getByRole("group", { name: "Seleziona data" })
    await expect(group).toHaveAttribute("aria-invalid", "true")
    const error = fieldError(canvasElement)
    await expect(error).toHaveTextContent("Seleziona una data prima di salvare.")
    await expect(group).toHaveAttribute("aria-describedby", error.id)
    await expect(
      canvas
        .getByRole("grid", { name: /maggio 2026/i })
        .contains(canvasElement.ownerDocument.activeElement),
    ).toBe(true)
    await expect(canvasElement.ownerDocument.activeElement).toHaveAttribute("tabindex", "0")

    await userEvent.click(canvas.getByRole("button", { name: "Imposta data esterna" }))
    const nextMonth = within(canvas.getByRole("grid", { name: /giugno 2026/i }))
    await expect(nextMonth.getByRole("gridcell", { selected: true })).toHaveTextContent("20")
    await expect(canvasElement.querySelector('[data-slot="field-error"]')).not.toBeInTheDocument()
    await expect(group).not.toHaveAttribute("aria-invalid")
    await userEvent.click(canvas.getByRole("button", { name: "Rimuovi data" }))
    await expect(canvasElement.querySelector('[data-slot="field-error"]')).not.toBeInTheDocument()
    await expect(
      within(canvas.getByRole("grid", { name: /maggio 2026/i })).queryAllByRole("gridcell", {
        selected: true,
      }),
    ).toHaveLength(0)
  },
}

const confirmRange = fn()
const cancelRange = fn()

export const RangeValidation: Story = {
  name: "Intervallo incompleto e stessa giornata",
  render: () => (
    <DatePicker
      mode="range"
      className="w-[310px] max-w-full"
      today={new Date(2026, 4, 11)}
      onConfirm={confirmRange}
      onCancel={cancelRange}
    />
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const calendar = within(canvas.getByRole("grid", { name: /maggio 2026/i }))
    await userEvent.click(canvas.getByRole("button", { name: "Salva" }))
    await expect(fieldError(canvasElement)).toHaveTextContent(
      "Seleziona una data prima di salvare.",
    )
    await expect(confirmRange).not.toHaveBeenCalled()
    await userEvent.click(calendar.getByRole("button", { name: /12 maggio 2026/i }))
    await expect(canvasElement.querySelector('[data-slot="field-error"]')).not.toBeInTheDocument()
    await userEvent.click(canvas.getByRole("button", { name: "Salva" }))
    await expect(fieldError(canvasElement)).toHaveTextContent(
      "Seleziona la data di fine prima di salvare.",
    )
    await expect(confirmRange).not.toHaveBeenCalled()
    await userEvent.click(calendar.getByRole("button", { name: /12 maggio 2026/i }))
    await userEvent.click(canvas.getByRole("button", { name: "Salva" }))
    await expect(confirmRange).toHaveBeenCalledOnce()
    await expect(confirmRange).toHaveBeenLastCalledWith({
      from: new Date(2026, 4, 12),
      to: new Date(2026, 4, 12),
    })
    await userEvent.click(canvas.getByRole("button", { name: "Annulla" }))
    await expect(cancelRange).toHaveBeenCalledOnce()
    await expect(calendar.queryAllByRole("gridcell", { selected: true })).toHaveLength(0)
  },
}

export const KeyboardNavigation: Story = {
  tags: ["color-pinned"],
  name: "Navigazione da tastiera",
  render: () => <SingleDateExample />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    canvas.getByRole("button", { name: /mese precedente/i }).focus()
    await userEvent.tab()
    await expect(canvas.getByRole("button", { name: /mese successivo/i })).toHaveFocus()
    await userEvent.tab()
    await expect(canvas.getByRole("button", { name: /11 maggio 2026/i })).toHaveFocus()
    await userEvent.keyboard("{ArrowRight}{Enter}")
    await expect(canvas.getByRole("gridcell", { selected: true })).toHaveTextContent("12")
    await expect(canvas.getByRole("status", { name: "Data confermata" })).toHaveTextContent(
      "11/05/2026",
    )
    await userEvent.keyboard("{Home}")
    await expect(canvas.getByRole("button", { name: /10 maggio 2026/i })).toHaveFocus()
    await userEvent.keyboard("{End}")
    await expect(canvas.getByRole("button", { name: /16 maggio 2026/i })).toHaveFocus()
    await userEvent.keyboard("{PageDown}")
    await expect(canvas.getByRole("grid", { name: /giugno 2026/i })).toBeVisible()
    await expect(canvas.getByRole("button", { name: /16 giugno 2026/i })).toHaveFocus()
    await userEvent.keyboard("{PageUp}{Enter}")
    await expect(canvas.getByRole("gridcell", { selected: true })).toHaveTextContent("16")
    await userEvent.tab()
    await expect(canvas.getByRole("button", { name: "Annulla" })).toHaveFocus()
    await userEvent.tab()
    const save = canvas.getByRole("button", { name: "Salva" })
    await expect(save).toHaveFocus()
    await userEvent.keyboard(" ")
    await expect(canvas.getByRole("status", { name: "Data confermata" })).toHaveTextContent(
      "16/05/2026",
    )
    await expect(save).toHaveFocus()
  },
}

function CalendarStatesExample() {
  const [date, setDate] = useState(new Date(2026, 4, 14))
  const [range, setRange] = useState<DateRange | undefined>({
    from: new Date(2026, 4, 12),
    to: new Date(2026, 4, 15),
  })
  return (
    <div className="flex flex-wrap gap-6">
      <fieldset className="min-w-0 w-85 max-w-full">
        <legend>Stati singoli</legend>
        <Calendar
          mode="single"
          required
          selected={date}
          onSelect={setDate}
          today={new Date(2026, 4, 11)}
          defaultMonth={date}
        />
      </fieldset>
      <fieldset className="min-w-0 w-85 max-w-full">
        <legend>Stati intervallo</legend>
        <Calendar
          mode="range"
          selected={range}
          onSelect={setRange}
          today={new Date(2026, 4, 11)}
          defaultMonth={range?.from}
        />
      </fieldset>
    </div>
  )
}

export const SourceDayStates: Story = {
  tags: ["color-pinned"],
  name: "Stati dei giorni Figma",
  parameters: {
    // The matrix stacks several source-fidelity calendars: the "one name per
    // navigation" rule is a product-surface rule, not a showcase one.
    a11yContract: {
      // Reflow exemption: fixture pinned at the source width, not a product surface.
      reflow: false,
      landmarks: false,
    },
    design: { type: "figma", url: figmaEmbedUrl("8049:39452") },
  },
  render: () => <CalendarStatesExample />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const single = within(canvas.getByRole("group", { name: "Stati singoli" }))
    const selected = within(single.getByRole("button", { name: /14 maggio 2026/i })).getByText("14")
    await expect(selected.getBoundingClientRect().width).toBe(36)
    await expect(selected.getBoundingClientRect().height).toBe(36)
    await expect(getComputedStyle(selected).backgroundColor).toBe("rgb(11, 62, 227)")
    await expect(getComputedStyle(selected).color).toBe("rgb(255, 255, 255)")
    const today = within(single.getByRole("button", { name: /oggi.*11 maggio 2026/i })).getByText(
      "11",
    )
    await expect(getComputedStyle(today).borderTopColor).toBe("rgb(11, 62, 227)")
    await expect(getComputedStyle(today).borderTopWidth).toBe("1px")
    await expect(getComputedStyle(today).color).toBe("rgb(11, 62, 227)")
    await expect(
      getComputedStyle(
        within(single.getByRole("button", { name: /10 maggio 2026/i })).getByText("10"),
      ).color,
    ).toBe("rgb(14, 15, 19)")

    const range = within(canvas.getByRole("group", { name: "Stati intervallo" }))
    await expect(range.getAllByRole("gridcell", { selected: true })).toHaveLength(4)
    for (const day of [12, 15]) {
      const circle = within(
        range.getByRole("button", { name: new RegExp(`${day} maggio 2026`, "i") }),
      ).getByText(String(day))
      await expect(getComputedStyle(circle).backgroundColor).toBe("rgb(11, 62, 227)")
      await expect(circle.getBoundingClientRect().width).toBe(36)
    }
    await expect(
      getComputedStyle(
        within(range.getByRole("button", { name: /13 maggio 2026/i })).getByText("13"),
      ).color,
    ).toBe("rgb(85, 92, 112)")
  },
}

export const NarrowGrid: Story = {
  tags: ["color-pinned"],
  name: "Reflow in griglia stretta",
  render: () => (
    <section
      aria-label="Calendario in griglia stretta"
      style={{ width: 240, maxWidth: "100%", display: "grid" }}
    >
      <DatePicker
        mode="range"
        label="Intervallo mobile"
        value={{ from: new Date(2026, 4, 12), to: new Date(2026, 4, 15) }}
        onConfirm={fn()}
        onCancel={fn()}
      />
    </section>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const container = canvas.getByRole("region", { name: "Calendario in griglia stretta" })
    const picker = within(container).getByRole("group", { name: "Intervallo mobile" })
    await expect(picker.getBoundingClientRect().width).toBeLessThanOrEqual(
      container.getBoundingClientRect().width,
    )
    await expect(container.scrollWidth).toBeLessThanOrEqual(container.clientWidth)
    const calendar = within(picker).getByRole("grid")
    for (const day of within(calendar).getAllByRole("button")) {
      await expect(day.getBoundingClientRect().width).toBeGreaterThanOrEqual(24)
      await expect(day.getBoundingClientRect().height).toBeGreaterThanOrEqual(44)
    }
    const selectedDay = within(calendar).getByRole("button", { name: /12 maggio 2026/i })
    const circle = within(selectedDay).getByText("12").getBoundingClientRect()
    await expect(circle.width).toBeLessThanOrEqual(selectedDay.getBoundingClientRect().width)
    await expect(Math.abs(circle.width - circle.height)).toBeLessThan(0.5)
  },
}

// The field is the custom chooser: a labelled trigger that carries the local
// ISO date in a named form control, opens the source calendar panel and keeps
// the committed value on cancel.
export const FieldStates: Story = {
  tags: ["color-pinned"],
  name: "Campo: stati",
  parameters: {
    // Reflow exemption pending a design request: docs/design-requests/2026-10-16-a11y-reflow-conditions.md.
    a11yContract: { reflow: false },
    design: { type: "figma", url: figmaEmbedUrl("8049:39452") },
  },
  render: () => (
    <div className="grid w-[min(28rem,calc(100vw-2rem))] gap-6">
      <DatePickerField label="Data vuota" today={new Date(2026, 4, 11)} />
      <DatePickerField
        label="Data confermata"
        description="La data della richiesta."
        defaultValue="2026-05-11"
        today={new Date(2026, 4, 11)}
      />
      <DatePickerField
        label="Data in errore"
        error="Scegli una data disponibile."
        defaultValue="2026-05-11"
        today={new Date(2026, 4, 11)}
      />
      <DatePickerField
        label="Data non modificabile"
        defaultValue="2026-05-11"
        today={new Date(2026, 4, 11)}
        readOnly
      />
      <DatePickerField
        label="Data non disponibile"
        defaultValue="2026-05-11"
        today={new Date(2026, 4, 11)}
        disabled
      />
    </div>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const empty = canvas.getByRole("button", { name: "Data vuota" })
    await expect(empty).toHaveAttribute("aria-expanded", "false")
    await expect(empty).not.toHaveTextContent("mag 2026")
    await expect(canvas.getByRole("button", { name: "Data confermata" })).toHaveTextContent(
      "11 mag 2026",
    )
    const invalid = canvas.getByRole("button", { name: "Data in errore" })
    await expect(invalid).toHaveAttribute("aria-invalid", "true")
    const error = canvas.getByText("Scegli una data disponibile.")
    await expect(invalid).toHaveAttribute("aria-describedby", error.id)
    await expect(canvas.getByRole("button", { name: "Data non disponibile" })).toBeDisabled()

    // Read-only fields keep the value but never open the panel.
    const readOnly = canvas.getByRole("button", { name: "Data non modificabile" })
    await userEvent.click(readOnly)
    await expect(screen.queryByRole("group", { name: "Seleziona data" })).not.toBeInTheDocument()

    // The empty field opens the panel; Annulla discards the draft, Salva
    // commits the it-IT value.
    await userEvent.click(empty)
    const firstPanel = await screen.findByRole("group", { name: "Seleziona data" })
    await userEvent.click(within(firstPanel).getByRole("button", { name: /12 maggio 2026/i }))
    await userEvent.click(within(firstPanel).getByRole("button", { name: "Annulla" }))
    await waitFor(() =>
      expect(screen.queryByRole("group", { name: "Seleziona data" })).not.toBeInTheDocument(),
    )
    await expect(empty).not.toHaveTextContent("12 mag 2026")
    await userEvent.click(empty)
    const panel = await screen.findByRole("group", { name: "Seleziona data" })
    await userEvent.click(within(panel).getByRole("button", { name: /12 maggio 2026/i }))
    await userEvent.click(within(panel).getByRole("button", { name: "Salva" }))
    await expect(empty).toHaveTextContent("12 mag 2026")
    await waitFor(() =>
      expect(screen.queryByRole("group", { name: "Seleziona data" })).not.toBeInTheDocument(),
    )
  },
}

const submitDate = fn()

export const FieldNativeForm: Story = {
  // Reflow exemption pending a design request: docs/design-requests/2026-10-16-a11y-reflow-conditions.md.
  parameters: { a11yContract: { reflow: false } },
  name: "Campo: form nativo",
  render: () => (
    <form
      aria-label="Appuntamento"
      className="grid w-[min(28rem,calc(100vw-2rem))] gap-4"
      onSubmit={(event) => {
        event.preventDefault()
        submitDate(new FormData(event.currentTarget).get("appointment"))
      }}
    >
      <DatePickerField
        label="Data dell'appuntamento"
        name="appointment"
        today={new Date(2026, 4, 11)}
        required
      />
      <Button type="submit">Fissa appuntamento</Button>
      <Button type="reset">Ripristina data</Button>
    </form>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const form = canvas.getByRole("form", { name: "Appuntamento" })
    if (!(form instanceof HTMLFormElement)) throw new Error("Expected a native form")
    submitDate.mockClear()
    const field = canvas.getByRole("button", { name: /Data dell'appuntamento/ })
    // A required empty chooser blocks native submission.
    await expect(form.checkValidity()).toBe(false)
    await userEvent.click(field)
    const panel = await screen.findByRole("group", { name: "Seleziona data" })
    await userEvent.click(within(panel).getByRole("button", { name: /12 maggio 2026/i }))
    await userEvent.click(within(panel).getByRole("button", { name: "Salva" }))
    await userEvent.click(canvas.getByRole("button", { name: "Fissa appuntamento" }))
    await waitFor(() => expect(form.checkValidity()).toBe(true))
    await expect(submitDate).toHaveBeenLastCalledWith("2026-05-12")
    await userEvent.click(canvas.getByRole("button", { name: "Ripristina data" }))
    await waitFor(() => expect(field).not.toHaveTextContent("12 mag 2026"))
    await expect(form.checkValidity()).toBe(false)
  },
}
