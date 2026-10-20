import * as React from "react"
import type { Meta, StoryObj } from "@storybook/react-vite"
import { expect, userEvent, waitFor, within } from "storybook/test"

import { SwitchField } from "@/components/inputs/switch-field"
import { PagoPAIcon } from "@/components/icons/PagoPAIcon"
import { Button } from "@/components/primitives/button"
import { Switch } from "@/components/primitives/switch"
import { figmaEmbedUrl } from "@/catalog/figma/file"

import switchGuide from "./guides/switch-choices.md?raw"
import { fieldError } from "./support/a11y-contract"

const meta = {
  title: "Components/Inputs/SwitchField",
  component: SwitchField,
  args: { label: "Aggiornamenti del servizio" },
  parameters: {
    docs: {
      description: {
        component: switchGuide,
      },
    },
  },
} satisfies Meta<typeof SwitchField>

export default meta
type Story = StoryObj<typeof meta>

// The link keeps its source-exact 14/20 line box and reaches the 44px pointer
// target through the invisible ::after expansion (20 + 2×12, vertical only so
// the expansion cannot widen the scroll area).
const expectLinkTargetAtLeast44 = async (element: HTMLElement) => {
  const box = element.getBoundingClientRect()
  const expansion = getComputedStyle(element, "::after")
  await expect(box.height - 2 * parseFloat(expansion.top)).toBeGreaterThanOrEqual(44)
}

export const SourcePrimitiveStates: Story = {
  parameters: {
    // Reflow exemption: fixture pinned at the source width, not a product surface.
    a11yContract: { reflow: false },
    design: { type: "figma", url: figmaEmbedUrl("295:1360") },
  },
  render: () => (
    <form aria-label="Elementi Switch nativi" className="grid gap-4">
      <label className="flex items-center gap-3">
        <Switch name="active" defaultChecked />
        Aggiornamenti attivi
      </label>
      <label className="flex items-center gap-3">
        <Switch name="reminders" />
        Promemoria facoltativi
      </label>
      <label className="flex items-center gap-3">
        <Switch name="locked" defaultChecked disabled />
        Aggiornamenti non modificabili
      </label>
      <label className="flex items-center gap-3">
        <Switch name="unavailable" disabled />
        Promemoria non disponibili
      </label>
      <label className="flex items-center gap-3">
        <Switch name="loading" defaultChecked loading />
        Aggiornamento in corso
      </label>
    </form>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const form = canvas.getByRole("form", { name: "Elementi Switch nativi" })
    if (!(form instanceof HTMLFormElement)) throw new Error("Expected a native primitive form")
    const active = canvas.getByRole("switch", { name: "Aggiornamenti attivi" })
    const reminders = canvas.getByRole("switch", { name: "Promemoria facoltativi" })
    const locked = canvas.getByRole("switch", { name: "Aggiornamenti non modificabili" })
    const unavailable = canvas.getByRole("switch", { name: "Promemoria non disponibili" })
    const loading = canvas.getByRole("switch", { name: "Aggiornamento in corso" })
    for (const control of [active, reminders, locked, unavailable, loading]) {
      await expect(control.getBoundingClientRect().width).toBe(56)
      await expect(control.getBoundingClientRect().height).toBe(44)
    }
    await expect(Object.fromEntries(new FormData(form))).toEqual({ active: "on" })
    for (const control of [locked, unavailable, loading]) {
      await expect(control).toHaveAttribute("aria-disabled", "true")
      await userEvent.click(control)
    }
    await expect(locked).toBeChecked()
    await expect(unavailable).not.toBeChecked()
    await expect(loading).toBeChecked()
    await expect(loading).toHaveAttribute("aria-busy", "true")
    await userEvent.click(canvas.getByText("Aggiornamenti attivi", { exact: true }))
    await expect(active).not.toBeChecked()
    reminders.focus()
    await userEvent.keyboard(" ")
    await expect(reminders).toBeChecked()
    await expect(Object.fromEntries(new FormData(form))).toEqual({ reminders: "on" })
    await expect(getComputedStyle(reminders).outlineStyle).toBe("solid")
    await expect(getComputedStyle(reminders).outlineWidth).toBe("2px")
  },
}

