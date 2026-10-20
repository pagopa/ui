import type { Meta, StoryObj } from "@storybook/react-vite"
import { expect, screen, userEvent, waitFor, within } from "storybook/test"

import { Drawer } from "@/components/overlays"
import { Button } from "@/components/primitives/button"
import { PagoPAIcon } from "@/components/icons/PagoPAIcon"
import { figmaEmbedUrl } from "@/catalog/figma/file"

import drawerGuide from "./guides/drawer.md?raw"

const meta = {
  title: "Components/Overlays/Drawer",
  component: Drawer,
  args: {
    trigger: <Button variant="outline">Apri pannello</Button>,
    title: "Dettagli pagamento",
    description: "Riepilogo della transazione.",
    children: <p>Importo: 24,00 €</p>,
    footer: <Button>Continua</Button>,
  },
  parameters: {
    docs: {
      description: {
        component: `Side panel with a focus trap, Escape to close and focus restore to the trigger.\n\n${drawerGuide}`,
      },
    },
  },
} satisfies Meta<typeof Drawer>

export default meta
type Story = StoryObj<typeof meta>

export const Playground: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const trigger = canvas.getByRole("button", { name: "Apri pannello" })

    await userEvent.click(trigger)

    const drawer = await screen.findByRole("dialog")
    await waitFor(() => expect(drawer).toBeVisible())
    await expect(drawer).toHaveAccessibleName("Dettagli pagamento")
    await waitFor(() => expect(drawer.contains(document.activeElement)).toBe(true))

    // Base UI only drives the dismiss gesture: the edge geometry is ours, so a
    // right panel must stay anchored to the right edge of the viewport.
    const root = drawer.ownerDocument.documentElement
    await waitFor(() =>
      expect(Math.round(drawer.getBoundingClientRect().right)).toBe(root.clientWidth),
    )
    const bounds = drawer.getBoundingClientRect()
    await expect(Math.round(bounds.top)).toBe(0)
    await expect(Math.round(bounds.height)).toBe(root.clientHeight)
    const handle = drawer.querySelector('[data-slot="drawer-handle"]')
    if (!(handle instanceof HTMLElement)) throw new Error("Expected the source drag handle")
    await expect(handle).not.toBeVisible()

    await userEvent.keyboard("{Escape}")
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument())
    await expect(trigger).toHaveFocus()
  },
}

export const OpenKeyboardAudit: Story = {
  play: async ({ canvasElement }) => {
    const trigger = within(canvasElement).getByRole("button", { name: "Apri pannello" })
    await userEvent.click(trigger)
    const drawer = await screen.findByRole("dialog", { name: "Dettagli pagamento" })
    await waitFor(() => expect(drawer).toBeVisible())
    await waitFor(() => expect(drawer.contains(document.activeElement)).toBe(true))
    for (let index = 0; index < 6; index++) {
      await userEvent.tab()
      await waitFor(() => expect(drawer.contains(document.activeElement)).toBe(true))
    }
    await userEvent.tab({ shift: true })
    await waitFor(() => expect(drawer.contains(document.activeElement)).toBe(true))
    await userEvent.keyboard("{Escape}")
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument())
    await expect(trigger).toHaveFocus()
    await userEvent.keyboard("{Enter}")
    await waitFor(() =>
      expect(screen.getByRole("dialog", { name: "Dettagli pagamento" })).toBeVisible(),
    )
  },
}

const sourceParagraph =
  "Lorem ipsum dolor sit amet, consectetur adipisici elit, sed eiusmod tempor incidunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis ullamco laboris nisi ut aliquid ex ea commodi consequat."

function SourceDescription() {
  return (
    <>
      <p className="mb-3 text-body">{sourceParagraph}</p>
      <p className="mb-3 text-body">{sourceParagraph}</p>
      <a
        data-slot="drawer-source-link"
        className="font-semibold text-primary underline"
        href="#manuale"
      >
        Dubbi? Vai al manuale
      </a>
      <p className="mt-5 text-body">{sourceParagraph}</p>
    </>
  )
}

function SourceFrame({ direction }: { direction: "bottom" | "right" }) {
  return (
    <div className="min-h-screen w-full">
      <Drawer
        trigger={
          <Button className="sr-only" tabIndex={-1} aria-hidden="true">
            Apri pannello sorgente
          </Button>
        }
        title="Drawer title"
        description={<SourceDescription />}
        icon={<PagoPAIcon name="flag" size={40} className="text-primary" />}
        footer={<Button className="w-full sm:w-auto">Primary</Button>}
        footerPlacement="flow"
        showHandle={false}
        direction={direction}
        defaultOpen
        modal={false}
      />
    </div>
  )
}

export const SourceDesktop: Story = {
  render: () => <SourceFrame direction="right" />,
  parameters: {
    layout: "fullscreen",
    design: { type: "figma", url: figmaEmbedUrl("1278:6528") },
  },
}

export const SourceMobile: Story = {
  render: () => <SourceFrame direction="bottom" />,
  parameters: {
    layout: "fullscreen",
    design: { type: "figma", url: figmaEmbedUrl("1278:6526") },
  },
}
