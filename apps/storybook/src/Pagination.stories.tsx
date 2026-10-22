import * as React from "react"
import type { Decorator, Meta, StoryObj } from "@storybook/react-vite"
import { expect, fn, userEvent, within } from "storybook/test"

import { figmaEmbedUrl } from "@/catalog/figma/file"
import { Pagination } from "@/components/navigation"

import paginationGuide from "./guides/pagination.md?raw"

const selectEmptyPage = fn()

// The component sizes itself with a container query, so the centered canvas
// would otherwise collapse it: give the examples a real content width, capped
// by the canvas so a narrow viewport never pushes it past the root.
const contentWidth: Decorator = (Story) => (
  <div className="w-[min(48rem,calc(100vw-2rem))] max-w-full">
    <Story />
  </div>
)

// The page-position variants are 836 wide in the source: frame them at that
// width so the capture compares the same box.
const sourceFrame: Decorator = (Story) => (
  <div className="w-[836px] max-w-full">
    <Story />
  </div>
)

const meta = {
  title: "Components/Navigation/Pagination",
  component: Pagination,
  args: { currentPage: 4, totalPages: 12, onPageChange: fn() },
  argTypes: {
    currentPage: { control: { type: "number", min: 1 } },
    totalPages: { control: { type: "number", min: 0 } },
    onPageChange: { control: false },
  },
  parameters: {
    docs: {
      description: {
        component: `Application-controlled pagination: the current page is normalised, the controls stay native buttons, the ellipses are decorative and not announced.

${paginationGuide}`,
      },
    },
  },
} satisfies Meta<typeof Pagination>

export default meta
type Story = StoryObj<typeof meta>

export const Playground: Story = { decorators: [contentWidth] }

// The source page-position states, with a three-digit total. Previous, next and
// the ellipsis are 40x40; a page is 40 wide (wider for three digits) and 46 high.
export const FirstPage: Story = {
  args: { currentPage: 1, totalPages: 101 },
  decorators: [sourceFrame],
  parameters: { design: { type: "figma", url: figmaEmbedUrl("126:5056") } },
  play: async ({ canvasElement }) => {
    const pagination = within(canvasElement).getByRole("navigation", {
      name: "Paginazione",
    })
    const controls = within(pagination)
    const current = controls.getByRole("button", { name: "Pagina 1" })
    await expect(current).toHaveAttribute("aria-current", "page")
    // A forced-colors border may wrap the page: measure the hug inside it.
    const border = getComputedStyle(current)
    const borderY = parseFloat(border.borderTopWidth) + parseFloat(border.borderBottomWidth)
    await expect([current.offsetWidth, current.offsetHeight - borderY]).toEqual([40, 46])
    for (const name of ["Pagina precedente", "Pagina successiva"]) {
      const step = controls.getByRole("button", { name })
      await expect([step.offsetWidth, step.offsetHeight]).toEqual([40, 40])
    }
  },
}

export const SecondPage: Story = {
  args: { currentPage: 2, totalPages: 101 },
  decorators: [sourceFrame],
  parameters: { design: { type: "figma", url: figmaEmbedUrl("127:1511") } },
}

export const LastPage: Story = {
  args: { currentPage: 101, totalPages: 101 },
  decorators: [sourceFrame],
  parameters: { design: { type: "figma", url: figmaEmbedUrl("127:1535") } },
}

function InteractivePagination() {
  const [page, setPage] = React.useState(4)
  return (
    <div className="grid gap-3">
      <Pagination currentPage={page} totalPages={12} onPageChange={setPage} />
      <output>Pagina selezionata: {page}</output>
    </div>
  )
}

export const Interactive: Story = {
  decorators: [contentWidth],
  render: () => <InteractivePagination />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await userEvent.click(canvas.getByRole("button", { name: "Pagina successiva" }))
    await expect(canvas.getByText("Pagina selezionata: 5")).toBeInTheDocument()
  },
}

export const PaginationEmpty: Story = {
  decorators: [contentWidth],
  render: () => <Pagination currentPage={1} totalPages={0} onPageChange={selectEmptyPage} />,
  play: async ({ canvasElement }) => {
    const pagination = within(canvasElement).getByRole("navigation", {
      name: "Paginazione",
    })
    const controls = within(pagination)
    await expect(controls.queryByRole("button", { name: /^Pagina \d+$/ })).not.toBeInTheDocument()
    await expect(controls.getByRole("button", { name: "Pagina precedente" })).toBeDisabled()
    await expect(controls.getByRole("button", { name: "Pagina successiva" })).toBeDisabled()
  },
}
