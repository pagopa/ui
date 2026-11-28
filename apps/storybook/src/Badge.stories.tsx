import type { Meta, StoryObj } from "@storybook/react-vite"
import { expect, within } from "storybook/test"

import {
  Selected as MailSelectedIcon,
  Default as MailUnselectedIcon,
} from "@/components/icons/generated/mail"
import { Badge } from "@/components/primitives/badge"
import { figmaEmbedUrl } from "@/catalog/figma/file"

import { expectFocusContrast, focusWithKeyboard } from "./support/a11y-contract"
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

// A linked Badge is a control, so it owes the 24x24 target WCAG 2.5.8 asks for
// even though the label badge itself stays 20px tall.
export const LinkBadges: Story = {
  name: "Badge collegati",
  render: () => (
    <div className="pui:flex pui:flex-col pui:items-start pui:gap-4">
      {(["default", "secondary", "destructive", "outline", "ghost"] as const).map((variant) => (
        <Badge
          key={variant}
          variant={variant}
          render={<a href="#badge" aria-label={`Collegamento ${variant}`} />}
          data-variant={variant}
        >
          Collegamento
        </Badge>
      ))}
    </div>
  ),
  play: async ({ canvasElement }) => {
    const links = within(canvasElement).getAllByRole("link")
    await expect(links).toHaveLength(5)
    for (const link of links) {
      const box = link.getBoundingClientRect()
      await expect(box.height).toBeGreaterThanOrEqual(24)
      await expect(box.width).toBeGreaterThanOrEqual(24)
      await focusWithKeyboard(link)
      await expectFocusContrast(link)
    }
    // The destructive surface is an opaque token, not an alpha composite: the
    // page behind the badge must not decide its contrast.
    const destructive = canvasElement.querySelector<HTMLElement>("[data-variant='destructive']")
    if (!destructive) throw new Error("the destructive link badge is missing")
    await expect(getComputedStyle(destructive).backgroundColor).toMatch(/^rgb\(\d+, \d+, \d+\)$/)
  },
}

export const Fidelity: Story = {
  // Reflow exemption: fixture pinned at the source width, not a product surface.
  parameters: { a11yContract: { reflow: false } },
  render: () => (
    <div className="pui:flex pui:flex-col pui:gap-4">
      <div className="pui:flex pui:min-h-11 pui:items-center pui:gap-4">
        <span className="pui:text-sm">Numbered · transparent</span>
        <Badge data-fidelity-case="numbered" display="numbered">
          1
        </Badge>
      </div>
      <div className="pui:flex pui:min-h-11 pui:items-center pui:gap-4">
        <span className="pui:text-sm">Plain · transparent</span>
        <Badge data-fidelity-case="plain-transparent" display="plain" background="transparent" />
      </div>
      <div className="pui:flex pui:min-h-11 pui:items-center pui:gap-4">
        <span className="pui:text-sm">Sidenav icon · selected</span>
        <Badge
          data-fidelity-case="sidenav-selected"
          display="sidenav-icon"
          selected
          background="primary"
        >
          <MailSelectedIcon size={24} className="pui:size-6" />
        </Badge>
      </div>
      <div className="pui:flex pui:min-h-11 pui:items-center pui:gap-4">
        <span className="pui:text-sm">Sidenav icon · unselected</span>
        <Badge data-fidelity-case="sidenav-unselected" display="sidenav-icon" background="white">
          <MailUnselectedIcon size={24} className="pui:size-6" />
        </Badge>
      </div>
      <div className="pui:flex pui:min-h-11 pui:items-center pui:gap-4">
        <span className="pui:text-sm">Plain · grey 50</span>
        <Badge data-fidelity-case="plain-muted" display="plain" background="muted" />
      </div>
      <div className="pui:flex pui:min-h-11 pui:items-center pui:gap-4">
        <span className="pui:text-sm">Plain · white</span>
        <Badge data-fidelity-case="plain-white" display="plain" background="white" />
      </div>
    </div>
  ),
}