export const SourcePrimitiveFidelity: Story = {
  parameters: {
    // Reflow exemption: fixture pinned at the source width, not a product surface.
    a11yContract: { reflow: false },
    design: { type: "figma", url: figmaEmbedUrl("295:1360") },
  },
  render: () => (
    <form aria-label="Varianti sorgente dello Switch" className="grid gap-4">
      <label className="flex items-center gap-3" data-switch-case="unchecked-default">
        <Switch name="uncheckedDefault" />
        Predefinito non selezionato
      </label>
      <label className="flex items-center gap-3" data-switch-case="checked-default">
        <Switch name="checkedDefault" defaultChecked />
        Predefinito selezionato
      </label>
      <label className="flex items-center gap-3" data-switch-case="unchecked-disabled">
        <Switch name="uncheckedDisabled" disabled />
        Non selezionato, non disponibile
      </label>
      <label className="flex items-center gap-3" data-switch-case="checked-disabled">
        <Switch name="checkedDisabled" defaultChecked disabled />
        Selezionato, non disponibile
      </label>
      <label className="flex items-center gap-3" data-switch-case="loading">
        <Switch name="loading" defaultChecked loading />
        Caricamento
      </label>
    </form>
  ),
}

export const SourcePrimitiveFocusUnchecked: Story = {
  parameters: { design: { type: "figma", url: figmaEmbedUrl("295:1360") } },
  render: () => (
    <form aria-label="Switch non selezionato con focus" className="grid gap-4">
      <div className="w-fit p-1" data-switch-frame="focus-unchecked">
        <label className="flex items-center gap-3">
          <Switch name="focusedUnchecked" />
          <span className="sr-only">Non selezionato con focus</span>
        </label>
      </div>
    </form>
  ),
  play: async ({ canvasElement }) => {
    const control = within(canvasElement).getByRole("switch", {
      name: "Non selezionato con focus",
    })
    await userEvent.tab()
    await expect(control).toHaveFocus()
  },
}

export const SourcePrimitiveFocusChecked: Story = {
  parameters: { design: { type: "figma", url: figmaEmbedUrl("295:1360") } },
  render: () => (
    <form aria-label="Switch selezionato con focus" className="grid gap-4">
      <div className="w-fit p-1" data-switch-frame="focus-checked">
        <label className="flex items-center gap-3">
          <Switch name="focusedChecked" defaultChecked />
          <span className="sr-only">Selezionato con focus</span>
        </label>
      </div>
    </form>
  ),
  play: async ({ canvasElement }) => {
    const control = within(canvasElement).getByRole("switch", {
      name: "Selezionato con focus",
    })
    await userEvent.tab()
    await expect(control).toHaveFocus()
  },
}

// The verifier positions its pointer with a click; controlled values keep the hover fixtures stable.
export const SourcePrimitiveHoverUnchecked: Story = {
  parameters: {
    // Reflow exemption: fixture pinned at the source width, not a product surface.
    a11yContract: { reflow: false },
    design: { type: "figma", url: figmaEmbedUrl("295:1360") },
  },
  render: () => (
    <form aria-label="Switch non selezionato in hover" className="grid gap-4">
      <label className="flex items-center gap-3">
        <Switch name="hoverUnchecked" checked={false} onCheckedChange={() => undefined} />
        Non selezionato in hover
      </label>
    </form>
  ),
  play: async ({ canvasElement }) => {
    const control = within(canvasElement).getByRole("switch", {
      name: "Non selezionato in hover",
    })
    await userEvent.hover(control)
  },
}

export const SourcePrimitiveHoverChecked: Story = {
  parameters: {
    // Reflow exemption: fixture pinned at the source width, not a product surface.
    a11yContract: { reflow: false },
    design: { type: "figma", url: figmaEmbedUrl("295:1360") },
  },
  render: () => (
    <form aria-label="Switch selezionato in hover" className="grid gap-4">
      <label className="flex items-center gap-3">
        <Switch name="hoverChecked" checked onCheckedChange={() => undefined} />
        Selezionato in hover
      </label>
    </form>
  ),
  play: async ({ canvasElement }) => {
    const control = within(canvasElement).getByRole("switch", {
      name: "Selezionato in hover",
    })
    await userEvent.hover(control)
  },
}

