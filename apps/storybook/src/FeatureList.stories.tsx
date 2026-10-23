import type { Meta, StoryObj } from "@storybook/react-vite"

import { figmaEmbedUrl } from "@/catalog/figma/file"
import { FeatureList } from "@/components/content"
import { PagoPAIcon } from "@/components/icons/PagoPAIcon"
import { PagoPAPictogram } from "@/components/icons/PagoPAPictogram"

import featureListGuide from "./guides/feature-list.md?raw"

const meta = {
  title: "Components/Content/FeatureList",
  component: FeatureList,
  args: {
    features: [
      {
        title: "Pagamenti sicuri",
        description: "Paga online verso la Pubblica Amministrazione.",
        icon: <PagoPAIcon name="check" />,
      },
      {
        title: "Servizi accessibili",
        description: "Esperienze progettate per tutte le persone.",
        icon: <PagoPAIcon name="check" />,
      },
    ],
  },
  argTypes: {
    titleAs: { control: "select", options: ["h2", "h3"] },
    numbered: { control: "boolean" },
    features: { control: false },
  },
  parameters: {
    design: { type: "figma", url: figmaEmbedUrl("920:4502") },
    docs: {
      description: {
        component: `Feature list: every item has a title and description, a decorative indicator (icon, pictogram or numbering), and an optional link.

${featureListGuide}`,
      },
    },
  },
} satisfies Meta<typeof FeatureList>

export default meta
type Story = StoryObj<typeof meta>

export const Playground: Story = { parameters: { a11yContract: { reflow: false } } }

export const Indicators: Story = {
  render: () => (
    <div className="grid w-[min(42rem,calc(100vw-2rem))] gap-8">
      <FeatureList
        features={[
          {
            title: "Pubblica i tuoi servizi",
            description: "Carica i servizi e rendili disponibili ai cittadini.",
            pictogram: <PagoPAPictogram name="Idea" size={40} />,
            action: { label: "Scopri di più", href: "#scopri" },
          },
          {
            title: "Monitora le richieste",
            description: "Segui lo stato delle pratiche in tempo reale.",
            icon: <PagoPAIcon name="check" />,
          },
        ]}
      />
      <FeatureList
        numbered
        features={[
          { title: "Accedi all'area riservata", description: "Con SPID o CIE." },
          { title: "Scegli il servizio", description: "Tra quelli disponibili per il tuo ente." },
        ]}
      />
    </div>
  ),
}

// The set draws one 270x135 row per Indicator variant, with the mock copy. Each
// capture maps that single row at the source width.
const sourceTitle = "Title"
const sourceDescription =
  "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor ut labore et dolore magna aliqua."

export const SourcePictogram: Story = {
  // Reflow exemption: fixture pinned at the source row width, not a product surface.
  parameters: { a11yContract: { reflow: false } },
  render: () => (
    <div data-fidelity-variant="pictogram" style={{ width: 270 }}>
      <FeatureList
        features={[
          {
            title: sourceTitle,
            description: sourceDescription,
            pictogram: <PagoPAPictogram name="Flag" size={40} />,
            action: { label: "Scopri di più", href: "#scopri" },
          },
        ]}
      />
    </div>
  ),
}

export const SourceIcon: Story = {
  // Reflow exemption: fixture pinned at the source row width, not a product surface.
  parameters: { a11yContract: { reflow: false } },
  render: () => (
    <div data-fidelity-variant="icon" style={{ width: 270 }}>
      <FeatureList
        features={[
          {
            title: sourceTitle,
            description: sourceDescription,
            icon: <PagoPAIcon name="photo" />,
            action: { label: "Scopri di più", href: "#scopri" },
          },
        ]}
      />
    </div>
  ),
}

export const SourceNumbered: Story = {
  // Reflow exemption: fixture pinned at the source row width, not a product surface.
  parameters: { a11yContract: { reflow: false } },
  render: () => (
    <div data-fidelity-variant="numbered" style={{ width: 270 }}>
      <FeatureList
        numbered
        features={[
          {
            title: sourceTitle,
            description: sourceDescription,
            action: { label: "Scopri di più", href: "#scopri" },
          },
        ]}
      />
    </div>
  ),
}
