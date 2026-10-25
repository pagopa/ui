import type { Meta, StoryObj } from "@storybook/react-vite"

import { figmaEmbedUrl } from "@/catalog/figma/file"
import { PagoPAPictogram } from "@/components/icons/PagoPAPictogram"
import { Button } from "@/components/primitives/button"
import { InformativeDrawer } from "@/components/templates/figma/InformativeDrawer"

import templatesGuide from "./guides/templates.md?raw"

// The source composition of set `1992:127582`: the rejection notice with its
// multi-paragraph copy and the single reply action. The copy is caller-owned,
// so the story carries the source sample.
const sourceTitle = "Motivi del rifiuto"

function SourceDrawer({ direction }: { direction: "bottom" | "right" }) {
  return (
    <InformativeDrawer
      direction={direction}
      title={sourceTitle}
      icon={<PagoPAPictogram name="Error" size={40} />}
      description={
        // The source text node separates its lines with paragraph breaks, each
        // one carrying the 12px paragraph spacing: the copy keeps that shape.
        <span className="flex flex-col gap-3">
          <span>
            Ciao, ti segnaliamo che la tua richiesta di attivazione del servizio è stata respinta
            poiché la descrizione del servizio inserita non rispetta le indicazioni presenti nel
            manuale dei servizi.
          </span>
          <span>
            <a
              href="/manuale-servizi"
              className="rounded-sm font-semibold text-primary underline underline-offset-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
            >
              Dubbi? Vai al manuale
            </a>
          </span>
          <span aria-hidden="true" />
          <span>
            Ti invitiamo pertanto a modificare la descrizione del servizio precedentemente inserita.
          </span>
          <span>Grazie per la collaborazione,</span>
          <span>il Team di IO.</span>
        </span>
      }
      actions={<Button type="button">Rispondi</Button>}
    />
  )
}

const meta = {
  title: "Components/Templates/Informative Drawer",
  component: InformativeDrawer,
  args: { title: sourceTitle, description: null },
  parameters: {
    // The frame stories render the drawer statically: there is no open
    // lifecycle to own the focus or answer Escape.
    a11yContract: { dialog: false },
    design: { type: "figma", url: figmaEmbedUrl("1992:127582") },
    layout: "fullscreen",
    docs: { description: { component: templatesGuide } },
  },
} satisfies Meta<typeof InformativeDrawer>

export default meta
type Story = StoryObj<typeof meta>

// The frame decides the edge: the 320px device keeps the 320×650 bottom sheet
// (16px top corners), the wide frame the 417×800 square side panel, both with
// the 40px pictogram row and the source 40px gap before the action. The wide
// story is the page itself (no width wrapper), so the desktop devices are
// captured in their own frame.
export const NarrowFrame: Story = {
  name: "Narrow frame (320)",
  render: () => (
    <div className="w-80 max-w-full">
      <SourceDrawer direction="bottom" />
    </div>
  ),
}

export const WideFrame: Story = {
  name: "Wide frame",
  render: () => <SourceDrawer direction="right" />,
}