export const SourceSwitches: Story = {
  parameters: { design: { type: "figma", url: figmaEmbedUrl("349:4683") } },
  render: () => (
    <form aria-label="Stati degli aggiornamenti" className="grid w-80 max-w-full gap-4">
      <SwitchField label="Aggiornamenti attivi" name="active" defaultChecked />
      <SwitchField label="Promemoria facoltativi" name="reminders" />
      <SwitchField
        label="Notifiche attive non modificabili"
        name="locked"
        defaultChecked
        disabled
      />
      <SwitchField label="Notifiche non disponibili" name="unavailable" disabled />
    </form>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const form = canvas.getByRole("form", { name: "Stati degli aggiornamenti" })
    if (!(form instanceof HTMLFormElement)) throw new Error("Expected the native preferences form")
    const active = canvas.getByRole("switch", { name: "Aggiornamenti attivi" })
    const reminders = canvas.getByRole("switch", { name: "Promemoria facoltativi" })
    const locked = canvas.getByRole("switch", { name: "Notifiche attive non modificabili" })
    const unavailable = canvas.getByRole("switch", { name: "Notifiche non disponibili" })

    for (const control of [active, reminders, locked, unavailable]) {
      const bounds = control.getBoundingClientRect()
      await expect(bounds.width).toBe(56)
      await expect(bounds.height).toBe(44)
    }
    await expect(active).toBeChecked()
    await expect(reminders).not.toBeChecked()
    await expect(locked).toBeChecked()
    await expect(locked).toHaveAttribute("aria-disabled", "true")
    await expect(unavailable).not.toBeChecked()
    await expect(unavailable).toHaveAttribute("aria-disabled", "true")
    await userEvent.click(locked)
    await userEvent.click(unavailable)
    await expect(locked).toBeChecked()
    await expect(unavailable).not.toBeChecked()
    await expect(Object.fromEntries(new FormData(form))).toEqual({ active: "on" })

    await userEvent.click(canvas.getByText("Aggiornamenti attivi", { exact: true }))
    await expect(active).not.toBeChecked()
    reminders.focus()
    await userEvent.keyboard(" ")
    await expect(reminders).toBeChecked()
    await expect(Object.fromEntries(new FormData(form))).toEqual({ reminders: "on" })
  },
}

function LoadingPreference() {
  const [loading, setLoading] = React.useState(true)
  return (
    <form aria-label="Aggiornamento della preferenza" className="grid w-80 max-w-full gap-4">
      <SwitchField
        label="Ricevi aggiornamenti"
        name="updates"
        defaultChecked
        loading={loading}
        description="Ricevi le comunicazioni relative al servizio."
      />
      <Button type="button" onClick={() => setLoading(false)}>
        Completa aggiornamento
      </Button>
    </form>
  )
}

export const LoadingPreservesSelection: Story = {
  render: () => <LoadingPreference />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const form = canvas.getByRole("form", { name: "Aggiornamento della preferenza" })
    if (!(form instanceof HTMLFormElement)) throw new Error("Expected the native preference form")
    const control = canvas.getByRole("switch", { name: "Ricevi aggiornamenti" })
    await expect(control).toBeChecked()
    await expect(control).toHaveAttribute("aria-busy", "true")
    await expect(control).toHaveAttribute("aria-disabled", "true")
    await expect(new FormData(form).has("updates")).toBe(false)
    await userEvent.click(canvas.getByText("Ricevi aggiornamenti", { exact: true }))
    await expect(control).toBeChecked()

    await userEvent.click(canvas.getByRole("button", { name: "Completa aggiornamento" }))
    await expect(control).not.toHaveAttribute("aria-busy")
    await expect(control).not.toHaveAttribute("aria-disabled")
    await expect(control).toBeChecked()
    await expect(new FormData(form).get("updates")).toBe("on")
    control.focus()
    await userEvent.keyboard(" ")
    await expect(control).not.toBeChecked()
    await expect(new FormData(form).has("updates")).toBe(false)
  },
}

