import type { Meta, StoryObj } from "@storybook/react-vite"
import { expect, fn, userEvent, waitFor, within } from "storybook/test"

import { AuthenticationCodeInput } from "@/components/inputs/text-fields"
import { Button } from "@/components/primitives/button"
import { figmaEmbedUrl } from "@/catalog/figma/file"

import authenticationCodesGuide from "./guides/authentication-codes.md?raw"

const meta = {
  title: "Components/Inputs/AuthenticationCodeInput",
  component: AuthenticationCodeInput,
  parameters: {
    docs: {
      description: {
        component: authenticationCodesGuide,
      },
    },
  },
} satisfies Meta<typeof AuthenticationCodeInput>

export default meta
type Story = StoryObj<typeof meta>

const completeCode = fn()

function codeFrame(input: Element) {
  const frame = input.closest('[data-slot="otp-field"]')
  if (!(frame instanceof HTMLElement)) throw new Error("Expected the shared code frame")
  return frame
}

function slotValues(frame: HTMLElement) {
  return Array.from(frame.querySelectorAll("input"), (input) => input.value).join("")
}

function visibleCarets(frame: HTMLElement) {
  return Array.from(frame.querySelectorAll('[data-slot="otp-field-caret"]')).filter(
    (caret) => getComputedStyle(caret).display !== "none",
  )
}

export const MaskedNativeCode: Story = {
  // Reflow exemption pending a design request: docs/design-requests/2026-10-16-a11y-reflow-conditions.md.
  parameters: { a11yContract: { reflow: false } },
  render: () => (
    <form aria-label="Verifica riservata" className="grid max-w-sm gap-4">
      <AuthenticationCodeInput
        label="Codice riservato"
        name="code"
        mask
        length={5}
        defaultValue="57"
        description="Puoi digitare o incollare il codice."
      />
      <Button type="reset">Ripristina codice riservato</Button>
    </form>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const form = canvas.getByRole("form", { name: "Verifica riservata" })
    if (!(form instanceof HTMLFormElement)) throw new Error("Expected the native verification form")
    const input = canvas.getByLabelText("Codice riservato", { selector: "input" })
    await expect(input).toHaveAttribute("type", "password")
    await expect(input).toHaveAttribute("inputmode", "numeric")
    await expect(input).toHaveAttribute("autocomplete", "one-time-code")
    await expect(canvas.queryByText("5")).not.toBeInTheDocument()
    await expect(canvas.queryByText("7")).not.toBeInTheDocument()
    const frame = codeFrame(input)
    await expect(frame.querySelectorAll('[data-slot="otp-field-mask"]')).toHaveLength(2)
    const marker = frame.querySelector('[data-slot="otp-field-mask"]')
    const slot = marker?.closest('[data-slot="otp-field-slot"]')
    if (!(marker instanceof HTMLElement) || !(slot instanceof HTMLElement)) {
      throw new Error("Expected a rounded source mask marker independent of the font")
    }
    const markerBounds = marker.getBoundingClientRect()
    const slotBounds = slot.getBoundingClientRect()
    await expect(markerBounds.width).toBe(8)
    await expect(markerBounds.height).toBe(8)
    await expect(markerBounds.x - slotBounds.x).toBe(2)
    await expect(markerBounds.y - slotBounds.y).toBe(14)
    await userEvent.click(canvas.getByText("Codice riservato"))
    await expect(input).toHaveFocus()
    await userEvent.keyboard("{End}391")
    await expect(slotValues(frame)).toBe("57391")
    await expect(new FormData(form).get("code")).toBe("57391")
    await expect(frame.querySelectorAll('[data-slot="otp-field-mask"]')).toHaveLength(5)
    await userEvent.click(canvas.getByRole("button", { name: "Ripristina codice riservato" }))
    await waitFor(() => expect(new FormData(form).get("code")).toBe("57"))
    await expect(slotValues(frame)).toBe("57")
    await expect(frame.querySelectorAll('[data-slot="otp-field-mask"]')).toHaveLength(2)
  },
}

