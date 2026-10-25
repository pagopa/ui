import * as React from "react"
import type { Meta, StoryObj } from "@storybook/react-vite"
import { expect, fn, screen, userEvent, waitFor, within } from "storybook/test"

import {
  Autocomplete,
  AuthenticationCodeInput,
  CheckboxField,
  Chip,
  DatePicker,
  DatePickerField,
  DragAndDrop,
  ErrorSummary,
  InputChip,
  MultiSelectField,
  RadioField,
  RadioGroup,
  SelectField,
  SwitchField,
  TextareaField,
  TextField,
} from "@/components/inputs"
import { Button } from "@/components/primitives/button"
import { Checkbox } from "@/components/primitives/checkbox"
import { Label } from "@/components/primitives/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/primitives/select"

import { fieldError } from "./support/a11y-contract"

// The OTP field renders one real input per slot: the visible frame is the
// slot group, and the whole value lives in the hidden named input.
function codeFrame(input: Element) {
  const frame = input.closest('[data-slot="otp-field"]')
  if (!(frame instanceof HTMLElement)) throw new Error("Expected the shared code frame")
  return frame
}

function FormControls() {
  return (
    <form
      className="grid w-[min(28rem,calc(100vw-2rem))] gap-7"
      onSubmit={(event) => event.preventDefault()}
    >
      <TextField
        label="Indirizzo email"
        description="Useremo questo indirizzo solo per le comunicazioni di servizio."
        required
        name="email"
        type="email"
        autoComplete="email"
      />

      <div className="grid gap-2">
        <Label id="municipality-label" className="flex-wrap text-label-sb">
          Comune
          <span aria-hidden="true" className="text-destructive">
            *
          </span>
          <span className="text-caption"> (obbligatorio)</span>
        </Label>
        <Select
          name="municipality"
          required
          items={{ roma: "Roma", milano: "Milano", torino: "Torino" }}
        >
          <SelectTrigger aria-labelledby="municipality-label">
            <SelectValue placeholder="Seleziona un comune" />
          </SelectTrigger>
          <SelectContent aria-labelledby="municipality-label">
            <SelectItem value="roma">Roma</SelectItem>
            <SelectItem value="milano">Milano</SelectItem>
            <SelectItem value="torino">Torino</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="flex items-start gap-3">
        <Checkbox id="terms" name="terms" required />
        <Label htmlFor="terms" className="min-h-6 text-label-sb">
          Accetto i termini del servizio
        </Label>
      </div>
    </form>
  )
}

const meta = {
  title: "Components/Inputs/Form behaviors",
  component: FormControls,
  parameters: {
    docs: {
      description: {
        component:
          "Suite of the native field behaviours: shared focus perimeter, form reset, reverted changes, controlled values and external form ownership. The documentation of each field lives in its own stories; here the form machinery is verified as a whole.",
      },
    },
  },
} satisfies Meta<typeof FormControls>

export default meta
type Story = StoryObj<typeof meta>

export const PaintedKeyboardPerimeters: Story = {
  // Reflow exemption pending a design request: docs/design-requests/2026-10-16-a11y-reflow-conditions.md.
  parameters: { a11yContract: { reflow: false } },
  tags: ["color-pinned"],
  render: () => (
    <form
      aria-label="Indicatori di tastiera"
      className="grid w-[min(28rem,calc(100vw-2rem))] gap-6"
      onSubmit={(event) => event.preventDefault()}
    >
      <TextField label="Indirizzo email" name="email" />
      <TextareaField label="Note della pratica" name="notes" />
      <Autocomplete label="Comune" name="city" options={[{ value: "roma", label: "Roma" }]} />
      <SelectField label="Provincia" name="province" options={[{ value: "rm", label: "Roma" }]} />
      <CheckboxField label="Consenso alle comunicazioni" name="consent" />
      <RadioGroup legend="Canale di comunicazione" name="contact" defaultValue="email">
        <RadioField label="Email di conferma" value="email" />
      </RadioGroup>
      <SwitchField label="Aggiornamenti della pratica" name="updates" />
      <InputChip onRemove={fn()}>Servizi scolastici</InputChip>
      <Chip onRemove={fn()}>Servizio facoltativo</Chip>
      <DatePicker
        label="Data della pratica"
        value={new Date(2026, 4, 11)}
        today={new Date(2026, 4, 11)}
        onConfirm={fn()}
        onCancel={fn()}
      />
      <Button type="button">Conferma preferenze</Button>
    </form>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await userEvent.tab()
    const controls = [
      canvas.getByRole("textbox", { name: "Indirizzo email" }),
      canvas.getByRole("textbox", { name: "Note della pratica" }),
      canvas.getByRole("combobox", { name: "Comune" }),
      canvas.getByRole("combobox", { name: "Provincia" }),
      canvas.getByRole("checkbox", { name: "Consenso alle comunicazioni" }),
      canvas.getByRole("radio", { name: "Email di conferma" }),
      canvas.getByRole("switch", { name: "Aggiornamenti della pratica" }),
      canvas.getByRole("button", { name: "Elimina Servizi scolastici" }),
      canvas.getByRole("button", { name: "Elimina Servizio facoltativo" }),
      canvas.getByRole("button", { name: /11 maggio 2026/i }),
      canvas.getByRole("button", { name: "Conferma preferenze" }),
    ]
    for (const control of controls) {
      control.focus()
      await expect(control).toHaveFocus()
      const indicator = getComputedStyle(control)
      await expect(
        indicator.outlineStyle,
        control.getAttribute("aria-label") ?? control.textContent ?? "keyboard control",
      ).toBe("solid")
      await expect(parseFloat(indicator.outlineWidth)).toBeGreaterThanOrEqual(2)
      await expect(indicator.outlineColor).toBe("rgb(11, 62, 227)")
    }
  },
}