export const RichSourceOptions: Story = {
  parameters: { design: { type: "figma", url: figmaEmbedUrl("349:4683") } },
  render: () => (
    <form aria-label="Preferenze complete" className="grid w-80 max-w-full">
      <SwitchField
        label="Aggiornamenti della pratica"
        name="updates"
        defaultChecked
        leadingIcon={<PagoPAIcon name="mobile_2" decorative={false} label="Dispositivo mobile" />}
        description="Ricevi una comunicazione quando cambia lo stato."
        learnMore={{ label: "Approfondisci gli aggiornamenti", href: "/servizi/aggiornamenti" }}
      />
      <SwitchField
        label="Notifiche non disponibili"
        name="unavailable"
        disabled
        leadingIcon={<PagoPAIcon name="mobile_2" />}
        description="La preferenza non può essere modificata."
        learnMore={{ label: "Informazioni sulle notifiche", href: "/servizi/notifiche" }}
      />
      <SwitchField
        label="Conferma degli avvisi"
        name="confirmation"
        required
        leadingIcon={<PagoPAIcon name="mobile_2" />}
        description="Conferma la ricezione degli avvisi."
        error="La conferma è obbligatoria."
      />
    </form>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const form = canvas.getByRole("form", { name: "Preferenze complete" })
    if (!(form instanceof HTMLFormElement)) throw new Error("Expected the native preferences form")
    const control = canvas.getByRole("switch", { name: "Aggiornamenti della pratica" })
    const unavailable = canvas.getByRole("switch", { name: "Notifiche non disponibili" })
    const details = canvas.getByRole("link", { name: "Approfondisci gli aggiornamenti" })
    const unavailableDetails = canvas.getByRole("link", { name: "Informazioni sulle notifiche" })
    await expect(details).toHaveAttribute("href", "/servizi/aggiornamenti")
    await expect(unavailableDetails).toHaveAttribute("href", "/servizi/notifiche")
    await expect(details).not.toHaveAttribute("role", "button")
    await expect(unavailableDetails).not.toHaveAttribute("aria-disabled")
    await expectLinkTargetAtLeast44(details)
    await expect(getComputedStyle(details).fontSize).toBe("14px")
    await expect(getComputedStyle(details).lineHeight).toBe("20px")
    await expect(canvas.queryAllByRole("img")).toHaveLength(0)
    await expect(canvas.queryAllByRole("button")).toHaveLength(0)
    const invalid = canvas.getByRole("switch", { name: /Conferma degli avvisi/ })
    await expect(invalid).toHaveAttribute("aria-invalid", "true")
    await expect(fieldError(canvasElement)).toHaveTextContent("La conferma è obbligatoria.")
    const invalidIds = (invalid.getAttribute("aria-describedby") ?? "").split(/\s+/)
    await expect(invalidIds.map((id) => document.getElementById(id)?.textContent).join(" ")).toBe(
      "Conferma la ricezione degli avvisi. La conferma è obbligatoria.",
    )
    const descriptionIds = (control.getAttribute("aria-describedby") ?? "").split(/\s+/)
    await expect(
      descriptionIds.map((id) => document.getElementById(id)?.textContent).join(" "),
    ).toBe("Ricevi una comunicazione quando cambia lo stato.")

    await userEvent.click(canvas.getByText("Aggiornamenti della pratica", { exact: true }))
    await expect(control).not.toBeChecked()
    await expect(unavailable).not.toBeChecked()
    await expect(Object.fromEntries(new FormData(form))).toEqual({})
    let navigations = 0
    const recordNavigation = (event: Event) => {
      event.preventDefault()
      navigations += 1
    }
    unavailableDetails.addEventListener("click", recordNavigation)
    try {
      unavailableDetails.focus()
      await userEvent.keyboard(" ")
      await expect(navigations).toBe(0)
      await userEvent.keyboard("{Enter}")
      await expect(navigations).toBe(1)
      await expect(unavailable).not.toBeChecked()
      await expect(Object.fromEntries(new FormData(form))).toEqual({})
    } finally {
      unavailableDetails.removeEventListener("click", recordNavigation)
    }
  },
}

export const KeyboardFocusStates: Story = {
  tags: ["color-pinned"],
  parameters: { design: { type: "figma", url: figmaEmbedUrl("295:1360") } },
  render: () => (
    <div className="grid w-80 max-w-full">
      <SwitchField label="Aggiornamenti attivi" defaultChecked />
      <SwitchField label="Promemoria disattivati" />
    </div>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const checked = canvas.getByRole("switch", { name: "Aggiornamenti attivi" })
    const unchecked = canvas.getByRole("switch", { name: "Promemoria disattivati" })
    for (const { control, expectedColor } of [
      { control: checked, expectedColor: "rgb(11, 62, 227)" },
      { control: unchecked, expectedColor: "rgb(85, 92, 112)" },
    ]) {
      if (!(control instanceof HTMLElement)) throw new Error("Expected a rendered switch")
      control.focus()
      await expect(control).toHaveFocus()
      await expect(getComputedStyle(control).outlineWidth).toBe("2px")
      await expect(getComputedStyle(control).outlineStyle).toBe("solid")
      const knob = control.querySelector("[data-slot=switch-thumb]")
      if (!(knob instanceof HTMLElement)) throw new Error("The source knob must be visible")
      const indicatorElement = knob.querySelector<HTMLElement>("[data-slot=switch-focus-dot]")
      if (!indicatorElement) throw new Error("The source focus dot must render")
      const indicator = getComputedStyle(indicatorElement)
      await expect(indicator.width).toBe("10px")
      await expect(indicator.height).toBe("10px")
      await expect(indicator.backgroundColor).toBe(expectedColor)
      await expect(indicator.opacity).toBe("1")
    }
  },
}

