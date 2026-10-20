import type { Meta, StoryObj } from "@storybook/react-vite"

import { EmptyState } from "@/components/feedback"
import { PagoPAPictogram } from "@/components/icons/PagoPAPictogram"
import { Button } from "@/components/primitives/button"
import { figmaEmbedUrl } from "@/catalog/figma/file"

// Source anatomy (`11149:7765`, 832×184): a 56px `Error` pictogram, a centred
// title/subtitle pair and a 48×22 semibold text action. The 44px pointer target
// comes from the invisible ::after expansion, so the action keeps its 22px
// source line instead of inflating the card by 26px.
const sourceIcon = <PagoPAPictogram name="Error" size={56} />

function SourceAction({ children }: { children: React.ReactNode }) {
  return (
    <Button
      type="button"
      variant="link"
      className="relative min-h-0 px-0 after:absolute after:inset-x-0 after:-inset-y-3"
    >
      {children}
    </Button>
  )
}

const meta = {
  title: "Components/Feedback/EmptyState",
  component: EmptyState,
  args: {
    title: "Nessun pagamento",
    description: "Quando effettuerai un pagamento, lo troverai qui.",
  },
  argTypes: {
    titleAs: { control: "select", options: ["h2", "h3", "h4"] },
    actions: { control: false },
    icon: { control: false },
  },
  parameters: {
    design: { type: "figma", url: figmaEmbedUrl("11149:7765") },
    docs: {
      description: {
        component:
          "Empty state of a section: it explains why there is no content and proposes the next step. The title is a real heading.",
      },
    },
  },
} satisfies Meta<typeof EmptyState>

export default meta
type Story = StoryObj<typeof meta>

export const Playground: Story = {
  // The fixture carries the source frame (832px = `w-208`) and the source state:
  // pictogram + action, not a bare title/subtitle pair at the viewport width.
  args: { icon: sourceIcon, actions: <SourceAction>Inizia ora</SourceAction> },
  render: (args) => <EmptyState {...args} className="w-208 max-w-full" />,
}

export const WithAction: Story = {
  args: { actions: <SourceAction>Inizia ora</SourceAction> },
}
