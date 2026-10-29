import type { Meta, StoryObj } from "@storybook/react-vite"

import { figmaEmbedUrl } from "@/catalog/figma/file"
import { SkipToMainContent } from "@/components/navigation"

const meta = {
  title: "Components/Navigation/SkipToMainContent",
  component: SkipToMainContent,
  args: { targetId: "main-content" },
  argTypes: {
    targetId: { control: "text" },
    children: { control: "text" },
  },
  parameters: {
    design: { type: "figma", url: figmaEmbedUrl("8090:46352") },
    docs: {
      description: {
        component:
          "Keyboard skip link: it stays off screen until it receives focus, then shows at the top. It points to the id of the main content.",
      },
    },
  },
} satisfies Meta<typeof SkipToMainContent>

export default meta
type Story = StoryObj<typeof meta>

// The source component (`8090:46352`): the 236x56 dark pill (radius 8, #0e0f13)
// with its 2px Blue 300 ring, its 8/16 insets and the underlined white 16/21
// Semibold link. The link is fixed, so the story owns the page surface and
// renders fullscreen.
export const SourceBand: Story = {
  tags: ["color-pinned"],
  parameters: { layout: "fullscreen" },
  render: () => (
    <div className="min-h-screen bg-background">
      <SkipToMainContent />
      <main id="main-content" tabIndex={-1} className="p-6">
        <p>Usa Tab per portare il focus sul link di salto.</p>
      </main>
    </div>
  ),
}

export const Playground: Story = {
  render: () => (
    <div className="min-h-40">
      <SkipToMainContent />
      <main id="main-content" tabIndex={-1} className="p-6">
        <p>Usa Tab per portare il focus sul link di salto.</p>
      </main>
    </div>
  ),
}
