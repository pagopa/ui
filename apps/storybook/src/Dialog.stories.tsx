import type { Meta, StoryObj } from "@storybook/react-vite"
import * as React from "react"
import { expect, screen, userEvent, waitFor, within } from "storybook/test"

import { figmaEmbedUrl } from "@/catalog/figma/file"
import { CheckboxField } from "@/components/inputs/checkbox-field"
import { Dialog, DialogClose } from "@/components/overlays/dialog"
import { Button } from "@/components/primitives/button"
import { Input } from "@/components/primitives/input"

import dialogGuide from "./guides/dialog.md?raw"

// The source sample of set `1042:18133` (`Device=Desktop|Mobile, Type=Default`):
// the title, the copy, the option row and the two actions. The copy is
// caller-owned, so the story carries the source sample.
const sourceTitle = "Dialog Title"
const sourceDescription =
  "Lorem ipsum dolor sit amet, consectetur adipisici elit, sed eiusmod tempor incidunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis ullamco laboris nisi ut aliquid ex ea commodi consequat."

const meta = {
  title: "Components/Overlays/Dialog",
  component: Dialog,
  args: {
    trigger: <Button>Apri dialog</Button>,
    title: "Conferma operazione",
    description: "Controlla i dati prima di procedere con l'operazione.",
    footer: (
      <>
        <Button variant="outline">Annulla</Button>
        <Button>Conferma</Button>
      </>
    ),
  },
  // Text, close label and the initial state are controls; the trigger, the body
  // and the actions row are nodes, and `open` alone would pin the panel shut
  // because the story carries no handler to close it.
  argTypes: {
    trigger: { control: false },
    children: { control: false },
    footer: { control: false },
    open: { control: false },
    onOpenChange: { control: false },
    defaultOpen: { control: "boolean" },
    closeLabel: { control: "text" },
  },
  parameters: {
    design: { type: "figma", url: figmaEmbedUrl("1042:18133") },
    docs: {
      description: {
        component: `Modal dialog with a focus trap, Escape to close and focus restore to the trigger.\n\n${dialogGuide}`,
      },
    },
  },
} satisfies Meta<typeof Dialog>

export default meta
type Story = StoryObj<typeof meta>

export const Playground: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const trigger = canvas.getByRole("button", { name: "Apri dialog" })

    await userEvent.click(trigger)

    const dialog = await screen.findByRole("dialog")
    // The dialog fades in (Base UI data-starting-style transition): wait for it.
    await waitFor(() => expect(dialog).toBeVisible())
    await expect(dialog).toHaveAccessibleName("Conferma operazione")
    await waitFor(() => expect(dialog.contains(document.activeElement)).toBe(true))

    await userEvent.keyboard("{Escape}")
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument())
    await expect(trigger).toHaveFocus()
  },
}

export const OpenKeyboardAudit: Story = {
  play: async ({ canvasElement }) => {
    const trigger = within(canvasElement).getByRole("button", { name: "Apri dialog" })
    await userEvent.click(trigger)
    const dialog = await screen.findByRole("dialog", { name: "Conferma operazione" })
    await waitFor(() => expect(dialog).toBeVisible())
    await waitFor(() => expect(dialog.contains(document.activeElement)).toBe(true))
    for (let index = 0; index < 6; index++) {
      await userEvent.tab()
      await waitFor(() => expect(dialog.contains(document.activeElement)).toBe(true))
    }
    await userEvent.tab({ shift: true })
    await waitFor(() => expect(dialog.contains(document.activeElement)).toBe(true))
    await userEvent.keyboard("{Escape}")
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument())
    await expect(trigger).toHaveFocus()
    await userEvent.keyboard("{Enter}")
    await waitFor(() =>
      expect(screen.getByRole("dialog", { name: "Conferma operazione" })).toBeVisible(),
    )
  },
}

// The source composition of `Type=Default`: the option row as the message-block
// child and the secondary text action before the primary one. The capture opens
// the panel with its own click on the trigger; a `play` would race it. The story
// leaves the centered layout: the capture forces the story root to the source
// width and a centered body (a flex item) would shrink it below the viewport.
export const SourceCase: Story = {
  name: "Source case",
  parameters: { layout: "fullscreen" },
  args: {
    title: sourceTitle,
    description: sourceDescription,
    children: <CheckboxField id="dialog-option" label="Checkbox label" />,
    footer: (
      <>
        <Button variant="ghost">Secondary</Button>
        <Button>Primary</Button>
      </>
    ),
  },
}