export const NarrowRichSource: Story = {
  render: () => {
    const placements: ("start" | "end")[] = ["start", "end"]
    return (
      <div className="grid gap-6">
        {[240, 320].flatMap((width) =>
          placements.map((placement) => (
            <section
              key={`${width}-${placement}`}
              aria-label={`Preferenze nel layout ${placement} da ${width} px`}
              className="grid max-w-full"
              style={{ width }}
            >
              <SwitchField
                label="AggiornamentiDellePratichePerLePubblicheAmministrazioni"
                defaultChecked
                indicatorPlacement={placement}
                leadingIcon={<PagoPAIcon name="mobile_2" />}
                description="ComunicazioniRelativeAgliAggiornamentiDeiServiziDellaPubblicaAmministrazione"
                learnMore={{
                  label: "InformazioniSugliAggiornamentiDellePraticheAmministrative",
                  href: "/servizi/aggiornamenti",
                }}
              />
            </section>
          )),
        )}
      </div>
    )
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    for (const width of [240, 320]) {
      for (const placement of ["start", "end"]) {
        const region = canvas.getByRole("region", {
          name: `Preferenze nel layout ${placement} da ${width} px`,
        })
        const content = within(region)
        const control = content.getByRole("switch", {
          name: "AggiornamentiDellePratichePerLePubblicheAmministrazioni",
        })
        const details = content.getByRole("link", {
          name: "InformazioniSugliAggiornamentiDellePraticheAmministrative",
        })
        const bounds = region.getBoundingClientRect()
        await expect(bounds.width).toBe(width)
        await expect(region.scrollWidth).toBeLessThanOrEqual(region.clientWidth)
        await expect(getComputedStyle(region).overflowX).toBe("visible")
        await expect(control.getBoundingClientRect().width).toBe(56)
        await expect(control.getBoundingClientRect().height).toBe(44)
        await expectLinkTargetAtLeast44(details)
        for (const element of [control, details]) {
          const target = element.getBoundingClientRect()
          await expect(target.left).toBeGreaterThanOrEqual(bounds.left)
          await expect(target.right).toBeLessThanOrEqual(bounds.right)
        }
        const descriptionId = control.getAttribute("aria-describedby")
        if (!descriptionId) throw new Error("The long description must remain associated")
        await expect(document.getElementById(descriptionId)).toHaveTextContent(
          "ComunicazioniRelativeAgliAggiornamentiDeiServiziDellaPubblicaAmministrazione",
        )
        await expect(control).toBeChecked()
        control.focus()
        await userEvent.keyboard(" ")
        await expect(control).not.toBeChecked()
      }
    }
  },
}

function RepositioningPreference() {
  const [placement, setPlacement] = React.useState<"start" | "end">("start")
  return (
    <form aria-label="Preferenze con indicatore iniziale" className="grid w-80 max-w-full gap-4">
      <section aria-label="Preferenza principale" className="grid">
        <SwitchField
          label="Comunicazioni del servizio"
          name="updates"
          defaultChecked
          indicatorPlacement={placement}
          description="Ricevi gli aggiornamenti della pratica."
        />
      </section>
      <section aria-label="Preferenza con errore" className="grid">
        <SwitchField
          label="Conferma delle comunicazioni"
          name="confirmation"
          indicatorPlacement="start"
          description="Conferma la ricezione degli aggiornamenti."
          error="La conferma è obbligatoria."
          required
        />
      </section>
      <SwitchField
        label="Preferenza iniziale non modificabile"
        name="locked"
        defaultChecked
        indicatorPlacement="start"
        disabled
      />
      <SwitchField
        label={<span className="sr-only">Preferenza senza titolo visibile</span>}
        name="withoutTitle"
        indicatorPlacement="start"
      />
      <SwitchField
        label={<span className="sr-only">Preferenza con sola descrizione</span>}
        name="descriptionOnly"
        indicatorPlacement="start"
        description="Ricevi soltanto gli avvisi essenziali."
      />
      <Button
        type="button"
        onClick={() => setPlacement((current) => (current === "start" ? "end" : "start"))}
      >
        Cambia posizione
      </Button>
      <Button type="reset" variant="outline">
        Ripristina preferenze
      </Button>
    </form>
  )
}

