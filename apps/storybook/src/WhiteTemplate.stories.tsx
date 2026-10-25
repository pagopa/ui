import type { Meta, StoryObj } from "@storybook/react-vite"

import { SafeArea } from "@/components/content/safe-area"
import { WhiteTemplate } from "@/components/content/white-template"
import { figmaEmbedUrl } from "@/catalog/figma/file"

const meta = {
  title: "Components/Content/WhiteTemplate",
  component: WhiteTemplate,
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
    },
  },
} satisfies Meta<typeof WhiteTemplate>

export default meta
type Story = StoryObj<typeof meta>

export const Playground: Story = {}

export const Fidelity: Story = {
  render: () => <WhiteTemplate />,
  parameters: { layout: "fullscreen" },
}
