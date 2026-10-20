import type { Meta, StoryObj } from "@storybook/react-vite"

import { StatusTile, Tag } from "@/components/content"
import { PagoPAIcon } from "@/components/icons/PagoPAIcon"

const meta = {
  title: "Components/Content/StatusTile",
  component: StatusTile,
  args: {
    channel: <PagoPAIcon name="send" />,
    title: "SEND",
    tag: <Tag status="default">In attesa</Tag>,
    children: "Invio previsto dopo la validazione dell'ente.",
  },
  argTypes: {
    channel: { control: false },
    tag: { control: false },
    orientation: { control: "select", options: ["horizontal", "vertical"] },
  },
  parameters: {
    docs: {
      description: {
        component:
          "Status tile with a channel, title, status tag and text; the horizontal composition puts the tag beside the copy, the vertical one stacks it.",
      },
    },
  },
} satisfies Meta<typeof StatusTile>

export default meta
type Story = StoryObj<typeof meta>

export const Playground: Story = {}

export const Orientations: Story = {
  // Reflow exemption pending a design request: docs/design-requests/2026-10-16-a11y-reflow-conditions.md.
  parameters: { a11yContract: { reflow: false } },
  render: () => (
    <div className="grid w-[min(36rem,calc(100vw-2rem))] gap-3">
      <StatusTile
        channel={<PagoPAIcon name="mark_email_read" />}
        title="Piattaforma pagoPA"
        tag={<Tag status="success">Attivo</Tag>}
      >
        Servizio operativo dalle 07:00 alle 23:00.
      </StatusTile>
      <StatusTile
        orientation="vertical"
        channel={<PagoPAIcon name="notifications_active" />}
        title="Piattaforma Notifiche"
        tag={<Tag status="warning">Limitato</Tag>}
      >
        Stiamo lavorando per ripristinare tutte le funzionalità.
      </StatusTile>
    </div>
  ),
}
