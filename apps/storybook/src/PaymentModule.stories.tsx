import * as React from "react"
import type { Meta, StoryObj } from "@storybook/react-vite"
import { expect, userEvent, within } from "storybook/test"

import { figmaEmbedUrl } from "@/catalog/figma/file"
import { PaymentModule } from "@/components/composites"
import { PagoPAIcon } from "@/components/icons/PagoPAIcon"
import { ButtonGroup, Chip } from "@/components/inputs"
import { Button } from "@/components/primitives/button"

import { SourceFrame } from "./support/source-frame"

const meta = {
  title: "Components/Composites/PaymentModule",
  component: PaymentModule,
  args: {
    code: "3020 1234 5678 9012 34",
    metadata: [
      { label: "Oggetto", value: "Accertamento TARI 2025 - 00016/2025" },
      { label: "Scade il", value: "12/04/2026" },
      {
        label: "Stato",
        value: (
          <Chip size="compact" variant="neutral">
            Da pagare
          </Chip>
        ),
      },
    ],
  },
  argTypes: {
    metadata: { control: false },
    suggestion: { control: false },
    price: { control: false },
    onDownload: { control: false },
    onSelect: { control: false },
    actions: { control: false },
    selected: { control: "boolean" },
  },
  parameters: {
    design: { type: "figma", url: figmaEmbedUrl("11133:16142") },
    docs: {
      description: {
        component:
          "Payment notice module: a code, labelled rows, a status chip, the suggestion line, the primary price with its detail and actions below the content. With `onSelect` the tail becomes the radio of the Multi-payment variant.",
      },
    },
  },
} satisfies Meta<typeof PaymentModule>

export default meta
type Story = StoryObj<typeof meta>

export const Playground: Story = {
  // The source draws this module in a 560 page column. The frame is what the
  // story draws and the capture verifies, so a reader sees the composition the
  // source drew; `maxWidth: 100%` carries the same story down to the 270 case.
  parameters: { layout: "fullscreen" },
  args: {
    suggestion: { label: "Sei già cliente" },
    actions: (
      <ButtonGroup aria-label="Azioni del pagamento">
        <Button type="button" variant="ghost">
          Scarica documento
          <PagoPAIcon name="download" className="size-6" />
        </Button>
        <Button type="button">Paga 744,00 €</Button>
      </ButtonGroup>
    ),
  },
  render: (args) => (
    <SourceFrame nodeId="11133:16142" device="desktop">
      <PaymentModule {...args} />
    </SourceFrame>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await expect(canvas.getByText("3020 1234 5678 9012 34")).toBeVisible()
    await expect(canvas.getByText("Da pagare")).toBeVisible()
    await expect(canvas.getByText("Sei già cliente")).toBeVisible()
    await userEvent.click(canvas.getByRole("button", { name: "Paga 744,00 €" }))
  },
}

// The source mobile Action frame stacks the primary action above the secondary
// one; the group orientation is the caller's, so the mobile composition has its
// own export (the desktop `Playground` keeps the source row).
export const ActionMobile: Story = {
  name: "Action (mobile)",
  parameters: { layout: "fullscreen" },
  args: {
    suggestion: { label: "Sei già cliente" },
    actions: (
      <ButtonGroup aria-label="Azioni del pagamento" orientation="vertical" className="w-full">
        <Button type="button">Paga 744,00 €</Button>
        <Button type="button" variant="ghost">
          Scarica documento
          <PagoPAIcon name="download" className="size-6" />
        </Button>
      </ButtonGroup>
    ),
  },
  render: (args) => (
    <SourceFrame nodeId="11133:16142" device="mobile">
      <PaymentModule {...args} />
    </SourceFrame>
  ),
}

export const Summary: Story = {
  parameters: { layout: "fullscreen" },
  args: {
    price: { amount: "744,00 €", detail: "Costi di notifica inclusi" },
    onDownload: () => undefined,
  },
  render: (args) => (
    <SourceFrame nodeId="11133:16142" device="desktop">
      <PaymentModule {...args} />
    </SourceFrame>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await expect(canvas.getByText("744,00 €")).toBeVisible()
    await expect(canvas.getByText("Costi di notifica inclusi")).toBeVisible()
    await userEvent.click(canvas.getByRole("button", { name: "Scarica" }))
  },
}

function SelectablePayment() {
  const [selected, setSelected] = React.useState(false)
  return (
    <PaymentModule
      code="3020 1234 5678 9012 34"
      metadata={[
        { label: "Oggetto", value: "Accertamento TARI 2025 - 00016/2025" },
        { label: "Pagato il", value: "12/04/2026" },
        {
          label: "Stato",
          value: (
            <Chip size="compact" variant="neutral">
              Da pagare
            </Chip>
          ),
        },
      ]}
      suggestion={{ label: "Sei già cliente" }}
      price={{ amount: "398,50 €", detail: "Costi di notifica inclusi" }}
      selected={selected}
      onSelect={setSelected}
    />
  )
}

export const MultiPayment: Story = {
  parameters: { layout: "fullscreen" },
  render: () => (
    <SourceFrame nodeId="11133:16142" device="desktop">
      <SelectablePayment />
    </SourceFrame>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const radio = canvas.getByRole("radio")
    await expect(radio).not.toBeChecked()
    await userEvent.click(radio)
    await expect(radio).toBeChecked()
  },
}

export const Loading: Story = {
  // Reflow exemption pending a design request: docs/design-requests/2026-10-16-a11y-reflow-conditions.md.
  parameters: { a11yContract: { reflow: false } },
  args: { loading: true },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await expect(canvas.queryByText("3020 1234 5678 9012 34")).not.toBeInTheDocument()
  },
}
