import type { Meta, StoryObj } from "@storybook/react-vite"

// One story per option. Review stories live only on the long-lived review pull
// request (`feedback/previews`) and never merge. Every dot row is a static
// composition; the dashed circle shows the 24 px target around each dot.

type Mode = "pitch-16" | "pitch-24" | "larger-dots" | "caller-band"

interface Option {
  key: string
  title: string
  summary: string
  mode: Mode
}

const options: Option[] = [
  {
    key: "A",
    title: "Keep the 16 px pitch",
    summary:
      "The stepper stays a compact 96x8 indicator. The small horizontal target is a deliberate choice, recorded in the guide.",
    mode: "pitch-16",
  },
  {
    key: "B",
    title: "Widen the gap to 24 px",
    summary:
      "The dots keep their size and each 24 px target sits around a dot without overlap. The row grows to about 160 px.",
    mode: "pitch-24",
  },
  {
    key: "C",
    title: "Enlarge the dots",
    summary:
      "A 12x12 outlined dot and a 24x8 active pill. The dot itself reaches the minimum, and the indicator becomes more prominent.",
    mode: "larger-dots",
  },
  {
    key: "D",
    title: "The caller owns the target",
    summary:
      "The caller places the stepper in a taller band. A vertical target grows, but adjacent dots still overlap.",
    mode: "caller-band",
  },
]

function Dots({ mode }: { mode: Mode }) {
  const pitch = mode === "pitch-24" ? "gap-6" : "gap-2"
  const dot = mode === "larger-dots" ? "size-3" : "size-2"
  const active = mode === "larger-dots" ? "h-2 w-6" : "h-1 w-4"
  return (
    <div className={`flex items-center justify-center ${pitch}`}>
      {Array.from({ length: 6 }, (_, index) => (
        <span key={index} className="relative grid place-items-center">
          <span
            className={
              index === 0
                ? `${active} shrink-0 rounded-2xl bg-primary`
                : `${dot} shrink-0 rounded-full border border-input`
            }
          />
          <span
            aria-hidden="true"
            className="pointer-events-none absolute size-6 rounded-full border border-dashed border-destructive/70"
          />
        </span>
      ))}
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
      <div className="grid max-w-3xl gap-6">
        <div className="grid gap-6 rounded-xl border bg-background p-6">
          <span className="text-label-mini-sb text-muted-foreground">
            {option.mode === "caller-band"
              ? "Stepper inside a 44 px band"
              : "Dots with the 24 px target circle"}
          </span>
          <div
            className={
              option.mode === "caller-band"
                ? "flex min-h-11 items-center justify-center rounded-lg bg-secondary/60 py-4"
                : "flex min-h-11 items-center"
            }
          >
            <Dots mode={option.mode} />
          </div>
          <p className="text-label-mini text-muted-foreground">
            {option.mode === "pitch-16"
              ? "Centres 16 px apart: the 24 px circles overlap."
              : option.mode === "pitch-24"
                ? "Centres 24 px apart: the circles touch, they do not overlap."
                : option.mode === "larger-dots"
                  ? "The dot itself is 24 px, so the target and the circle match."
                  : "The band grows vertically; the horizontal overlap stays."}
          </p>
        </div>
      </div>
    </div>
  )
}

const meta = {
  title: "Reviews/Carousel stepper target size",
  tags: ["!dev", "!test", "!autodocs", "no-visual"],
  parameters: {
    layout: "fullscreen",
    options: { showPanel: false },
  },
} satisfies Meta

export default meta
type Story = StoryObj<typeof meta>

export const OptionA: Story = {
  name: "A — 16 px pitch",
  render: () => <OptionView option={options[0]} />,
}

export const OptionB: Story = {
  name: "B — 24 px gap",
  render: () => <OptionView option={options[1]} />,
}

export const OptionC: Story = {
  name: "C — Larger dots",
  render: () => <OptionView option={options[2]} />,
}

export const OptionD: Story = {
  name: "D — Caller band",
  render: () => <OptionView option={options[3]} />,
}
