import type { Meta, StoryObj } from "@storybook/react-vite"
import { expect, within } from "storybook/test"

import { Avatar, Tag } from "@/components/content"
import { PagoPAIcon } from "@/components/icons/PagoPAIcon"
import { SideNav } from "@/components/navigation"
import { figmaEmbedUrl } from "@/catalog/figma/file"

const meta = {
  title: "Components/Navigation/SideNav",
  component: SideNav,
  args: {
    title: "Pagamenti",
    items: [
      { label: "Panoramica", href: "#", current: true },
      { label: "Come pagare", href: "#come" },
      { label: "Assistenza", href: "#assistenza" },
    ],
  },
  argTypes: {
    title: { control: "text" },
    items: { control: false },
    profile: { control: false },
  },
  parameters: {
    design: { type: "figma", url: figmaEmbedUrl("1120:7458") },
    docs: {
      description: {
        component:
          "Section-local navigation: on narrow screens it becomes a native `<details>` with the condensed source header (`1519:2721`: menu icon and section name); on wide screens a list with the current item announced by `aria-current`, nested second-level items and a profile block. The panel is a full-width column from desktop, and the current item keeps the source bar.",
      },
    },
  },
} satisfies Meta<typeof SideNav>

export default meta
type Story = StoryObj<typeof meta>

export const Playground: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await expect(canvas.getByRole("link", { name: "Panoramica" })).toHaveAttribute(
      "aria-current",
      "page",
    )
  },
}

export const NestedAndProfile: Story = {
  args: {
    items: [
      {
        label: "Panoramica",
        href: "#",
        current: true,
        icon: <PagoPAIcon name="dashboard" />,
      },
      {
        label: "Pagamenti",
        href: "#pagamenti",
        icon: <PagoPAIcon name="credit_card" />,
        badge: <Tag status="counter">2</Tag>,
        children: [
          { label: "PagoPA", href: "#pagopa" },
          { label: "F24", href: "#f24" },
        ],
      },
      {
        label: "Assistenza",
        href: "#assistenza",
        icon: <PagoPAIcon name="support" />,
      },
    ],
    profile: {
      title: "Stai operando come",
      name: "Comune di Roma",
      action: { label: "Cambia profilo", href: "#cambia-profilo" },
      avatar: <Avatar alt="Comune di Roma" initials="CR" size="compact" />,
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await expect(canvas.getByRole("link", { name: "F24" })).toBeVisible()
    await expect(canvas.getByRole("link", { name: "Cambia profilo" })).toBeVisible()
  },
}
