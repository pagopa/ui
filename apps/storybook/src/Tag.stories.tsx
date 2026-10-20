import type { Meta, StoryObj } from "@storybook/react-vite"

import { Tag } from "@/components/content/tag"
import { figmaEmbedUrl } from "@/catalog/figma/file"

const meta = {
  title: "Components/Content/Tag",
  component: Tag,
  args: { children: "info" },
  argTypes: {
    status: {
      control: "select",
      options: ["default", "info", "warning", "success", "error", "counter"],
    },
    icon: { control: false },
    children: { control: "text" },
  },
  parameters: {
    design: { type: "figma", url: figmaEmbedUrl("105:2043") },
    docs: {
      description: {
        component:
          "Non-interactive status label: an optional status icon and uppercase copy from the generated tokens, with the shared height and radius steps instead of one-off values. `counter` shows the numeric count without an icon.",
      },
    },
  },
} satisfies Meta<typeof Tag>

export default meta
type Story = StoryObj<typeof meta>

export const Playground: Story = {}

export const AllStatuses: Story = {
  parameters: { layout: "fullscreen" },
  render: () => (
    <div id="tag-all-statuses" className="flex flex-wrap gap-2">
      <Tag status="default">default</Tag>
      <Tag status="info">info</Tag>
      <Tag status="warning">warning</Tag>
      <Tag status="success">success</Tag>
      <Tag status="error">error</Tag>
      <Tag status="counter">+1</Tag>
    </div>
  ),
}
