import type { Meta, StoryObj } from "@storybook/react-vite"
import { expect, within } from "storybook/test"

import { figmaEmbedUrl } from "@/catalog/figma/file"
import { Icon } from "@/components/icons/icon"
import { Default as CreditCardIcon } from "@/components/icons/generated/credit-card"
import { Default as InfoIcon } from "@/components/icons/generated/info"
import { Chip } from "@/components/inputs/chips"
import { SectionHeader } from "@/components/navigation/section-header"
import { Button } from "@/components/primitives/button"

import sectionHeaderGuide from "./guides/section-header.md?raw"

const meta = {
  title: "Components/Navigation/SectionHeader",
  component: SectionHeader,
  args: {
    icon: <Icon source={CreditCardIcon} />,
    title: "Servizi per cittadini e imprese",
    status: (
      <Chip variant="neutral" size="compact">
        Status
      </Chip>
    ),
    actions: (
      <Button variant="ghost" size="icon" aria-label="Informazioni sulla sezione">
        <Icon source={InfoIcon} />
      </Button>
    ),
  },
  argTypes: {
    titleAs: { control: "select", options: ["h2", "h3", "h4", "h5", "h6"] },
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

export const Playground: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    // The page owns its single h1: a section title is a level-2 heading unless
    // the caller asks for another tag.
    const title = canvas.getByRole("heading", { name: "Servizi per cittadini e imprese" })
    await expect(title.tagName).toBe("H2")
  },
}

export const WithAction: Story = {
  args: {
    actions: <Button variant="ghost">Modifica</Button>,
  },
}

export const Levels: Story = {
  // Reflow exemption: fixture pinned at the source width, not a product surface.
  parameters: { a11yContract: { reflow: false } },
  render: () => (
    <div className="pui:grid pui:w-[min(42rem,calc(100vw-2rem))] pui:gap-8">
      <SectionHeader
        level={1}
        icon={<Icon source={CreditCardIcon} />}
        title="Servizi per cittadini e imprese"
        status={
          <Chip variant="neutral" size="compact">
            Status
          </Chip>
        }
      />
      <SectionHeader
        level={2}
        titleAs="h3"
        icon={<Icon source={CreditCardIcon} />}
        title="Documenti e pagamenti"
      />
      <SectionHeader
        level={3}
        titleAs="h4"
        icon={<Icon source={CreditCardIcon} />}
        title="Ultimo aggiornamento"
      />
    </div>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    // The tag follows `titleAs`, not `level`: the visual size and the outline
    // are two separate choices.
    const heading = (name: string) => canvas.getByRole("heading", { name }).tagName
    await expect(heading("Servizi per cittadini e imprese")).toBe("H2")
    await expect(heading("Documenti e pagamenti")).toBe("H3")
    await expect(heading("Ultimo aggiornamento")).toBe("H4")
  },
}
