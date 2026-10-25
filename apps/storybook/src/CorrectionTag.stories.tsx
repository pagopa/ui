import type { Meta, StoryObj } from "@storybook/react-vite"

import { figmaEmbedUrl } from "@/catalog/figma/file"
import { CorrectionTag } from "@/components/content"

import correctionsGuide from "./guides/corrections.md?raw"

const meta = {
  title: "Components/Content/CorrectionTag",
  component: CorrectionTag,
  args: { status: "valid", label: "EVENTO RETTIFICATO" },
  argTypes: {
    status: { control: "inline-radio", options: ["valid", "not-valid"] },
    label: { control: "text" },
  },
  parameters: {
    design: { type: "figma", url: figmaEmbedUrl("9676:5453") },
    docs: {
      description: {
        component: `Correction outcome as a status tag: \`status="valid"\` is the success tag, \`status="not-valid"\` the warning one.

${correctionsGuide}`,
      },
      subtitle: "Figma: Correction/Valid · Correction/NotValid",
    },
  },
} satisfies Meta<typeof CorrectionTag>

export default meta
type Story = StoryObj<typeof meta>

export const Valid: Story = {}

export const NotValid: Story = {
  args: { status: "not-valid", label: "EVENTO NON VALIDO" },
  parameters: { design: { type: "figma", url: figmaEmbedUrl("9676:5455") } },
}

// The source `Correction/Valid` is a 164x30 component that wraps the shared
// `Tag` instance; the capture frames the tag at the source width plus the 2px
// the CSS border adds inside the box.
export const ValidSource: Story = {
  parameters: { layout: "fullscreen", a11yContract: { reflow: false } },
  render: () => (
    <div data-fidelity-variant="default" className="w-[166px]">
      <CorrectionTag status="valid" />
    </div>
  ),
}

// The source `Correction/NotValid` is a 160x30 component that wraps the shared
// `Tag` instance; the capture frames the tag at the source width plus the 2px
// the CSS border adds inside the box.
export const NotValidSource: Story = {
  parameters: {
    layout: "fullscreen",
    a11yContract: { reflow: false },
    design: { type: "figma", url: figmaEmbedUrl("9676:5455") },
  },
  render: () => (
    <div data-fidelity-variant="default" className="w-[162px]">
      <CorrectionTag status="not-valid" />
    </div>
  ),
}