export const SourceStartPlacement: Story = {
  parameters: { design: { type: "figma", url: figmaEmbedUrl("295:1360") } },
  render: () => <RepositioningPreference />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const form = canvas.getByRole("form", { name: "Preferenze con indicatore iniziale" })
    if (!(form instanceof HTMLFormElement)) throw new Error("Expected the native preferences form")
    const region = canvas.getByRole("region", { name: "Preferenza principale" })
    const control = within(region).getByRole("switch", { name: "Comunicazioni del servizio" })
    const title = within(region).getByText("Comunicazioni del servizio", { exact: true })
    const description = within(region).getByText("Ricevi gli aggiornamenti della pratica.")
    const track = control.querySelector<HTMLElement>("[data-slot=switch-track]")
    if (!track) throw new Error("The switch track must remain visible")
    await expect(control.getBoundingClientRect().left).toBe(region.getBoundingClientRect().left)
    await expect(title.getBoundingClientRect().left).toBe(control.getBoundingClientRect().right)
    await expect(title.getBoundingClientRect().left).toBe(track.getBoundingClientRect().right + 8)
    await expect(description.getBoundingClientRect().left).toBe(title.getBoundingClientRect().left)
    await expect(region.getBoundingClientRect().height).toBe(44)
    await expect(control.getBoundingClientRect().width).toBe(56)
    await expect(control.getBoundingClientRect().height).toBe(44)

    const invalid = canvas.getByRole("switch", { name: /Conferma delle comunicazioni/ })
    const invalidRegion = canvas.getByRole("region", { name: "Preferenza con errore" })
    // The wrapped copy settles with the font: retry instead of asserting on a
    // first paint that may still measure the fallback metrics.
    await waitFor(() => expect(invalidRegion.getBoundingClientRect().height).toBe(66))
    await expect(invalid).toHaveAttribute("aria-invalid", "true")
    await expect(fieldError(invalidRegion)).toHaveTextContent("La conferma è obbligatoria.")
    const associated = (invalid.getAttribute("aria-describedby") ?? "")
      .split(/\s+/)
      .map((id) => document.getElementById(id)?.textContent)
      .join(" ")
    await expect(associated).toBe(
      "Conferma la ricezione degli aggiornamenti. La conferma è obbligatoria.",
    )
    const locked = canvas.getByRole("switch", { name: "Preferenza iniziale non modificabile" })
    await userEvent.click(locked)
    await expect(locked).toBeChecked()
    await expect(Object.fromEntries(new FormData(form))).toEqual({ updates: "on" })

    await userEvent.click(title)
    await expect(control).not.toBeChecked()
    await userEvent.click(canvas.getByRole("button", { name: "Cambia posizione" }))
    const repositioned = canvas.getByRole("switch", { name: "Comunicazioni del servizio" })
    await expect(repositioned).not.toBeChecked()
    await expect(repositioned.getBoundingClientRect().left).toBeGreaterThan(
      canvas.getByText("Comunicazioni del servizio", { exact: true }).getBoundingClientRect().right,
    )
    await expect(Object.fromEntries(new FormData(form))).toEqual({})
    await userEvent.click(canvas.getByRole("button", { name: "Ripristina preferenze" }))
    await expect(repositioned).toBeChecked()
    await expect(Object.fromEntries(new FormData(form))).toEqual({ updates: "on" })

    for (const label of ["Preferenza senza titolo visibile", "Preferenza con sola descrizione"]) {
      const control = canvas.getByRole("switch", { name: label })
      const title = canvas.getByText(label, { exact: true })
      await expect(title.getBoundingClientRect().width).toBe(1)
      await expect(title.getBoundingClientRect().height).toBe(1)
      await expect(control.getBoundingClientRect().height).toBe(44)
      await expect(control).not.toBeChecked()
      control.focus()
      await userEvent.keyboard(" ")
      await expect(control).toBeChecked()
    }
    const descriptionOnly = canvas.getByRole("switch", {
      name: "Preferenza con sola descrizione",
    })
    const descriptionId = descriptionOnly.getAttribute("aria-describedby")
    if (!descriptionId) throw new Error("The titleless preference must retain its description")
    await expect(document.getElementById(descriptionId)).toHaveTextContent(
      "Ricevi soltanto gli avvisi essenziali.",
    )
    await expect(Object.fromEntries(new FormData(form))).toEqual({
      updates: "on",
      withoutTitle: "on",
      descriptionOnly: "on",
    })
  },
}

