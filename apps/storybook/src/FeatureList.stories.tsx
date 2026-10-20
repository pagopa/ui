import type { Meta, StoryObj } from "@storybook/react-vite"

import { FeatureList } from "@/components/content"
import { PagoPAIcon } from "@/components/icons/PagoPAIcon"
import { PagoPAPictogram } from "@/components/icons/PagoPAPictogram"

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
    docs: {
      description: {
        component:
          "Feature list: every item has a title and description, a decorative indicator (icon, pictogram or numbering), and an optional link.",
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
