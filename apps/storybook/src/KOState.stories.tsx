import type { Meta, StoryObj } from "@storybook/react-vite"
import { expect, within } from "storybook/test"

import { KOState } from "@/components/feedback/ko-state"
import { Button } from "@/components/primitives/button"
import { figmaEmbedUrl } from "@/catalog/figma/file"

const meta = {
  title: "Components/Feedback/KOState",
  component: KOState,
  args: {
    title: "Pagamento non riuscito",
    description: "Non è stato effettuato alcun addebito.",
  },
  argTypes: {
    titleAs: { control: "select", options: ["h2", "h3", "h4"] },
    actions: { control: false },
    code: { control: "text" },
  },
  parameters: {
    design: { type: "figma", url: figmaEmbedUrl("749:5695") },
    layout: "fullscreen",
    docs: {
      description: {
        component:
          "Negative outcome: it uses the Maintenance pictogram, keeps native actions and, with `code`, shows a copyable row; the copy and text actions keep their accessible targets.",
      },
    },
  },
} satisfies Meta<typeof KOState>

export default meta
type Story = StoryObj<typeof meta>

const sourceArgs = {
  title: (
    <>
      Qualcosa è andato
      <br />
      storto
    </>
  ),
  description: (
    <>
      A causa di un errore del sistema non è possibile completare la procedura.
      <br />
      Ti chiediamo di riprovare più tardi.
    </>
  ),
  code: "[Codice errore]",
  actions: (
    <>
      <Button>Esci</Button>
      {/* Source action `749:5694`: a 154×22 semibold text line. The 44px target is
          the invisible ::after expansion, so the column keeps the source rhythm. */}
      <Button
        variant="link"
        className="relative min-h-0 px-0 after:absolute after:inset-x-0 after:-inset-y-3"
      >
        Contatta l’assistenza
      </Button>
    </>
  ),
}

export const Playground: Story = {
  // Reflow exemption pending a design request: docs/design-requests/2026-10-16-a11y-reflow-conditions.md.
  parameters: { a11yContract: { reflow: false } },
  // The fixture carries the source state (code row + both actions, `749:5694`).
  args: { code: sourceArgs.code, actions: sourceArgs.actions },
}

export const WithAction: Story = {
  // Reflow exemption pending a design request: docs/design-requests/2026-10-16-a11y-reflow-conditions.md.
  parameters: { a11yContract: { reflow: false } },
  args: { actions: <Button>Riprova</Button> },
}

export const WithCode: Story = {
  // Reflow exemption pending a design request: docs/design-requests/2026-10-16-a11y-reflow-conditions.md.
  parameters: { a11yContract: { reflow: false } },
  args: {
    code: "PPT_001",
    actions: (
      <>
        <Button>Riprova</Button>
        <Button variant="ghost">Contatta l'assistenza</Button>
      </>
    ),
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await expect(canvas.getByText("PPT_001")).toBeVisible()
    await expect(canvas.getByRole("button", { name: "Copia codice errore" })).toBeVisible()
  },
}

export const SourceMobile: Story = {
  args: sourceArgs,
}

export const SourceDesktop: Story = {
  args: sourceArgs,
}
