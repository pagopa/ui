import type { Meta, StoryObj } from "@storybook/react-vite"
import * as React from "react"
import { expect, screen, userEvent, waitFor, within } from "storybook/test"

import { Popover } from "@/components/overlays/popover"
import { Button } from "@/components/primitives/button"
import { Default as InfoIcon } from "@/components/icons/generated/info"
import { PopoverTitle } from "@/components/primitives/popover"
import { figmaEmbedUrl } from "@/catalog/figma/file"

import popoverGuide from "./guides/popover.md?raw"

const meta = {
  title: "Components/Overlays/Popover",
  component: Popover,
  args: {
    trigger: <Button variant="outline">Apri popover</Button>,
    children: (
      <>
        <PopoverTitle>Informazione contestuale</PopoverTitle>
        <p className="pui:text-muted-foreground">Contenuto collegato al trigger.</p>
      </>
    ),
  },
  // The placement and the initial state are controls; the trigger, the content
  // and the anchor are nodes, and `open` alone would pin the panel open because
  // the story carries no handler to close it.
  argTypes: {
    trigger: { control: false },
    children: { control: false },
    anchor: { control: false },
    open: { control: false },
    onOpenChange: { control: false },
    defaultOpen: { control: "boolean" },
    align: { control: "select", options: ["start", "center", "end"] },
    arrowPosition: { control: "select", options: ["top", "bottom"] },
    modal: { control: "boolean" },
    label: { control: "text" },
    closeLabel: { control: "text" },
  },
  parameters: {
    docs: {
      description: {
        component: `Popover anchored to the trigger, with an accessible name, Escape to close and focus restore. The indicator follows the trigger when the popup is shifted to stay in the viewport.

${popoverGuide}`,
      },
    },
  },
} satisfies Meta<typeof Popover>

export default meta
type Story = StoryObj<typeof meta>

export const Playground: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const trigger = canvas.getByRole("button", { name: "Apri popover" })

    await userEvent.click(trigger)

    const popover = await screen.findByRole("dialog")
    await waitFor(() => expect(popover).toBeVisible())
    await expect(popover).toHaveAccessibleName("Informazione contestuale")

    await userEvent.keyboard("{Escape}")
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument())
    await expect(trigger).toHaveFocus()
    await userEvent.keyboard("{Enter}")
    const reopened = await screen.findByRole("dialog", {
      name: "Informazione contestuale",
    })
    await waitFor(() => expect(reopened).toBeVisible())
    await userEvent.click(within(reopened).getByRole("button", { name: "Chiudi popover" }))
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument())
    await expect(trigger).toHaveFocus()
  },
}

export const OpenKeyboardAudit: Story = {
  // Reflow exemption debt, tracked in https://github.com/pagopa/ui/issues/192.
  parameters: { a11yContract: { reflow: false } },
  args: {
    children: (
      <>
        <PopoverTitle>Informazione contestuale</PopoverTitle>
        <p>Contenuto collegato al trigger.</p>
        <Button>Leggi dettagli</Button>
      </>
    ),
  },
  play: async ({ canvasElement }) => {
    const trigger = within(canvasElement).getByRole("button", { name: "Apri popover" })
    await userEvent.click(trigger)
    const popover = await screen.findByRole("dialog", { name: "Informazione contestuale" })
    await waitFor(() => expect(popover).toBeVisible())
    const action = within(popover).getByRole("button", { name: "Leggi dettagli" })
    await waitFor(() => expect(action).toHaveFocus())
    await userEvent.keyboard("{Escape}")
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument())
    await expect(trigger).toHaveFocus()
    await userEvent.keyboard("{Enter}")
    await waitFor(() =>
      expect(screen.getByRole("dialog", { name: "Informazione contestuale" })).toBeVisible(),
    )
  },
}

