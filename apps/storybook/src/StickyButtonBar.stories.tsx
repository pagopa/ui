import type { Meta, StoryObj } from "@storybook/react-vite"

import { ButtonGroup, StickyButtonBar } from "@/components/inputs"
import { Button } from "@/components/primitives/button"

const meta = {
  title: "Components/Inputs/StickyButtonBar",
  component: StickyButtonBar,
  args: {
    // Source 3424:12354: the bar closes the flow with the full-width contained
    // action (312px block inside the 360px frame, 24px insets).
    children: (
      <ButtonGroup className="w-full" orientation="vertical">
        <Button type="submit" className="w-full">
          Continua
        </Button>
      </ButtonGroup>
    ),
  },
  argTypes: {
    children: { control: false },
    variant: { control: "select", options: ["bar", "fade"] },
  },
  parameters: {
    docs: {
      description: {
        component:
          "Action bar pinned to the bottom of the flow: the `bar` variant is the separated surface (ButtonStickyBottom), the `fade` variant is the source CTA overlay; the submit belongs to the caller's form.",
      },
    },
  },
} satisfies Meta<typeof StickyButtonBar>

export default meta
type Story = StoryObj<typeof meta>

export const Playground: Story = {
  render: (args) => (
    <form
      className="min-h-96 w-90 max-w-full px-4"
      onSubmit={(event) => {
        event.preventDefault()
      }}
    >
      <p className="mb-96">Contenuto lungo del modulo che scorre sotto la barra.</p>
      <StickyButtonBar {...args} />
    </form>
  ),
}

export const CtaFade: Story = {
  args: { variant: "fade" },
  render: (args) => (
    <form
      className="min-h-96 w-90 max-w-full px-4"
      onSubmit={(event) => {
        event.preventDefault()
      }}
    >
      <p className="mb-96">Contenuto lungo del modulo che scorre sotto il CTA.</p>
      <StickyButtonBar {...args} />
    </form>
  ),
}