const sourceStartStates: readonly {
  id: string
  caseClass: string
  state: string
  checked: boolean
  disabled?: boolean
  error?: string
}[] = [
  {
    id: "switch-start-default-off",
    caseClass: "source-start-default-off",
    state: "unchecked enabled",
    checked: false,
  },
  {
    id: "switch-start-error",
    caseClass: "source-start-error",
    state: "unchecked error",
    checked: false,
    error: "Helper text",
  },
  {
    id: "switch-start-disabled-off",
    caseClass: "source-start-disabled-off",
    state: "unchecked disabled",
    checked: false,
    disabled: true,
  },
  {
    id: "switch-start-default-on",
    caseClass: "source-start-default-on",
    state: "checked enabled",
    checked: true,
  },
  {
    id: "switch-start-disabled-on",
    caseClass: "source-start-disabled-on",
    state: "checked disabled",
    checked: true,
    disabled: true,
  },
  {
    id: "switch-start-hover-off",
    caseClass: "source-start-hover-off",
    state: "unchecked hover",
    checked: false,
  },
  {
    id: "switch-start-focus-off",
    caseClass: "source-start-focus-off",
    state: "unchecked focused",
    checked: false,
  },
  {
    id: "switch-start-hover-on",
    caseClass: "source-start-hover-on",
    state: "checked hover",
    checked: true,
  },
  {
    id: "switch-start-focus-on",
    caseClass: "source-start-focus-on",
    state: "checked focused",
    checked: true,
  },
]

function SourceStartOption({
  id,
  caseClass,
  state,
  checked,
  disabled,
  error,
}: {
  id: string
  caseClass: string
  state: string
  checked: boolean
  disabled?: boolean
  error?: string
}) {
  return (
    <SwitchField
      id={id}
      name={id}
      className={caseClass}
      label={
        <>
          Label
          <span className="sr-only">{` ${state}`}</span>
        </>
      }
      description="Label"
      error={error}
      checked={checked}
      disabled={disabled}
      onCheckedChange={() => undefined}
      indicatorPlacement="start"
    />
  )
}

export const FidelityStartStates: Story = {
  parameters: {
    // Reflow exemption pending a design request: docs/design-requests/2026-10-16-a11y-reflow-conditions.md.
    a11yContract: { reflow: false },
    design: { type: "figma", url: figmaEmbedUrl("295:1360") },
  },
  render: () => (
    <form aria-label="SwitchField control-before-copy source states" className="grid w-80 gap-4">
      {sourceStartStates.map((state) => (
        <SourceStartOption key={state.id} {...state} />
      ))}
    </form>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    for (const state of sourceStartStates) {
      const control = canvas.getByRole("switch", {
        name: `Label ${state.state}`,
      })
      if (state.checked) await expect(control).toBeChecked()
      else await expect(control).not.toBeChecked()
      if (state.disabled) await expect(control).toHaveAttribute("aria-disabled", "true")
      else await expect(control).not.toHaveAttribute("aria-disabled", "true")
      await expect(control.getBoundingClientRect().width).toBe(56)
      await expect(control.getBoundingClientRect().height).toBe(44)
      const row = canvasElement.querySelector<HTMLElement>(`.${state.caseClass}`)
      const title = row?.querySelector<HTMLElement>(`label[for="${state.id}"] > span.min-w-0`)
      const track = control.querySelector<HTMLElement>("[data-slot=switch-track]")
      if (!title || !track) throw new Error("The source control and title geometry must render")
      await expect(title.getBoundingClientRect().left).toBe(track.getBoundingClientRect().right + 8)
    }

    const form = canvas.getByRole("form", {
      name: "SwitchField control-before-copy source states",
    })
    if (!(form instanceof HTMLFormElement)) throw new Error("Expected the native switch form")
    await expect(Object.fromEntries(new FormData(form))).toEqual({
      "switch-start-default-on": "on",
      "switch-start-hover-on": "on",
      "switch-start-focus-on": "on",
    })
    const invalid = canvas.getByRole("switch", { name: "Label unchecked error" })
    await expect(invalid).toHaveAttribute("aria-invalid", "true")
    await expect(fieldError(canvasElement)).toHaveTextContent("Helper text")
  },
}

