import type { Meta, StoryObj } from "@storybook/react-vite"
import { expect, fn, userEvent, within } from "storybook/test"

import { CheckoutModule } from "@/components/composites/checkout-module"
import { PagoPAIcon } from "@/components/icons/PagoPAIcon"
import { figmaEmbedUrl } from "@/catalog/figma/file"

import { SourceFrame } from "./support/source-frame"

const edit = fn()
const legacyContinue = fn()
const callerAction = fn()

const meta = {
  title: "Components/Composites/CheckoutModule",
  component: CheckoutModule,
  args: {
    description: "Description",
    suggestion: "Suggerito perché sei già cliente",
    onEdit: fn(),
  },
  argTypes: {
    brand: { control: false },
    title: { control: "text" },
    actionLabel: { control: "text" },
    amount: { control: "text" },
    creditor: { control: "text" },
    description: { control: "text" },
    noticeCode: { control: "text" },
    onAction: { control: false },
    onContinue: { control: false },
    onEdit: { control: false },
    showButton: { control: "boolean" },
    showDescription: { control: "boolean" },
    showLogo: { control: "boolean" },
    showSuggestion: { control: "boolean" },
    skeleton: { control: "boolean" },
    loading: { control: "boolean" },
    suggestion: { control: false },
  },
  parameters: {
    design: { type: "figma", url: figmaEmbedUrl("382:7813") },
    layout: "fullscreen",
    docs: {
      description: {
        component:
          "Responsive payment-method row with caller-owned `title`, `brand`, `suggestion` and `onAction`. Supplying `title` does not invent a brand, description or recommendation. The existing no-title payment-data composition, `amount`/`creditor`/`noticeCode` and `onEdit`/`onContinue` remain supported. `loading` and `skeleton` show placeholder bars; the trailing action is a text link with an accessible target.",
      },
    },
  },
} satisfies Meta<typeof CheckoutModule>

export default meta
type Story = StoryObj<typeof meta>

// The source draws this row in a 560 page column and a 272 drawer panel: the
// story draws that frame, so a reader sees the composition the capture
// measures. `maxWidth: 100%` follows the narrower case of the same node down.
export const Playground: Story = {
  render: (args) => (
    <SourceFrame nodeId="382:7813" device="desktop">
      <CheckoutModule {...args} />
    </SourceFrame>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await expect(canvas.getByRole("heading", { name: "Payment data" })).toBeVisible()
    await expect(canvas.getByText("Description")).toBeVisible()
    await expect(canvas.getByText("Suggerito perché sei già cliente")).toBeVisible()
    await userEvent.click(canvas.getByRole("button", { name: "Modifica" }))
  },
}

export const ReadOnly: Story = {
  args: { showButton: false },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await expect(canvas.getByRole("heading", { name: "Payment data" })).toBeVisible()
    await expect(canvas.getByText("Description")).toBeVisible()
    await expect(canvas.queryAllByRole("button")).toHaveLength(0)
  },
}

export const WithContinue: Story = {
  args: {
    amount: "€ 42,00",
    creditor: "Comune di Milano",
    noticeCode: "3020 1234 5678 9012 34",
    onContinue: legacyContinue,
  },
  render: ({ amount, creditor, noticeCode, onContinue }) => (
    <CheckoutModule
      amount={amount}
      creditor={creditor}
      noticeCode={noticeCode}
      onContinue={onContinue}
    />
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const button = canvas.getByRole("button", { name: "Continua" })
    await expect(canvas.getByText("€ 42,00")).toBeVisible()
    await expect(canvas.getByText("Comune di Milano")).toBeVisible()
    await expect(canvas.getByText("3020 1234 5678 9012 34")).toBeVisible()
    await userEvent.click(button)
    await expect(legacyContinue).toHaveBeenCalledTimes(1)
  },
}

export const SkeletonState: Story = {
  args: { skeleton: true },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const region = canvas.getByRole("region", { name: "Payment data" })
    await expect(region).toHaveAttribute("aria-busy", "true")
    await expect(canvas.queryAllByRole("button")).toHaveLength(0)
  },
}

export const NativeBehavior: Story = {
  args: { onEdit: edit },
  render: (args) => (
    <form
      aria-label="Payment form"
      onSubmit={(event) => {
        event.preventDefault()
        event.currentTarget.dataset.submitted = "true"
      }}
    >
      <CheckoutModule {...args} />
    </form>
  ),
  play: async ({ canvasElement }) => {
    edit.mockClear()
    const canvas = within(canvasElement)
    const form = canvas.getByRole("form", { name: "Payment form" })
    const button = canvas.getByRole("button", { name: "Modifica" })

    await userEvent.tab()
    await expect(button).toHaveFocus()
    await userEvent.keyboard(" ")
    await expect(edit).toHaveBeenCalledTimes(1)
    await userEvent.keyboard("{Enter}")
    await expect(edit).toHaveBeenCalledTimes(2)
    await expect(form).not.toHaveAttribute("data-submitted")
  },
}

export const Branded: Story = {
  args: {
    brand: <PagoPAIcon name="credit_card" size={24} />,
    title: "Carta di credito o debito",
    description: "Visa •••• 4532",
    suggestion: { label: "Suggerito perché sei già cliente" },
    onAction: callerAction,
    onEdit: undefined,
  },
  play: async ({ canvasElement }) => {
    callerAction.mockClear()
    const canvas = within(canvasElement)
    await expect(canvas.getByRole("heading", { name: "Carta di credito o debito" })).toBeVisible()
    await expect(canvas.getByText("Visa •••• 4532")).toBeVisible()
    await expect(canvas.getByText("Suggerito perché sei già cliente")).toBeVisible()
    const button = canvas.getByRole("button", { name: "Modifica" })
    await expect(button).toHaveAttribute("type", "button")
    await userEvent.click(button)
    await expect(callerAction).toHaveBeenCalledTimes(1)
  },
}

export const CallerOwnedReadOnly: Story = {
  render: () => <CheckoutModule title="Carta di credito o debito" />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await expect(canvas.getByRole("heading", { name: "Carta di credito o debito" })).toBeVisible()
    await expect(canvas.queryByText("Payment data")).not.toBeInTheDocument()
    await expect(canvas.queryByText("Description")).not.toBeInTheDocument()
    await expect(canvas.queryByText("Suggerito perché sei già cliente")).not.toBeInTheDocument()
    await expect(canvas.queryByRole("img", { name: "PayPal" })).not.toBeInTheDocument()
    await expect(canvas.queryAllByRole("button")).toHaveLength(0)
  },
}

export const Loading: Story = {
  args: { title: "Carta di credito o debito", loading: true },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await expect(canvas.getByRole("region", { name: "Carta di credito o debito" })).toHaveAttribute(
      "aria-busy",
      "true",
    )
    await expect(canvas.queryByText("Carta di credito o debito")).not.toBeInTheDocument()
    await expect(canvas.queryAllByRole("button")).toHaveLength(0)
  },
}

export const ConfigurableHeading: Story = {
  args: { title: "Dati del pagamento", titleAs: "h3" },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    // The caller owns the outline: the row title renders at the requested
    // level instead of a fixed h2.
    await expect(
      canvas.getByRole("heading", { level: 3, name: "Dati del pagamento" }),
    ).toBeVisible()
    await expect(canvas.queryByRole("heading", { level: 2 })).not.toBeInTheDocument()
  },
}
