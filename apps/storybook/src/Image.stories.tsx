import type { Meta, StoryObj } from "@storybook/react-vite"
import { expect } from "storybook/test"

import { Image } from "@/components/content"
import { figmaEmbedUrl } from "@/catalog/figma/file"

import imageGuide from "./guides/image.md?raw"

const placeholder =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='640' height='360'%3E%3Crect width='640' height='360' fill='%23ced8f9'/%3E%3C/svg%3E"

const meta = {
  title: "Components/Content/Image",
  component: Image,
  args: {
    alt: "Anteprima illustrativa del servizio",
    src: placeholder,
  },
  argTypes: {
    ratio: {
      control: "select",
      options: ["square", "photo", "portrait", "video", "cinema", "wide"],
    },
    fallbackLabel: { control: "text" },
    src: { control: "text" },
    alt: { control: "text" },
  },
  parameters: {
    design: { type: "figma", url: figmaEmbedUrl("8818:39878") },
    docs: {
      description: {
        component: `Content image with a fixed ratio: without \`src\` or after a loading error it shows the labelled fallback, never an empty box.

${imageGuide}`,
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
      <Image ratio="square" alt="Quadrata" src={placeholder} />
      <Image ratio="video" alt="Video" src={placeholder} />
      <Image ratio="wide" alt="Panoramica" src={placeholder} />
    </div>
  ),
}

export const Fallback: Story = {
  args: { src: undefined, fallbackLabel: "Immagine non disponibile" },
}

// The source set draws one ratio keeper per Aspect ratio value, painted with
// the Han Purple 100 surface and no content: the fallback is that surface plus
// the component's own icon and label.
function SourceRatio({ ratio }: { ratio: NonNullable<Story["args"]>["ratio"] }) {
  return <Image ratio={ratio} src={undefined} alt="Immagine del servizio" />
}

export const SourceSquare: Story = {
  parameters: { layout: "fullscreen" },
  render: () => <SourceRatio ratio="square" />,
}

export const SourcePhoto: Story = {
  parameters: { layout: "fullscreen" },
  render: () => <SourceRatio ratio="photo" />,
  play: async ({ canvasElement }) => {
    const box = canvasElement.querySelector('[data-slot="image"]')
    if (!(box instanceof HTMLElement)) throw new Error("The source ratio box must render")
    const { width, height } = box.getBoundingClientRect()
    await expect(height / width).toBeCloseTo(3 / 4, 1)
  },
}

export const SourceVideo: Story = {
  parameters: { layout: "fullscreen" },
  render: () => <SourceRatio ratio="video" />,
}

export const SourceCinema: Story = {
  parameters: { layout: "fullscreen" },
  render: () => <SourceRatio ratio="cinema" />,
}

export const SourcePortrait: Story = {
  parameters: { layout: "fullscreen" },
  render: () => <SourceRatio ratio="portrait" />,
}
