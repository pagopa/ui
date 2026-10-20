import type { Meta, StoryObj } from "@storybook/react-vite"
import { expect, screen, userEvent, waitFor, within } from "storybook/test"

import { figmaEmbedUrl } from "@/catalog/figma/file"
import { CheckboxField } from "@/components/inputs"
import { Dialog } from "@/components/overlays"
import { Button } from "@/components/primitives/button"

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
  parameters: {
    design: { type: "figma", url: figmaEmbedUrl("1042:18133") },
    docs: {
      description: {
        component:
          "Modal dialog with a focus trap, Escape to close and focus restore to the trigger.",
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
