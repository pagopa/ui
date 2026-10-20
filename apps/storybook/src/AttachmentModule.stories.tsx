import type { Meta, StoryObj } from "@storybook/react-vite"
import { expect, userEvent, within } from "storybook/test"

import { AttachmentModule } from "@/components/composites"
import { Tag } from "@/components/content"
import { PagoPAIcon } from "@/components/icons/PagoPAIcon"

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
    docs: {
      description: {
        component:
          "Attachment box with a title, an optional description and status, and a download action. In the Available state the title opens the attachment; in the Unavailable state it stays text with the “non disponibile” tag.",
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
