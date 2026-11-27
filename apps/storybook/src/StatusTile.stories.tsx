import type { Meta, StoryObj } from "@storybook/react-vite"

import { figmaEmbedUrl } from "@/catalog/figma/file"
import { StatusTile } from "@/components/content/status-tile"
import { Tag } from "@/components/content/tag"
import { Icon } from "@/components/icons/icon"
import { Default as MarkEmailReadIcon } from "@/components/icons/generated/mark-email-read"
import { Default as NotificationsActiveIcon } from "@/components/icons/generated/notifications-active"
import { Default as SendIcon } from "@/components/icons/generated/send"

import statusTileGuide from "./guides/status-tile.md?raw"

const meta = {
  title: "Components/Content/StatusTile",
  component: StatusTile,
  args: {
    channel: <Icon source={SendIcon} />,
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
    <div className="pui:grid pui:w-[min(36rem,calc(100vw-2rem))] pui:gap-3">
      <StatusTile
        channel={<Icon source={MarkEmailReadIcon} />}
        title="Piattaforma pagoPA"
        tag={<Tag status="success">Attivo</Tag>}
      >
        Servizio operativo dalle 07:00 alle 23:00.
      </StatusTile>
      <StatusTile
        orientation="vertical"
        channel={<Icon source={NotificationsActiveIcon} />}
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
  <div data-fidelity-variant={orientation} className="pui:w-[312px]">
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