export const NativeEditorKeyboardFocus: Story = {
  // Reflow exemption pending a design request: docs/design-requests/2026-10-16-a11y-reflow-conditions.md.
  parameters: { a11yContract: { reflow: false } },
  tags: ["color-pinned"],
  render: () => (
    <form aria-label="Editor nativi" className="grid w-[min(28rem,calc(100vw-2rem))] gap-6">
      <TextField label="Prima degli editor" />
      <DatePickerField label="Data" defaultValue="2026-05-11" />
      <TextField label="Orario" type="time" defaultValue="10:30" />
      <TextField label="Data e ora" type="datetime-local" defaultValue="2026-05-11T10:30" />
      <TextField label="Mese" type="month" defaultValue="2026-05" />
      <TextField label="Settimana" type="week" defaultValue="2026-W20" />
      <DatePickerField
        label="Data non valida"
        defaultValue="2026-05-11"
        error="Scegli una data disponibile."
      />
    </form>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    canvas.getByRole("textbox", { name: "Prima degli editor" }).focus()
    await userEvent.tab()
    for (const label of ["Data", "Orario", "Data e ora", "Mese", "Settimana", "Data non valida"]) {
      const control = canvas.getByLabelText(label, { exact: true })
      control.focus()
      await expect(control).toHaveFocus()
      await expect(control.matches(":focus-within")).toBe(true)
      const outline = getComputedStyle(control)
      await expect(outline.outlineStyle).toBe("solid")
      await expect(parseFloat(outline.outlineWidth)).toBeGreaterThanOrEqual(2)
      await expect(outline.outlineColor).toBe(
        label === "Data non valida" ? "rgb(209, 51, 51)" : "rgb(11, 62, 227)",
      )
    }
    await expect(canvas.getByLabelText("Data non valida", { exact: true })).toHaveAttribute(
      "aria-invalid",
      "true",
    )
    // The date fields are the custom chooser, not the native picker: the
    // trigger carries the it-IT value and opens the source calendar panel.
    const date = canvas.getByRole("button", { name: /^Data$/ })
    await expect(date).toHaveTextContent("11 mag 2026")
    await expect(date).toHaveAttribute("aria-haspopup", "dialog")
    await userEvent.click(date)
    await expect(await screen.findByRole("group", { name: "Seleziona data" })).toBeVisible()
    await userEvent.keyboard("{Escape}")
    await waitFor(() =>
      expect(screen.queryByRole("group", { name: "Seleziona data" })).not.toBeInTheDocument(),
    )
    await expect(date).toHaveFocus()
  },
}

// The label of a native editor follows the same rule as every other field: it
// rests centred while the field is empty (the browser's own placeholder text
// stays hidden until focus) and floats to the source notch on focus or value.
export const NativeEditorLabelFloat: Story = {
  tags: ["color-pinned"],
  render: () => (
    <form
      aria-label="Etichette degli editor"
      className="grid w-[min(28rem,calc(100vw-2rem))] gap-6"
    >
      <TextField label="Orario vuoto" type="time" />
      <TextField label="Orario con valore" type="time" defaultValue="10:30" />
      <DatePickerField label="Data vuota" />
    </form>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const labelFor = (control: HTMLElement) =>
      canvasElement.querySelector<HTMLLabelElement>(`label[for="${CSS.escape(control.id)}"]`)
    const labelCenterOffset = (control: HTMLElement) => {
      const label = labelFor(control)
      if (!label) throw new Error("Expected the associated label")
      const box = label.getBoundingClientRect()
      return box.top + box.height / 2 - control.getBoundingClientRect().top
    }
    const editorColor = (control: HTMLElement) =>
      getComputedStyle(control).color.replace(/\s+/g, "")
    const transparent = (color: string) => color === "rgba(0,0,0,0)" || color === "transparent"

    const empty = canvas.getByLabelText("Orario vuoto", { exact: true })
    const filled = canvas.getByLabelText("Orario con valore", { exact: true })
    const emptyDate = canvas.getByLabelText("Data vuota", { exact: true })
    const resting = (control: HTMLElement) =>
      Math.abs(labelCenterOffset(control) - control.getBoundingClientRect().height / 2)
    const notched = (control: HTMLElement) => Math.abs(labelCenterOffset(control) - 1)
    // Empty, unfocused: the label sits on the field's centre line and the
    // browser's empty placeholder text is transparent.
    await expect(resting(empty)).toBeLessThanOrEqual(1)
    await expect(transparent(editorColor(empty))).toBe(true)
    await expect(resting(emptyDate)).toBeLessThanOrEqual(1)
    // Filled: the label is the source notch, 1px below the top edge.
    await waitFor(() => expect(notched(filled)).toBeLessThanOrEqual(1))
    // Focus floats the empty label and reveals the editor text.
    empty.focus()
    await waitFor(() => expect(notched(empty)).toBeLessThanOrEqual(1))
    await waitFor(() => expect(transparent(editorColor(empty))).toBe(false))
    empty.blur()
    await waitFor(() => expect(resting(empty)).toBeLessThanOrEqual(1))
    // The date chooser follows the same rule: resting while empty and
    // unfocused, floating while focused (the click that opens its panel).
    await userEvent.click(emptyDate)
    await waitFor(() => expect(notched(emptyDate)).toBeLessThanOrEqual(1))
    await screen.findByRole("group", { name: "Seleziona data" })
    await userEvent.keyboard("{Escape}")
    await waitFor(() => expect(emptyDate).toHaveFocus())
    emptyDate.blur()
    await waitFor(() => expect(resting(emptyDate)).toBeLessThanOrEqual(1))
  },
}

const submitMunicipality = fn()
const filesChanged = fn<(files: File[]) => void>()
const disabledFilesChanged = fn<(files: File[]) => void>()

export const NativeCheckboxReset: Story = {
  render: () => (
    <form aria-label="Ripristino consensi" className="grid max-w-md gap-4">
      <CheckboxField label="Accetto i termini" name="accept" />
      <label className="flex min-h-11 items-center gap-3">
        <Checkbox name="optional" />
        Consenso facoltativo
      </label>
      <Button type="reset">Ripristina consenso</Button>
    </form>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const form = canvas.getByRole("form", { name: "Ripristino consensi" })
    if (!(form instanceof HTMLFormElement)) throw new Error("Expected a native form")
    const checkbox = canvas.getByRole("checkbox", { name: "Accetto i termini" })
    await userEvent.click(checkbox)
    await expect(checkbox).toBeChecked()
    await expect(new FormData(form).get("accept")).toBe("on")
    const optional = canvas.getByRole("checkbox", { name: "Consenso facoltativo" })
    await userEvent.click(optional)
    await expect(optional).toBeChecked()
    await expect(new FormData(form).get("optional")).toBe("on")
    await userEvent.click(canvas.getByRole("button", { name: "Ripristina consenso" }))
    await waitFor(() => expect(checkbox).not.toBeChecked())
    await expect(new FormData(form).has("accept")).toBe(false)
    await waitFor(() => expect(optional).not.toBeChecked())
    await expect(new FormData(form).has("optional")).toBe(false)
  },
}

export const NativeRadioReset: Story = {
  render: () => (
    <form aria-label="Ripristino canale" className="grid max-w-md gap-4">
      <RadioGroup legend="Canale di conferma" name="contact" defaultValue="email">
        <RadioField label="Email" value="email" />
        <RadioField label="SMS" value="sms" />
      </RadioGroup>
      <Button type="reset">Ripristina canale</Button>
    </form>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const form = canvas.getByRole("form", { name: "Ripristino canale" })
    if (!(form instanceof HTMLFormElement)) throw new Error("Expected a native form")
    const email = canvas.getByRole("radio", { name: "Email" })
    await userEvent.click(email)
    await userEvent.keyboard("{ArrowDown}")
    await expect(canvas.getByRole("radio", { name: "SMS" })).toBeChecked()
    await expect(new FormData(form).get("contact")).toBe("sms")
    await userEvent.click(canvas.getByRole("button", { name: "Ripristina canale" }))
    await waitFor(() => expect(email).toBeChecked())
    await expect(new FormData(form).get("contact")).toBe("email")
  },
}

