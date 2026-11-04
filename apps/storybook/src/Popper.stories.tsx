import * as React from "react"
import type { Meta, StoryObj } from "@storybook/react-vite"
import { expect, userEvent, within } from "storybook/test"

import { figmaEmbedUrl } from "@/catalog/figma/file"
import { Popper, type PopperPointer, type PopperProps } from "@/components/overlays"
import { UIProvider } from "@/lib/ui-provider"
import popperGuide from "./guides/popper.md?raw"

const meta = {
  title: "Components/Overlays/Popper",
  component: Popper,
  args: {
    id: "popper-message",
    children: "Inserisci un valore per iniziare la ricerca",
    onDismiss: () => undefined,
  },
  argTypes: {
    tone: { control: "select", options: ["error", "warning", "info", "success"] },
    pointer: { control: "select", options: ["left", "center", "right"] },
    dismissLabel: { control: "text" },
    onDismiss: { control: false },
  },
  parameters: {
    design: { type: "figma", url: figmaEmbedUrl("13211:26152") },
    a11y: { test: "error" },
    docs: { description: { component: popperGuide } },
  },
} satisfies Meta<typeof Popper>

export default meta
type Story = StoryObj<typeof meta>

function ValidationExample({
  dismissLabel,
  tone,
  pointer,
}: Pick<PopperProps, "dismissLabel" | "tone" | "pointer">) {
  const [value, setValue] = React.useState("")
  const [invalid, setInvalid] = React.useState(false)
  const [visible, setVisible] = React.useState(false)
  const inputRef = React.useRef<HTMLInputElement>(null)

  React.useEffect(() => {
    if (visible) inputRef.current?.focus()
  }, [visible])

  return (
    <form
      className="grid w-full max-w-78 gap-4"
      onSubmit={(event) => {
        event.preventDefault()
        const isInvalid = !value.trim()
        setInvalid(isInvalid)
        setVisible(isInvalid)
      }}
    >
      <div className="relative">
        <label htmlFor="popper-search">Ricerca</label>
        <input
          ref={inputRef}
          id="popper-search"
          className="block min-h-11 w-full rounded-md border px-3"
          value={value}
          aria-invalid={invalid || undefined}
          aria-describedby={visible ? "popper-help popper-validation" : "popper-help"}
          onChange={(event) => {
            setValue(event.target.value)
            if (event.target.value.trim()) {
              setInvalid(false)
              setVisible(false)
            }
          }}
        />
        <p id="popper-help">Inserisci un termine di ricerca.</p>
        {visible ? (
          <Popper
            id="popper-validation"
            className="absolute left-0 top-full z-10"
            dismissLabel={dismissLabel}
            tone={tone}
            pointer={pointer}
            onDismiss={() => {
              setVisible(false)
              inputRef.current?.focus()
            }}
          >
            Inserisci un valore per iniziare la ricerca
          </Popper>
        ) : null}
      </div>
      <button type="submit" className="min-h-11 rounded-md border px-4">
        Avvia ricerca
      </button>
    </form>
  )
}

export const Playground: Story = {
  args: { dismissLabel: "Nascondi suggerimento" },
  render: ({ dismissLabel, tone, pointer }) => (
    <ValidationExample dismissLabel={dismissLabel} tone={tone} pointer={pointer} />
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const field = canvas.getByRole("textbox", { name: "Ricerca" })
    const submit = canvas.getByRole("button", { name: "Avvia ricerca" })
    await userEvent.click(submit)
    await expect(field).toHaveAccessibleDescription(
      "Inserisci un termine di ricerca. Inserisci un valore per iniziare la ricerca",
    )
    await expect(field).toHaveAttribute("aria-invalid", "true")
    const dismiss = canvas.getByRole("button", { name: "Nascondi suggerimento" })
    await expect(field).toHaveFocus()
    await userEvent.tab()
    await expect(dismiss).toHaveFocus()
    await userEvent.keyboard("{Enter}")
    await expect(field).toHaveFocus()
    await expect(field).toHaveAttribute("aria-describedby", "popper-help")
    await expect(field).toHaveAttribute("aria-invalid", "true")
    await userEvent.click(submit)
    await userEvent.type(field, "PagoPA")
    await expect(
      canvas.queryByRole("button", { name: "Nascondi suggerimento" }),
    ).not.toBeInTheDocument()
    await expect(field).not.toHaveAttribute("aria-invalid")
  },
}

export const Localized: Story = {
  render: () => (
    <UIProvider messages={{ popper: { dismissLabel: "Nascondi messaggio" } }}>
      <ValidationExample />
    </UIProvider>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await userEvent.click(canvas.getByRole("button", { name: "Avvia ricerca" }))
    await expect(canvas.getByRole("button", { name: "Nascondi messaggio" })).toBeVisible()
  },
}

const tones = ["error", "warning", "info", "success"] as const
const pointers = ["center", "left", "right"] as const

