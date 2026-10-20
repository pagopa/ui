import type { Meta, StoryObj } from "@storybook/react-vite"

import { CameraViewElement } from "@/components/overlays"

const meta = {
  title: "Components/Overlays/CameraViewElement",
  component: CameraViewElement,
  args: { label: "Inquadra il codice", active: true },
  argTypes: { active: { control: "boolean" }, children: { control: false } },
  parameters: {
    docs: {
      description: {
        component:
          "Camera framing overlay: the crop is decorative and the active/inactive state is announced with spoken text.",
      },
    },
  },
} satisfies Meta<typeof CameraViewElement>

export default meta
type Story = StoryObj<typeof meta>

export const Playground: Story = {}

export const Inactive: Story = {
  args: { active: false, label: "Fotocamera disattivata" },
}
