import type { Meta, StoryObj } from "@storybook/react-vite"

import { SuccessState } from "@/components/feedback/success-state"
import { Button, buttonVariants } from "@/components/primitives/button"
import { cn } from "@/lib/cn"
import { figmaEmbedUrl } from "@/catalog/figma/file"

const meta = {
  title: "Components/Feedback/SuccessState",
  component: SuccessState,
  args: {
    title: "Abbiamo ricevuto la tua richiesta!",
    description: "Ti risponderemo al più presto all’indirizzo e-mail che hai indicato.",
  },
  argTypes: {
    titleAs: { control: "select", options: ["h2", "h3", "h4"] },
    actions: { control: false },
  },
  parameters: {
    design: { type: "figma", url: figmaEmbedUrl("733:22841") },
    layout: "fullscreen",
    docs: {
      description: {
        component: "Positive outcome of an operation.",
      },
      subtitle: "Figma: OKState",
    },
  },
} satisfies Meta<typeof SuccessState>

export default meta
type Story = StoryObj<typeof meta>

// Source actions (`733:22842`): the contained 79×48 "Esci" plus a 154×22 semibold
// text link. The 44px target comes from the invisible ::after expansion, so the
// link keeps its source 22px line.
const sourceActions = (
  <>
    <Button>Esci</Button>
    <a
      className={cn(
        buttonVariants({ variant: "link" }),
        "relative min-h-0 px-0 after:absolute after:inset-x-0 after:-inset-y-3",
      )}
      download
      href="/ricevuta.pdf"
    >
      Scarica il documento
    </a>
  </>
)

export const Playground: Story = {
  // The fixture carries the source state (both actions, `733:22842`).
  args: { actions: sourceActions },
}

export const WithAction: Story = {
  args: { actions: sourceActions },
}
