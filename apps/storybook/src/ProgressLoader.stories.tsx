import type { Meta, StoryObj } from "@storybook/react-vite"

import { ProgressLoader } from "@/components/feedback/progress-loader"
import { figmaEmbedUrl } from "@/catalog/figma/file"
import progressLoaderGuide from "./guides/progress-loader.md?raw"

const meta = {
  title: "Components/Feedback/ProgressLoader",
  component: ProgressLoader,
  args: { value: 68, label: "Invio documenti", showLabel: true, showValue: true },
  argTypes: {
    value: { control: { type: "number", min: 0, max: 100 } },
    label: { control: "text" },
    showLabel: { control: "boolean" },
    showValue: { control: "boolean" },
  },
  parameters: {
    design: { type: "figma", url: figmaEmbedUrl("236:1311") },
    docs: {
      description: {
        component: progressLoaderGuide,
      },
    },
  },
} satisfies Meta<typeof ProgressLoader>

export default meta
type Story = StoryObj<typeof meta>

export const Playground: Story = {}

export const FigmaDefault: Story = {
  args: {
    value: undefined,
    label: "Avanzamento",
    showLabel: false,
    showValue: false,
  },
  parameters: {
    layout: "fullscreen",
  },
}

export const Indeterminate: Story = {
  args: { value: undefined, label: "Elaborazione" },
}

export const Matrix: Story = {
  render: () => (
    <div className="grid w-[min(28rem,calc(100vw-2rem))] gap-6">
      <ProgressLoader value={25} label="Caricamento dati" />
      <ProgressLoader value={68} label="Invio documenti" />
      <ProgressLoader value={100} label="Completato" showValue={false} />
      <ProgressLoader label="Elaborazione" />
    </div>
  ),
}
