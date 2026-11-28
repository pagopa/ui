import type { Meta, StoryObj } from "@storybook/react-vite"
import * as React from "react"
import { enUS } from "react-day-picker/locale"
import { expect, fn, screen, userEvent, waitFor, within } from "storybook/test"

import { DatePicker } from "@/components/inputs/date-picker"
import { Breadcrumb } from "@/components/navigation/breadcrumb"
import { Footer } from "@/components/navigation/footer"
import { Pagination } from "@/components/navigation/pagination"
import { Dialog } from "@/components/overlays/dialog"
import { Popover } from "@/components/overlays/popover"
import { Button } from "@/components/primitives/button"
import { UIProvider, enMessages, itMessages, type LinkComponentProps } from "@/lib/ui-provider"

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
          "One provider for the library contexts. `linkComponent` makes every navigation link render through the application's own link component, so a client router keeps its client-side transitions; without a provider the links are plain anchors. `className` and `style` theme the root the token variables are published on, and the `--*` declarations and class reach the overlays too, which mount outside the provider's branch.",
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
      <div className="pui:grid pui:gap-8">
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

export const English: Story = {
  name: "English",
  render: () => (
    <UIProvider locale="en-US" messages={enMessages} calendarLocale={enUS}>
      <div className="pui:grid pui:gap-8">
        <Dialog trigger={<Button>Open dialog</Button>} title="Payment details">
          <Pagination currentPage={2} totalPages={5} onPageChange={fn()} />
        </Dialog>
        <DatePicker label={enMessages.datePicker.label} onCancel={fn()} onConfirm={fn()} />
      </div>
    </UIProvider>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    // The open dialog hides the rest of the tree from assistive technology, so
    // the pagination is asserted inside it and the dialog closes before the
    // calendar checks.
    await userEvent.click(canvas.getByRole("button", { name: "Open dialog" }))
    const dialog = await screen.findByRole("dialog", { name: "Payment details" })
    await waitFor(() => expect(dialog).toBeVisible())
    await expect(
      within(dialog).getByRole("button", { name: enMessages.dialog.closeLabel }),
    ).toBeVisible()
    await expect(
      within(dialog).getByRole("navigation", { name: enMessages.pagination.label }),
    ).toBeVisible()
    await expect(
      within(dialog).getByRole("button", { name: enMessages.pagination.previousLabel }),
    ).toBeVisible()
    await expect(
      within(dialog).getByRole("button", { name: enMessages.pagination.nextLabel }),
    ).toBeVisible()

    await userEvent.keyboard("{Escape}")
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument())

    await expect(canvas.getByText(enMessages.datePicker.label)).toBeVisible()
    await expect(canvas.getByText(enMessages.datePicker.emptySelectionText)).toBeVisible()
    await expect(
      canvas.getByRole("button", { name: enMessages.datePicker.cancelLabel }),
    ).toBeVisible()
    await expect(
      canvas.getByRole("button", { name: enMessages.datePicker.confirmLabel }),
    ).toBeVisible()
  },
}

export const PartialOverride: Story = {
  name: "PartialOverride",
  render: () => (
    <UIProvider messages={{ pagination: { previousLabel: "Indietro" } }}>
      <Pagination currentPage={2} totalPages={5} onPageChange={fn()} />
    </UIProvider>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await expect(canvas.getByRole("button", { name: "Indietro" })).toBeVisible()
    await expect(
      canvas.getByRole("button", { name: itMessages.pagination.nextLabel }),
    ).toBeVisible()
  },
}

// A theme scope is a class plus the variables it declares, as an application
// would ship it: the values are arbitrary here, only their reach is asserted.
const OUTER_THEME = { "--pui-primary": "rgb(0, 0, 1)" }
const INNER_THEME = { "--pui-primary": "rgb(0, 0, 2)" }

export const ThemeScope: Story = {
  name: "ThemeScope",
  render: () => (
    <UIProvider className="demo-outer" style={OUTER_THEME}>
      <UIProvider className="demo-inner" style={INNER_THEME}>
        <div className="pui:grid pui:gap-8">
          <Dialog trigger={<Button>Apri</Button>} title="Dettagli">
            <Pagination currentPage={1} totalPages={3} onPageChange={fn()} />
          </Dialog>
          <Popover
            label="Informazione contestuale"
            trigger={<Button variant="outline">Apri popover</Button>}
          >
            <p>Contenuto collegato al trigger.</p>
          </Popover>
        </div>
      </UIProvider>
    </UIProvider>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const inner = canvasElement.querySelector<HTMLElement>(".demo-inner")

    // The scope is declared on the root the tokens publish on, alongside the
    // classes the stylesheet needs.
    await expect(inner).not.toBeNull()
    await expect(inner).toHaveClass("pagopa-ui-root")
    await expect(inner?.style.getPropertyValue("--pui-primary")).toBe("rgb(0, 0, 2)")

    await userEvent.click(canvas.getByRole("button", { name: "Apri" }))
    const dialog = await screen.findByRole("dialog", { name: "Dettagli" })
    await waitFor(() => expect(dialog).toBeVisible())

    // The dialog leaves the provider's branch, so the scope must be repeated on
    // the portal root: the innermost provider wins, as it does in the tree.
    const scope = document.querySelector<HTMLElement>("[data-pagopa-ui-portal-root]")
    await expect(scope).not.toBeNull()
    await expect(scope).toHaveClass("pagopa-ui-root", "demo-inner")
    await expect(scope).not.toHaveClass("demo-outer")
    await expect(scope?.style.getPropertyValue("--pui-primary")).toBe("rgb(0, 0, 2)")

    // And the declaration cascades into the portalled subtree.
    await expect(window.getComputedStyle(dialog).getPropertyValue("--pui-primary").trim()).toBe(
      "rgb(0, 0, 2)",
    )
  },
}
