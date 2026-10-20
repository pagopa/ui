import * as React from "react"
import type { Meta, StoryObj } from "@storybook/react-vite"
import { expect, userEvent, within } from "storybook/test"

import { PagoPAIcon } from "@/components/icons/PagoPAIcon"
import { RadioField } from "@/components/inputs/radio-field"
import { RadioGroup } from "@/components/inputs/radio-group"
import { Button } from "@/components/primitives/button"
import {
  RadioGroup as RadioGroupPrimitive,
  RadioGroupItem,
} from "@/components/primitives/radio-group"
import { figmaEmbedUrl } from "@/catalog/figma/file"

import radioGuide from "./guides/radio-choices.md?raw"
import { fieldError } from "./support/a11y-contract"

const meta = {
  title: "Components/Inputs/RadioField",
  component: RadioField,
  args: { value: "email", label: "Email" },
  argTypes: {
    indicatorPlacement: { control: "select", options: ["start", "end"] },
    loading: { control: "boolean" },
    disabled: { control: "boolean" },
    leadingIcon: { control: false },
    description: { control: "text" },
    error: { control: "text" },
  },
  parameters: {
    docs: {
      description: {
        component: `Radio option with a native enclosing label and the source artwork. The rich layout covers decorative icon, description, feedback and skeleton; loading preserves the real state and follows the native submission exclusion.

${radioGuide}`,
      },
    },
  },
} satisfies Meta<typeof RadioField>

export default meta
type Story = StoryObj<typeof meta>

export const Playground: Story = {
  render: (args) => (
    // Source option frame: 320 wide (`194:3842`).
    <RadioGroup legend="Metodo di contatto" defaultValue="email" className="w-80 max-w-full">
      <RadioField {...args} />
      <RadioField value="office" label="Sportello" />
    </RadioGroup>
  ),
}

export const RichRadioOptions: Story = {
  parameters: {
    // Reflow exemption pending a design request: docs/design-requests/2026-10-16-a11y-reflow-conditions.md.
    a11yContract: { reflow: false },
    design: { type: "figma", url: figmaEmbedUrl("194:3700") },
  },
  render: () => (
    <RadioGroup
      legend="Ricezione dei documenti"
      name="delivery"
      defaultValue="office"
      className="w-80 max-w-full"
    >
      <RadioField
        value="email"
        label="Email"
        leadingIcon={
          <PagoPAIcon name="notifications_active" decorative={false} label="Icona promemoria" />
        }
        indicatorPlacement="end"
        description="Ricevi i documenti via email."
      />
      <RadioField value="office" label="Sportello" indicatorPlacement="end" />
      <RadioField
        value="phone"
        label="Telefono"
        indicatorPlacement="end"
        description="Questo numero deve essere verificato."
        error="Verifica il numero di telefono."
      />
    </RadioGroup>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const email = canvas.getByRole("radio", { name: "Email" })
    const office = canvas.getByRole("radio", { name: "Sportello" })
    const icon = canvas.getByLabelText("Icona promemoria")
    await expect(icon).toBeVisible()
    await expect(icon.getBoundingClientRect().width).toBe(24)
    await expect(email.getBoundingClientRect().left).toBeGreaterThan(
      canvas.getByText("Email").getBoundingClientRect().right,
    )
    await expect(email).toHaveAccessibleDescription("Ricevi i documenti via email.")
    await expect(office).toBeChecked()
    await expect(fieldError(canvasElement).getBoundingClientRect().left).toBeLessThan(
      canvas.getByRole("radio", { name: "Telefono" }).getBoundingClientRect().left,
    )

    await userEvent.click(icon)
    await expect(email).toBeChecked()
    await expect(office).not.toBeChecked()
    await userEvent.keyboard("{ArrowDown}")
    await expect(office).toBeChecked()
  },
}

