import type { Meta, StoryObj } from "@storybook/react-vite"

import { figmaEmbedUrl } from "@/catalog/figma/file"
import { AuthenticationCodeInput } from "@/components/inputs/text-fields"
import { Button } from "@/components/primitives/button"
import { SourceFrame } from "./support/source-frame"
import { SecurityCodeDialog } from "./templates/SecurityCodeDialog"

import templatesGuide from "./guides/templates.md?raw"

// The source composition of set `1909:99033`: the shared dialog copy, the code
// row and the actions. The copy is caller-owned, so the story carries the
// source sample.
const sourceTitle = "Vuoi assegnare la delega a uno o più gruppi?"
const sourceDescription =
  "Se assegni la delega a un gruppo, questa potrà essere gestita dall’amministratore di gruppo e i componenti del gruppo potranno accedere alle relative notifiche."

// The source secondary action is the text button (`108:1447`): a 22px line with
// no fill, border or radius, kept with its invisible 44px pointer target.
function SecondaryAction() {
  return (
    <button
      type="button"
      className="pui:relative pui:inline-flex pui:min-h-0 pui:items-center pui:justify-center pui:text-center pui:text-base pui:leading-[1.375] pui:font-semibold pui:text-primary pui:whitespace-normal pui:[overflow-wrap:anywhere] pui:underline-offset-4 pui:hover:underline pui:focus-visible:outline-2 pui:focus-visible:outline-solid pui:focus-visible:outline-offset-2 pui:focus-visible:outline-ring pui:after:absolute pui:after:inset-x-0 pui:after:-inset-y-3"
    >
      Secondary
    </button>
  )
}

function SourceDialog() {
  return (
    <SecurityCodeDialog
      title={sourceTitle}
      description={sourceDescription}
      code={
        <AuthenticationCodeInput
          id="security-code"
          label="Inserisci codice"
          name="code"
          length={5}
        />
      }
      helper={
        <>
          Non l’hai ricevuto? Controlla che l’indirizzo PEC sia corretto o{" "}
          <a
            href="/pec/rigenera"
            className="pui:rounded-sm pui:font-semibold pui:text-primary pui:underline pui:underline-offset-2 pui:focus-visible:outline-2 pui:focus-visible:outline-offset-2 pui:focus-visible:outline-ring"
          >
            generane uno nuovo
          </a>
          .
        </>
      }
      actions={
        <>
          <SecondaryAction />
          <Button type="button">Primary</Button>
        </>
      }
    />
  )
}

const meta = {
  title: "Components/Templates/Security Code Dialog",
  component: SecurityCodeDialog,
  args: { title: sourceTitle, description: sourceDescription, code: null },
  parameters: {
    // The frame stories render the dialog statically: there is no open
    // lifecycle to own the focus or answer Escape.
    a11yContract: { dialog: false },
    design: { type: "figma", url: figmaEmbedUrl("1909:99033") },
    layout: "fullscreen",
    docs: { description: { component: templatesGuide } },
  },
} satisfies Meta<typeof SecurityCodeDialog>

export default meta
type Story = StoryObj<typeof meta>

// The composition answers its own frame: the narrow frame keeps the 272×570
// panel and the three-line helper; the wide frame takes the 600-wide panel with
// the helper on a single line. Each story draws the frame of the device it is
// captured at, so the panel and the helper wrap the way the source draws them.
export const NarrowFrame: Story = {
  name: "Narrow frame (320)",
  render: () => (
    <SourceFrame nodeId="1909:99033" device="mobile">
      <SourceDialog />
    </SourceFrame>
  ),
}

export const WideFrame: Story = {
  name: "Wide frame",
  render: () => (
    <SourceFrame nodeId="1909:99033" device="desktop">
      <SourceDialog />
    </SourceFrame>
  ),
}
