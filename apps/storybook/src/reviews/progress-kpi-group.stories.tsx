import type { Meta, StoryObj } from "@storybook/react-vite"
import type { ReactNode } from "react"

import { ProgressKpi } from "@/components/data-display"
import { PagoPAIcon } from "@/components/icons/PagoPAIcon"

// One review story per open design question. It lives only on the long-lived
// review pull request (`feedback/previews`), never merges, and answers the
// question with a side-by-side comparison instead of prose. The cards are the
// real component; the group is the composition under review.

const VIEWPORTS = [320, 1200] as const

const cards = [
  { label: "Inviate", value: 51, total: 69, completed: false },
  { label: "Consegnate", value: 69, total: 69, completed: true },
  { label: "Servizi attivi", value: 12, total: 20, completed: false },
  { label: "Pagamenti", value: 34, total: 50, completed: false },
]

function KpiCards() {
  return cards.map((card) => (
    <ProgressKpi
      key={card.label}
      label={card.label}
      value={card.value}
      total={card.total}
      completed={card.completed}
      channel={<PagoPAIcon name="send" />}
      info={<PagoPAIcon name="info" />}
    />
  ))
}

function Frame({ width, children }: { width: number; children: ReactNode }) {
  return (
    <div className="shrink-0 rounded-2xl border border-dashed border-border p-4" style={{ width }}>
      <p className="text-label-mini text-foreground mb-3">{width} px</p>
      {children}
    </div>
  )
}

function FourUpGrid({ width }: { width: number }) {
  return (
    <Frame width={width}>
      <div
        className={`grid gap-4 ${width >= 900 ? "grid-cols-4" : "grid-cols-2"}`}
        data-review-layout="grid"
      >
        <KpiCards />
      </div>
    </Frame>
  )
}

function PeekCarousel({ width }: { width: number }) {
  return (
    <Frame width={width}>
      {width >= 900 ? (
        <div className="grid grid-cols-4 gap-4" data-review-layout="grid">
          <KpiCards />
        </div>
      ) : (
        <div
          className="flex snap-x snap-mandatory gap-4 overflow-x-auto pb-2"
          data-review-layout="carousel"
        >
          {cards.map((card) => (
            <div key={card.label} className="w-[82%] shrink-0 snap-start">
              <ProgressKpi
                label={card.label}
                value={card.value}
                total={card.total}
                completed={card.completed}
                channel={<PagoPAIcon name="send" />}
                info={<PagoPAIcon name="info" />}
              />
            </div>
          ))}
        </div>
      )}
    </Frame>
  )
}

function PlainGrid({ width }: { width: number }) {
  return (
    <Frame width={width}>
      <div className="grid gap-4" data-review-layout="plain">
        {cards.slice(0, 3).map((card) => (
          <ProgressKpi
            key={card.label}
            label={card.label}
            value={card.value}
            total={card.total}
            completed={card.completed}
            channel={<PagoPAIcon name="send" />}
            info={<PagoPAIcon name="info" />}
          />
        ))}
      </div>
    </Frame>
  )
}

interface Option {
  key: string
  title: string
  summary: string
  render: (width: number) => ReactNode
}

const options: Option[] = [
  {
    key: "A",
    title: "Four-up grid at every width",
    summary: "Four cards per row above 900, two by two below. No carousel and no peeking card.",
    render: (width) => <FourUpGrid width={width} />,
  },
  {
    key: "B",
    title: "Four-up grid, peek carousel on mobile",
    summary:
      "Four cards per row above 900; below 900 the cards scroll sideways and the next one peeks.",
    render: (width) => <PeekCarousel width={width} />,
  },
  {
    key: "C",
    title: "No group",
    summary:
      "The page composes three cards in a plain grid at every width, as the templates do now.",
    render: (width) => <PlainGrid width={width} />,
  },
]

const meta = {
  title: "Reviews/Progress KPI group",
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
      <p className="text-title-sb text-foreground">
        Progress KPI group — grid or peek carousel on mobile?
      </p>
      <p className="text-body text-foreground mt-2 mb-8">
        The same four cards in every option, rendered at 320 and 1200.
      </p>
      <div className="flex items-start gap-10">
        {options.map((option) => (
          <div key={option.key} className="shrink-0">
            <p className="text-body-sb text-foreground">
              {option.key} — {option.title}
            </p>
            <p className="text-label-mini text-foreground mt-1 mb-4">{option.summary}</p>
            <div className="flex flex-col gap-6">
              {VIEWPORTS.map((width) => (
                <div key={width}>{option.render(width)}</div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  ),
}
