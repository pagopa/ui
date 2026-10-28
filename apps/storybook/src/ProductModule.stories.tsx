import * as React from "react"
import type { Meta, StoryObj } from "@storybook/react-vite"
import { expect, fn, userEvent, within } from "storybook/test"

import { ProductModule } from "@/components/composites/product-module"
import { Avatar } from "@/components/content/avatar"
import { Chip } from "@/components/inputs/chips"
import { RadioGroup } from "@/components/inputs/radio-group"
import { Button } from "@/components/primitives/button"
import { figmaEmbedUrl } from "@/catalog/figma/file"

import { SourceFrame } from "./support/source-frame"

const callerAction = fn()

const meta = {
  title: "Components/Composites/ProductModule",
  component: ProductModule,
  args: {
    name: "Product title",
    description: "Description",
    status: "Default",
    value: "product",
    variant: "radio",
  },
  argTypes: {
    avatar: { control: false },
    chips: { control: false },
    selected: { control: "boolean" },
    onSelect: { control: false },
    action: { control: false },
    onOpen: { control: false },
    status: { control: "text" },
    actionLabel: { control: "text" },
    variant: { control: "radio", options: ["radio", "action"] },
  },
  parameters: {
    design: { type: "figma", url: figmaEmbedUrl("403:4116") },
    layout: "fullscreen",
    a11y: { test: "error" },
    docs: {
      description: {
        component:
          'Product row with caller-owned `title`, `avatar`, `chips` and `action`. A title-only row stays inert; `selected`/`onSelect` retain the standalone controlled radio and `selectName` its native form name. The existing `name`/`status` composition keeps its default artwork and participates in a caller-owned RadioGroup, or uses `variant="action"`/`onOpen`. Both forms preserve native labels, source radio/cached artwork and content-driven reflow.',
      },
    },
  },
} satisfies Meta<typeof ProductModule>

export default meta
type Story = StoryObj<typeof meta>

// The source draws this row in a 560 page column and a 272 drawer panel: the
// story draws that frame, so a reader sees the composition the capture
// measures. `maxWidth: 100%` follows the narrower case of the same node down.
const renderRadio =
  (device: "desktop" | "mobile") => (args: React.ComponentProps<typeof ProductModule>) => (
    <SourceFrame nodeId="403:4116" device={device}>
      <RadioGroup
        className="min-w-0"
        legend="Prodotti disponibili"
        name="products"
        defaultValue={args.value}
      >
        <ProductModule {...args} />
      </RadioGroup>
    </SourceFrame>
  )

const renderAction =
  (device: "desktop" | "mobile") => (args: React.ComponentProps<typeof ProductModule>) => (
    <SourceFrame nodeId="403:4116" device={device}>
      <ProductModule {...args} />
    </SourceFrame>
  )

export const Playground: Story = {
  render: renderRadio("desktop"),
}

export const WithAction: Story = {
  args: { variant: "action", onOpen: fn() },
  play: async ({ args, canvasElement }) => {
    const action = within(canvasElement).getByRole("button", { name: "Aggiorna documenti" })
    await userEvent.click(action)
    await expect(args.onOpen).toHaveBeenCalledTimes(1)
    action.blur()
  },
  render: renderAction("desktop"),
}

export const RadioMobile: Story = {
  args: { value: "mobile-product" },
  render: renderRadio("mobile"),
}

export const ActionMobile: Story = {
  args: { variant: "action", onOpen: fn() },
  render: renderAction("mobile"),
}

export const RadioFormBehavior: Story = {
  render: (args) => (
    <div className="w-screen min-w-0 max-w-full">
      <form aria-label="Selezione prodotto" className="grid w-full min-w-0 gap-3">
        <RadioGroup className="min-w-0" legend="Prodotti" name="products" defaultValue="first">
          <ProductModule {...args} value="first" />
          <ProductModule {...args} title={undefined} name="Second product" value="second" />
        </RadioGroup>
        <div className="flex flex-wrap gap-2">
          <Button type="submit" size="sm">
            Conferma
          </Button>
          <Button type="reset" size="sm" variant="secondary">
            Reset
          </Button>
        </div>
      </form>
    </div>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const [first, second] = canvas.getAllByRole("radio")
    await expect(first).toBeChecked()
    await userEvent.click(second)
    await expect(second).toBeChecked()

    const form = canvasElement.querySelector<HTMLFormElement>(
      'form[aria-label="Selezione prodotto"]',
    )
    if (!form) throw new Error("ProductModule form was not rendered")
    await expect(new FormData(form).get("products")).toBe("second")

    await userEvent.click(canvas.getByRole("button", { name: "Reset" }))
    await expect(first).toBeChecked()
    await userEvent.click(first)
    await userEvent.keyboard("{ArrowDown}")
    await expect(second).toBeChecked()
  },
}

