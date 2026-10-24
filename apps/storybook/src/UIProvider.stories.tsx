import type { Meta, StoryObj } from "@storybook/react-vite"
import * as React from "react"
import { expect, userEvent, within } from "storybook/test"

import { Breadcrumb } from "@/components/navigation/breadcrumb"
import { Footer } from "@/components/navigation/footer"
import { Button } from "@/components/primitives/button"
import { UIProvider, type LinkComponentProps } from "@/lib/ui-provider"

// A stand-in for a client router: it keeps the anchor, marks it and stops the
// browser navigation the way a router intercepts a same-origin click.
const RouterLink = React.forwardRef<HTMLAnchorElement, LinkComponentProps>(
  ({ href, onClick, ...props }, ref) => (
    <a
      {...props}
      data-router-link="true"
      href={href}
      onClick={(event) => {
        event.preventDefault()
        onClick?.(event)
      }}
      ref={ref}
    />
  ),
)
RouterLink.displayName = "RouterLink"

const meta = {
  title: "Components/Composites/UIProvider",
  parameters: {
    docs: {
      description: {
        component:
          "One provider for the library contexts. `linkComponent` makes every navigation link render through the application's own link component, so a client router keeps its client-side transitions; without a provider the links are plain anchors.",
      },
    },
  },
} satisfies Meta

export default meta
type Story = StoryObj<typeof meta>

export const RouterLinkStory: Story = {
  name: "RouterLink",
  render: () => (
    <UIProvider linkComponent={RouterLink}>
      <div className="grid gap-8">
        <Breadcrumb
          items={[
            { label: "Home", href: "/" },
            { label: "Servizi", href: "/servizi" },
            { label: "Pagamenti" },
          ]}
        />
        <Footer
          links={[
            { label: "Informativa Privacy", href: "/privacy" },
            { label: "Accessibilità", href: "/accessibilita" },
          ]}
          company="PagoPA S.p.A."
        />
      </div>
    </UIProvider>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const privacy = canvas.getByRole("link", { name: "Informativa Privacy" })
    const home = canvas.getByRole("link", { name: "Home" })

    await expect(privacy).toHaveAttribute("data-router-link", "true")
    await expect(home).toHaveAttribute("data-router-link", "true")
    await expect(home).toHaveAttribute("href", "/")

    // The router component owns the click: the page does not navigate.
    const pathname = window.location.pathname
    await userEvent.click(home)
    await expect(window.location.pathname).toBe(pathname)
  },
}

export const ButtonAsLink: Story = {
  render: () => (
    <Button render={<a aria-label="Vai alla sezione" href="/somewhere" />}>Vai alla sezione</Button>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await expect(canvas.getByRole("link", { name: "Vai alla sezione" })).toBeVisible()
  },
}