export const NativeSwitchReset: Story = {
  render: () => (
    <form aria-label="Ripristino notifiche" className="grid max-w-md gap-4">
      <SwitchField label="Ricevi aggiornamenti" name="updates" defaultChecked />
      <Button type="reset">Ripristina notifiche</Button>
    </form>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const form = canvas.getByRole("form", { name: "Ripristino notifiche" })
    if (!(form instanceof HTMLFormElement)) throw new Error("Expected a native form")
    const control = canvas.getByRole("switch", { name: "Ricevi aggiornamenti" })
    await userEvent.click(control)
    await expect(control).not.toBeChecked()
    await expect(new FormData(form).has("updates")).toBe(false)
    await userEvent.click(canvas.getByRole("button", { name: "Ripristina notifiche" }))
    await waitFor(() => expect(control).toBeChecked())
    await expect(new FormData(form).get("updates")).toBe("on")
  },
}

export const NativeAuthenticationCodeReset: Story = {
  render: () => (
    <form aria-label="Ripristino verifica" className="grid max-w-md gap-4">
      <AuthenticationCodeInput label="Codice di verifica" name="code" length={4} />
      <Button type="reset">Ripristina codice</Button>
    </form>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const form = canvas.getByRole("form", { name: "Ripristino verifica" })
    if (!(form instanceof HTMLFormElement)) throw new Error("Expected a native form")
    const input = canvas.getByRole("textbox", { name: "Codice di verifica" })
    await userEvent.click(input)
    await userEvent.keyboard("1234")
    await expect(new FormData(form).get("code")).toBe("1234")
    await userEvent.click(canvas.getByRole("button", { name: "Ripristina codice" }))
    await waitFor(() => expect(new FormData(form).get("code")).toBe(""))
    await expect(codeFrame(input).textContent).toBe("")
  },
}

export const AuthenticationCodeReflow: Story = {
  // Reflow exemption pending a design request: docs/design-requests/2026-10-16-a11y-reflow-conditions.md.
  parameters: { a11yContract: { reflow: false } },
  render: () => (
    <form aria-label="Verifica su schermo piccolo" className="w-72 max-w-full">
      <AuthenticationCodeInput name="code" />
    </form>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const form = canvas.getByRole("form", { name: "Verifica su schermo piccolo" })
    const input = canvas.getByRole("textbox", { name: "Codice di autenticazione" })
    await userEvent.click(input)
    await userEvent.keyboard("123456")
    await expect(codeFrame(input).textContent).toBe("123456")
    const lastDigit = canvas.getByText("6")
    await expect(lastDigit).toBeVisible()
    await expect(lastDigit.getBoundingClientRect().right).toBeLessThanOrEqual(
      form.getBoundingClientRect().right,
    )
  },
}

export const CancelledChoiceChanges: Story = {
  render: () => (
    <form aria-label="Modifiche annullate" className="grid max-w-md gap-4">
      <CheckboxField
        label="Consenso non confermato"
        name="accept"
        onCheckedChange={(_, details) => details.cancel()}
      />
      <RadioGroup
        legend="Canale non confermato"
        name="contact"
        defaultValue="email"
        onValueChange={(_, details) => details.cancel()}
      >
        <RadioField label="Email" value="email" />
        <RadioField label="SMS" value="sms" />
      </RadioGroup>
      <SwitchField
        label="Aggiornamenti non confermati"
        name="updates"
        defaultChecked
        onCheckedChange={(_, details) => details.cancel()}
      />
    </form>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const form = canvas.getByRole("form", { name: "Modifiche annullate" })
    if (!(form instanceof HTMLFormElement)) throw new Error("Expected a native form")
    const checkbox = canvas.getByRole("checkbox", { name: "Consenso non confermato" })
    const email = canvas.getByRole("radio", { name: "Email" })
    const sms = canvas.getByRole("radio", { name: "SMS" })
    const updates = canvas.getByRole("switch", { name: "Aggiornamenti non confermati" })
    await userEvent.click(checkbox)
    await userEvent.click(sms)
    await userEvent.click(updates)
    await expect(checkbox).not.toBeChecked()
    await expect(email).toBeChecked()
    await expect(sms).not.toBeChecked()
    await expect(updates).toBeChecked()
    await expect(Object.fromEntries(new FormData(form))).toEqual({
      contact: "email",
      updates: "on",
    })
  },
}

function ControlledChoiceForm() {
  const [accept, setAccept] = React.useState(false)
  const [updates, setUpdates] = React.useState(true)
  const [contact, setContact] = React.useState("email")
  const [code, setCode] = React.useState("")
  return (
    <form aria-label="Preferenze controllate" className="grid max-w-md gap-4">
      <CheckboxField
        label="Consenso controllato"
        name="accept"
        checked={accept}
        defaultChecked={false}
        onCheckedChange={setAccept}
      />
      <RadioGroup
        legend="Canale controllato"
        name="contact"
        value={contact}
        defaultValue="email"
        onValueChange={setContact}
      >
        <RadioField label="Email" value="email" />
        <RadioField label="SMS" value="sms" />
      </RadioGroup>
      <SwitchField
        label="Aggiornamenti controllati"
        name="updates"
        checked={updates}
        defaultChecked
        onCheckedChange={setUpdates}
      />
      <AuthenticationCodeInput
        label="Codice controllato"
        name="code"
        length={4}
        value={code}
        defaultValue=""
        onValueChange={setCode}
      />
      <Button type="reset">Ripristina preferenze controllate</Button>
    </form>
  )
}

export const ControlledChoiceReset: Story = {
  render: () => <ControlledChoiceForm />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const form = canvas.getByRole("form", { name: "Preferenze controllate" })
    if (!(form instanceof HTMLFormElement)) throw new Error("Expected a native form")
    const checkbox = canvas.getByRole("checkbox", { name: "Consenso controllato" })
    const updates = canvas.getByRole("switch", { name: "Aggiornamenti controllati" })
    const sms = canvas.getByRole("radio", { name: "SMS" })
    const code = canvas.getByRole("textbox", { name: "Codice controllato" })
    await userEvent.click(checkbox)
    await userEvent.click(sms)
    await userEvent.click(updates)
    await userEvent.click(code)
    await userEvent.keyboard("1234")
    await expect(Object.fromEntries(new FormData(form))).toEqual({
      accept: "on",
      contact: "sms",
      code: "1234",
    })
    await userEvent.click(canvas.getByRole("button", { name: "Ripristina preferenze controllate" }))
    await expect(checkbox).toBeChecked()
    await expect(sms).toBeChecked()
    await expect(updates).not.toBeChecked()
    await expect(Object.fromEntries(new FormData(form))).toEqual({
      accept: "on",
      contact: "sms",
      code: "1234",
    })
  },
}

