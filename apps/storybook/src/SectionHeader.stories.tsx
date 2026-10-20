import type { Meta, StoryObj } from "@storybook/react-vite"

import { figmaEmbedUrl } from "@/catalog/figma/file"
import { PagoPAIcon } from "@/components/icons/PagoPAIcon"
import { Chip } from "@/components/inputs/chips"
import { SectionHeader } from "@/components/navigation"
import { Button } from "@/components/primitives/button"

import sectionHeaderGuide from "./guides/section-header.md?raw"

const meta = {
  title: "Components/Navigation/SectionHeader",
  component: SectionHeader,
  args: {
    icon: <PagoPAIcon name="credit_card" />,
    title: "Servizi per cittadini e imprese",
    status: (
      <Chip variant="neutral" size="compact">
        Status
      </Chip>
    ),
    actions: (
      <Button variant="ghost" size="icon" aria-label="Informazioni sulla sezione">
        <PagoPAIcon name="info" />
      </Button>
    ),
  },
  argTypes: {
    titleAs: { control: "select", options: ["h1", "h2", "h3"] },
    level: { control: "select", options: [1, 2, 3] },
    icon: { control: false },
    status: { control: false },
    actions: { control: false },
  },
  parameters: {
    design: { type: "figma", url: figmaEmbedUrl("1566:29849") },
    docs: {
      description: {
        component: `Section header with a decorative icon, title, state and trailing action.\n\n${sectionHeaderGuide}`,
      },
    },
  },
} satisfies Meta<typeof SectionHeader>

export default meta
type Story = StoryObj<typeof meta>

export const Playground: Story = {}

export const WithAction: Story = {
  args: {
    actions: <Button variant="ghost">Modifica</Button>,
  },
}

export const Levels: Story = {
  // Reflow exemption: fixture pinned at the source width, not a product surface.
  parameters: { a11yContract: { reflow: false } },
  render: () => (
    <div className="grid w-[min(42rem,calc(100vw-2rem))] gap-8">
      <SectionHeader
        level={1}
        icon={<PagoPAIcon name="credit_card" />}
        title="Servizi per cittadini e imprese"
        status={
          <Chip variant="neutral" size="compact">
            Status
          </Chip>
        }
      />
      <SectionHeader
        level={2}
        icon={<PagoPAIcon name="credit_card" />}
        title="Documenti e pagamenti"
      />
      <SectionHeader
        level={3}
        icon={<PagoPAIcon name="credit_card" />}
        title="Ultimo aggiornamento"
      />
    </div>
  ),
}
