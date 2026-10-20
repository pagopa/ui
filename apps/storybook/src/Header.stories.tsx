import type { Meta, StoryObj } from "@storybook/react-vite"
import { expect, within } from "storybook/test"

import { figmaEmbedUrl } from "@/catalog/figma/file"
import { Avatar } from "@/components/content"
import { Header } from "@/components/navigation"
import { Button } from "@/components/primitives/button"

const meta = {
  title: "Components/Navigation/Header",
  component: Header,
  args: {
    product: {
      label: "SEND - Servizio Notifiche Digitali",
      href: "#",
      logo: (
        <span className="grid size-10 place-items-center rounded-lg bg-primary text-lg font-bold text-white">
          S
        </span>
      ),
    },
    user: {
      name: "Comune di Roma",
      parent: "PagoPA S.p.A.",
      role: "Referente amministrativo",
      href: "#",
      avatar: <Avatar alt="Comune di Roma" initials="CR" size="small" />,
    },
  },
  argTypes: {
    product: { control: false },
    user: { control: false },
    actions: { control: false },
  },
  parameters: {
    layout: "fullscreen",
    design: { type: "figma", url: figmaEmbedUrl("1298:5209") },
    docs: {
      description: {
        component:
          "Header bar with the product identity and the user block (avatar, entity, contact): both are real links when they have a destination, and the chevrons mark the menus. Below the mobile breakpoint (source `Device=Mobile`) the bar stays a single row: the profile shrinks to its avatar — the name, the entity and the contact stay announced but are not painted — and the chevron disappears with a logo, while the caller actions stay on the same row instead of wrapping.",
      },
    },
  },
} satisfies Meta<typeof Header>

export default meta
type Story = StoryObj<typeof meta>

export const Playground: Story = {
  // The source's default identity (`Logo=False`, 1298:5148/1298:5227): the
  // label plus the chevron. The logo slot is demonstrated by `WithActions`.
  args: {
    product: { label: "SEND - Servizio Notifiche Digitali", href: "#" },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await expect(
      canvas.getByRole("link", { name: /SEND - Servizio Notifiche Digitali/ }),
    ).toBeVisible()
    await expect(canvas.getByRole("link", { name: /Comune di Roma/ })).toBeVisible()
    await expect(canvas.getByText("Referente amministrativo")).toBeVisible()
  },
}

export const WithActions: Story = {
  // Reflow exemption pending a design request: docs/design-requests/2026-10-16-a11y-reflow-conditions.md.
  parameters: { a11yContract: { reflow: false } },
  args: {
    actions: <Button>Accedi</Button>,
  },
}
