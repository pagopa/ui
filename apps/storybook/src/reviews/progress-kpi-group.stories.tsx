import type { Meta, StoryObj } from "@storybook/react-vite"
import type { ReactNode } from "react"

import { ProgressKpi } from "@/components/data-display"
import { PagoPAIcon } from "@/components/icons/PagoPAIcon"

// One story per option, so a designer can open a single layout at the real
// viewport. Review stories live only on the long-lived review pull request
// (`feedback/previews`) and never merge. The cards are the real component; the
// group is the composition under review.

const cards = [
  { label: "Inviate", value: 51, total: 69, completed: false },
  { label: "Consegnate", value: 69, total: 69, completed: true },
  { label: "Servizi attivi", value: 12, total: 20, completed: false },
  { label: "Pagamenti", value: 34, total: 50, completed: false },
]

function KpiCard({ card }: { card: (typeof cards)[number] }) {
  return (
    <ProgressKpi
      label={card.label}
      value={card.value}
      total={card.total}
      completed={card.completed}
      channel={<PagoPAIcon name="send" />}
      info={<PagoPAIcon name="info" />}
    />
  )
}

function FourUpGrid() {
  return (
    <div className="grid grid-cols-2 gap-4 tablet-md:grid-cols-4" data-review-layout="grid">
      {cards.map((card) => (
        <KpiCard key={card.label} card={card} />
      ))}
    </div>
  )
}

function PeekCarousel() {
  return (
    <>
      <div
        className="flex snap-x snap-mandatory gap-4 overflow-x-auto pb-2 tablet-md:hidden"
        data-review-layout="carousel"
      >
        {cards.map((card) => (
          <div key={card.label} className="w-[82%] shrink-0 snap-start">
            <KpiCard card={card} />
          </div>
        ))}
      </div>
      <div className="hidden grid-cols-4 gap-4 tablet-md:grid" data-review-layout="grid">
        {cards.map((card) => (
          <KpiCard key={card.label} card={card} />
        ))}
      </div>
    </>
  )
}

function PlainGrid() {
  return (
    <div className="grid gap-4" data-review-layout="plain">
      {cards.slice(0, 3).map((card) => (
        <KpiCard key={card.label} card={card} />
      ))}
    </div>
  )
}

interface Option {
  key: string
  title: string
  summary: string
  render: () => ReactNode
}

const options: Option[] = [
  {
    key: "A",
    title: "Four-up grid at every width",
    summary: "Four cards per row above 900, two by two below. No carousel and no peeking card.",
    render: () => <FourUpGrid />,
  },
  {
    key: "B",
    title: "Four-up grid, peek carousel on mobile",
    summary:
      "Four cards per row above 900; below 900 the cards scroll sideways and the next one peeks.",
    render: () => <PeekCarousel />,
  },
  {
    key: "C",
    title: "No group",
    summary:
      "The page composes three cards in a plain grid at every width, as the templates do now.",
    render: () => <PlainGrid />,
  },
]

function OptionView({ option }: { option: Option }) {
  return (
    <div className="min-h-dvh p-8">
      <p className="text-title-sb text-foreground">
        {option.key} — {option.title}
      </p>
      <p className="text-body text-foreground mt-2 mb-8 max-w-3xl">{option.summary}</p>
      {option.render()}
    </div>
  )
}

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

export const OptionA: Story = {
  name: "A — Four-up grid at every width",
  render: () => <OptionView option={options[0]} />,
}

export const OptionB: Story = {
  name: "B — Four-up grid, peek carousel on mobile",
  render: () => <OptionView option={options[1]} />,
}

export const OptionC: Story = {
  name: "C — No group",
  render: () => <OptionView option={options[2]} />,
}
