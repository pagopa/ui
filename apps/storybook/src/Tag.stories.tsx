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

const fidelityVariant = (nodeId: string) => nodeId.replace(":", "-")

const fidelityVariants = [
  { nodeId: "105:2044", status: "info", label: "INFO" },
  { nodeId: "105:2047", status: "warning", label: "WARNING" },
  { nodeId: "105:2050", status: "success", label: "SUCCESS" },
  { nodeId: "105:2053", status: "error", label: "ERROR" },
  { nodeId: "105:2056", status: "default", label: "DEFAULT" },
  { nodeId: "105:2059", status: "counter", label: "+1" },
] as const

export const Fidelity: Story = {
  parameters: { layout: "fullscreen" },
  render: () => (
    <div id="tag-fidelity" className="grid w-[320px] justify-items-start gap-4">
      {fidelityVariants.map((variant) => (
        <div key={variant.nodeId} data-fidelity-variant={fidelityVariant(variant.nodeId)}>
          <Tag status={variant.status}>{variant.label}</Tag>
        </div>
      ))}
    </div>
  ),
}