export const RadioIndicatorStates: Story = {
  tags: ["color-pinned"],
  parameters: { a11y: { test: "error" } },
  render: () => (
    <div className="grid max-w-xl gap-6">
      <RadioGroup legend="Canale di contatto" defaultValue="email" name="contact">
        <RadioField value="email" label="Email" />
        <RadioField value="office" label="Sportello" />
        <RadioField value="phone" label="Telefono non disponibile" disabled />
      </RadioGroup>
      <RadioGroup legend="Canale da correggere">
        <RadioField value="invalid" label="Canale non valido" aria-invalid />
      </RadioGroup>
      <RadioGroupPrimitive
        aria-label="Indicatori radio sorgente"
        defaultValue="active"
        className="gap-5"
      >
        <RadioGroupItem value="default" aria-label="Indicatore predefinito" />
        <RadioGroupItem value="active" aria-label="Indicatore attivo" />
        <RadioGroupItem value="error" aria-label="Indicatore da correggere" aria-invalid />
      </RadioGroupPrimitive>
    </div>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    for (const radio of canvas.getAllByRole("radio")) {
      await expect(radio.getBoundingClientRect().width).toBe(24)
      await expect(radio.getBoundingClientRect().height).toBe(24)
    }

    const email = canvas.getByRole("radio", { name: "Email" })
    const office = canvas.getByRole("radio", { name: "Sportello" })
    await expect(canvas.getByRole("radio", { name: "Indicatore attivo" })).toBeChecked()
    await expect(email).toBeChecked()
    await expect(email).toHaveStyle({ color: "rgb(11, 62, 227)" })
    await expect(office).not.toBeChecked()
    await expect(office).toHaveStyle({ color: "rgb(14, 15, 19)" })
    await expect(canvas.getByRole("radio", { name: "Canale non valido" })).toHaveStyle({
      color: "rgb(209, 51, 51)",
    })

    await userEvent.click(canvas.getByText("Sportello"))
    await expect(office).toBeChecked()
    await expect(email).not.toBeChecked()
    await expect(office).toHaveStyle({ color: "rgb(11, 62, 227)" })
    await userEvent.keyboard("{ArrowUp}")
    await expect(email).toBeChecked()
    await expect(canvas.getByRole("radio", { name: "Telefono non disponibile" })).toHaveAttribute(
      "aria-disabled",
      "true",
    )
  },
}

export const RadioFieldFeedback: Story = {
  parameters: { design: { type: "figma", url: figmaEmbedUrl("194:3841") } },
  render: () => (
    <RadioGroup legend="Canale con verifica" name="delivery" required className="w-80 max-w-full">
      <RadioField
        value="email"
        label="Posta elettronica"
        description="Ricevi i documenti via email."
        error="Conferma l'indirizzo prima di selezionare questo canale."
      />
      <RadioField value="office" label="Sportello" required />
    </RadioGroup>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const group = canvas.getByRole("radiogroup", { name: "Canale con verifica" })
    await expect(group).toBeVisible()
    await expect(group).toHaveAttribute("aria-required", "true")

    const email = canvas.getByRole("radio", { name: "Posta elettronica" })
    await expect(email).toHaveAttribute("aria-invalid", "true")
    await expect(email).toHaveAccessibleDescription(
      "Ricevi i documenti via email. Conferma l'indirizzo prima di selezionare questo canale.",
    )
    await expect(fieldError(canvasElement)).toHaveTextContent(
      "Conferma l'indirizzo prima di selezionare questo canale.",
    )
    const errorIcon = fieldError(canvasElement).querySelector('[data-figma-node-id="98:1154"]')
    await expect(errorIcon).toBeVisible()
    await expect(errorIcon).toHaveAttribute("aria-hidden", "true")
    await expect(fieldError(canvasElement).getBoundingClientRect().left).toBe(
      canvas.getByText("Posta elettronica").getBoundingClientRect().left,
    )
    await expect(
      canvas.getByText("Posta elettronica").getBoundingClientRect().left -
        email.getBoundingClientRect().right,
    ).toBe(8)

    const office = canvas.getByRole("radio", { name: /Sportello.*obbligatorio/ })
    await userEvent.click(canvas.getByText("Sportello"))
    await expect(office).toBeChecked()
    await expect(email).not.toBeChecked()
  },
}