function ExternalFormControls() {
  const [owner, setOwner] = React.useState("external-form-first")
  const [showUpdates, setShowUpdates] = React.useState(true)
  const [updatesDetached, setUpdatesDetached] = React.useState(false)
  const checkboxRef = React.useRef<HTMLInputElement>(null)
  const radioRef = React.useRef<HTMLInputElement>(null)
  const switchRef = React.useRef<HTMLInputElement>(null)
  const codeRef = React.useRef<HTMLInputElement>(null)
  const receiveCode = React.useCallback((input: HTMLInputElement | null) => {
    codeRef.current = input
  }, [])
  const receiveSwitch = React.useCallback((input: HTMLInputElement | null) => {
    switchRef.current = input
    if (input)
      return () => {
        switchRef.current = null
        setUpdatesDetached(true)
      }
  }, [])
  function focusInput(ref: React.RefObject<HTMLInputElement | null>) {
    if (!ref.current) throw new Error("The public input ref was not forwarded")
    ref.current.focus()
  }
  return (
    <div className="grid max-w-md gap-4">
      <form id="external-form-first" aria-label="Primo form">
        <Button type="reset">Ripristina primo form</Button>
      </form>
      <form id="external-form-second" aria-label="Secondo form">
        <Button type="reset">Ripristina secondo form</Button>
      </form>
      <CheckboxField label="Consenso esterno" name="accept" form={owner} inputRef={checkboxRef} />
      <RadioGroup
        legend="Canale esterno"
        name="contact"
        form={owner}
        defaultValue="email"
        inputRef={radioRef}
      >
        <RadioField label="Email" value="email" />
        <RadioField label="SMS" value="sms" />
      </RadioGroup>
      {showUpdates ? (
        <SwitchField
          label="Aggiornamenti esterni"
          name="updates"
          form={owner}
          defaultChecked
          inputRef={receiveSwitch}
        />
      ) : null}
      <AuthenticationCodeInput
        label="Codice esterno"
        name="code"
        length={4}
        form={owner}
        ref={receiveCode}
      />
      <Button onClick={() => focusInput(checkboxRef)}>Focus consenso</Button>
      <Button onClick={() => focusInput(radioRef)}>Focus canale</Button>
      <Button onClick={() => focusInput(switchRef)}>Focus aggiornamenti</Button>
      <Button onClick={() => focusInput(codeRef)}>Focus codice</Button>
      <Button onClick={() => setOwner("external-form-second")}>Sposta campi</Button>
      <Button onClick={() => setShowUpdates(false)}>Rimuovi aggiornamenti</Button>
      <output aria-label="Ref aggiornamenti">{updatesDetached ? "Liberato" : "Collegato"}</output>
    </div>
  )
}

export const ExternalNativeFormOwnership: Story = {
  render: () => <ExternalFormControls />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const first = canvas.getByRole("form", { name: "Primo form" })
    const second = canvas.getByRole("form", { name: "Secondo form" })
    if (!(first instanceof HTMLFormElement) || !(second instanceof HTMLFormElement))
      throw new Error("Expected native forms")
    const checkbox = canvas.getByRole("checkbox", { name: "Consenso esterno" })
    const email = canvas.getByRole("radio", { name: "Email" })
    const sms = canvas.getByRole("radio", { name: "SMS" })
    const updates = canvas.getByRole("switch", { name: "Aggiornamenti esterni" })
    const code = canvas.getByRole("textbox", { name: "Codice esterno" })
    await userEvent.click(canvas.getByRole("button", { name: "Focus consenso" }))
    await expect(checkbox).toHaveFocus()
    await userEvent.keyboard(" ")
    await userEvent.click(sms)
    await userEvent.click(canvas.getByRole("button", { name: "Focus canale" }))
    await expect(sms).toHaveFocus()
    await userEvent.click(canvas.getByRole("button", { name: "Focus aggiornamenti" }))
    await expect(updates).toHaveFocus()
    await userEvent.keyboard(" ")
    await userEvent.click(canvas.getByRole("button", { name: "Focus codice" }))
    await expect(code).toHaveFocus()
    await userEvent.keyboard("1234")
    await expect(Object.fromEntries(new FormData(first))).toEqual({
      accept: "on",
      contact: "sms",
      code: "1234",
    })
    await userEvent.click(canvas.getByRole("button", { name: "Sposta campi" }))
    await expect(Object.fromEntries(new FormData(first))).toEqual({})
    await userEvent.click(canvas.getByRole("button", { name: "Ripristina primo form" }))
    await expect(Object.fromEntries(new FormData(second))).toEqual({
      accept: "on",
      contact: "sms",
      code: "1234",
    })
    await userEvent.click(canvas.getByRole("button", { name: "Ripristina secondo form" }))
    await waitFor(() => expect(checkbox).not.toBeChecked())
    await expect(email).toBeChecked()
    await expect(updates).toBeChecked()
    await expect(code).toHaveValue("")
    await expect(Object.fromEntries(new FormData(second))).toEqual({
      contact: "email",
      updates: "on",
      code: "",
    })
    await userEvent.click(canvas.getByRole("button", { name: "Rimuovi aggiornamenti" }))
    await expect(canvas.getByLabelText("Ref aggiornamenti")).toHaveTextContent("Liberato")
    await expect(new FormData(second).has("updates")).toBe(false)
  },
}

function ControlledSelections() {
  const [city, setCity] = React.useState("roma")
  const [province, setProvince] = React.useState("rm")
  const [services, setServices] = React.useState(["tributi"])
  return (
    <form aria-label="Selezioni controllate" className="grid max-w-md gap-6">
      <Autocomplete
        label="Comune"
        name="city"
        options={[
          { value: "roma", label: "Roma" },
          { value: "milano", label: "Milano" },
        ]}
        value={city}
        onValueChange={setCity}
        defaultValue="roma"
        required
      />
      <SelectField
        label="Provincia"
        name="province"
        options={[
          { value: "rm", label: "Roma" },
          { value: "mi", label: "Milano" },
        ]}
        value={province}
        onValueChange={setProvince}
        defaultValue="rm"
        required
      />
      <MultiSelectField
        label="Servizi"
        name="services"
        options={[
          { value: "tributi", label: "Tributi" },
          { value: "scuola", label: "Scuola" },
        ]}
        value={services}
        onValueChange={setServices}
        defaultValue={["tributi"]}
        required
      />
      <Button
        type="button"
        onClick={() => {
          setCity("milano")
          setProvince("mi")
          setServices(["scuola"])
        }}
      >
        Aggiorna selezioni
      </Button>
      <Button type="reset">Ripristina form controllato</Button>
      <Button
        type="button"
        onClick={() => {
          setCity("")
          setProvince("")
          setServices([])
        }}
      >
        Azzera selezioni
      </Button>
    </form>
  )
}

