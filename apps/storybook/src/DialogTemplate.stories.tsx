import type { Meta, StoryObj } from "@storybook/react-vite"

import { figmaEmbedUrl } from "@/catalog/figma/file"
import { CheckboxField } from "@/components/inputs"
import { Button } from "@/components/primitives/button"
import { SourceFrame } from "./support/source-frame"
import { DialogTemplate } from "./templates/DialogTemplate"

import templatesGuide from "./guides/templates.md?raw"

// The source composition of set `1909:98992`: the dialog copy, the option row
// and the two actions. The copy is caller-owned (a template ships behaviour,
// not product text), so the story carries the source sample.
const sourceTitle = "Vuoi assegnare la delega a uno o più gruppi?"
const sourceDescription =
  "Se assegni la delega a un gruppo, questa potrà essere gestita dall’amministratore di gruppo e i componenti del gruppo potranno accedere alle relative notifiche."

// The source secondary action is the text button (`108:1447`): a 22px line with
// no fill, border or radius. The >=44px pointer target comes from the invisible
// ::after expansion, so the line keeps the source metric.
function SecondaryAction() {
  return (
    <button
      type="button"
      className="relative inline-flex min-h-0 items-center justify-center text-center text-base leading-[1.375] font-semibold text-primary whitespace-normal [overflow-wrap:anywhere] underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-solid focus-visible:outline-offset-2 focus-visible:outline-ring after:absolute after:inset-x-0 after:-inset-y-3"
    >
      Secondary
    </button>
  )
}

function SourceDialog() {
  return (
    <DialogTemplate
      title={sourceTitle}
      description={sourceDescription}
      actions={
        <>
          <SecondaryAction />
          <Button type="button">Primary</Button>
        </>
      }
    >
      <CheckboxField id="delegation-groups" label="Checkbox label" />
    </DialogTemplate>
  )
}

const meta = {
  title: "Components/Templates/Dialog",
  component: DialogTemplate,
  args: { title: sourceTitle, description: sourceDescription },
  parameters: {
    // The frame stories render the dialog statically: there is no open
    // lifecycle to own the focus or answer Escape.
    a11yContract: { dialog: false },
    design: { type: "figma", url: figmaEmbedUrl("1909:98992") },
    layout: "fullscreen",
    docs: { description: { component: templatesGuide } },
  },
} satisfies Meta<typeof DialogTemplate>

export default meta
type Story = StoryObj<typeof meta>

// The composition answers its own frame: the narrow frame keeps the 272×446
// panel, the 18/28 title and the stacked actions; the wide frame takes the
// 600×290 panel, the 24/32 title and the right-aligned action row. Each story
// draws the frame of the device it is captured at — the panel is sized by the
// `@container/dialog-page` query on the page element, so the wrapper's width is
// the frame the composition answers, not a component dimension.
export const NarrowFrame: Story = {
  name: "Narrow frame (320)",
  render: () => (
    <SourceFrame nodeId="1909:98992" device="mobile">
      <SourceDialog />
    </SourceFrame>
  ),
}

export const WideFrame: Story = {
  name: "Wide frame",
  render: () => (
    <SourceFrame nodeId="1909:98992" device="desktop">
      <SourceDialog />
    </SourceFrame>
  ),
}
