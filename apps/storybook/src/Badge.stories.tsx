import type { Meta, StoryObj } from "@storybook/react-vite"

import { PagoPAIcon } from "@/components/icons/PagoPAIcon"
import { Badge } from "@/components/primitives/badge"
import { figmaEmbedUrl } from "@/catalog/figma/file"

import badgeGuide from "./guides/badges.md?raw"

const meta = {
  title: "Components/Badge",
  component: Badge,
  parameters: {
    design: { type: "figma", url: figmaEmbedUrl("360:797") },
    docs: {
      description: {
        component: badgeGuide,
      },
    },
  },
  argTypes: {
    display: {
      control: "select",
      options: ["label", "numbered", "plain", "sidenav-icon"],
    },
    background: {
      control: "select",
      options: ["transparent", "white", "muted", "primary"],
    },
    selected: {
      control: "boolean",
    },
  },
} satisfies Meta<typeof Badge>

export default meta
type Story = StoryObj<typeof meta>

export const Playground: Story = {
  args: {
    display: "numbered",
    children: "1",
  },
}

export const Fidelity: Story = {
  // Reflow exemption: fixture pinned at the source width, not a product surface.
  parameters: { a11yContract: { reflow: false } },
  render: () => (
    <div className="flex flex-col gap-4">
      <div className="flex min-h-11 items-center gap-4">
        <span className="text-sm">Numbered · transparent</span>
        <Badge data-fidelity-case="numbered" display="numbered">
          1
        </Badge>
      </div>
      <div className="flex min-h-11 items-center gap-4">
        <span className="text-sm">Plain · transparent</span>
        <Badge data-fidelity-case="plain-transparent" display="plain" background="transparent" />
      </div>
      <div className="flex min-h-11 items-center gap-4">
        <span className="text-sm">Sidenav icon · selected</span>
        <Badge
          data-fidelity-case="sidenav-selected"
          display="sidenav-icon"
          selected
          background="primary"
        >
          <PagoPAIcon name="mail" variant="selected" size={24} className="size-6" />
        </Badge>
      </div>
      <div className="flex min-h-11 items-center gap-4">
        <span className="text-sm">Sidenav icon · unselected</span>
        <Badge data-fidelity-case="sidenav-unselected" display="sidenav-icon" background="white">
          <PagoPAIcon name="mail" variant="unselected" size={24} className="size-6" />
        </Badge>
      </div>
      <div className="flex min-h-11 items-center gap-4">
        <span className="text-sm">Plain · grey 50</span>
        <Badge data-fidelity-case="plain-muted" display="plain" background="muted" />
      </div>
      <div className="flex min-h-11 items-center gap-4">
        <span className="text-sm">Plain · white</span>
        <Badge data-fidelity-case="plain-white" display="plain" background="white" />
      </div>
    </div>
  ),
}