function sourceVariant(tone: NonNullable<PopperProps["tone"]>, pointer: PopperPointer): Story {
  return {
    args: { tone, pointer },
    render: (args) => (
      <div className="w-78 max-w-full">
        <Popper {...args} />
      </div>
    ),
    play: async ({ canvasElement }) => {
      if (!("__vitest_browser_runner__" in window)) return

      const { page } = await import("@vitest/browser/context")
      const root = canvasElement.querySelector<HTMLElement>('[data-slot="popper"]')
      const pointerElement = root?.querySelector<HTMLElement>('[data-slot="popper-pointer"]')
      const card = root?.querySelector<HTMLElement>('[data-slot="popper-card"]')
      if (!root || !pointerElement || !card) throw new Error("Missing Popper junction")

      const rootRect = root.getBoundingClientRect()
      const pointerRect = pointerElement.getBoundingClientRect()
      const cardRect = card.getBoundingClientRect()
      const image = new Image()
      image.src = `data:image/png;base64,${await page.screenshot({ element: root, save: false })}`
      await image.decode()
      const canvas = document.createElement("canvas")
      canvas.width = image.width
      canvas.height = image.height
      const context = canvas.getContext("2d")
      if (!context) throw new Error("Cannot inspect Popper screenshot pixels")
      context.drawImage(image, 0, 0)
      const pixels = context.getImageData(0, 0, image.width, image.height).data
      const scale = image.width / rootRect.width
      const x = (position: number) => Math.round((position - rootRect.left) * scale)
      const y = Math.round((cardRect.top - rootRect.top) * scale)
      const forcedColors = window.matchMedia("(forced-colors: active)").matches
      const borderRow = forcedColors ? y - 1 : y
      const firstRow = y - Math.ceil(2 * scale)
      const left = x(pointerRect.left)
      const right = x(pointerRect.right)
      const color = (column: number, row: number) => {
        const index = (row * image.width + column) * 4
        return [pixels[index], pixels[index + 1], pixels[index + 2]]
      }
      const fill = color(Math.round((left + right) / 2), firstRow)
      const distance = (a: number[], b: number[]) =>
        a.reduce((sum, channel, index) => sum + (channel - b[index]) ** 2, 0)

      for (const [side, edge, borderX] of [
        ["left", left, left - Math.ceil(4 * scale)],
        ["right", right, right + Math.ceil(4 * scale)],
      ] as const) {
        const border = color(borderX, borderRow)
        const margin = Math.ceil(4 * scale)
        let reachable: number[] = []
        for (let row = firstRow; row <= borderRow; row++) {
          const previous = reachable
          reachable = Array.from(
            { length: margin * 2 + 1 },
            (_, index) => edge - margin + index,
          ).filter((column) => {
            const pixel = color(column, row)
            return (
              distance(pixel, border) < distance(pixel, fill) &&
              (row === firstRow || previous.some((prior) => Math.abs(prior - column) <= 1))
            )
          })
        }
        await expect(
          reachable.length > 0,
          `${tone}/${pointer}: ${side} pointer junction${forcedColors ? " in forced colors" : ""}`,
        ).toBe(true)
        if (!forcedColors) {
          const corner = side === "left" ? left : right - 1
          const pixel = color(corner, borderRow)
          await expect(
            distance(pixel, border),
            `${tone}/${pointer}: ${side} card-border corner`,
          ).toBeLessThan(distance(pixel, fill))
        }
      }
    },
  }
}

export const SourceErrorCenter = sourceVariant("error", "center")
export const SourceErrorLeft = sourceVariant("error", "left")
export const SourceErrorRight = sourceVariant("error", "right")
export const SourceWarningCenter = sourceVariant("warning", "center")
export const SourceWarningLeft = sourceVariant("warning", "left")
export const SourceWarningRight = sourceVariant("warning", "right")
export const SourceInfoCenter = sourceVariant("info", "center")
export const SourceInfoLeft = sourceVariant("info", "left")
export const SourceInfoRight = sourceVariant("info", "right")
export const SourceSuccessCenter = sourceVariant("success", "center")
export const SourceSuccessLeft = sourceVariant("success", "left")
export const SourceSuccessRight = sourceVariant("success", "right")

export const SourceVariants: Story = {
  render: () => (
    <div className="grid w-max grid-cols-4 gap-5">
      {pointers.flatMap((pointer) =>
        tones.map((tone) => (
          <Popper
            key={`${tone}-${pointer}`}
            id={`popper-${tone}-${pointer}`}
            tone={tone}
            pointer={pointer}
            onDismiss={() => undefined}
            className="w-78"
          >
            Inserisci un valore per iniziare la ricerca
          </Popper>
        )),
      )}
    </div>
  ),
  parameters: {
    // The contact sheet is fixed at source width; individual source stories reflow.
    a11yContract: { reflow: false },
  },
}