function SourceFrame({ arrowPosition }: { arrowPosition: "top" | "bottom" }) {
  return (
    <div className="pui:relative pui:min-h-screen pui:w-full">
      <Popover
        trigger={
          <Button
            variant="ghost"
            size="icon"
            aria-label="Apri popover informativo"
            className={`pui:absolute pui:left-1/2 pui:size-6 pui:p-0 pui:after:absolute pui:after:-inset-2.5 ${
              arrowPosition === "top" ? "pui:top-0" : "pui:bottom-0"
            }`}
          >
            <InfoIcon className="pui:size-6" />
          </Button>
        }
        defaultOpen
        modal={false}
        arrowPosition={arrowPosition}
      >
        <p>Descrizione di approfondimento su più righe più righe più righe</p>
      </Popover>
    </div>
  )
}

export const SourceTop: Story = {
  render: () => <SourceFrame arrowPosition="top" />,
  parameters: {
    // Reflow exemption: fixture pinned at the source width, not a product surface.
    a11yContract: { reflow: false },
    layout: "fullscreen",
    design: { type: "figma", url: figmaEmbedUrl("9927:36954") },
  },
}

export const SourceBottom: Story = {
  render: () => <SourceFrame arrowPosition="bottom" />,
  parameters: {
    // Reflow exemption: fixture pinned at the source width, not a product surface.
    a11yContract: { reflow: false },
    layout: "fullscreen",
    design: { type: "figma", url: figmaEmbedUrl("9927:36954") },
  },
}

export const ShiftedIndicator: Story = {
  // The trigger sits at the edge a centred popup cannot fit: the popup is
  // shifted back inside the viewport, and the arrow still points at the
  // trigger instead of the popup centre.
  render: () => (
    <div className="pui:relative pui:min-h-screen pui:w-full">
      <Popover
        trigger={
          <Button
            variant="ghost"
            size="icon"
            aria-label="Apri popover informativo"
            className="pui:absolute pui:top-24 pui:right-24 pui:size-6 pui:p-0 pui:after:absolute pui:after:-inset-2.5"
          >
            <InfoIcon className="pui:size-6" />
          </Button>
        }
        defaultOpen
        modal={false}
      >
        <p>Descrizione di approfondimento su più righe più righe più righe</p>
      </Popover>
    </div>
  ),
  parameters: {
    // Reflow exemption: fixture holds the popup open, not a product surface.
    a11yContract: { reflow: false },
    layout: "fullscreen",
  },
  play: async ({ canvasElement }) => {
    const trigger = within(canvasElement).getByRole("button", {
      name: "Apri popover informativo",
    })
    const popup = await screen.findByRole("dialog")
    const arrow = popup.querySelector("[data-slot='popover-arrow']")
    if (!arrow) throw new Error("the popup renders no arrow")

    const centre = (element: Element) => {
      const rect = element.getBoundingClientRect()
      return rect.x + rect.width / 2
    }
    const triggerCentre = centre(trigger)
    await waitFor(() => expect(Math.abs(centre(arrow) - triggerCentre)).toBeLessThanOrEqual(2))
    // The popup really is off-centre against the trigger, otherwise the
    // assertion above would hold for a centred arrow too.
    await expect(Math.abs(centre(popup) - triggerCentre)).toBeGreaterThan(40)
  },
}

// A controlled popover: the caller owns the state, so the trigger, Escape and
// the close button all land on the same handler.
function ControlledHarness() {
  const [open, setOpen] = React.useState(false)

  return (
    <>
      <Popover
        trigger={<Button variant="outline">Apri popover controllato</Button>}
        open={open}
        onOpenChange={setOpen}
        label="Informazione controllata"
      >
        <PopoverTitle>Informazione controllata</PopoverTitle>
        <p className="pui:text-muted-foreground">Il pannello segue lo stato del componente.</p>
      </Popover>
      <p data-testid="controlled-state">Stato: {open ? "aperto" : "chiuso"}</p>
    </>
  )
}

export const Controlled: Story = {
  render: () => <ControlledHarness />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const trigger = canvas.getByRole("button", { name: "Apri popover controllato" })
    await expect(canvas.getByTestId("controlled-state")).toHaveTextContent("Stato: chiuso")

    await userEvent.click(trigger)
    const popover = await screen.findByRole("dialog", { name: "Informazione controllata" })
    await waitFor(() => expect(popover).toBeVisible())
    await expect(canvas.getByTestId("controlled-state")).toHaveTextContent("Stato: aperto")

    await userEvent.keyboard("{Escape}")
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument())
    await expect(canvas.getByTestId("controlled-state")).toHaveTextContent("Stato: chiuso")
    await expect(trigger).toHaveFocus()
  },
}

