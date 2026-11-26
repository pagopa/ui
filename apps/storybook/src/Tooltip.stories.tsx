import type { Meta, StoryObj } from "@storybook/react-vite"
import * as React from "react"
import { expect, screen, userEvent, waitFor, within } from "storybook/test"

import { Tooltip } from "@/components/overlays/tooltip"
import { Button } from "@/components/primitives/button"
import { figmaEmbedUrl } from "@/catalog/figma/file"

import tooltipGuide from "./guides/tooltips.md?raw"

const meta = {
  title: "Components/Overlays/Tooltip",
  component: Tooltip,
  args: {
    trigger: <Button variant="outline">Passa il mouse</Button>,
    children: "Dettagli utili",
    side: "bottom",
    showClose: true,
  },
  argTypes: {
    trigger: { control: false },
    side: { control: "select", options: ["top", "right", "bottom", "left"] },
    showClose: { control: "boolean" },
  },
  parameters: {
    design: { type: "figma", url: figmaEmbedUrl("230:1317") },
    docs: {
      description: {
        component: `Non-essential hint: it opens on hover and focus and closes with Escape. \`side\` indicates the trigger side where the content appears: the source \`Arrow Direction=Top\` maps to \`side="bottom"\`, while \`Arrow Direction=Bottom\` maps to \`side="top"\`. \`showClose\` keeps the source mark visible; it stays decorative because the tooltip contains no actions and the source declares no interaction.

${tooltipGuide}`,
      },
    },
  },
} satisfies Meta<typeof Tooltip>

export default meta
type Story = StoryObj<typeof meta>

export const Playground: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const trigger = canvas.getByRole("button", { name: "Passa il mouse" })

    await userEvent.tab()
    await expect(trigger).toHaveFocus()

    const tooltip = await screen.findByRole("tooltip")
    await waitFor(() => expect(tooltip).toBeVisible())
    await expect(tooltip).toHaveTextContent("Dettagli utili")

    await userEvent.keyboard("{Escape}")
    await waitFor(() => expect(screen.queryByRole("tooltip")).not.toBeInTheDocument())
    await expect(trigger).toHaveFocus()
  },
}

export const Sides: Story = {
  render: () => (
    <div className="pui:flex pui:flex-wrap pui:gap-6 pui:p-12">
      {(["top", "right", "bottom", "left"] as const).map((side) => (
        <Tooltip key={side} side={side} trigger={<Button variant="outline">{side}</Button>}>
          Suggerimento su {side}
        </Tooltip>
      ))}
    </div>
  ),
}

const sourceDescription = "Descrizione di approfondimento su più righe più righe più righe"

function SourceTooltip({ side }: { side: "top" | "bottom" }) {
  return (
    <div className="pui:grid pui:min-h-60 pui:place-items-center pui:p-6">
      <Tooltip
        side={side}
        trigger={
          <Button data-testid="tooltip-source-trigger" variant="outline">
            Apri suggerimento
          </Button>
        }
      >
        {sourceDescription}
      </Tooltip>
    </div>
  )
}

export const SourceArrowTop: Story = {
  name: "Source: Arrow Direction=Top",
  render: () => <SourceTooltip side="bottom" />,
}

export const SourceArrowBottom: Story = {
  name: "Source: Arrow Direction=Bottom",
  render: () => <SourceTooltip side="top" />,
}

// A controlled tooltip: the caller owns the state, so hover, focus and Escape
// land on the same handler.
function ControlledHarness() {
  const [open, setOpen] = React.useState(false)

  return (
    <>
      <Tooltip
        trigger={<Button variant="outline">Passa il mouse</Button>}
        open={open}
        onOpenChange={setOpen}
      >
        Dettagli utili
      </Tooltip>
      <p data-testid="controlled-state">Stato: {open ? "aperto" : "chiuso"}</p>
    </>
  )
}

