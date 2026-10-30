import type { Meta, StoryObj } from "@storybook/react-vite"

// One story per option. Review stories live only on the long-lived review pull
// request (`feedback/previews`) and never merge. Focus is painted statically:
// the live controls keep the shared perimeter of the current code.

type Surface = "white" | "grey" | "accent"

interface Option {
  key: string
  title: string
  summary: string
  mode: "blue-outline" | "white-inset" | "surface-inset"
}

const options: Option[] = [
  {
    key: "A",
    title: "Blue outer border plus a white inner strip",
    summary:
      "The control keeps a 2 px white strip between itself and a 2 px blue border. The perimeter looks the same on white, grey and coloured surfaces.",
    mode: "white-inset",
  },
  {
    key: "B",
    title: "One blue outline with an offset",
    summary:
      "The control paints a 2 px blue outline at a 2 px offset. The gap shows the surface colour, so the perimeter changes on a coloured surface.",
    mode: "blue-outline",
  },
  {
    key: "C",
    title: "Blue outer border plus a surface-coloured strip",
    summary:
      "The gap takes the colour of the surface. It follows the page, but a coloured surface gives no fixed safety strip.",
    mode: "surface-inset",
  },
]

const surfaces: { key: Surface; label: string; className: string }[] = [
  { key: "white", label: "White", className: "bg-background" },
  { key: "grey", label: "Grey", className: "bg-secondary" },
  { key: "accent", label: "Blue tint", className: "bg-accent" },
]

function Field({ label }: { label: string }) {
  return (
    <div className="grid w-56 gap-2">
      <span className="text-label-mini-sb text-foreground">{label}</span>
      <div className="flex h-12 items-center rounded-lg border bg-background px-4 text-body text-foreground">
        Mario Rossi
      </div>
    </div>
  )
}

function Focused({ option, surface }: { option: Option; surface: Surface }) {
  if (option.mode === "blue-outline") {
    return (
      <div className="rounded-lg outline-2 outline-offset-2 outline-solid outline-ring">
        <Field label="Campo" />
      </div>
    )
  }
  const inner =
    option.mode === "white-inset"
      ? "bg-background"
      : surfaces.find((candidate) => candidate.key === surface)?.className
  return (
    <div className="rounded-[10px] bg-primary p-0.5">
      <div className={`rounded-[8px] p-0.5 ${inner}`}>
        <Field label="Campo" />
      </div>
    </div>
  )
}

function OptionView({ option }: { option: Option }) {
  return (
    <div className="min-h-dvh bg-background p-8">
      <p className="text-body-big-sb text-foreground">
        {option.key} — {option.title}
      </p>
      <p className="text-body mt-2 mb-8 max-w-3xl text-foreground">{option.summary}</p>
      <div className="flex flex-wrap gap-6">
        {surfaces.map((surface) => (
          <div
            key={surface.key}
            className={`grid gap-4 rounded-xl border p-6 ${surface.className}`}
          >
            <span className="text-label-mini-sb text-foreground">{surface.label}</span>
            <Focused option={option} surface={surface.key} />
          </div>
        ))}
      </div>
    </div>
  )
}

const meta = {
  title: "Reviews/Focus perimeter",
  tags: ["!dev", "!test", "!autodocs", "no-visual"],
  parameters: {
    layout: "fullscreen",
    options: { showPanel: false },
  },
} satisfies Meta

export default meta
type Story = StoryObj<typeof meta>

export const OptionA: Story = {
  name: "A — White inner strip",
  render: () => <OptionView option={options[0]} />,
}

export const OptionB: Story = {
  name: "B — Single blue outline",
  render: () => <OptionView option={options[1]} />,
}

export const OptionC: Story = {
  name: "C — Surface-coloured strip",
  render: () => <OptionView option={options[2]} />,
}
