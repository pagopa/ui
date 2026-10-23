import type { Meta, StoryObj } from "@storybook/react-vite"

import { Separator } from "@/components/primitives/separator"
import { figmaEmbedUrl } from "@/catalog/figma/file"

import separatorGuide from "./guides/separator.md?raw"

const meta = {
  title: "Components/Separator",
  component: Separator,
  parameters: {
    design: { type: "figma", url: figmaEmbedUrl("61:2786") },
    docs: {
      description: {
        component: `Semantic separator between content blocks, with an optional centred label; it is decorative for assistive technology and does not replace the visual hierarchy.

${separatorGuide}`,
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

const fidelityVariant = (nodeId: string) => nodeId.replace(":", "-")

export const Fidelity: Story = {
  parameters: { layout: "fullscreen" },
  render: () => (
    <div id="separator-fidelity" className="grid w-[320px] gap-6">
      <div data-fidelity-variant={fidelityVariant("61:2787")}>
        <Separator />
      </div>
      <div data-fidelity-variant={fidelityVariant("61:2789")}>
        <Separator padding={16} />
      </div>
      <div data-fidelity-variant={fidelityVariant("61:2793")}>
        <Separator padding={24} />
      </div>
      <div data-fidelity-variant={fidelityVariant("61:2797")}>
        <Separator padding={32} />
      </div>
      <div data-fidelity-variant={fidelityVariant("9557:62590")}>
        <Separator label="oppure" />
      </div>
    </div>
  ),
}
