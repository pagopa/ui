import * as React from "react"
import type { Meta, StoryObj } from "@storybook/react-vite"

import { CameraViewElement } from "@/components/overlays"
import { figmaEmbedUrl } from "@/catalog/figma/file"

import cameraViewElementGuide from "./guides/camera-view-element.md?raw"

const meta = {
  title: "Components/Overlays/CameraViewElement",
  component: CameraViewElement,
  args: { label: "Inquadra il codice", active: true },
  argTypes: { active: { control: "boolean" }, children: { control: false } },
  parameters: {
    design: { type: "figma", url: figmaEmbedUrl("1134:6812") },
    docs: {
      description: {
        component: `Camera framing overlay: the crop is decorative and the active/inactive state is announced with spoken text.

${cameraViewElementGuide}`,
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

export const Fidelity: Story = {
  parameters: { layout: "fullscreen" },
  render: () => (
    <div style={{ "--camera-size": "376px" } as React.CSSProperties}>
      <CameraViewElement label="Inquadra il codice">{null}</CameraViewElement>
    </div>
  ),
}
