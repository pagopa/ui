import type { Meta, StoryObj } from "@storybook/react-vite"

import { Image } from "@/components/content"

const meta = {
  title: "Components/Content/Image",
  component: Image,
  args: {
    alt: "Anteprima illustrativa del servizio",
    src: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='640' height='360'%3E%3Crect width='640' height='360' fill='%23ced8f9'/%3E%3C/svg%3E",
  },
  argTypes: {
    ratio: { control: "select", options: ["square", "video", "wide"] },
    fallbackLabel: { control: "text" },
    src: { control: "text" },
    alt: { control: "text" },
  },
  parameters: {
    docs: {
      description: {
        component:
          "Content image with a fixed ratio: without `src` or after a loading error it shows the labelled fallback, never an empty box.",
      },
    },
  },
} satisfies Meta<typeof Image>

export default meta
type Story = StoryObj<typeof meta>

export const Playground: Story = {}

export const Ratios: Story = {
  render: () => (
    <div className="grid w-[min(36rem,calc(100vw-2rem))] gap-4">
      <Image ratio="square" alt="Quadrata" src={meta.args?.src} />
      <Image ratio="video" alt="Video" src={meta.args?.src} />
      <Image ratio="wide" alt="Panoramica" src={meta.args?.src} />
    </div>
  ),
}

export const Fallback: Story = {
  args: { src: undefined, fallbackLabel: "Immagine non disponibile" },
}
