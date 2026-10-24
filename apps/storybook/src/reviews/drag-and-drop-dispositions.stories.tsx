import type { Meta, StoryObj } from "@storybook/react-vite"

import { DragAndDrop } from "@/components/inputs"
import { PagoPAIcon } from "@/components/icons/PagoPAIcon"
import { Button } from "@/components/primitives/button"
import { FileUp } from "@/components/primitives/icons"

// One story per option. Review stories live only on the long-lived review pull
// request (`feedback/previews`) and never merge. The vertical field is the live
// component; the horizontal one is a static composition of the source.

type Mode = "container" | "caller" | "both"

interface Option {
  key: string
  title: string
  summary: string
  mode: Mode
}

const options: Option[] = [
  {
    key: "A",
    title: "The container width selects the form",
    summary:
      "Above a threshold the field shows the horizontal form. The smallest source frame is 505 px, so the threshold sits near it.",
    mode: "container",
  },
  {
    key: "B",
    title: "The caller selects the form",
    summary:
      "The field takes a disposition prop. The width no longer matters, and the responsive behaviour disappears.",
    mode: "caller",
  },
  {
    key: "C",
    title: "Both",
    summary:
      "The container width is the default, and the prop overrides it for a surface that must not follow its width.",
    mode: "both",
  },
]

function HorizontalField({ failed = false }: { failed?: boolean }) {
  return (
    <div
      className={
        failed
          ? "flex min-h-24 w-full items-center gap-6 rounded-lg border border-error-border bg-error-soft p-6"
          : "flex min-h-24 w-full items-center gap-6 rounded-lg border border-drop-target bg-accent p-6"
      }
    >
      <span className="flex min-w-0 flex-1 items-center gap-3">
        {failed ? (
          <PagoPAIcon
            name="error"
            filled={false}
            size={24}
            className="shrink-0 text-error-foreground"
          />
        ) : (
          <FileUp aria-hidden="true" className="size-6 shrink-0 text-foreground" />
        )}
        <span className="grid min-w-0 gap-1">
          <span className="text-body-sb text-foreground">
            {failed ? "Caricamento non riuscito" : "Trascina qui il file"}
          </span>
          <span className="text-caption-sb text-muted-foreground">PDF o PNG, massimo 10 MB</span>
        </span>
      </span>
      <Button type="button" className="shrink-0">
        {failed ? "Riprova" : "Carica"}
      </Button>
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
      <div className="grid gap-8">
        <div className="grid gap-3">
          <span className="text-label-mini-sb text-muted-foreground">Vertical — 272 px</span>
          <div className="w-68 max-w-full">
            <DragAndDrop label="Allega un documento" accept="application/pdf" />
          </div>
        </div>
        <div className="grid gap-3">
          <span className="text-label-mini-sb text-muted-foreground">Horizontal — 600 px</span>
          <div className="w-full max-w-150">
            <HorizontalField />
          </div>
        </div>
        <div className="grid gap-3">
          <span className="text-label-mini-sb text-muted-foreground">Failed and Error states</span>
          <div className="grid max-w-150 gap-4">
            <div className="w-68 max-w-full">
              <DragAndDrop label="Allega un documento" failed retryLabel="Riprova" />
            </div>
            <HorizontalField failed />
          </div>
        </div>
      </div>
    </div>
  )
}

const meta = {
  title: "Reviews/Drag and drop dispositions",
  tags: ["!dev", "!test", "!autodocs"],
  parameters: {
    layout: "fullscreen",
    options: { showPanel: false },
  },
} satisfies Meta

export default meta
type Story = StoryObj<typeof meta>

export const OptionA: Story = {
  name: "A — Container width",
  render: () => <OptionView option={options[0]} />,
}

export const OptionB: Story = {
  name: "B — Caller prop",
  render: () => <OptionView option={options[1]} />,
}

export const OptionC: Story = {
  name: "C — Both",
  render: () => <OptionView option={options[2]} />,
}