const urlStateHash = "#dialog-riepilogo"

// A controlled overlay: the caller owns the state, so an async handler, a form
// submission and the URL can each decide when the panel opens.
function AsyncOpenHarness() {
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
      <Button onClick={handleOpen} loading={loading}>
        Apri dopo la richiesta
      </Button>
      <p data-testid="async-state">Stato: {open ? "aperto" : "chiuso"}</p>
      <Dialog
        open={open}
        onOpenChange={setOpen}
        title="Riepilogo della pratica"
        description="La richiesta è terminata e la pratica è pronta."
        footer={<Button>Conferma</Button>}
      />
    </>
  )
}

export const ControlledAsync: Story = {
  render: () => <AsyncOpenHarness />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await userEvent.click(canvas.getByRole("button", { name: "Apri dopo la richiesta" }))

    const dialog = await screen.findByRole("dialog", { name: "Riepilogo della pratica" })
    await waitFor(() => expect(dialog).toBeVisible())
    await expect(canvas.getByTestId("async-state")).toHaveTextContent("Stato: aperto")

    await userEvent.keyboard("{Escape}")
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument())
    await expect(canvas.getByTestId("async-state")).toHaveTextContent("Stato: chiuso")
  },
}

function FormSubmitHarness() {
  const [open, setOpen] = React.useState(false)
  const [practice, setPractice] = React.useState("")

  return (
    <>
      <form
        onSubmit={(event) => {
          event.preventDefault()
          setOpen(true)
        }}
      >
        <label htmlFor="dialog-practice">Numero pratica</label>
        <Input
          id="dialog-practice"
          value={practice}
          onChange={(event) => setPractice(event.target.value)}
        />
        <Button type="submit">Apri riepilogo</Button>
      </form>
      <Dialog
        open={open}
        onOpenChange={setOpen}
        title="Riepilogo della pratica"
        description={`Pratica ${practice || "senza numero"}`}
        footer={<Button>Conferma</Button>}
      />
    </>
  )
}

export const ControlledFormSubmit: Story = {
  render: () => <FormSubmitHarness />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await userEvent.type(canvas.getByLabelText("Numero pratica"), "2026-17")
    await userEvent.click(canvas.getByRole("button", { name: "Apri riepilogo" }))

    const dialog = await screen.findByRole("dialog", { name: "Riepilogo della pratica" })
    await waitFor(() => expect(dialog).toBeVisible())
    await expect(dialog).toHaveAccessibleDescription("Pratica 2026-17")

    await userEvent.keyboard("{Escape}")
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument())
    await expect(canvas.getByLabelText("Numero pratica")).toHaveValue("2026-17")
  },
}

function UrlStateHarness() {
  const [open, setOpen] = React.useState(false)

  React.useEffect(() => {
    const sync = () => setOpen(window.location.hash === urlStateHash)
    sync()
    window.addEventListener("hashchange", sync)
    return () => window.removeEventListener("hashchange", sync)
  }, [])

  return (
    <>
      {/* The consumer router owns the navigation: it updates the address and
          lets the browser stay on the page. */}
      <a
        href={urlStateHash}
        onClick={(event) => {
          event.preventDefault()
          window.location.hash = urlStateHash
        }}
      >
        Collegamento al riepilogo
      </a>
      <p data-testid="url-state">Stato: {open ? "aperto" : "chiuso"}</p>
      <Dialog
        open={open}
        onOpenChange={(next) => {
          setOpen(next)
          if (!next) window.history.replaceState(null, "", window.location.href.split("#")[0])
        }}
        title="Riepilogo dal collegamento"
        description="Il pannello segue l'indirizzo della pagina."
      />
    </>
  )
}

