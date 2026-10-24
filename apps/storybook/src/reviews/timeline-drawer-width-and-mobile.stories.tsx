import type { Meta, StoryObj } from "@storybook/react-vite"

import { PagoPAPictogram } from "@/components/icons/PagoPAPictogram"
import { Button } from "@/components/primitives/button"

// One story per option. Review stories live only on the long-lived review pull
// request (`feedback/previews`) and never merge. The panels are static
// compositions: the question is the composition, not the live portal.

type Mode = "direction" | "compose" | "responsive"

interface Option {
  key: string
  title: string
  summary: string
  mode: Mode
}

const options: Option[] = [
  {
    key: "A",
    title: "The drawer exposes direction",
    summary:
      "The caller opens the timeline from the bottom on a small screen and from the right on a large one. The 24 px header rhythm stays inside the TimelineDrawer.",
    mode: "direction",
  },
  {
    key: "B",
    title: "The caller composes the Drawer",
    summary:
      "The TimelineDrawer stays a right-edge helper. A caller that needs the sheet composes the Drawer directly and repeats the timeline content.",
    mode: "compose",
  },
  {
    key: "C",
    title: "The drawer switches by itself",
    summary:
      "Below a breakpoint the drawer opens from the bottom, above it from the right. This is a viewport decision inside the component.",
    mode: "responsive",
  },
]

const events = [
  {
    title: "Pagamento registrato",
    date: "12 aprile 2026, 09:14",
    body: "L’avviso risulta pagato. La ricevuta è disponibile.",
  },
  {
    title: "Notifica inviata",
    date: "12 aprile 2026, 09:15",
    body: "Il destinatario ha ricevuto la notifica sull’app IO.",
  },
]

function TimelineBody() {
  return (
    <ol className="grid gap-6">
      {events.map((event) => (
        <li key={event.title} className="grid grid-cols-[24px_1fr] gap-3">
          <span className="relative flex justify-center">
            <span className="mt-1 size-3 rounded-full bg-primary" />
            <span className="absolute top-5 bottom-[-24px] w-px bg-border" />
          </span>
          <span className="grid gap-1">
            <span className="text-body-sb text-foreground">{event.title}</span>
            <span className="text-label-mini text-muted-foreground">{event.date}</span>
            <span className="text-body text-muted-foreground">{event.body}</span>
          </span>
        </li>
      ))}
    </ol>
  )
}

function DesktopPanel() {
  return (
    <div className="grid h-120 w-104 max-w-full grid-rows-[auto_1fr_auto] overflow-hidden rounded-l-2xl border bg-background shadow-32">
      <div className="flex items-start gap-3 border-b p-6">
        <PagoPAPictogram name="History Doc" size={40} />
        <div className="grid gap-1">
          <h2 className="text-title-xs-mobile text-foreground">Cronologia</h2>
          <p className="text-body text-muted-foreground">Eventi in ordine cronologico</p>
        </div>
      </div>
      <div className="overflow-auto p-6">
        <TimelineBody />
      </div>
      <div className="border-t p-6">
        <Button type="button" variant="outline" className="w-full">
          Scarica tutte le ricevute
        </Button>
      </div>
    </div>
  )
}

function MobileSheet() {
  return (
    <div className="grid h-120 w-80 max-w-full grid-rows-[auto_1fr_auto] self-end overflow-hidden rounded-t-xl border bg-background shadow-32">
      <div className="flex items-start gap-3 border-b p-4">
        <PagoPAPictogram name="History Doc" size={40} />
        <div className="grid gap-1">
          <h2 className="text-title-xs-mobile text-foreground">Cronologia</h2>
          <p className="text-body text-muted-foreground">Eventi in ordine cronologico</p>
        </div>
      </div>
      <div className="overflow-auto p-4">
        <TimelineBody />
      </div>
      <div className="border-t p-4">
        <Button type="button" variant="outline" className="w-full">
          Scarica tutte le ricevute
        </Button>
      </div>
    </div>
  )
}

function OptionView({ option }: { option: Option }) {
  return (
    <div className="min-h-dvh bg-secondary p-8">
      <p className="text-body-big-sb text-foreground">
        {option.key} — {option.title}
      </p>
      <p className="text-body mt-2 mb-8 max-w-3xl text-foreground">{option.summary}</p>
      <div className="flex flex-wrap items-start gap-6">
        <div className="grid gap-2">
          <span className="text-label-mini-sb text-muted-foreground">
            Desktop — right panel (416)
          </span>
          <DesktopPanel />
        </div>
        <div className="grid gap-2">
          <span className="text-label-mini-sb text-muted-foreground">
            Mobile — bottom sheet (320)
          </span>
          <MobileSheet />
        </div>
      </div>
    </div>
  )
}

const meta = {
  title: "Reviews/Timeline drawer width and mobile",
  tags: ["!dev", "!test", "!autodocs"],
  parameters: {
    layout: "fullscreen",
    options: { showPanel: false },
  },
} satisfies Meta

export default meta
type Story = StoryObj<typeof meta>

export const OptionA: Story = {
  name: "A — Direction prop",
  render: () => <OptionView option={options[0]} />,
}

export const OptionB: Story = {
  name: "B — Caller composition",
  render: () => <OptionView option={options[1]} />,
}

export const OptionC: Story = {
  name: "C — Responsive default",
  render: () => <OptionView option={options[2]} />,
}
