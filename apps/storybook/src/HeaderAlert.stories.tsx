import * as React from "react"
import type { Meta, StoryObj } from "@storybook/react-vite"
import { expect, userEvent, within } from "storybook/test"

import { figmaEmbedUrl } from "@/catalog/figma/file"
import { HeaderAlert } from "@/components/feedback"
import { PagoPAIcon } from "@/components/icons/PagoPAIcon"
import { Button } from "@/components/primitives/button"

const meta = {
  title: "Components/Feedback/HeaderAlert",
  component: HeaderAlert,
  args: {
    tone: "warning",
    children: "Manutenzione programmata domenica dalle 02:00 alle 04:00.",
  },
  argTypes: {
    tone: { control: "select", options: ["default", "info", "success", "warning", "error"] },
    onDismiss: { control: false },
  },
  parameters: {
    layout: "fullscreen",
    design: { type: "figma", url: figmaEmbedUrl("1317:10404") },
    docs: {
      description: {
        component:
          "Full-width notice below the header. Errors use role alert, the other updates role status.",
      },
    },
  },
} satisfies Meta<typeof HeaderAlert>

export default meta
type Story = StoryObj<typeof meta>

export const Playground: Story = {}

export const AllTones: Story = {
  // Reflow exemption pending a design request: docs/design-requests/2026-10-16-a11y-reflow-conditions.md.
  parameters: { a11yContract: { reflow: false } },
  render: () => (
    <div>
      <HeaderAlert tone="default">Stai navigando come PagoPA S.p.A.</HeaderAlert>
      <HeaderAlert tone="info">Il servizio sarà aggiornato questa notte.</HeaderAlert>
      <HeaderAlert tone="success">L'operazione è stata completata correttamente.</HeaderAlert>
      <HeaderAlert tone="warning">
        Manutenzione programmata domenica dalle 02:00 alle 04:00.
      </HeaderAlert>
      <HeaderAlert tone="error">Il servizio non è temporaneamente disponibile.</HeaderAlert>
    </div>
  ),
}

// The source action of the `Status=Default` sample (`11014:7007`/`11014:7010`):
// the published `cached` glyph and the label on the ghost action's source
// geometry (a 22px line, the invisible 44px pointer target through `::after`,
// the ButtonGroup/Banner reading).
function SourceUnitAction() {
  return (
    <Button
      type="button"
      variant="ghost"
      className="relative min-h-0 px-0 py-0 after:absolute after:inset-x-0 after:-inset-y-3"
    >
      <PagoPAIcon name="cached" size={24} className="shrink-0" />
      <span>Cambia unità</span>
    </Button>
  )
}

// The pinned set's own `Status=Default` sample (`11014:7007`/`11014:7010`): the
// copy beside the star, the trailing unit action — the composition the device
// cases capture (the action drops under the copy at the mobile device).
export const SourceCase: Story = {
  render: () => (
    <HeaderAlert tone="default" action={<SourceUnitAction />}>
      Lorem ipsum
    </HeaderAlert>
  ),
}

// The pinned set's own `Status=Warning` sample (`1322:6534`/`1317:10412`) with
// its source copy: the tinted row centres the icon+copy pair on the desktop and
// wraps the copy beside the icon at the mobile device.
export const SourceTone: Story = {
  render: () => (
    <HeaderAlert tone="warning">
      Ambiente di collaudo: attenzione i dati non devono essere reali
    </HeaderAlert>
  ),
}

function DismissableHeaderAlert() {
  const [visible, setVisible] = React.useState(true)
  if (!visible) return <output>Avviso chiuso</output>
  return (
    <HeaderAlert tone="warning" onDismiss={() => setVisible(false)}>
      Manutenzione programmata domenica dalle 02:00 alle 04:00.
    </HeaderAlert>
  )
}

export const Dismissable: Story = {
  render: () => <DismissableHeaderAlert />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await userEvent.click(canvas.getByRole("button", { name: "Chiudi avviso" }))
    await expect(canvas.getByText("Avviso chiuso")).toBeVisible()
  },
}
