import type { Meta, StoryObj } from "@storybook/react-vite"

import { Button } from "@/components/primitives/button"
import { ChevronLeft, ChevronRight } from "@/components/primitives/icons"

// One story per option. Review stories live only on the long-lived review pull
// request (`feedback/previews`) and never merge. The compact row is a static
// composition so both widths stay visible in one frame.

type Mode = "state" | "width" | "device"

interface Option {
  key: string
  title: string
  summary: string
  mode: Mode
}

const options: Option[] = [
  {
    key: "A",
    title: "The compact form is a caller state",
    summary:
      'The component takes layout="compact" and shows the compact form at any width, also at the source 836. The narrow container stays the fallback.',
    mode: "state",
  },
  {
    key: "B",
    title: "The compact form is a width behaviour",
    summary:
      "The compact form appears below a container threshold. The source frame becomes narrow, for example 320.",
    mode: "width",
  },
  {
    key: "C",
    title: "The compact form is a device",
    summary:
      "The source gains a real Device axis with a 320 and an 836 frame. The library gains one case per device.",
    mode: "device",
  },
]

function Frame({
  width,
  label,
  children,
}: {
  width: number
  label: string
  children: React.ReactNode
}) {
  return (
    <div className="grid gap-2">
      <span className="text-label-mini-sb text-muted-foreground">{label}</span>
      <div
        className="max-w-full overflow-hidden rounded-lg border bg-background p-4"
        style={{ width }}
      >
        {children}
      </div>
    </div>
  )
}

function Step({ direction }: { direction: "left" | "right" }) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      className="size-10 rounded-sm border-2 border-border"
      aria-label={direction === "left" ? "Pagina precedente" : "Pagina successiva"}
    >
      {direction === "left" ? (
        <ChevronLeft aria-hidden="true" />
      ) : (
        <ChevronRight aria-hidden="true" />
      )}
    </Button>
  )
}

function Page({ value, current }: { value: number; current?: boolean }) {
  return (
    <Button
      type="button"
      variant={current ? "default" : "ghost"}
      className="min-w-10 rounded-sm p-3"
      aria-current={current ? "page" : undefined}
    >
      {value}
    </Button>
  )
}

function FullPagination() {
  return (
    <div className="flex items-center gap-2">
      <Step direction="left" />
      <Page value={1} current />
      <Page value={2} />
      <Page value={3} />
      <span aria-hidden="true" className="grid size-10 place-items-center">
        <span className="flex items-center gap-0.5">
          <span className="size-0.5 rounded-full bg-foreground" />
          <span className="size-0.5 rounded-full bg-foreground" />
          <span className="size-0.5 rounded-full bg-foreground" />
        </span>
      </span>
      <Page value={101} />
      <Step direction="right" />
    </div>
  )
}

function CompactPagination() {
  return (
    <div className="flex items-center gap-2">
      <Step direction="left" />
      <Page value={1} current />
      <Step direction="right" />
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
      <div className="grid gap-6">
        {option.mode === "state" ? (
          <>
            <Frame width={836} label="836 px — default state">
              <FullPagination />
            </Frame>
            <Frame width={836} label='836 px — layout="compact"'>
              <CompactPagination />
            </Frame>
          </>
        ) : null}
        {option.mode === "width" ? (
          <>
            <Frame width={836} label="836 px — above the threshold">
              <FullPagination />
            </Frame>
            <Frame width={320} label="320 px — below the threshold">
              <CompactPagination />
            </Frame>
          </>
        ) : null}
        {option.mode === "device" ? (
          <>
            <Frame width={836} label="Device: desktop (836)">
              <FullPagination />
            </Frame>
            <Frame width={320} label="Device: mobile (320)">
              <CompactPagination />
            </Frame>
          </>
        ) : null}
      </div>
    </div>
  )
}

const meta = {
  title: "Reviews/Pagination order axis",
  tags: ["!dev", "!test", "!autodocs"],
  parameters: {
    layout: "fullscreen",
    options: { showPanel: false },
  },
} satisfies Meta

export default meta
type Story = StoryObj<typeof meta>

export const OptionA: Story = {
  name: "A — Caller state",
  render: () => <OptionView option={options[0]} />,
}

export const OptionB: Story = {
  name: "B — Width behaviour",
  render: () => <OptionView option={options[1]} />,
}

export const OptionC: Story = {
  name: "C — Device axis",
  render: () => <OptionView option={options[2]} />,
}
