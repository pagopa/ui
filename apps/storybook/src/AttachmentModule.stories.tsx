import type { Meta, StoryObj } from "@storybook/react-vite"
import { expect, userEvent, within } from "storybook/test"

import { figmaEmbedUrl } from "@/catalog/figma/file"
import { AttachmentModule } from "@/components/composites"
import { Tag } from "@/components/content"
import { PagoPAIcon } from "@/components/icons/PagoPAIcon"

import attachmentModuleGuide from "./guides/attachment-module.md?raw"

const meta = {
  title: "Components/Composites/AttachmentModule",
  component: AttachmentModule,
  args: {
    title: "Ingiunzione di pagamento.pdf",
    description: "Disponibile online fino al 31/12/2026.",
  },
  argTypes: {
    status: { control: false },
    onOpen: { control: false },
    onDownload: { control: false },
  },
  parameters: {
    design: { type: "figma", url: figmaEmbedUrl("10192:41460") },
    docs: {
      description: {
        component: `Attachment box with a title, an optional description and status, and a download action. In the Available state the title opens the attachment; in the Unavailable state it stays text with the “non disponibile” tag.

${attachmentModuleGuide}`,
      },
    },
  },
} satisfies Meta<typeof AttachmentModule>

export default meta
type Story = StoryObj<typeof meta>

export const Playground: Story = {
  args: { onOpen: () => undefined, onDownload: () => undefined },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await userEvent.click(canvas.getByRole("button", { name: "Ingiunzione di pagamento.pdf" }))
    await userEvent.click(canvas.getByRole("button", { name: "Scarica" }))
  },
}

export const Unavailable: Story = {
  args: {
    description: "Non disponibile fino al 31/12/2026.",
    status: (
      <Tag
        status="default"
        icon={<PagoPAIcon name="block" size={16} className="text-muted-foreground" />}
        className="h-6 px-2"
      >
        non disponibile
      </Tag>
    ),
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await expect(canvas.getByText("non disponibile")).toBeVisible()
    await expect(canvas.queryAllByRole("button")).toHaveLength(0)
  },
}

export const ReadOnly: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await expect(canvas.getByText("Ingiunzione di pagamento.pdf")).toBeVisible()
    await expect(canvas.queryAllByRole("button")).toHaveLength(0)
  },
}

// The set `10192:41460` publishes one variant per State at the 428px tile
// width. Each capture maps the source variant alone, framed at that width with
// the source copy so the title wraps like the mockup.
const sourceTitle = "Ingiunzione di pagamento n. ING 325 - 2348726529"

export const SourceAvailable: Story = {
  // Reflow exemption: fixture pinned at the source width, not a product surface.
  parameters: { a11yContract: { reflow: false } },
  render: () => (
    <div data-fidelity-variant="available" style={{ width: 428 }}>
      <AttachmentModule
        title={sourceTitle}
        description="Disponibile online fino al giorno 31/12/2026."
        onOpen={() => undefined}
        onDownload={() => undefined}
      />
    </div>
  ),
}

export const SourceUnavailable: Story = {
  // Reflow exemption: fixture pinned at the source width, not a product surface.
  parameters: { a11yContract: { reflow: false } },
  render: () => (
    <div data-fidelity-variant="unavailable" style={{ width: 428 }}>
      <AttachmentModule
        title={sourceTitle}
        description="Disponibile online fino al giorno 31/12/2026."
        status={
          <Tag
            status="default"
            icon={<PagoPAIcon name="block" size={16} className="text-muted-foreground" />}
            className="h-6 px-2"
          >
            non disponibile
          </Tag>
        }
      />
    </div>
  ),
}
