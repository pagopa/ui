import type { Meta, StoryObj } from "@storybook/react-vite"

// One story per option, so a designer can open a single choice at the real
// viewport instead of judging three squeezed columns. Review stories live only
// on the long-lived review pull request (`feedback/previews`) and never merge.

const elevation = {
  32: "shadow-32",
  16: "shadow-16",
  1: "shadow-1",
} as const

type Elevation = keyof typeof elevation

interface Layer {
  name: string
  level: Elevation
}

// What each option does with the ambiguous floating layers. Dialog and Drawer
// keep Shadow 32 in every option: that part is not in question.
const options: { key: string; title: string; summary: string; layers: Layer[] }[] = [
  {
    key: "A",
    title: "Every floating layer",
    summary: "Tooltips, popovers, toasts, the cookie banner and the scroll button keep Shadow 32.",
    layers: [
      { name: "Dialog", level: 32 },
      { name: "Drawer", level: 32 },
      { name: "Tooltip", level: 32 },
      { name: "Popover", level: 32 },
      { name: "Snackbar", level: 32 },
      { name: "Cookie banner", level: 32 },
      { name: "Scroll to bottom", level: 32 },
    ],
  },
  {
    key: "B",
    title: "Only modals and drawers",
    summary:
      "Tooltips and popovers drop to Shadow 16; toasts, cookies and scroll button to Shadow 1.",
    layers: [
      { name: "Dialog", level: 32 },
      { name: "Drawer", level: 32 },
      { name: "Tooltip", level: 16 },
      { name: "Popover", level: 16 },
      { name: "Snackbar", level: 1 },
      { name: "Cookie banner", level: 1 },
      { name: "Scroll to bottom", level: 1 },
    ],
  },
  {
    key: "C",
    title: "Split by layer",
    summary:
      "Dialog, drawer and snackbar keep Shadow 32; tooltip, popover and scroll button drop to 16; the banner to 1.",
    layers: [
      { name: "Dialog", level: 32 },
      { name: "Drawer", level: 32 },
      { name: "Tooltip", level: 16 },
      { name: "Popover", level: 16 },
      { name: "Snackbar", level: 32 },
      { name: "Cookie banner", level: 1 },
      { name: "Scroll to bottom", level: 16 },
    ],
  },
]

function OptionView({ option }: { option: (typeof options)[number] }) {
  return (
    <div className="min-h-dvh bg-secondary p-8">
      <p className="text-title-sb text-foreground">
        {option.key} — {option.title}
      </p>
      <p className="text-body text-foreground mt-2 mb-8 max-w-3xl">{option.summary}</p>
      <div className="flex flex-wrap gap-6">
        {option.layers.map((layer) => (
          <div
            key={layer.name}
            className={`w-56 max-w-full rounded-lg bg-background p-4 ${elevation[layer.level]}`}
          >
            <p className="text-label-mini text-foreground">{layer.name}</p>
            <p className="text-label-mini text-foreground mt-1 opacity-70">Shadow {layer.level}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

const meta = {
  title: "Reviews/Shadow 32",
  tags: ["!dev", "!test", "!autodocs", "no-visual"],
  parameters: {
    layout: "fullscreen",
    options: { showPanel: false },
  },
} satisfies Meta

export default meta
type Story = StoryObj<typeof meta>

export const OptionA: Story = {
  name: "A — Every floating layer",
  render: () => <OptionView option={options[0]} />,
}

export const OptionB: Story = {
  name: "B — Only modals and drawers",
  render: () => <OptionView option={options[1]} />,
}

export const OptionC: Story = {
  name: "C — Split by layer",
  render: () => <OptionView option={options[2]} />,
}