export const ControlledSelectionFields: Story = {
  render: () => <ControlledSelections />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const form = canvas.getByRole("form", { name: "Selezioni controllate" })
    if (!(form instanceof HTMLFormElement)) throw new Error("Expected a native form")
    const city = canvas.getByRole("combobox", { name: /Comune/ })
    const province = canvas.getByRole("combobox", { name: /Provincia/ })
    const services = canvas.getByRole("combobox", { name: /Servizi/ })
    await userEvent.click(canvas.getByRole("button", { name: "Aggiorna selezioni" }))
    await expect(city).toHaveValue("Milano")
    await expect(province).toHaveTextContent("Milano")
    await expect(services).toHaveTextContent("Scuola")
    await userEvent.click(canvas.getByRole("button", { name: "Ripristina form controllato" }))
    await waitFor(() => expect(new FormData(form).get("city")).toBe("milano"))
    await expect(new FormData(form).get("province")).toBe("mi")
    await expect(new FormData(form).getAll("services")).toEqual(["scuola"])
    await expect(city).toHaveValue("Milano")

    await userEvent.clear(city)
    await userEvent.type(city, "rom")
    await userEvent.keyboard("{ArrowDown}{Enter}")
    await expect(new FormData(form).get("city")).toBe("roma")
    await userEvent.click(province)
    await userEvent.click(await screen.findByRole("option", { name: "Roma" }))
    await expect(new FormData(form).get("province")).toBe("rm")
    await userEvent.click(services)
    await userEvent.click(await screen.findByRole("option", { name: "Tributi" }))
    await userEvent.keyboard("{Escape}")
    await expect(new FormData(form).getAll("services")).toEqual(["scuola", "tributi"])

    // The chip control removes the option by pointer without opening the
    // chooser; Backspace/Delete removes the last visible chip from the
    // keyboard (the trigger stays one button, so the chip control is not a
    // nested control of its own).
    const chipRemove = (label: string) => {
      const chipLabel = within(services).getByText(label)
      const remove = chipLabel
        .closest('[data-slot="multi-select-chip"]')
        ?.querySelector('[data-slot="input-chip-remove"]')
      if (!(remove instanceof HTMLElement)) throw new Error("Expected the chip control")
      return remove
    }
    await userEvent.click(chipRemove("Tributi"))
    await expect(new FormData(form).getAll("services")).toEqual(["scuola"])
    await expect(services).toHaveAttribute("aria-expanded", "false")
    await expect(services).not.toHaveTextContent("Tributi")
    services.focus()
    await userEvent.keyboard("{Backspace}")
    await expect(new FormData(form).getAll("services")).toEqual([])
    await expect(services).not.toHaveTextContent("Scuola")

    await userEvent.click(canvas.getByRole("button", { name: "Azzera selezioni" }))
    await expect(city).toHaveValue("")
    await expect(new FormData(form).get("city")).toBe("")
    await expect(new FormData(form).get("province")).toBe("")
    await expect(new FormData(form).getAll("services")).toEqual([])
    await expect(form.checkValidity()).toBe(false)
  },
}

const resetCities = [
  { value: "roma", label: "Roma" },
  { value: "milano", label: "Milano" },
]

export const CancelledFormReset: Story = {
  // Reflow exemption pending a design request: docs/design-requests/2026-10-16-a11y-reflow-conditions.md.
  parameters: { a11yContract: { reflow: false } },
  render: () => (
    <form
      aria-label="Ripristino annullato"
      className="grid max-w-md gap-6"
      onReset={(event) => event.preventDefault()}
    >
      <Autocomplete label="Comune" name="city" options={resetCities} defaultValue="roma" />
      <SelectField label="Provincia" name="province" options={resetCities} defaultValue="roma" />
      <MultiSelectField
        label="Comuni di interesse"
        name="cities"
        options={resetCities}
        defaultValue={["roma"]}
      />
      <DragAndDrop label="Ricevuta" name="attachment" accept=".pdf" />
      <CheckboxField label="Consenso al servizio" name="accept" />
      <RadioGroup legend="Canale di conferma" name="contact" defaultValue="email">
        <RadioField label="Email" value="email" />
        <RadioField label="SMS" value="sms" />
      </RadioGroup>
      <SwitchField label="Ricevi aggiornamenti" name="updates" defaultChecked />
      <AuthenticationCodeInput label="Codice di verifica" name="code" length={4} />
      <Button type="reset">Annulla ripristino</Button>
    </form>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const form = canvas.getByRole("form", { name: "Ripristino annullato" })
    if (!(form instanceof HTMLFormElement)) throw new Error("Expected a native form")
    const city = canvas.getByRole("combobox", { name: "Comune" })
    await userEvent.clear(city)
    await userEvent.type(city, "mil")
    await userEvent.keyboard("{ArrowDown}{Enter}")
    const province = canvas.getByRole("combobox", { name: "Provincia" })
    await userEvent.click(province)
    await userEvent.click(await screen.findByRole("option", { name: "Milano" }))
    await waitFor(() =>
      expect(screen.queryByRole("option", { name: "Milano" })).not.toBeInTheDocument(),
    )
    const cities = canvas.getByRole("combobox", { name: "Comuni di interesse" })
    await userEvent.click(cities)
    await userEvent.click(await screen.findByRole("option", { name: "Milano" }))
    await userEvent.keyboard("{Escape}")
    const file = canvas.getByLabelText("Ricevuta")
    if (!(file instanceof HTMLInputElement)) throw new Error("Expected a native file input")
    const transfer = new DataTransfer()
    transfer.items.add(new File(["ricevuta"], "ricevuta.pdf", { type: "application/pdf" }))
    file.dispatchEvent(new DragEvent("drop", { bubbles: true, dataTransfer: transfer }))
    await waitFor(() => expect(canvas.getByText("ricevuta.pdf")).toBeVisible())
    const checkbox = canvas.getByRole("checkbox", { name: "Consenso al servizio" })
    const sms = canvas.getByRole("radio", { name: "SMS" })
    const updates = canvas.getByRole("switch", { name: "Ricevi aggiornamenti" })
    const code = canvas.getByRole("textbox", { name: "Codice di verifica" })
    await userEvent.click(checkbox)
    await userEvent.click(sms)
    await userEvent.click(updates)
    await userEvent.click(code)
    await userEvent.keyboard("1234")

    await userEvent.click(canvas.getByRole("button", { name: "Annulla ripristino" }))
    await expect(city).toHaveValue("Milano")
    await expect(province).toHaveTextContent("Milano")
    await expect(cities).toHaveTextContent("Roma")
    await expect(cities).toHaveTextContent("Milano")
    await expect(new FormData(form).get("city")).toBe("milano")
    await expect(new FormData(form).get("province")).toBe("milano")
    await expect(new FormData(form).getAll("cities")).toEqual(["roma", "milano"])
    await expect(file.files?.[0]?.name).toBe("ricevuta.pdf")
    await expect(canvas.getByText("ricevuta.pdf")).toBeVisible()
    await expect(checkbox).toBeChecked()
    await expect(sms).toBeChecked()
    await expect(updates).not.toBeChecked()
    await expect(codeFrame(code).textContent).toBe("1234")
    await expect(new FormData(form).get("accept")).toBe("on")
    await expect(new FormData(form).get("contact")).toBe("sms")
    await expect(new FormData(form).has("updates")).toBe(false)
    await expect(new FormData(form).get("code")).toBe("1234")
  },
}

