import type { Meta, StoryObj } from "@storybook/react-vite"

import { figmaEmbedUrl } from "@/catalog/figma/file"
import { Icon } from "@/components/icons/icon"
import { Default as MenuBookIcon } from "@/components/icons/generated/menu-book"
import { Default as SupportIcon } from "@/components/icons/generated/support"
import { Preheader } from "@/components/navigation/preheader"
import { Button } from "@/components/primitives/button"

const meta = {
  title: "Components/Navigation/Preheader",
  component: Preheader,
  args: {
    institution: "PagoPA S.p.A.",
    links: [{ label: "Area riservata", href: "#area" }],
  },
  argTypes: {
    institution: { control: "text" },
    links: { control: false },
    actions: { control: false },
  },
  parameters: {
    layout: "fullscreen",
    design: { type: "figma", url: figmaEmbedUrl("1298:5299") },
    docs: {
      description: {
        component:
          "Institutional band above the header: parent link on the left, actions with icon and button on the right, with adequate hit areas. Below the mobile breakpoint (source `Device=Mobile`) the band stays a single row: a link with an icon shrinks to the icon — its label stays announced — and a link with `avatar` shows the portrait instead of icon, label and chevron, as in the source user block.",
      },
    },
  },
} satisfies Meta<typeof Preheader>

export default meta
type Story = StoryObj<typeof meta>

export const Playground: Story = {}

export const WithActions: Story = {
  args: {
    links: [
      { label: "Manuale operativo", href: "#manuale", icon: <Icon source={MenuBookIcon} /> },
      { label: "Assistenza", href: "#assistenza", icon: <Icon source={SupportIcon} /> },
    ],
    actions: <Button>Accedi</Button>,
  },
}