export const SourceFrame: Story = {
  // Reflow exemption: fixture pinned at the source width, not a product surface.
  parameters: { a11yContract: { reflow: false } },
  tags: ["color-pinned"],
  render: () => (
    <div className="grid max-w-sm gap-6">
      <AuthenticationCodeInput label="Codice vuoto" length={5} />
      <AuthenticationCodeInput label="Codice compilato" length={5} defaultValue="57391" />
    </div>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    for (const name of ["Codice vuoto", "Codice compilato"]) {
      const input = canvas.getByRole("textbox", { name })
      const frame = codeFrame(input)
      const bounds = frame.getBoundingClientRect()
      await expect(bounds.width).toBe(169)
      await expect(bounds.height).toBe(52)
      await expect(input.getBoundingClientRect().height).toBeGreaterThanOrEqual(44)
      const style = getComputedStyle(frame)
      await expect(style.borderRadius).toBe("8px")
      await expect(style.borderWidth).toBe("1px")
      await expect(style.borderColor).toBe("rgb(99, 107, 130)")
      const slots = Array.from(frame.querySelectorAll('[data-slot="otp-field-slot"]'))
      await expect(slots).toHaveLength(5)
      await expect(frame.querySelectorAll('[data-slot="otp-field-underline"]')).toHaveLength(5)
      for (const [index, slot] of slots.entries()) {
        const slotBounds = slot.getBoundingClientRect()
        await expect(slotBounds.width).toBe(11)
        await expect(slotBounds.height).toBe(34)
        await expect(slotBounds.x - bounds.x).toBe(25 + index * 27)
        await expect(slotBounds.y - bounds.y).toBe(9)
      }
    }
    // The source digit is the Titillio 500 style = the Semibold face, declared
    // at CSS 600 in this bundle (there is no 500 face and font-synthesis is off).
    await expect(getComputedStyle(canvas.getByText("5")).fontWeight).toBe("600")
    const glyphs = canvasElement.querySelectorAll('[data-slot="otp-field-glyph"]')
    await expect(glyphs).toHaveLength(5)
    for (const glyph of glyphs) await expect(glyph).toHaveAttribute("aria-hidden", "true")
  },
}

export const KeyboardSourceCursor: Story = {
  // Reflow exemption: fixture pinned at the source width, not a product surface.
  parameters: { a11yContract: { reflow: false } },
  tags: ["color-pinned"],
  render: () => (
    <form aria-label="Verifica da tastiera" className="grid max-w-sm gap-4">
      <Button>Prima del codice</Button>
      <AuthenticationCodeInput label="Codice con cursore" length={5} />
      <Button>Dopo il codice</Button>
    </form>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await userEvent.click(canvas.getByRole("button", { name: "Prima del codice" }))
    await userEvent.tab()
    const input = canvas.getByRole("textbox", { name: "Codice con cursore" })
    await expect(input).toHaveFocus()
    const frame = codeFrame(input)
    const style = getComputedStyle(frame)
    await expect(style.outlineStyle).toBe("solid")
    await expect(style.outlineWidth).toBe("2px")
    await expect(style.outlineColor).toBe("rgb(11, 62, 227)")
    await waitFor(() => expect(visibleCarets(frame)).toHaveLength(1))
    const caret = visibleCarets(frame)[0]
    const slot = caret?.closest('[data-slot="otp-field-slot"]')
    if (!(caret instanceof HTMLElement) || !(slot instanceof HTMLElement)) {
      throw new Error("Expected the rendered source cursor")
    }
    const slotBounds = slot.getBoundingClientRect()
    const cursorBounds = caret.getBoundingClientRect()
    await expect(cursorBounds.width).toBe(2)
    await expect(cursorBounds.height).toBe(16)
    await expect(cursorBounds.x - slotBounds.x).toBe(4.5)
    await expect(cursorBounds.y - slotBounds.y).toBe(8)
    await expect(getComputedStyle(caret).backgroundColor).toBe("rgb(11, 62, 227)")
    await expect(slot).not.toHaveAttribute("aria-hidden")
    const firstSlot = slot
    await userEvent.keyboard("5")
    await expect(input).toHaveValue("5")
    await waitFor(() =>
      expect(visibleCarets(frame)[0]?.closest('[data-slot="otp-field-slot"]')).not.toBe(firstSlot),
    )
    await userEvent.tab()
    await expect(canvas.getByRole("button", { name: "Dopo il codice" })).toHaveFocus()
    await waitFor(() => expect(visibleCarets(frame)).toHaveLength(0))
  },
}

