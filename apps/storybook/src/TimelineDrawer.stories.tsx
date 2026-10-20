import type { Meta, StoryObj } from "@storybook/react-vite"

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
