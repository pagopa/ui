import type { Meta, StoryObj } from "@storybook/react-vite"

import { figmaEmbedUrl } from "@/catalog/figma/file"
import { CorrectionNotValid } from "@/components/content"

import correctionNotValidGuide from "./guides/corrections.md?raw"

const meta = {
  title: "Components/Content/CorrectionNotValid",
  component: CorrectionNotValid,
  args: { label: "EVENTO NON VALIDO" },
  argTypes: { label: { control: "text" } },
  parameters: {
    design: { type: "figma", url: figmaEmbedUrl("9676:5455") },
    docs: {
      description: {
        component: `Negative correction outcome as a warning status tag.

${correctionNotValidGuide}`,
      },
    },
  },
} satisfies Meta<typeof CorrectionNotValid>

export default meta
type Story = StoryObj<typeof meta>

export const Playground: Story = {}

// The source `Correction/NotValid` is a 160x30 component that wraps the shared
// `Tag` instance; the capture frames the tag at the source width.
export const Source: Story = {
  parameters: { layout: "fullscreen", a11yContract: { reflow: false } },
  render: () => (
    <div data-fidelity-variant="default" className="w-[162px]">
      <CorrectionNotValid />
    </div>
  ),
}
