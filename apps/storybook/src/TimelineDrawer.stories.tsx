import type { Meta, StoryObj } from "@storybook/react-vite"
import * as React from "react"
import { expect, screen, userEvent, waitFor, within } from "storybook/test"

import { TimelineDrawer } from "@/components/overlays"
import { Button } from "@/components/primitives/button"

const meta = {
  title: "Components/Overlays/TimelineDrawer",
  component: TimelineDrawer,
  args: {
    trigger: <Button variant="outline">Apri cronologia</Button>,
    items: [
      { id: 1, title: "Creazione", dot: "outlined" },
      { id: 2, title: "Revisione", dot: "filled" },
    ],
  },
  argTypes: { trigger: { control: false }, items: { control: false }, title: { control: "text" } },
  parameters: {
    docs: {
      description: {
        component:
          "Side panel with the event timeline: it composes Drawer and Timeline, keeps a real title and invents no states.",
      },
    },
  },
} satisfies Meta<typeof TimelineDrawer>

export default meta
type Story = StoryObj<typeof meta>

export const Playground: Story = {}

const items = [
  { id: 1, title: "Creazione", dot: "outlined" as const },
  { id: 2, title: "Revisione", dot: "filled" as const },
]

function ControlledHarness() {
  const [open, setOpen] = React.useState(false)

  return (
    <>
      <TimelineDrawer
        trigger={<Button variant="outline">Apri cronologia controllata</Button>}
        items={items}
        open={open}
        onOpenChange={setOpen}
      />
      <p data-testid="controlled-state">Stato: {open ? "aperto" : "chiuso"}</p>
    </>
  )
}

export const Controlled: Story = {
  render: () => <ControlledHarness />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const trigger = canvas.getByRole("button", { name: "Apri cronologia controllata" })
    await expect(canvas.getByTestId("controlled-state")).toHaveTextContent("Stato: chiuso")

    await userEvent.click(trigger)
    const drawer = await screen.findByRole("dialog", { name: "Cronologia" })
    await waitFor(() => expect(drawer).toBeVisible())
    await expect(canvas.getByTestId("controlled-state")).toHaveTextContent("Stato: aperto")
    await expect(within(drawer).getByText("Revisione")).toBeVisible()

    await userEvent.keyboard("{Escape}")
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument())
    await expect(canvas.getByTestId("controlled-state")).toHaveTextContent("Stato: chiuso")
    await expect(trigger).toHaveFocus()
  },
}

export const UncontrolledDefaultOpen: Story = {
  args: {
    trigger: <Button variant="outline">Cronologia già aperta</Button>,
    defaultOpen: true,
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const drawer = await screen.findByRole("dialog", { name: "Cronologia" })
    await waitFor(() => expect(drawer).toBeVisible())
    await expect(within(drawer).getByText("Creazione")).toBeVisible()

    await userEvent.keyboard("{Escape}")
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument())

    await userEvent.click(canvas.getByRole("button", { name: "Cronologia già aperta" }))
    await waitFor(() => expect(screen.getByRole("dialog", { name: "Cronologia" })).toBeVisible())
    await userEvent.keyboard("{Escape}")
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument())
  },
}

function NoTriggerHarness() {
  const [open, setOpen] = React.useState(false)
  const opener = React.useRef<HTMLButtonElement>(null)

  return (
    <>
      <Button ref={opener} onClick={() => setOpen(true)}>
        Mostra la cronologia dal controllo
      </Button>
      <p data-testid="no-trigger-state">Stato: {open ? "aperto" : "chiuso"}</p>
      <TimelineDrawer items={items} open={open} onOpenChange={setOpen} />
    </>
  )
}

export const WithoutTrigger: Story = {
  render: () => <NoTriggerHarness />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await expect(screen.queryByRole("dialog")).not.toBeInTheDocument()

    await userEvent.click(
      canvas.getByRole("button", { name: "Mostra la cronologia dal controllo" }),
    )
    const drawer = await screen.findByRole("dialog", { name: "Cronologia" })
    await waitFor(() => expect(drawer).toBeVisible())
    await expect(canvas.getByTestId("no-trigger-state")).toHaveTextContent("Stato: aperto")

    await userEvent.keyboard("{Escape}")
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument())
    await expect(canvas.getByTestId("no-trigger-state")).toHaveTextContent("Stato: chiuso")
  },
}

function PanelContractHarness() {
  const [open, setOpen] = React.useState(false)
  const [panel, setPanel] = React.useState<HTMLDivElement | null>(null)

  return (
    <>
      <Button onClick={() => setOpen(true)}>Controlla il pannello</Button>
      <p data-testid="panel-contract">
        {panel
          ? `class=${panel.classList.contains("pui:max-w-lg") ? "inoltrata" : "assente"} attribute=${panel.dataset.contractSlot ?? "assente"}`
          : "nessun pannello"}
      </p>
      <TimelineDrawer
        ref={setPanel}
        items={items}
        open={open}
        onOpenChange={setOpen}
        title="Cronologia della pratica"
        className="pui:max-w-lg"
        data-contract-slot="timeline-drawer"
      />
    </>
  )
}

export const PanelContract: Story = {
  render: () => <PanelContractHarness />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const opener = canvas.getByRole("button", { name: "Controlla il pannello" })
    await userEvent.click(opener)

    const drawer = await screen.findByRole("dialog", { name: "Cronologia della pratica" })
    await waitFor(() => expect(drawer).toBeVisible())
    await expect(canvas.getByTestId("panel-contract")).toHaveTextContent(
      "class=inoltrata attribute=timeline-drawer",
    )

    await userEvent.keyboard("{Escape}")
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument())
    await expect(opener).toHaveFocus()
  },
}