export const SourceErrorDescription: Story = {
  tags: ["color-pinned"],
  parameters: {
    // Reflow exemption: fixture pinned at the source width, not a product surface.
    a11yContract: { reflow: false },
    design: { type: "figma", url: figmaEmbedUrl("198:828") },
  },
  render: () => (
    <form aria-label="Verifica non riuscita" className="grid max-w-sm gap-4">
      <p id="source-code-policy">Richiedi un nuovo codice prima di riprovare.</p>
      <AuthenticationCodeInput
        label="Codice scaduto"
        name="code"
        length={5}
        mask
        defaultValue="57391"
        required
        description="Puoi incollare l'intero codice."
        error="Il codice inserito è scaduto."
        aria-describedby="source-code-policy"
      />
    </form>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const input = canvas.getByLabelText(/Codice scaduto/, { selector: "input" })
    await expect(input).toBeRequired()
    await expect(input).toBeInvalid()
    await expect(input).toHaveAccessibleDescription(
      "Richiedi un nuovo codice prima di riprovare. Puoi incollare l'intero codice. Il codice inserito è scaduto.",
    )
    await expect(canvas.getByText("Il codice inserito è scaduto.")).toBeVisible()
    await expect(canvas.queryByText("5")).not.toBeInTheDocument()
    const frame = codeFrame(input)
    await expect(getComputedStyle(frame).borderColor).toBe("rgb(209, 51, 51)")
    await expect(getComputedStyle(frame).borderWidth).toBe("1px")
    await expect(getComputedStyle(frame).boxShadow).toContain("inset")
    await expect(getComputedStyle(frame).boxShadow).toContain("rgb(209, 51, 51)")
    const bounds = frame.getBoundingClientRect()
    await expect(bounds.width).toBe(169)
    await expect(bounds.height).toBe(52)
    const slot = frame.querySelector('[data-slot="otp-field-slot"]')
    if (!(slot instanceof HTMLElement)) throw new Error("Expected the first source slot")
    await expect(slot.getBoundingClientRect().x - bounds.x).toBe(25)
    await expect(slot.getBoundingClientRect().y - bounds.y).toBe(9)
  },
}

export const NarrowSourceCode: Story = {
  parameters: {
    // Reflow exemption pending a design request: docs/design-requests/2026-10-16-a11y-reflow-conditions.md.
    a11yContract: { reflow: false },
    design: { type: "figma", url: figmaEmbedUrl("198:828") },
  },
  render: () => (
    <form aria-label="Verifica su contenitore stretto" className="w-60 max-w-full">
      <AuthenticationCodeInput
        label="CodiceDiAutenticazioneDellaRichiestaConIdentificativoMoltoLungo"
        description="DescrizioneDelCodiceDiAutenticazioneConUnaParolaMoltoLungaDaNonTagliare"
        defaultValue="573912"
        mask
      />
    </form>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const form = canvas.getByRole("form", { name: "Verifica su contenitore stretto" })
    const bounds = form.getBoundingClientRect()
    await expect(bounds.width).toBe(240)
    for (const content of form.querySelectorAll('label,p,[data-slot="otp-field"]')) {
      const contentBounds = content.getBoundingClientRect()
      await expect(contentBounds.x).toBeGreaterThanOrEqual(bounds.x)
      await expect(contentBounds.right).toBeLessThanOrEqual(bounds.right)
    }
    await expect(form.scrollWidth).toBeLessThanOrEqual(form.clientWidth)
    const frame = codeFrame(
      canvas.getByLabelText("CodiceDiAutenticazioneDellaRichiestaConIdentificativoMoltoLungo", {
        selector: "input",
      }),
    )
    await expect(slotValues(frame)).toBe("573912")
    await expect(frame.textContent).toBe("")
    await expect(frame.querySelectorAll('[data-slot="otp-field-mask"]')).toHaveLength(6)
  },
}

