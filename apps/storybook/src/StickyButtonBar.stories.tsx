import type { Meta, StoryObj } from "@storybook/react-vite"

import { figmaEmbedUrl } from "@/catalog/figma/file"
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
    design: { type: "figma", url: figmaEmbedUrl("3424:12354") },
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

// The source bar (`3424:12354`): the 360x97 `ButtonStickyBottom` — a full-bleed
// 1px divider over the 96px white surface (24px insets) holding the 312x48
// contained action. The bar is the first box in the flow, so the capture
// measures it from the source origin; the paragraph below is the page surface.
export const SourceBar: Story = {
  tags: ["color-pinned"],
  args: {
    children: (
      <ButtonGroup className="w-full" orientation="vertical">
        <Button type="submit" className="w-full">
          Primary
        </Button>
      </ButtonGroup>
    ),
  },
  render: (args) => (
    <form
      className="flex w-full flex-col px-4"
      onSubmit={(event) => {
        event.preventDefault()
      }}
    >
      <StickyButtonBar {...args} />
      <p className="py-6">Contenuto della pagina sotto la barra.</p>
    </form>
  ),
}

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
