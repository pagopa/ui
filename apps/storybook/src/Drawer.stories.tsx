import type { Meta, StoryObj } from "@storybook/react-vite"
import * as React from "react"
import { expect, screen, userEvent, waitFor, within } from "storybook/test"

import { Drawer, DrawerClose } from "@/components/overlays/drawer"
import { Button } from "@/components/primitives/button"
import { Icon } from "@/components/icons/icon"
import { Default as FlagIcon } from "@/components/icons/generated/flag"
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
  // The layout switches and the initial state are controls; the trigger, the
  // icon, the body and the actions row are nodes, and `open` alone would pin the
  // panel shut because the story carries no handler to close it.
  argTypes: {
    trigger: { control: false },
    icon: { control: false },
    children: { control: false },
    footer: { control: false },
    open: { control: false },
    onOpenChange: { control: false },
    defaultOpen: { control: "boolean" },
    footerPlacement: { control: "select", options: ["pinned", "flow"] },
    showHandle: { control: "boolean" },
    direction: { control: "select", options: ["top", "right", "bottom", "left"] },
    modal: { control: "boolean" },
    closeLabel: { control: "text" },
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
      <p className="pui:mb-3 pui:text-body">{sourceParagraph}</p>
      <p className="pui:mb-3 pui:text-body">{sourceParagraph}</p>
      <a
        data-slot="drawer-source-link"
        className="pui:font-semibold pui:text-primary pui:underline"
        href="#manuale"
      >
        Dubbi? Vai al manuale
      </a>
      <p className="pui:mt-5 pui:text-body">{sourceParagraph}</p>
    </>
  )
}

function SourceFrame({ direction }: { direction: "bottom" | "right" }) {
  return (
    <div className="pui:min-h-screen pui:w-full">
      <Drawer
        trigger={
          <Button className="pui:sr-only" tabIndex={-1} aria-hidden="true">
            Apri pannello sorgente
          </Button>
        }
        title="Drawer title"
        description={<SourceDescription />}
        icon={<Icon source={FlagIcon} size={40} className="pui:text-primary" />}
        footer={<Button className="pui:w-full pui:tablet:w-auto">Primary</Button>}
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

// The browser provider resizes the page inside the test runner only; the
// interactive Storybook has no page controller and the check is skipped there.
async function viewportController() {
  const module = await import("@vitest/browser/context").catch(() => undefined)
  return module?.page
}

async function applyViewport(width: number, height: number) {
  const page = await viewportController()
  await page?.viewport(width, height)
  for (let frame = 0; frame < 60; frame += 1) {
    if (window.innerWidth === width && window.innerHeight === height) break
    await new Promise((resolve) => requestAnimationFrame(() => resolve(null)))
  }
  // The media query follows the resize on the next frame lock.
  await new Promise((resolve) =>
    requestAnimationFrame(() => requestAnimationFrame(() => resolve(null))),
  )
}

// The title keeps the mobile type scale through the tablet range and switches at
// the 900px device step (`tablet-md`), not at Tailwind's default 768px `md`.
export const TitleScale: Story = {
  parameters: { layout: "fullscreen" },
  render: () => <SourceFrame direction="right" />,
  play: async () => {
    const title = document.querySelector<HTMLElement>('[data-slot="drawer-title"]')
    if (!title) throw new Error("Expected the drawer title")
    const page = await viewportController()
    if (!page) return
    const previous = { width: window.innerWidth, height: window.innerHeight }
    try {
      for (const width of [599, 600, 768, 899]) {
        await applyViewport(width, 900)
        await expect(getComputedStyle(title).fontSize).toBe("18px")
      }
      await applyViewport(900, 900)
      await expect(getComputedStyle(title).fontSize).toBe("24px")
    } finally {
      await applyViewport(previous.width, previous.height)
    }
  },
}

// A controlled drawer: the panel follows the caller's state, an async handler
// decides when it opens and a close action in the footer closes it.
function ControlledHarness() {
  const [open, setOpen] = React.useState(false)
  const [loading, setLoading] = React.useState(false)

  async function handleOpen() {
    setLoading(true)
    await new Promise((resolve) => setTimeout(resolve, 60))
    setLoading(false)
    setOpen(true)
  }

  return (
    <>
      <Button variant="outline" onClick={handleOpen} loading={loading}>
        Apri dopo la richiesta
      </Button>
      <p data-testid="controlled-state">Stato: {open ? "aperto" : "chiuso"}</p>
      <Drawer
        open={open}
        onOpenChange={setOpen}
        title="Dettagli della pratica"
        description="Il pannello segue lo stato del componente."
        direction="bottom"
        footer={<DrawerClose variant="outline">Chiudi dal piè di pagina</DrawerClose>}
      >
        <p>Importo: 24,00 €</p>
      </Drawer>
    </>
  )
}

export const Controlled: Story = {
  render: () => <ControlledHarness />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await userEvent.click(canvas.getByRole("button", { name: "Apri dopo la richiesta" }))

    const drawer = await screen.findByRole("dialog", { name: "Dettagli della pratica" })
    await waitFor(() => expect(drawer).toBeVisible())
    await expect(canvas.getByTestId("controlled-state")).toHaveTextContent("Stato: aperto")

    await userEvent.click(within(drawer).getByRole("button", { name: "Chiudi dal piè di pagina" }))
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument())
    await expect(canvas.getByTestId("controlled-state")).toHaveTextContent("Stato: chiuso")
  },
}