export const Controlled: Story = {
  render: () => <ControlledHarness />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const trigger = canvas.getByRole("button", { name: "Passa il mouse" })
    await expect(canvas.getByTestId("controlled-state")).toHaveTextContent("Stato: chiuso")

    await userEvent.tab()
    await expect(trigger).toHaveFocus()
    const tooltip = await screen.findByRole("tooltip")
    await waitFor(() => expect(tooltip).toBeVisible())
    await expect(canvas.getByTestId("controlled-state")).toHaveTextContent("Stato: aperto")

    await userEvent.keyboard("{Escape}")
    await waitFor(() => expect(screen.queryByRole("tooltip")).not.toBeInTheDocument())
    await expect(canvas.getByTestId("controlled-state")).toHaveTextContent("Stato: chiuso")
    await expect(trigger).toHaveFocus()
  },
}

export const UncontrolledDefaultOpen: Story = {
  args: {
    trigger: <Button variant="outline">Suggerimento già aperto</Button>,
    defaultOpen: true,
    children: "Dettagli sempre visibili",
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const trigger = canvas.getByRole("button", { name: "Suggerimento già aperto" })

    const tooltip = await screen.findByRole("tooltip")
    await waitFor(() => expect(tooltip).toBeVisible())
    await expect(tooltip).toHaveTextContent("Dettagli sempre visibili")

    await userEvent.keyboard("{Escape}")
    await waitFor(() => expect(screen.queryByRole("tooltip")).not.toBeInTheDocument())

    await userEvent.hover(trigger)
    await waitFor(() =>
      expect(screen.getByRole("tooltip")).toHaveTextContent("Dettagli sempre visibili"),
    )

    await userEvent.keyboard("{Escape}")
    await waitFor(() => expect(screen.queryByRole("tooltip")).not.toBeInTheDocument())
  },
}

function NoTriggerHarness() {
  const [open, setOpen] = React.useState(false)
  const anchor = React.useRef<HTMLButtonElement>(null)

  return (
    <>
      <Button ref={anchor} onClick={() => setOpen(true)}>
        Mostra il suggerimento dal controllo
      </Button>
      <p data-testid="no-trigger-state">Stato: {open ? "aperto" : "chiuso"}</p>
      <Tooltip anchor={anchor} open={open} onOpenChange={setOpen}>
        Suggerimento senza elemento di apertura
      </Tooltip>
    </>
  )
}

export const WithoutTrigger: Story = {
  render: () => <NoTriggerHarness />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await expect(screen.queryByRole("tooltip")).not.toBeInTheDocument()

    await userEvent.click(
      canvas.getByRole("button", { name: "Mostra il suggerimento dal controllo" }),
    )
    const tooltip = await screen.findByRole("tooltip")
    await waitFor(() => expect(tooltip).toBeVisible())
    await expect(canvas.getByTestId("no-trigger-state")).toHaveTextContent("Stato: aperto")

    await userEvent.keyboard("{Escape}")
    await waitFor(() => expect(screen.queryByRole("tooltip")).not.toBeInTheDocument())
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
      <Button ref={anchor} onClick={() => setOpen(true)}>
        Controlla il suggerimento
      </Button>
      <p data-testid="panel-contract">{forwarded}</p>
      <Tooltip
        ref={setPanel}
        anchor={anchor}
        open={open}
        onOpenChange={setOpen}
        className="pui:max-w-md"
        data-contract-slot="tooltip"
      >
        Suggerimento misurato dal consumatore
      </Tooltip>
    </>
  )
}

export const PanelContract: Story = {
  render: () => <PanelContractHarness />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const opener = canvas.getByRole("button", { name: "Controlla il suggerimento" })
    await userEvent.click(opener)

    const tooltip = await screen.findByRole("tooltip")
    await waitFor(() => expect(tooltip).toBeVisible())
    await expect(canvas.getByTestId("panel-contract")).toHaveTextContent(
      "class=inoltrata attribute=tooltip",
    )
    await expect(opener).toHaveFocus()

    await userEvent.keyboard("{Escape}")
    await waitFor(() => expect(screen.queryByRole("tooltip")).not.toBeInTheDocument())
    await expect(opener).toHaveFocus()
  },
}
