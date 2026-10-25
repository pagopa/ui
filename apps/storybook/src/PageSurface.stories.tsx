import type { Meta, StoryObj } from "@storybook/react-vite"

import { SafeArea } from "@/components/content/safe-area"
import { PageSurface } from "@/components/content/page-surface"
import { figmaEmbedUrl } from "@/catalog/figma/file"

const meta = {
  title: "Components/Content/PageSurface",
  component: PageSurface,
  args: {
    children: (
      <SafeArea>
        <p>Contenuto centrato nella SafeArea, sopra una superficie bianca.</p>
      </SafeArea>
    ),
  },
  parameters: {
    design: { type: "figma", url: figmaEmbedUrl("50:1700") },
    docs: {
      description: {
        component:
          "White template surface with content-driven growth; `SafeArea` handles the maximum width and the responsive gutters.",
      },
      subtitle: "Figma: White Template",
    },
  },
} satisfies Meta<typeof PageSurface>

export default meta
type Story = StoryObj<typeof meta>

export const Playground: Story = {}

export const Fidelity: Story = {
  render: () => <PageSurface />,
  parameters: { layout: "fullscreen" },
}