const sourceRichStates = [
  {
    id: "switch-rich-checked-yes",
    caseClass: "source-rich-checked-yes",
    state: "checked available",
    checked: true,
    unavailable: false,
  },
  {
    id: "switch-rich-unchecked-yes",
    caseClass: "source-rich-unchecked-yes",
    state: "unchecked available",
    checked: false,
    unavailable: false,
  },
  {
    id: "switch-rich-unchecked-no",
    caseClass: "source-rich-unchecked-no",
    state: "unchecked unavailable",
    checked: false,
    unavailable: true,
  },
  {
    id: "switch-rich-checked-no",
    caseClass: "source-rich-checked-no",
    state: "checked unavailable",
    checked: true,
    unavailable: true,
  },
] as const

function SourceRichOption({
  id,
  caseClass,
  state,
  checked,
  unavailable,
}: {
  id: string
  caseClass: string
  state: string
  checked: boolean
  unavailable: boolean
}) {
  return (
    <SwitchField
      id={id}
      name={id}
      className={caseClass}
      label={
        <>
          Label
          <span className="sr-only">{` ${state}`}</span>
        </>
      }
      leadingIcon={<PagoPAIcon name="mobile_2" />}
      description="Add a supporting description"
      learnMore={{ label: "Scopri di più", href: "/servizi/aggiornamenti" }}
      unavailable={unavailable}
      defaultChecked={checked}
    />
  )
}

export const FidelityRichStates: Story = {
  tags: ["color-pinned"],
  parameters: { design: { type: "figma", url: figmaEmbedUrl("349:4683") } },
  render: () => (
    <form aria-label="SwitchField rich source states" className="grid w-80 max-w-full">
      {sourceRichStates.map((state) => (
        <SourceRichOption key={state.id} {...state} />
      ))}
    </form>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const form = canvas.getByRole("form", { name: "SwitchField rich source states" })
    if (!(form instanceof HTMLFormElement)) throw new Error("Expected the native preference form")

    for (const state of sourceRichStates) {
      const row = canvasElement.querySelector<HTMLElement>(`.${state.caseClass}`)
      if (!row) throw new Error(`Missing rendered source option: ${state.caseClass}`)
      const control = within(row).getByRole("switch", {
        name: `Label ${state.state}`,
      })
      if (state.checked) await expect(control).toBeChecked()
      else await expect(control).not.toBeChecked()
      await expect(control).not.toBeDisabled()
      await expect(getComputedStyle(row).opacity).toBe("1")
      const iconContainer = row.querySelector<HTMLElement>(
        `label[for="${state.id}"] > span[aria-hidden="true"]`,
      )
      if (!iconContainer?.querySelector("[data-figma-node-id]"))
        throw new Error("The decorative source icon must render")
      await expect(getComputedStyle(iconContainer).opacity).toBe(state.unavailable ? "0.5" : "1")
      const link = within(row).getByRole("link", { name: "Scopri di più" })
      await expect(link).toHaveAttribute("href", "/servizi/aggiornamenti")
      await expect(getComputedStyle(link).opacity).toBe("1")
      await expectLinkTargetAtLeast44(link)
    }

    const unavailable = canvas.getByRole("switch", {
      name: "Label unchecked unavailable",
    })
    const unavailableRow = canvasElement.querySelector<HTMLElement>(".source-rich-unchecked-no")
    if (!unavailableRow) throw new Error("The unavailable source option must render")
    unavailable.focus()
    await expect(getComputedStyle(unavailableRow).opacity).toBe("1")
    unavailable.blur()
    await expect(getComputedStyle(unavailableRow).opacity).toBe("1")
    unavailable.focus()
    await userEvent.keyboard(" ")
    await expect(unavailable).toBeChecked()
    await expect(Object.fromEntries(new FormData(form))).toEqual({
      "switch-rich-checked-yes": "on",
      "switch-rich-unchecked-no": "on",
      "switch-rich-checked-no": "on",
    })
    await userEvent.keyboard(" ")
    await expect(unavailable).not.toBeChecked()
    unavailable.blur()
    await expect(getComputedStyle(unavailableRow).opacity).toBe("1")
    await expect(Object.fromEntries(new FormData(form))).toEqual({
      "switch-rich-checked-yes": "on",
      "switch-rich-checked-no": "on",
    })
  },
}
