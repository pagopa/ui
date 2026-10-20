import type { Meta, StoryObj } from "@storybook/react-vite"

import { Separator } from "@/components/primitives/separator"
import { figmaEmbedUrl } from "@/catalog/figma/file"

const meta = {
  title: "Components/Separator",
  component: Separator,
  parameters: {
    design: { type: "figma", url: figmaEmbedUrl("61:2786") },
    docs: {
      description: {
        component:
          "Semantic separator between content blocks, with an optional centred label; it is decorative for assistive technology and does not replace the visual hierarchy.",
      },
    },
  },
} satisfies Meta<typeof Separator>

export default meta
type Story = StoryObj<typeof meta>

export const Playground: Story = {
  render: () => (
    <div className="w-[min(28rem,calc(100vw-2rem))]">
      <p className="font-semibold">Sezione precedente</p>
      <Separator className="my-6" />
      <p className="font-semibold">Sezione successiva</p>
    </div>
  ),
}

export const Padded: Story = {
  render: () => (
    <div className="w-[min(28rem,calc(100vw-2rem))]">
      <p className="font-semibold">Prima riga</p>
      <Separator padding={24} />
      <p className="font-semibold">Dopo 24px</p>
      <Separator padding={32} />
      <p className="font-semibold">Dopo 32px</p>
    </div>
  ),
}

export const WithText: Story = {
  render: () => (
    <div className="w-[min(28rem,calc(100vw-2rem))]">
      <p className="font-semibold">Accedi con SPID</p>
      <Separator label="oppure" className="my-4" />
      <p className="font-semibold">Accedi con CIE</p>
    </div>
  ),
}

export const Fidelity: Story = {
  args: { padding: 0 },
  parameters: { layout: "fullscreen" },
  render: (args) => (
    <div id="separator-fidelity" className="w-[320px]">
      <Separator {...args} />
    </div>
  ),
}