export const ControlledUrlState: Story = {
  render: () => <UrlStateHarness />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const originalUrl = window.location.href
    try {
      await userEvent.click(canvas.getByRole("link", { name: "Collegamento al riepilogo" }))

      const dialog = await screen.findByRole("dialog", { name: "Riepilogo dal collegamento" })
      await waitFor(() => expect(dialog).toBeVisible())
      await expect(canvas.getByTestId("url-state")).toHaveTextContent("Stato: aperto")

      await userEvent.keyboard("{Escape}")
      await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument())
      await expect(canvas.getByTestId("url-state")).toHaveTextContent("Stato: chiuso")
      await expect(window.location.hash).toBe("")
    } finally {
      window.history.replaceState(null, "", originalUrl)
    }
  },
}

export const UncontrolledDefaultOpen: Story = {
  args: {
    trigger: <Button>Apri dialog non controllato</Button>,
    title: "Dialogo non controllato",
    defaultOpen: true,
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const panel = await screen.findByRole("dialog", { name: "Dialogo non controllato" })
    await waitFor(() => expect(panel).toBeVisible())

    await userEvent.keyboard("{Escape}")
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument())

    const trigger = canvas.getByRole("button", { name: "Apri dialog non controllato" })
    await userEvent.click(trigger)
    await waitFor(() =>
      expect(screen.getByRole("dialog", { name: "Dialogo non controllato" })).toBeVisible(),
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
      <Button onClick={() => setOpen(true)}>Apri dal controllo</Button>
      <p data-testid="no-trigger-state">Stato: {open ? "aperto" : "chiuso"}</p>
      <Dialog
        open={open}
        onOpenChange={setOpen}
        title="Pannello senza elemento di apertura"
        description="Il pannello si apre dallo stato del componente."
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
    const dialog = await screen.findByRole("dialog", {
      name: "Pannello senza elemento di apertura",
    })
    await waitFor(() => expect(dialog).toBeVisible())
    await expect(canvas.getByTestId("no-trigger-state")).toHaveTextContent("Stato: aperto")

    await userEvent.keyboard("{Escape}")
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument())
    await expect(canvas.getByTestId("no-trigger-state")).toHaveTextContent("Stato: chiuso")
  },
}

function FooterCloseHarness() {
  const [open, setOpen] = React.useState(true)
  const [confirmed, setConfirmed] = React.useState(false)

  return (
    <>
      <p data-testid="footer-close-state">
        Stato: {open ? "aperto" : "chiuso"}
        {confirmed ? " e confermato" : ""}
      </p>
      <Dialog
        open={open}
        onOpenChange={setOpen}
        title="Conferma operazione"
        footer={
          <>
            <DialogClose variant="outline">Annulla</DialogClose>
            <Button onClick={() => setConfirmed(true)}>Conferma</Button>
          </>
        }
      />
    </>
  )
}

export const FooterCloseAction: Story = {
  render: () => <FooterCloseHarness />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const dialog = await screen.findByRole("dialog", { name: "Conferma operazione" })
    await waitFor(() => expect(dialog).toBeVisible())

    await userEvent.click(within(dialog).getByRole("button", { name: "Annulla" }))
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument())
    await expect(canvas.getByTestId("footer-close-state")).toHaveTextContent("Stato: chiuso")
  },
}

function PanelContractHarness() {
  const [open, setOpen] = React.useState(true)
  const [panel, setPanel] = React.useState<HTMLDivElement | null>(null)

  const forwarded = panel
    ? `class=${panel.classList.contains("pui:max-w-md") ? "inoltrata" : "assente"} attribute=${panel.dataset.contractSlot ?? "assente"}`
    : "nessun pannello"

  return (
    <>
      <p data-testid="panel-contract">{forwarded}</p>
      <Dialog
        ref={setPanel}
        open={open}
        onOpenChange={setOpen}
        title="Pannello con contratto inoltrato"
        className="pui:max-w-md"
        data-contract-slot="dialog"
        footer={<DialogClose variant="outline">Chiudi</DialogClose>}
      />
    </>
  )
}

export const PanelContract: Story = {
  render: () => <PanelContractHarness />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const dialog = await screen.findByRole("dialog", { name: "Pannello con contratto inoltrato" })
    await waitFor(() => expect(dialog).toBeVisible())
    await expect(canvas.getByTestId("panel-contract")).toHaveTextContent(
      "class=inoltrata attribute=dialog",
    )
  },
}