export const UncontrolledDefaultOpen: Story = {
  args: {
    trigger: <Button variant="outline">Apri pannello non controllato</Button>,
    title: "Pannello non controllato",
    defaultOpen: true,
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const panel = await screen.findByRole("dialog", { name: "Pannello non controllato" })
    await waitFor(() => expect(panel).toBeVisible())

    await userEvent.keyboard("{Escape}")
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument())

    const trigger = canvas.getByRole("button", { name: "Apri pannello non controllato" })
    await userEvent.click(trigger)
    await waitFor(() =>
      expect(screen.getByRole("dialog", { name: "Pannello non controllato" })).toBeVisible(),
    )
    await userEvent.keyboard("{Escape}")
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument())
    await expect(trigger).toHaveFocus()
  },
}

function NoTriggerHarness() {
  const [open, setOpen] = React.useState(false)

  return (
    <>
      <Button variant="outline" onClick={() => setOpen(true)}>
        Apri dal controllo
      </Button>
      <p data-testid="no-trigger-state">Stato: {open ? "aperto" : "chiuso"}</p>
      <Drawer
        open={open}
        onOpenChange={setOpen}
        title="Pannello senza elemento di apertura"
        description="Il pannello si apre dallo stato del componente."
        direction="bottom"
      />
    </>
  )
}

export const WithoutTrigger: Story = {
  render: () => <NoTriggerHarness />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await expect(screen.queryByRole("dialog")).not.toBeInTheDocument()

    await userEvent.click(canvas.getByRole("button", { name: "Apri dal controllo" }))
    const drawer = await screen.findByRole("dialog", {
      name: "Pannello senza elemento di apertura",
    })
    await waitFor(() => expect(drawer).toBeVisible())
    await expect(canvas.getByTestId("no-trigger-state")).toHaveTextContent("Stato: aperto")

    await userEvent.keyboard("{Escape}")
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument())
    await expect(canvas.getByTestId("no-trigger-state")).toHaveTextContent("Stato: chiuso")
  },
}

function PanelContractHarness() {
  const [open, setOpen] = React.useState(true)
  const [panel, setPanel] = React.useState<HTMLDivElement | null>(null)

  const forwarded = panel
    ? `class=${panel.classList.contains("pui:w-80") ? "inoltrata" : "assente"} attribute=${panel.dataset.contractSlot ?? "assente"}`
    : "nessun pannello"

  return (
    <>
      <p data-testid="panel-contract">{forwarded}</p>
      <Drawer
        ref={setPanel}
        open={open}
        onOpenChange={setOpen}
        title="Pannello con contratto inoltrato"
        className="pui:w-80"
        data-contract-slot="drawer"
        direction="bottom"
      />
    </>
  )
}

export const PanelContract: Story = {
  render: () => <PanelContractHarness />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const drawer = await screen.findByRole("dialog", { name: "Pannello con contratto inoltrato" })
    await waitFor(() => expect(drawer).toBeVisible())
    await expect(canvas.getByTestId("panel-contract")).toHaveTextContent(
      "class=inoltrata attribute=drawer",
    )
  },
}
