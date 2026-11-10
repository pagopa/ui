import type { Meta, StoryObj } from "@storybook/react-vite"

import { Breadcrumb } from "@/components/navigation"
import { PagoPAIcon } from "@/components/icons/PagoPAIcon"

// One story per option. Review stories live only on the long-lived review pull
// request (`feedback/previews`) and never merge. Option A uses the live
// component; B and C show the composition the description asks for.

type Mode = "drawing" | "description" | "mix"

interface Option {
  key: string
  title: string
  summary: string
  mode: Mode
}

const options: Option[] = [
  {
    key: "A",
    title: "Keep the drawing",
    summary:
      "The current page stays regular in #555c70. The path wraps at any length, and the caller chooses Back with its destination.",
    mode: "drawing",
  },
  {
    key: "B",
    title: "Follow the description",
    summary:
      "The current page is bold and dark, the path stops after five ancestors, and a small screen switches to Back pointing at the second-to-last item.",
    mode: "description",
  },
  {
    key: "C",
    title: "Mix",
    summary:
      "The drawn style and the explicit Back stay. Only the maximum depth or the collapse rule is defined.",
    mode: "mix",
  },
]

const path = [
  { label: "Home", href: "#home" },
  { label: "Pagamenti", href: "#pagamenti" },
  { label: "Avvisi", href: "#avvisi" },
  { label: "Dettaglio avviso" },
]

const longPath = [
  { label: "Home", href: "#home" },
  { label: "Area riservata", href: "#area" },
  { label: "Enti", href: "#enti" },
  { label: "Comune di Roma", href: "#roma" },
  { label: "Tributi", href: "#tributi" },
  { label: "TARI 2025", href: "#tari" },
  { label: "Accertamento" },
]

function BoldPath() {
  return (
    <nav aria-label="Percorso di navigazione">
      <ol className="flex min-w-0 flex-wrap items-center gap-1.5">
        {path.map((item, index) => {
          const current = index === path.length - 1
          return (
            <li key={item.label} className="flex min-w-0 items-center gap-1.5">
              {index > 0 ? (
                <PagoPAIcon
                  name="chevron"
                  variant="right"
                  size={16}
                  className="shrink-0 opacity-80"
                />
              ) : null}
              <span
                aria-current={current ? "page" : undefined}
                className={
                  current
                    ? "text-body-sb text-foreground"
                    : "text-body-sb text-foreground underline-offset-4"
                }
              >
                {item.label}
              </span>
            </li>
          )
        })}
      </ol>
    </nav>
  )
}

function CollapsedPath() {
  const visible = [longPath[0], longPath[1], longPath[5], longPath[6]]
  return (
    <nav aria-label="Percorso di navigazione">
      <ol className="flex min-w-0 flex-wrap items-center gap-1.5">
        {visible.map((item, index) => {
          const current = index === visible.length - 1
          return (
            <li key={item.label} className="flex min-w-0 items-center gap-1.5">
              {index > 0 ? (
                <PagoPAIcon
                  name="chevron"
                  variant="right"
                  size={16}
                  className="shrink-0 opacity-80"
                />
              ) : null}
              {index === 2 ? (
                <span aria-hidden="true" className="px-1 text-body text-muted-foreground">
                  …
                </span>
              ) : null}
              <span
                aria-current={current ? "page" : undefined}
                className={
                  current ? "text-body-sb text-foreground" : "text-body-sb text-foreground"
                }
              >
                {item.label}
              </span>
            </li>
          )
        })}
      </ol>
    </nav>
  )
}

function OptionView({ option }: { option: Option }) {
  return (
    <div className="min-h-dvh bg-secondary p-8">
      <p className="text-body-big-sb text-foreground">
        {option.key} — {option.title}
      </p>
      <p className="text-body mt-2 mb-8 max-w-3xl text-foreground">{option.summary}</p>
      <div className="grid max-w-3xl gap-6">
        <div className="grid gap-3 rounded-xl border bg-background p-6">
          <span className="text-label-mini-sb text-muted-foreground">Extended</span>
          {option.mode === "description" ? <BoldPath /> : null}
          {option.mode === "mix" ? <CollapsedPath /> : null}
          {option.mode === "drawing" ? <Breadcrumb items={path} /> : null}
        </div>
        <div className="grid gap-3 rounded-xl border bg-background p-6">
          <span className="text-label-mini-sb text-muted-foreground">
            {option.mode === "description" ? "Mobile — automatic Back" : "Compact"}
          </span>
          {option.mode === "description" ? (
            <Breadcrumb layout="compact" back={{ label: "Avvisi", href: "#avvisi" }} />
          ) : (
            <Breadcrumb layout="compact" back={{ label: "Indietro", href: "#indietro" }} />
          )}
        </div>
      </div>
    </div>
  )
}

const meta = {
  title: "Reviews/Breadcrumb description vs drawing",
  tags: ["!dev", "!test", "!autodocs", "no-visual"],
  parameters: {
    layout: "fullscreen",
    options: { showPanel: false },
  },
} satisfies Meta

export default meta
type Story = StoryObj<typeof meta>

export const OptionA: Story = {
  name: "A — Drawing",
  render: () => <OptionView option={options[0]} />,
}

export const OptionB: Story = {
  name: "B — Description",
  render: () => <OptionView option={options[1]} />,
}

export const OptionC: Story = {
  name: "C — Mix",
  render: () => <OptionView option={options[2]} />,
}