export const AutocompleteNativeForm: Story = {
  render: () => (
    <form
      aria-label="Ricerca comune"
      className="grid max-w-md gap-6"
      onSubmit={(event) => {
        event.preventDefault()
        submitMunicipality(new FormData(event.currentTarget).get("municipality"))
      }}
    >
      <Autocomplete
        label="Comune di residenza"
        name="municipality"
        options={[
          { value: "roma", label: "Roma" },
          { value: "milano", label: "Milano" },
        ]}
        required
      />
      <Button type="submit">Invia comune</Button>
    </form>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const form = canvas.getByRole("form", { name: "Ricerca comune" })
    if (!(form instanceof HTMLFormElement)) throw new Error("Expected a native form")
    const city = canvas.getByRole("combobox", { name: /Comune di residenza/ })
    await userEvent.type(city, "inesistente")
    await expect(form.checkValidity()).toBe(false)
    const emptyAnnouncement = canvasElement.ownerDocument.querySelector(
      '[data-slot="combobox-empty"]',
    )
    if (!(emptyAnnouncement instanceof HTMLElement))
      throw new Error("Expected the combobox empty announcement")
    await expect(emptyAnnouncement).toBeVisible()
    await userEvent.clear(city)
    await userEvent.type(city, "mil")
    // The empty announcement keeps its live region but contributes no layout:
    // results start at the popup edge, not after a blank band.
    await expect(emptyAnnouncement.getBoundingClientRect().height).toBe(0)
    await userEvent.keyboard("{ArrowDown}{Enter}")
    await expect(city).toHaveValue("Milano")
    await expect(form.checkValidity()).toBe(true)
    await userEvent.click(canvas.getByRole("button", { name: "Invia comune" }))
    await expect(submitMunicipality).toHaveBeenLastCalledWith("milano")
  },
}

export const AutocompleteResetAndDisabled: Story = {
  render: () => (
    <form aria-label="Ripristino comune" className="grid max-w-md gap-6">
      <Autocomplete
        label="Comune"
        name="municipality"
        options={[
          { value: "roma", label: "Roma" },
          { value: "milano", label: "Milano" },
        ]}
        defaultValue="roma"
        required
      />
      <Autocomplete
        label="Comune non disponibile"
        name="disabledMunicipality"
        options={[{ value: "milano", label: "Milano" }]}
        defaultValue="milano"
        required
        disabled
      />
      <Button type="reset">Ripristina comune</Button>
    </form>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const form = canvas.getByRole("form", { name: "Ripristino comune" })
    if (!(form instanceof HTMLFormElement)) throw new Error("Expected a native form")
    const city = canvas.getByRole("combobox", { name: /^Comune \(obbligatorio\)$/ })
    await expect(new FormData(form).get("municipality")).toBe("roma")
    await expect(new FormData(form).has("disabledMunicipality")).toBe(false)
    await expect(canvas.getByRole("combobox", { name: /Comune non disponibile/ })).toBeDisabled()
    await userEvent.clear(city)
    await userEvent.type(city, "mil")
    await userEvent.keyboard("{ArrowDown}{Enter}")
    await expect(new FormData(form).get("municipality")).toBe("milano")
    await userEvent.click(canvas.getByRole("button", { name: "Ripristina comune" }))
    await waitFor(() => expect(city).toHaveValue("Roma"))
    await expect(new FormData(form).get("municipality")).toBe("roma")
    await expect(form.checkValidity()).toBe(true)
  },
}

export const MultiSelectNativeForm: Story = {
  render: () => (
    <form aria-label="Scelta servizi" className="grid max-w-md gap-6">
      <MultiSelectField
        label="Servizi"
        name="services"
        options={[
          { value: "tributi", label: "Tributi" },
          { value: "scuola", label: "Scuola" },
          { value: "office", label: "Sportello", disabled: true },
        ]}
        required
      />
      <MultiSelectField
        label="Servizi non disponibili"
        name="disabledServices"
        options={[{ value: "tributi", label: "Tributi" }]}
        defaultValue={["tributi"]}
        disabled
      />
      <Button type="reset">Ripristina servizi</Button>
    </form>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const form = canvas.getByRole("form", { name: "Scelta servizi" })
    if (!(form instanceof HTMLFormElement)) throw new Error("Expected a native form")
    await expect(form.checkValidity()).toBe(false)
    await expect(new FormData(form).has("disabledServices")).toBe(false)
    const services = canvas.getByRole("combobox", { name: /^Servizi \(obbligatorio\)$/ })
    await userEvent.click(services)
    await userEvent.click(await screen.findByRole("option", { name: "Tributi" }))
    await userEvent.click(screen.getByRole("option", { name: "Scuola" }))
    await expect(screen.getByRole("option", { name: "Sportello" })).toHaveAttribute(
      "aria-disabled",
      "true",
    )
    await userEvent.keyboard("{Escape}")
    await expect(form.checkValidity()).toBe(true)
    await expect(new FormData(form).getAll("services")).toEqual(["tributi", "scuola"])
    await expect(services).toHaveTextContent("Tributi")
    await expect(services).toHaveTextContent("Scuola")
    await userEvent.click(canvas.getByRole("button", { name: "Ripristina servizi" }))
    await waitFor(() => expect(new FormData(form).getAll("services")).toEqual([]))
    await expect(form.checkValidity()).toBe(false)
    // The floating label carries the empty state; the trigger shows no value text.
    await expect(services.textContent).not.toContain("Tributi")
  },
}

export const SelectNativeReset: Story = {
  render: () => (
    <form aria-label="Scelta provincia" className="grid max-w-md gap-6">
      <SelectField
        label="Provincia"
        name="province"
        options={[
          { value: "rm", label: "Roma" },
          { value: "mi", label: "Milano" },
        ]}
        defaultValue="rm"
        required
      />
      <Button type="reset">Ripristina provincia</Button>
    </form>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const form = canvas.getByRole("form", { name: "Scelta provincia" })
    if (!(form instanceof HTMLFormElement)) throw new Error("Expected a native form")
    const province = canvas.getByRole("combobox", { name: /Provincia/ })
    await userEvent.click(province)
    await userEvent.click(await screen.findByRole("option", { name: "Milano" }))
    await expect(new FormData(form).get("province")).toBe("mi")
    await userEvent.click(canvas.getByRole("button", { name: "Ripristina provincia" }))
    await waitFor(() => expect(province).toHaveTextContent("Roma"))
    await expect(new FormData(form).get("province")).toBe("rm")
  },
}