function SelectableProducts() {
  const [selected, setSelected] = React.useState("spontanei")
  return (
    <div className="grid gap-3">
      <ProductModule
        avatar={<Avatar size="small" alt="Pagamenti spontanei" initials="SP" />}
        title="Pagamenti spontanei"
        chips={<Chip size="compact">Novità</Chip>}
        description="Paga senza avviso."
        selected={selected === "spontanei"}
        onSelect={() => setSelected("spontanei")}
      />
      <ProductModule
        avatar={<Avatar size="small" alt="Avvisi di pagamento" initials="AV" />}
        title="Avvisi di pagamento"
        description="Paga un avviso già emesso."
        selected={selected === "avvisi"}
        onSelect={() => setSelected("avvisi")}
      />
    </div>
  )
}

export const Radio: Story = {
  // Reflow exemption pending a design request: docs/design-requests/2026-10-16-a11y-reflow-conditions.md.
  parameters: { a11yContract: { reflow: false } },
  render: () => <SelectableProducts />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const [first, second] = canvas.getAllByRole("radio")
    await expect(canvas.getByRole("img", { name: "Pagamenti spontanei" })).toBeVisible()
    await expect(first).toBeChecked()
    await expect(second).not.toBeChecked()
    await userEvent.click(second)
    await expect(second).toBeChecked()
    await expect(first).not.toBeChecked()
  },
}

export const CallerOwnedAction: Story = {
  render: () => (
    <form
      aria-label="Documenti prodotto"
      onSubmit={(event) => {
        event.preventDefault()
        event.currentTarget.dataset.submitted = "true"
      }}
    >
      <ProductModule
        avatar={<Avatar size="small" alt="Servizio catastale" initials="DC" />}
        title="Dati catastali"
        chips={<Chip size="compact">Novità</Chip>}
        description="Aggiornati il 12/04/2026."
        action={{ label: "Aggiorna documenti", onClick: callerAction }}
      />
    </form>
  ),
  play: async ({ canvasElement }) => {
    callerAction.mockClear()
    const canvas = within(canvasElement)
    await expect(canvas.getByText("Dati catastali")).toBeVisible()
    await expect(canvas.getByRole("img", { name: "Servizio catastale" })).toBeVisible()
    const action = canvas.getByRole("button", { name: "Aggiorna documenti" })
    await expect(action).toHaveAttribute("type", "button")
    await userEvent.click(action)
    await expect(callerAction).toHaveBeenCalledTimes(1)
    await expect(canvas.getByRole("form", { name: "Documenti prodotto" })).not.toHaveAttribute(
      "data-submitted",
    )
  },
}

export const ReadOnly: Story = {
  render: () => <ProductModule title="Pagamenti spontanei" description="Paga senza avviso." />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await expect(canvas.getByText("Pagamenti spontanei")).toBeVisible()
    await expect(canvas.queryByText("Default")).not.toBeInTheDocument()
    await expect(canvas.queryAllByRole("radio")).toHaveLength(0)
    await expect(canvas.queryAllByRole("button")).toHaveLength(0)
  },
}

function StandaloneProductForm() {
  const [selected, setSelected] = React.useState(false)
  return (
    <form aria-label="Prodotto indipendente" className="grid gap-3">
      <ProductModule
        title="Pagamenti spontanei"
        selected={selected}
        selectName="product"
        onSelect={setSelected}
      />
      <ProductModule
        title="Prodotto non disponibile"
        selected
        disabled
        selectName="unavailable"
        onSelect={() => undefined}
      />
    </form>
  )
}

export const StandaloneFormBehavior: Story = {
  render: () => <StandaloneProductForm />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const form = canvasElement.querySelector<HTMLFormElement>(
      'form[aria-label="Prodotto indipendente"]',
    )
    if (!form) throw new Error("Standalone ProductModule form was not rendered")
    await expect(new FormData(form).has("product")).toBe(false)
    await expect(new FormData(form).has("unavailable")).toBe(false)
    await expect(canvas.getByRole("radio", { name: "Prodotto non disponibile" })).toHaveAttribute(
      "aria-disabled",
      "true",
    )
    const unavailableInput = form.querySelector<HTMLInputElement>('input[name="unavailable"]')
    if (!unavailableInput) throw new Error("Disabled product native input was not rendered")
    await expect(unavailableInput).toBeDisabled()
    await userEvent.click(canvas.getByText("Pagamenti spontanei"))
    await expect(canvas.getByRole("radio", { name: "Pagamenti spontanei" })).toBeChecked()
    await expect(new FormData(form).get("product")).toBe("selected")
  },
}