export const UncontrolledDefaultOpen: Story = {
  args: {
    trigger: <Button variant="outline">Apri popover non controllato</Button>,
    defaultOpen: true,
    label: "Informazione non controllata",
    children: <p>Contenuto aperto dallo stato iniziale.</p>,
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const panel = await screen.findByRole("dialog", { name: "Informazione non controllata" })
    await waitFor(() => expect(panel).toBeVisible())

    await userEvent.keyboard("{Escape}")
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument())

    const trigger = canvas.getByRole("button", { name: "Apri popover non controllato" })
    await userEvent.click(trigger)
    await waitFor(() =>
      expect(screen.getByRole("dialog", { name: "Informazione non controllata" })).toBeVisible(),
    )
    await userEvent.keyboard("{Escape}")
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument())
    await expect(trigger).toHaveFocus()
  },
}

function NoTriggerHarness() {
  const [open, setOpen] = React.useState(false)
  const anchor = React.useRef<HTMLButtonElement>(null)

  return (
    <>
      <Button ref={anchor} onClick={() => setOpen(true)}>
        Apri il popover dal controllo
      </Button>
      <p data-testid="no-trigger-state">Stato: {open ? "aperto" : "chiuso"}</p>
      <Popover
        anchor={anchor}
        open={open}
        onOpenChange={setOpen}
        label="Popover senza elemento di apertura"
      >
        <p>Contenuto aperto dallo stato del componente.</p>
      </Popover>
    </>
  )
}

export const WithoutTrigger: Story = {
  render: () => <NoTriggerHarness />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await expect(screen.queryByRole("dialog")).not.toBeInTheDocument()

    await userEvent.click(canvas.getByRole("button", { name: "Apri il popover dal controllo" }))
    const popover = await screen.findByRole("dialog", {
      name: "Popover senza elemento di apertura",
    })
    await waitFor(() => expect(popover).toBeVisible())
    await expect(canvas.getByTestId("no-trigger-state")).toHaveTextContent("Stato: aperto")

    await userEvent.keyboard("{Escape}")
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument())
    await expect(canvas.getByTestId("no-trigger-state")).toHaveTextContent("Stato: chiuso")
  },
}

function PanelContractHarness() {
  const [open, setOpen] = React.useState(false)
  const [panel, setPanel] = React.useState<HTMLDivElement | null>(null)
  const anchor = React.useRef<HTMLButtonElement>(null)

  const forwarded = panel
    ? `class=${panel.classList.contains("pui:max-w-md") ? "inoltrata" : "assente"} attribute=${panel.dataset.contractSlot ?? "assente"}`
    : "nessun pannello"

  return (
    <>
      <Button ref={anchor} onClick={() => setOpen(!open)}>
        Controlla il pannello
      </Button>
      <p data-testid="panel-contract">{forwarded}</p>
      <Popover
        ref={setPanel}
        anchor={anchor}
        open={open}
        onOpenChange={setOpen}
        label="Popover con contratto inoltrato"
        className="pui:max-w-md"
        data-contract-slot="popover"
      >
        <p>Contenuto misurato dal consumatore.</p>
      </Popover>
    </>
  )
}

export const PanelContract: Story = {
  render: () => <PanelContractHarness />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const opener = canvas.getByRole("button", { name: "Controlla il pannello" })
    await userEvent.click(opener)

    const popover = await screen.findByRole("dialog", { name: "Popover con contratto inoltrato" })
    await waitFor(() => expect(popover).toBeVisible())
    await expect(canvas.getByTestId("panel-contract")).toHaveTextContent(
      "class=inoltrata attribute=popover",
    )

    // Left open, the panel is wider than the reflow contract allows, so the
    // story hands the page back closed.
    await userEvent.keyboard("{Escape}")
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument())
    await expect(opener).toHaveFocus()
  },
}