export const UploadNativeForm: Story = {
  render: () => (
    <form aria-label="Allegati" className="grid max-w-md gap-6">
      <DragAndDrop
        label="Ricevuta"
        name="attachment"
        accept=".pdf"
        required
        onFilesChange={filesChanged}
      />
      <Button type="reset">Rimuovi allegati</Button>
    </form>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const form = canvas.getByRole("form", { name: "Allegati" })
    if (!(form instanceof HTMLFormElement)) throw new Error("Expected a native form")
    const input = canvas.getByLabelText(/Ricevuta/)
    if (!(input instanceof HTMLInputElement)) throw new Error("Expected a native file input")
    // The block label used by the upload fields also writes the state in words.
    await expect(input).toHaveAccessibleName("Ricevuta (obbligatorio)")
    await expect(canvas.getByText("(obbligatorio)")).toBeVisible()
    await expect(form.checkValidity()).toBe(false)
    const receipt = new File(["contenuto della ricevuta"], "ricevuta.pdf", {
      type: "application/pdf",
    })
    const transfer = new DataTransfer()
    transfer.items.add(receipt)
    input.dispatchEvent(new DragEvent("drop", { bubbles: true, dataTransfer: transfer }))
    await waitFor(() => expect(canvas.getByText("ricevuta.pdf")).toBeInTheDocument())
    await expect(input.files?.[0]?.name).toBe("ricevuta.pdf")
    await expect(form.checkValidity()).toBe(true)
    const uploaded = new FormData(form).get("attachment")
    if (!(uploaded instanceof File)) throw new Error("Expected a file in native FormData")
    await expect(await uploaded.text()).toBe("contenuto della ricevuta")
    await expect(filesChanged).toHaveBeenLastCalledWith([receipt])
    await userEvent.click(canvas.getByRole("button", { name: "Rimuovi allegati" }))
    await waitFor(() => expect(canvas.queryByText("ricevuta.pdf")).not.toBeInTheDocument())
    await expect(input.files?.length).toBe(0)
    await expect(form.checkValidity()).toBe(false)
    await expect(filesChanged).toHaveBeenLastCalledWith([])
  },
}

export const UploadRejectsInvalidFiles: Story = {
  // Reflow exemption pending a design request: docs/design-requests/2026-10-16-a11y-reflow-conditions.md.
  parameters: { a11yContract: { reflow: false } },
  render: () => (
    <form aria-label="Allegati verificati" className="grid max-w-md gap-6">
      <DragAndDrop label="Documento PDF" name="document" accept=".pdf" required />
      <Button type="reset">Ripristina documento</Button>
    </form>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const form = canvas.getByRole("form", { name: "Allegati verificati" })
    if (!(form instanceof HTMLFormElement)) throw new Error("Expected a native form")
    const input = canvas.getByLabelText(/Documento PDF/)
    if (!(input instanceof HTMLInputElement)) throw new Error("Expected a native file input")
    const original = new File(["pdf"], "originale.pdf", { type: "application/pdf" })
    const originalFiles = new DataTransfer()
    originalFiles.items.add(original)
    input.files = originalFiles.files
    input.dispatchEvent(new Event("change", { bubbles: true }))
    await waitFor(() => expect(canvas.getByText("originale.pdf")).toBeInTheDocument())
    const batch = new DataTransfer()
    batch.items.add(original)
    batch.items.add(new File(["altro pdf"], "secondo.pdf", { type: "application/pdf" }))
    input.dispatchEvent(new DragEvent("drop", { bubbles: true, dataTransfer: batch }))
    await waitFor(() =>
      expect(fieldError(canvasElement)).toHaveTextContent("Seleziona un solo file."),
    )
    await expect(input).toHaveAttribute("aria-invalid", "true")
    await expect(input.files?.[0]?.name).toBe("originale.pdf")
    await expect(form.checkValidity()).toBe(false)
    const invalid = new DataTransfer()
    invalid.items.add(new File(["invalid"], "programma.exe", { type: "application/octet-stream" }))
    input.dispatchEvent(new DragEvent("drop", { bubbles: true, dataTransfer: invalid }))
    await waitFor(() =>
      expect(fieldError(canvasElement)).toHaveTextContent("Formato non consentito: programma.exe."),
    )
    await expect(input.files?.[0]?.name).toBe("originale.pdf")
    const replacement = new DataTransfer()
    replacement.items.add(new File(["nuovo pdf"], "NUOVO.PDF", { type: "application/pdf" }))
    input.files = replacement.files
    input.dispatchEvent(new Event("change", { bubbles: true }))
    await waitFor(() => expect(canvas.queryByRole("alert")).not.toBeInTheDocument())
    await expect(form.checkValidity()).toBe(true)
    const accepted = new FormData(form).get("document")
    if (!(accepted instanceof File)) throw new Error("Expected a native submitted file")
    await expect(accepted.name).toBe("NUOVO.PDF")
  },
}

export const UploadMimeAndDragStates: Story = {
  // Reflow exemption pending a design request: docs/design-requests/2026-10-16-a11y-reflow-conditions.md.
  parameters: { a11yContract: { reflow: false } },
  tags: ["color-pinned"],
  render: () => (
    <form aria-label="Allegati multipli" className="grid max-w-md gap-6">
      <DragAndDrop name="documents" accept="image/*, application/pdf" multiple />
      <DragAndDrop label="Qualsiasi formato" name="unrestricted" />
      <DragAndDrop
        label="Archivio disabilitato"
        name="disabled"
        disabled
        onFilesChange={disabledFilesChanged}
      />
    </form>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const form = canvas.getByRole("form", { name: "Allegati multipli" })
    if (!(form instanceof HTMLFormElement)) throw new Error("Expected a native form")
    const input = canvas.getByLabelText("Carica file")
    const unrestricted = canvas.getByLabelText("Qualsiasi formato")
    const disabled = canvas.getByLabelText("Archivio disabilitato")
    if (
      !(input instanceof HTMLInputElement) ||
      !(unrestricted instanceof HTMLInputElement) ||
      !(disabled instanceof HTMLInputElement) ||
      !input.parentElement
    ) {
      throw new Error("Expected native file inputs and a visible drop area")
    }
    const dropArea = input.parentElement
    // The source dropzone keeps its 1px #6d8bee stroke and only deepens the
    // blue tint while a drag is over it.
    const baseBackground = getComputedStyle(dropArea).backgroundColor
    input.dispatchEvent(new DragEvent("dragenter", { bubbles: true }))
    input.dispatchEvent(new DragEvent("dragover", { bubbles: true }))
    await waitFor(() => expect(getComputedStyle(dropArea).borderColor).toBe("rgb(109, 139, 238)"))
    await waitFor(() => expect(getComputedStyle(dropArea).backgroundColor).not.toBe(baseBackground))
    input.dispatchEvent(new DragEvent("dragleave", { bubbles: true, relatedTarget: input }))
    await expect(getComputedStyle(dropArea).backgroundColor).not.toBe(baseBackground)
    input.dispatchEvent(new DragEvent("dragleave", { bubbles: true }))
    await waitFor(() => expect(getComputedStyle(dropArea).backgroundColor).toBe(baseBackground))

    const batch = new DataTransfer()
    batch.items.add(new File(["immagine"], "foto.png", { type: "image/png" }))
    batch.items.add(new File(["pdf"], "ricevuta.pdf", { type: "application/pdf" }))
    input.dispatchEvent(new DragEvent("drop", { bubbles: true, dataTransfer: batch }))
    await waitFor(() => expect(canvas.getByText("foto.png")).toBeVisible())
    await expect(canvas.getByText("ricevuta.pdf")).toBeVisible()
    const submitted = new FormData(form).getAll("documents")
    await expect(submitted.every((file) => file instanceof File)).toBe(true)
    await expect(submitted.map((file) => (file instanceof File ? file.name : file))).toEqual([
      "foto.png",
      "ricevuta.pdf",
    ])
    const rejected = new DataTransfer()
    rejected.items.add(new File(["testo"], "note.txt", { type: "text/plain" }))
    input.dispatchEvent(new DragEvent("drop", { bubbles: true, dataTransfer: rejected }))
    await waitFor(() =>
      expect(fieldError(canvasElement)).toHaveTextContent("Formato non consentito: note.txt."),
    )
    await expect(input.files?.length).toBe(2)
    await expect(canvas.getByText("foto.png")).toBeVisible()

    unrestricted.dispatchEvent(new DragEvent("drop", { bubbles: true, dataTransfer: rejected }))
    await waitFor(() => expect(canvas.getByText("note.txt")).toBeVisible())
    await expect(unrestricted.files?.[0]?.name).toBe("note.txt")
    disabled.dispatchEvent(new DragEvent("dragenter", { bubbles: true }))
    disabled.dispatchEvent(new DragEvent("drop", { bubbles: true, dataTransfer: rejected }))
    await expect(disabled.files?.length).toBe(0)
    await expect(new FormData(form).has("disabled")).toBe(false)
    await expect(disabledFilesChanged).not.toHaveBeenCalled()
    await expect(canvas.getByText("Caricamento non disponibile")).toBeVisible()
  },
}

