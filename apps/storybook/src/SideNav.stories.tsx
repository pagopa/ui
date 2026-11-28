import type { Meta, StoryObj } from "@storybook/react-vite"
import isChromatic from "chromatic/isChromatic"
import { expect, userEvent, waitFor, within } from "storybook/test"

import { Avatar } from "@/components/content/avatar"
import { Tag } from "@/components/content/tag"
import { Icon } from "@/components/icons/icon"
import { Default as CreditCardIcon } from "@/components/icons/generated/credit-card"
import { Default as DashboardIcon } from "@/components/icons/generated/dashboard"
import { Default as PaymentsIcon } from "@/components/icons/generated/payments"
import { Default as ReceiptLongIcon } from "@/components/icons/generated/receipt-long"
import { Default as SupportIcon } from "@/components/icons/generated/support"
import { SideNav } from "@/components/navigation/side-nav"
import { figmaEmbedUrl } from "@/catalog/figma/file"

import sideNavGuide from "./guides/side-nav.md?raw"

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
    condensed: { control: "boolean" },
  },
  parameters: {
    design: { type: "figma", url: figmaEmbedUrl("1120:7458") },
    docs: {
      description: {
        component: `Section-local navigation: on narrow screens it becomes a native \`<details>\` with the condensed source header (\`1519:2721\`: menu icon and section name); on wide screens a list with the current item announced by \`aria-current\`, nested second-level items and a profile block. \`condensed\` renders the source desktop rail (\`1130:11242\`, 72px): icons only, a numeric badge as a dot, the status chip hidden, and the full panel opening as an overlay on hover or focus without moving the page. The panel is a full-width column from desktop, and the current item keeps the source bar.\n\n${sideNavGuide}`,
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
  // The fixture pins the desktop width: the play function reads the navigation
  // links, which the narrow layout hides behind the drawer trigger.
  args: {
    items: [
      {
        label: "Panoramica",
        href: "#",
        current: true,
        icon: <Icon source={DashboardIcon} />,
      },
      {
        label: "Pagamenti",
        href: "#pagamenti",
        icon: <Icon source={CreditCardIcon} />,
        badgeCount: 2,
        badgeLabel: "2 pagamenti",
        chip: (
          <Tag status="info" className="pui:normal-case">
            Novità
          </Tag>
        ),
        children: [
          { label: "PagoPA", href: "#pagopa" },
          { label: "F24", href: "#f24" },
        ],
      },
      {
        label: "Assistenza",
        href: "#assistenza",
        icon: <Icon source={SupportIcon} />,
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
    // Chromatic's renderer fails this play while `test:stories` passes it
    // on three engines, so only the capture judges the build (#195).
    if (isChromatic()) return
    const canvas = within(canvasElement)
    const toggle = canvas.getByRole("button", { name: "Espandi Pagamenti" })
    await expect(toggle).toHaveAttribute("aria-expanded", "false")
    await userEvent.click(toggle)
    await expect(toggle).toHaveAccessibleName("Comprimi Pagamenti")
    await expect(canvas.getByRole("link", { name: "F24" })).toBeVisible()
    await expect(canvas.getByRole("link", { name: "Cambia profilo" })).toBeVisible()
  },
}

const condensedItems = [
  {
    label: "Panoramica",
    href: "#",
    icon: <Icon source={DashboardIcon} />,
  },
  {
    label: "Pagamenti",
    href: "#pagamenti",
    icon: <Icon source={CreditCardIcon} />,
    badgeCount: 2,
    badgeLabel: "2 pagamenti",
    chip: (
      <Tag status="info" className="pui:normal-case">
        Novità
      </Tag>
    ),
    children: [
      { label: "PagoPA", href: "#pagopa", current: true, icon: <Icon source={PaymentsIcon} /> },
      { label: "F24", href: "#f24", icon: <Icon source={ReceiptLongIcon} /> },
    ],
  },
  {
    label: "Assistenza",
    href: "#assistenza",
    icon: <Icon source={SupportIcon} />,
  },
]

function CondensedPage({ width }: { width: number }) {
  return (
    <div style={{ width }} className="pui:flex pui:min-h-[32rem] pui:items-stretch">
      <SideNav
        condensed
        title="Pagamenti"
        items={condensedItems}
        className="pui:shrink-0 pui:border-r"
        profile={{
          title: "Stai operando come",
          name: "Comune di Roma",
          avatar: <Avatar alt="Comune di Roma" initials="CR" size="compact" />,
        }}
      />
      <main data-testid="page-content" className="pui:min-w-0 pui:flex-1 pui:p-6">
        <p>Contenuto della pagina</p>
      </main>
    </div>
  )
}

export const Condensed: Story = {
  // Reflow exemption: the fixture is pinned at the 1440 source width and proves
  // the overlay does not move the page, not a 320 product surface.
  parameters: {
    layout: "fullscreen",
    a11yContract: { reflow: false },
    // The fixture pins the 1440 source width: the other two captures are the
    // same composition cropped, not a narrower product surface.
    chromatic: { viewports: [1200] },
  },
  render: () => <CondensedPage width={1440} />,
  play: async ({ canvasElement }) => {
    // Chromatic's renderer fails this play while `test:stories` passes it
    // on three engines, so only the capture judges the build (#195).
    if (isChromatic()) return
    const canvas = within(canvasElement)
    const nav = canvas.getByRole("navigation", { name: "Pagamenti" })
    const rail = nav.querySelector('[data-slot="side-nav-panel"]')
    if (!(rail instanceof HTMLElement)) throw new Error("Expected the condensed panel")
    const content = canvas.getByTestId("page-content")
    const before = content.getBoundingClientRect()
    await expect(rail.getBoundingClientRect().width).toBe(72)

    // The rail keeps every accessible label while it hides it visually.
    const panorama = canvas.getByRole("link", { name: "Panoramica" })
    await expect(panorama.getBoundingClientRect().height).toBeGreaterThanOrEqual(44)
    await expect(within(rail).getByText("2 pagamenti")).toBeInTheDocument()
    await expect(within(rail).queryByText("Novità")).not.toBeVisible()

    await userEvent.hover(rail)
    await waitFor(() => expect(rail.getBoundingClientRect().width).toBe(300))
    await expect(within(rail).getByText("Novità")).toBeVisible()
    const after = content.getBoundingClientRect()
    await expect(after.left).toBe(before.left)
    await expect(after.width).toBe(before.width)

    await userEvent.unhover(rail)
    await waitFor(() => expect(rail.getBoundingClientRect().width).toBe(72))

    panorama.focus()
    await waitFor(() => expect(rail.getBoundingClientRect().width).toBe(300))
    await expect(canvas.getByRole("link", { name: "PagoPA" })).toHaveAttribute(
      "aria-current",
      "page",
    )
    const parent = canvas.getByRole("link", { name: /^Pagamenti/ })
    await expect(getComputedStyle(parent).color).not.toBe("rgb(11, 62, 227)")
  },
}

export const CondensedMobile: Story = {
  // The source `Condensed=True, Device=Mobile` composition (`1519:2721`): the
  // declaration head and the full-bleed items at 320, the width the fixture
  // pins. The JS suite runs at the default viewport, where the desktop rail is
  // the rendered composition.
  parameters: { layout: "fullscreen", chromatic: { viewports: [320] } },
  render: () => (
    <div style={{ width: 320 }} className="pui:min-h-[32rem]">
      <SideNav
        condensed
        title="Pagamenti"
        items={condensedItems}
        profile={{
          title: "Stai operando come",
          name: "Comune di Roma",
          avatar: <Avatar alt="Comune di Roma" initials="CR" size="compact" />,
        }}
      />
      <main data-testid="page-content" className="pui:p-6">
        <p>Contenuto della pagina</p>
      </main>
    </div>
  ),
}
