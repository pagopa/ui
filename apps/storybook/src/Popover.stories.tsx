import type { Meta, StoryObj } from "@storybook/react-vite"
import { expect, screen, userEvent, waitFor, within } from "storybook/test"

import { Popover } from "@/components/overlays"
import { Button } from "@/components/primitives/button"
import { Info } from "@/components/primitives/icons"
import { PopoverTitle } from "@/components/primitives/popover"
import { figmaEmbedUrl } from "@/catalog/figma/file"

const meta = {
  title: "Components/Overlays/Popover",
  component: Popover,
  args: {
    trigger: <Button variant="outline">Apri popover</Button>,
    children: (
      <>
        <PopoverTitle>Informazione contestuale</PopoverTitle>
        <p className="text-muted-foreground">Contenuto collegato al trigger.</p>
      </>
    ),
  },
  parameters: {
    docs: {
      description: {
        component:
          "Popover anchored to the trigger, with an accessible name, Escape to close and focus restore.",
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
  // Reflow exemption pending a design request: docs/design-requests/2026-10-16-a11y-reflow-conditions.md.
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
    <div className="relative min-h-screen w-full">
      <Popover
        trigger={
          <Button
            variant="ghost"
            size="icon"
            aria-label="Apri popover informativo"
            className={`absolute left-1/2 size-6 p-0 after:absolute after:-inset-2.5 ${
              arrowPosition === "top" ? "top-0" : "bottom-0"
            }`}
          >
            <Info aria-hidden="true" className="size-6" />
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