export const Default: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    const email = canvas.getByLabelText(/Indirizzo email/)
    await userEvent.type(email, "mario.rossi@example.it")
    await expect(email).toHaveValue("mario.rossi@example.it")

    const municipality = canvas.getByRole("combobox", { name: /Comune/ })
    await userEvent.click(municipality)
    await expect(await screen.findByRole("listbox", { name: /Comune/ })).toBeVisible()
    await userEvent.click(await screen.findByRole("option", { name: "Milano" }))
    await expect(municipality).toHaveTextContent("Milano")

    const terms = canvas.getByRole("checkbox", { name: /Accetto i termini/ })
    await userEvent.click(terms)
    await expect(terms).toBeChecked()
  },
}

export const ValidationError: Story = {
  render: () => (
    <div className="w-[min(28rem,calc(100vw-2rem))]">
      <TextField
        label="Codice fiscale"
        error="Inserisci un codice fiscale valido."
        required
        name="fiscal-code"
        autoComplete="off"
        defaultValue="RSSMRA"
        spellCheck={false}
      />
    </div>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const input = canvas.getByLabelText(/Codice fiscale/)
    await expect(input).toHaveAttribute("aria-invalid", "true")

    const error = canvas.getByText("Inserisci un codice fiscale valido.")
    await expect(input).toHaveAttribute("aria-describedby", error.id)

    // The floated label is the source notch: its box centres 1px below the
    // frame's top edge (the source label text sits at -8 and its 14/20
    // required marker at -9), whatever the child metrics.
    const label = canvas.getByText("Codice fiscale").closest("label")
    if (!(label instanceof HTMLElement)) throw new Error("Expected the floating label")
    const labelBox = label.getBoundingClientRect()
    await expect(
      Math.abs(labelBox.top + labelBox.height / 2 - input.getBoundingClientRect().top - 1),
    ).toBeLessThanOrEqual(1)
  },
}

export const Disabled: Story = {
  render: () => (
    <div className="grid w-[min(28rem,calc(100vw-2rem))] gap-6">
      <TextField label="Campo non disponibile" disabled value="Valore non modificabile" readOnly />
      <div className="flex items-center gap-3">
        <Checkbox id="disabled-checkbox" disabled />
        <Label htmlFor="disabled-checkbox">Opzione non disponibile</Label>
      </div>
    </div>
  ),
}

// A form reports its errors through one announcement strategy: a single
// summary that links each field; the fields stay associated with their own
// message through aria-describedby. The shared contract asserts the single
// announcement, the story asserts the links.
function ErrorSummaryForm() {
  const [errors, setErrors] = React.useState<{ name?: string; city?: string }>({})
  const summaryErrors = [
    errors.name ? { fieldId: "error-summary-name", message: errors.name } : null,
    errors.city ? { fieldId: "error-summary-city", message: errors.city } : null,
  ].filter((error) => error !== null)
  return (
    <form
      aria-label="Segnalazione degli errori"
      className="grid w-[min(28rem,calc(100vw-2rem))] gap-6"
      onSubmit={(event) => event.preventDefault()}
    >
      <ErrorSummary errors={summaryErrors} />
      <TextField id="error-summary-name" label="Nome" name="name" required error={errors.name} />
      <SelectField
        id="error-summary-city"
        label="Comune"
        name="city"
        required
        options={[
          { value: "roma", label: "Roma" },
          { value: "milano", label: "Milano" },
        ]}
        error={errors.city}
      />
      <Button
        type="button"
        onClick={() => setErrors({ name: "Inserisci il nome.", city: "Seleziona il comune." })}
      >
        Conferma
      </Button>
    </form>
  )
}

export const WithErrorSummary: Story = {
  render: () => <ErrorSummaryForm />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await userEvent.click(canvas.getByRole("button", { name: "Conferma" }))
    // The field keeps its own message and the summary links it: two places,
    // one announcement.
    await waitFor(() => expect(canvas.getAllByText("Inserisci il nome.")).toHaveLength(2))
    // One announcement strategy: the summary is the only live region; the
    // per-field messages stay associated through aria-describedby.
    const alerts = canvas.queryAllByRole("alert")
    await expect(alerts).toHaveLength(1)
    await expect(alerts[0]).toHaveAttribute("data-slot", "error-summary")
    await expect(alerts[0]).toHaveTextContent("Controlla i campi segnalati")
    const links = within(alerts[0]).getAllByRole("link")
    await expect(links).toHaveLength(2)
    await expect(links[0]).toHaveAttribute("href", "#error-summary-name")
    await expect(links[1]).toHaveAttribute("href", "#error-summary-city")
    const name = canvas.getByRole("textbox", { name: /Nome/ })
    await expect(name).toHaveAttribute("aria-invalid", "true")
    await expect(name).toHaveAccessibleDescription("Inserisci il nome.")
    const city = canvas.getByRole("combobox", { name: /Comune/ })
    await expect(city).toHaveAttribute("aria-invalid", "true")
    await expect(city).toHaveAccessibleDescription("Seleziona il comune.")
  },
}
