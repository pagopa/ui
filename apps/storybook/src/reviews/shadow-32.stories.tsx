import type { Meta, StoryObj } from "@storybook/react-vite"
import type { ReactNode } from "react"

// One review story per open design question. It lives only on the long-lived
// review pull request (`feedback/previews`), never merges, and answers the
// question with a side-by-side comparison instead of prose. The options are
// standalone compositions: no component code changes here.

const VIEWPORTS = [320, 1200] as const

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

function Frame({ width, children }: { width: number; children: ReactNode }) {
  return (
    <div className="shrink-0 rounded-2xl border border-dashed border-border p-4" style={{ width }}>
      <p className="text-label-mini text-foreground mb-3">{width} px</p>
      {children}
    </div>
  )
}

function Option({ option }: { option: (typeof options)[number] }) {
  return (
    <div className="shrink-0">
      <p className="text-body-sb text-foreground">
        {option.key} — {option.title}
      </p>
      <p className="text-label-mini text-foreground mt-1 mb-4">{option.summary}</p>
      <div className="flex flex-col gap-6">
        {VIEWPORTS.map((width) => (
          <Frame key={width} width={width}>
            <div className="flex min-w-0 flex-wrap gap-6 bg-secondary p-6">
              {option.layers.map((layer) => (
                <div
                  key={layer.name}
                  className={`w-56 max-w-full rounded-lg bg-background p-4 ${elevation[layer.level]}`}
                >
                  <p className="text-label-mini text-foreground">{layer.name}</p>
                  <p className="text-label-mini text-foreground mt-1 opacity-70">
                    Shadow {layer.level}
                  </p>
                </div>
              ))}
            </div>
          </Frame>
        ))}
      </div>
    </div>
  )
}

const meta = {
  title: "Reviews/Shadow 32",
  tags: ["!dev", "!test", "!autodocs"],
  parameters: {
    layout: "fullscreen",
    options: { showPanel: false },
  },
} satisfies Meta

export default meta
type Story = StoryObj<typeof meta>

export const Options: Story = {
  render: () => (
    <div className="overflow-x-auto p-8">
      <p className="text-title-sb text-foreground">Shadow 32 — which floating layers use it?</p>
      <p className="text-body text-foreground mt-2 mb-8">
        The same stack of layers in every option, rendered at 320 and 1200. Dialog and drawer keep
        Shadow 32 in all three.
      </p>
      <div className="flex items-start gap-10">
        {options.map((option) => (
          <Option key={option.key} option={option} />
        ))}
      </div>
    </div>
  ),
}