export const MaskedNativePaste: Story = {
  parameters: {
    // Reflow exemption pending a design request: docs/design-requests/2026-10-16-a11y-reflow-conditions.md.
    a11yContract: { reflow: false },
    design: { type: "figma", url: figmaEmbedUrl("198:828") },
  },
  render: () => (
    <form aria-label="Verifica da codice copiato" className="grid max-w-sm gap-4">
      <AuthenticationCodeInput
        label="Codice da incollare"
        name="code"
        length={5}
        mask
        onValueComplete={completeCode}
        description="Puoi incollare anche il codice con il trattino."
      />
    </form>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const form = canvas.getByRole("form", { name: "Verifica da codice copiato" })
    if (!(form instanceof HTMLFormElement)) throw new Error("Expected the native verification form")
    const input = canvas.getByLabelText("Codice da incollare", { selector: "input" })
    const frame = codeFrame(input)
    await userEvent.click(canvas.getByText("Codice da incollare"))
    await userEvent.paste("57-391")
    await expect(slotValues(frame)).toBe("57391")
    await expect(new FormData(form).get("code")).toBe("57391")
    await expect(completeCode).toHaveBeenCalledOnce()
    await expect(completeCode).toHaveBeenCalledWith("57391", expect.anything())
    await expect(canvas.queryByText("5")).not.toBeInTheDocument()
    await expect(frame.querySelectorAll('[data-slot="otp-field-mask"]')).toHaveLength(5)
    await userEvent.keyboard("{Home}")
    await userEvent.keyboard("{Delete}")
    await expect(slotValues(frame)).toBe("7391")
    await expect(new FormData(form).get("code")).toBe("7391")
    await expect(frame.querySelectorAll('[data-slot="otp-field-mask"]')).toHaveLength(4)
  },
}

export const SlotLabelsAndFramePress: Story = {
  parameters: {
    // Reflow exemption pending a design request: docs/design-requests/2026-10-16-a11y-reflow-conditions.md.
    a11yContract: { reflow: false },
    design: { type: "figma", url: figmaEmbedUrl("198:828") },
  },
  render: () => (
    <div className="grid max-w-sm gap-6">
      <AuthenticationCodeInput label="Codice con etichette" length={5} defaultValue="57" />
    </div>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const input = canvas.getByRole("textbox", { name: "Codice con etichette" })
    const frame = codeFrame(input)
    const slots = Array.from(frame.querySelectorAll("input"))
    if (!(slots[2] instanceof HTMLInputElement) || !(slots[4] instanceof HTMLInputElement)) {
      throw new Error("Expected the per-slot inputs")
    }
    await expect(frame.querySelectorAll('[data-slot="otp-field-glyph"]')).toHaveLength(2)
    await expect(slots[2]).toHaveAccessibleName("Carattere 3 di 5")
    await expect(slots[4]).toHaveAccessibleName("Carattere 5 di 5")
    // The shared label names the group and the first slot; only the native
    // label names the first slot, so an extra aria-label there cannot disagree
    // with what the field announces.
    await expect(canvas.getByRole("group", { name: "Codice con etichette" })).toBeVisible()
    await expect(input).toHaveAccessibleName("Codice con etichette")
    // A press that misses the 11px inputs (padding, gap or decorative glyph)
    // continues at the first empty slot instead of being swallowed by the frame.
    input.blur()
    frame.dispatchEvent(new MouseEvent("mousedown", { bubbles: true, cancelable: true }))
    await expect(slots[2]).toHaveFocus()
  },
}

export const SourceVariant: Story = {
  parameters: {
    // Reflow exemption: fixture pinned at the source width, not a product surface.
    a11yContract: { reflow: false },
    design: { type: "figma", url: figmaEmbedUrl("198:828") },
  },
  args: {
    label: "Codice di autenticazione",
    length: 5,
    defaultValue: "",
    mask: false,
  },
  render: (args) => <AuthenticationCodeInput {...args} />,
}

export const SourceErrorVariant: Story = {
  parameters: {
    // Reflow exemption: fixture pinned at the source width, not a product surface.
    a11yContract: { reflow: false },
    design: { type: "figma", url: figmaEmbedUrl("198:828") },
  },
  args: {
    label: "Codice non valido",
    length: 5,
    defaultValue: "88888",
    mask: false,
    error: "Some details error",
  },
  render: (args) => <AuthenticationCodeInput {...args} />,
}

export const SourceErrorEncryptedVariant: Story = {
  parameters: {
    // Reflow exemption: fixture pinned at the source width, not a product surface.
    a11yContract: { reflow: false },
    design: { type: "figma", url: figmaEmbedUrl("198:828") },
  },
  args: {
    label: "Codice scaduto",
    length: 5,
    defaultValue: "88888",
    mask: true,
    error: "Some details error",
  },
  render: (args) => <AuthenticationCodeInput {...args} />,
}

export const SourceSingleSlotVariant: Story = {
  parameters: { design: { type: "figma", url: figmaEmbedUrl("198:828") } },
  args: {
    label: "Codice singolo",
    length: 1,
    defaultValue: "",
    mask: false,
  },
  render: (args) => <AuthenticationCodeInput {...args} />,
}
