import type { Meta, StoryObj } from "@storybook/react-vite"

import { figmaEmbedUrl } from "@/catalog/figma/file"
import { WaitingState } from "@/components/feedback"
import { Button } from "@/components/primitives/button"

// Source frame (`749:5867`, variants `749:5865`/`749:5866`): the contained
// "Esci" action plus a 154×22 semibold text link. The ≥44px pointer target
// comes from the invisible ::after expansion, so the link keeps the source 22px
// line: an inflated 48px box would stretch the column and drift the rhythm.
const sourceActions = (
  <>
    <Button type="button">Esci</Button>
    <a
      className="relative inline-flex min-h-0 max-w-full items-center justify-center px-0 text-center text-base leading-[1.375] font-semibold text-primary whitespace-normal [overflow-wrap:anywhere] underline-offset-4 outline-none hover:underline focus-visible:outline-2 focus-visible:outline-solid focus-visible:outline-offset-2 focus-visible:outline-ring after:absolute after:inset-x-0 after:-inset-y-3"
      href="mailto:assistenza@example.com"
    >
      Contatta l’assistenza
    </a>
  </>
)

const meta = {
  title: "Components/Feedback/WaitingState",
  component: WaitingState,
  args: {
    title: "Pagamento in elaborazione",
    description: "Riceverai una notifica non appena sarà concluso.",
  },
  argTypes: {
    titleAs: { control: "select", options: ["h2", "h3", "h4"] },
    actions: { control: false },
  },
  parameters: {
    design: { type: "figma", url: figmaEmbedUrl("749:5867") },
    docs: {
      description: {
        component:
          "Wait with no action required: it communicates that the operation is in progress and how the outcome will arrive.",
      },
    },
  },
} satisfies Meta<typeof WaitingState>

export default meta
type Story = StoryObj<typeof meta>

export const Playground: Story = { parameters: { a11yContract: { reflow: false } } }

// The source composition, at the source frame: title on the 700 face, the
// contained exit action and the text link with its expanded pointer target.
export const SourceFrame: Story = {
  args: {
    title: "L’ente sta valutando la tua domanda di adesione",
    description: "Quando pronto, riceverai l’esito all’indirizzo mail indicato.",
    titleAs: "h2",
    actions: sourceActions,
  },
  parameters: {
    // Reflow exemption: fixture pinned at the source width, not a product surface.
    a11yContract: { reflow: false },
    layout: "fullscreen",
  },
}
