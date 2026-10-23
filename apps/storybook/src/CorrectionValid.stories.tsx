import type { Meta, StoryObj } from "@storybook/react-vite"

import { figmaEmbedUrl } from "@/catalog/figma/file"
import { CorrectionValid } from "@/components/content"

import correctionValidGuide from "./guides/corrections.md?raw"

const meta = {
  title: "Components/Content/CorrectionValid",
  component: CorrectionValid,
  args: { label: "EVENTO RETTIFICATO" },
  argTypes: { label: { control: "text" } },
  parameters: {
    design: { type: "figma", url: figmaEmbedUrl("9676:5453") },
    docs: {
      description: {
        component: `Positive correction outcome as a success status tag.

${correctionValidGuide}`,
      },
    },
  },
} satisfies Meta<typeof CorrectionValid>

export default meta
type Story = StoryObj<typeof meta>

export const Playground: Story = {}

// The source `Correction/Valid` is a 164x30 component that wraps the shared
// `Tag` instance; the capture frames the tag at the source width.
export const Source: Story = {
  parameters: { layout: "fullscreen", a11yContract: { reflow: false } },
  render: () => (
    <div data-fidelity-variant="default" className="w-[166px]">
      <CorrectionValid />
    </div>
  ),
}
