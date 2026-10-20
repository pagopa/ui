import type { Meta, StoryObj } from "@storybook/react-vite"
import { expect, fn, screen, userEvent, waitFor, within } from "storybook/test"

import { XCircle } from "lucide-react"

import { MenuDropDown } from "@/components/inputs"

const notifyMenuItem = fn()
const documentsMenuItem = fn()
const deleteMenuItem = fn()

const meta = {
  title: "Components/Inputs/MenuDropDown",
  component: MenuDropDown,
  args: {
    accessibleLabel: "Altre opzioni",
    // Source 3262:40787: text rows carry the 16/22 blue label and the full-bleed
    // 1px dividers, and the panel closes with the destructive row that leads with
    // its 24px `cancel` artwork.
    items: [
      { id: "notify", label: "Notifiche", onSelect: notifyMenuItem },
      { id: "documents", label: "Documenti", onSelect: documentsMenuItem },
      {
        id: "delete",
        label: "Elimina",
        icon: XCircle,
        destructive: true,
        onSelect: deleteMenuItem,
      },
    ],
  },
  argTypes: {
    items: { control: false },
    accessibleLabel: { control: "text" },
  },
  parameters: {
    docs: {
      description: {
        component:
          "Icon menu for secondary actions: the control has a dedicated accessible name and does not depend on the visible text.",
      },
    },
  },
} satisfies Meta<typeof MenuDropDown>

export default meta
type Story = StoryObj<typeof meta>

export const Playground: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const trigger = canvas.getByRole("button", { name: "Altre opzioni" })
    await userEvent.click(trigger)
    const menu = await screen.findByRole("menu")
    await userEvent.click(within(menu).getByRole("menuitem", { name: /Notifiche/ }))
    await expect(notifyMenuItem).toHaveBeenCalled()
    await expect(deleteMenuItem).not.toHaveBeenCalled()
    await waitFor(() =>
      expect(document.querySelector("[data-aria-hidden]")).not.toBeInTheDocument(),
    )
    // The source MenuDropDown (3262:40787) is the open panel: leave the preview
    // in that state so the primary story shows the menu, not just the trigger.
    await userEvent.click(trigger)
    await screen.findByRole("menu")
  },
}
