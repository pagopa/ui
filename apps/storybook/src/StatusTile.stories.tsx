import type { Meta, StoryObj } from "@storybook/react-vite"

import { figmaEmbedUrl } from "@/catalog/figma/file"
import { StatusTile, Tag } from "@/components/content"
import { PagoPAIcon } from "@/components/icons/PagoPAIcon"

import statusTileGuide from "./guides/status-tile.md?raw"

const meta = {
  title: "Components/Content/StatusTile",
  component: StatusTile,
  args: {
    channel: <PagoPAIcon name="SEND" />,
    title: "SEND",
    tag: <Tag status="default">In attesa</Tag>,
    children: "Invio previsto dopo la validazione della comunicazione.",
  },
  argTypes: {
    channel: { control: false },
    tag: { control: false },
    orientation: { control: "select", options: ["horizontal", "vertical"] },
  },
  parameters: {
    design: { type: "figma", url: figmaEmbedUrl("9924:27054") },
    docs: {
      description: {
        component: `Status tile with a channel, title, status tag and text; the horizontal composition puts the tag beside the copy, the vertical one stacks it.

${statusTileGuide}`,
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

// The set `9924:27054` publishes one variant per orientation at the 312px
// column width. Each capture is its own export so the root maps the variant
// alone, framed at the source width.
const sourceTile = (orientation: "horizontal" | "vertical") => () => (
  <div data-fidelity-variant={orientation} className="w-[312px]">
    <StatusTile orientation={orientation} {...meta.args} />
  </div>
)

export const SourceHorizontal: Story = {
  // Reflow exemption: fixture pinned at the source width, not a product surface.
  parameters: { layout: "fullscreen", a11yContract: { reflow: false } },
  render: sourceTile("horizontal"),
}

export const SourceVertical: Story = {
  // Reflow exemption: fixture pinned at the source width, not a product surface.
  parameters: { layout: "fullscreen", a11yContract: { reflow: false } },
  render: sourceTile("vertical"),
}