export const RadioLoadingStates: Story = {
  parameters: {
    // Reflow exemption pending a design request: docs/design-requests/2026-10-16-a11y-reflow-conditions.md.
    a11yContract: { reflow: false },
    design: { type: "figma", url: figmaEmbedUrl("194:3700") },
  },
  render: function RadioLoadingForm() {
    const [loading, setLoading] = React.useState(true)
    const [submitted, setSubmitted] = React.useState("")
    const icon = <PagoPAIcon name="notifications_active" />

    return (
      <form
        className="grid w-80 max-w-full gap-4"
        onSubmit={(event) => {
          event.preventDefault()
          setSubmitted(String(new FormData(event.currentTarget).get("delivery") ?? "nessuno"))
        }}
      >
        <RadioGroup legend="Canali in caricamento" name="delivery" defaultValue="office">
          <RadioField value="email" label="Email" indicatorPlacement="end" loading={loading} />
          <RadioField
            value="office"
            label="Sportello"
            leadingIcon={icon}
            indicatorPlacement="end"
            loading={loading}
          />
          <RadioField
            value="phone"
            label="Telefono"
            description="Ricevi una chiamata."
            indicatorPlacement="end"
            loading={loading}
          />
          <RadioField
            value="notifications"
            label="Notifiche"
            leadingIcon={icon}
            description="Ricevi un promemoria."
            indicatorPlacement="end"
            loading={loading}
          />
        </RadioGroup>
        <Button type="button" onClick={() => setLoading(false)}>
          Mostra canali
        </Button>
        <Button type="submit">Invia preferenza</Button>
        <output aria-label="Canale inviato">{submitted}</output>
      </form>
    )
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const office = canvas.getByRole("radio", { name: "Sportello" })
    const email = canvas.getByRole("radio", { name: "Email" })
    for (const radio of canvas.getAllByRole("radio")) {
      await expect(radio).toHaveAttribute("aria-disabled", "true")
      await expect(radio).toHaveAttribute("aria-busy", "true")
    }
    await expect(office).toBeChecked()
    await userEvent.click(email)
    await expect(office).toBeChecked()
    await expect(email).not.toBeChecked()
    await userEvent.click(canvas.getByRole("button", { name: "Invia preferenza" }))
    await expect(canvas.getByRole("status", { name: "Canale inviato" })).toHaveTextContent(
      "nessuno",
    )

    await userEvent.click(canvas.getByRole("button", { name: "Mostra canali" }))
    await expect(office).toBeChecked()
    await expect(office).not.toHaveAttribute("aria-busy")
    await userEvent.click(canvas.getByRole("button", { name: "Invia preferenza" }))
    await expect(canvas.getByRole("status", { name: "Canale inviato" })).toHaveTextContent("office")
    await userEvent.click(canvas.getByText("Email"))
    await expect(email).toBeChecked()
    await userEvent.click(canvas.getByRole("button", { name: "Invia preferenza" }))
    await expect(canvas.getByRole("status", { name: "Canale inviato" })).toHaveTextContent("email")
  },
}

export const RadioSourceStateMatrix: Story = {
  // Reflow exemption pending a design request: docs/design-requests/2026-10-16-a11y-reflow-conditions.md.
  parameters: { a11yContract: { reflow: false } },
  render: () => {
    const states = [
      { label: "Default", selected: false, disabled: false, error: undefined },
      { label: "Selected", selected: true, disabled: false, error: undefined },
      { label: "Default disabled", selected: false, disabled: true, error: undefined },
      { label: "Selected disabled", selected: true, disabled: true, error: undefined },
      {
        label: "Feedback error",
        selected: false,
        disabled: false,
        error: "Seleziona un canale disponibile.",
      },
    ]
    const placeholders = [
      { label: "Title", leadingIcon: false, description: false, selected: true },
      { label: "Icon + Title", leadingIcon: true, description: false, selected: true },
      { label: "Title + Description", leadingIcon: false, description: true, selected: false },
      {
        label: "Icon + Title + Description",
        leadingIcon: true,
        description: true,
        selected: false,
      },
    ]
    const placements: ("start" | "end")[] = ["start", "end"]

    return (
      <div className="flex flex-wrap items-start gap-6">
        {states.flatMap((state) =>
          placements.map((placement) => (
            <RadioGroup
              key={`${state.label}-${placement}`}
              legend={`${state.label} · ${placement}`}
              defaultValue={state.selected ? "contact" : undefined}
              className="w-80 max-w-full"
            >
              <RadioField
                value="contact"
                label="Canale di contatto"
                indicatorPlacement={placement}
                leadingIcon={
                  placement === "end" ? <PagoPAIcon name="notifications_active" /> : undefined
                }
                description={placement === "end" ? "Testo descrittivo." : undefined}
                disabled={state.disabled}
                error={state.error}
              />
            </RadioGroup>
          )),
        )}
        {placeholders.map((state) => (
          <RadioGroup
            key={state.label}
            legend={`Skeleton · ${state.label}`}
            defaultValue={state.selected ? "loading" : undefined}
            className="w-80 max-w-full"
          >
            <RadioField
              value="loading"
              label="Canale in caricamento"
              leadingIcon={
                state.leadingIcon ? <PagoPAIcon name="notifications_active" /> : undefined
              }
              description={state.description ? "Informazioni sul canale." : undefined}
              indicatorPlacement="end"
              loading
            />
          </RadioGroup>
        ))}
      </div>
    )
  },
}
