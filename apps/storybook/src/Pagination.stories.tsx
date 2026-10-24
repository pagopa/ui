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

// The collapse step is the pagination region's width (900px, the `tablet-md`
// container step): one pixel below it only previous, the current page and next
// survive; at the step the page window returns. Both regions live in this
// story, so the threshold is proven side by side.
export const CollapseWidth: Story = {
  render: () => (
    <div className="grid w-full grid-cols-1 gap-6">
      {[
        { width: 899, className: "w-[899px]" },
        { width: 900, className: "w-[900px]" },
      ].map((region) => (
        <div
          key={region.width}
          data-pagination-width={region.width}
          className={`max-w-full ${region.className}`}
        >
          <Pagination
            currentPage={4}
            totalPages={12}
            onPageChange={selectEmptyPage}
            label={`Paginazione ${region.width}px`}
          />
        </div>
      ))}
    </div>
  ),
  play: async ({ canvasElement }) => {
    const region = (width: number) => {
      const wrapper = canvasElement.querySelector<HTMLElement>(`[data-pagination-width="${width}"]`)
      if (!wrapper) throw new Error(`Missing the ${width}px pagination region`)
      return wrapper
    }

    const collapsed = within(region(899))
    const collapsedNav = collapsed.getByRole("navigation", { name: "Paginazione 899px" })
    await expect(within(collapsedNav).getAllByRole("button")).toHaveLength(3)
    await expect(collapsed.getByRole("button", { name: "Pagina 4" })).toHaveAttribute(
      "aria-current",
      "page",
    )
    for (const name of ["Pagina 1", "Pagina 3", "Pagina 5", "Pagina 12"]) {
      await expect(collapsed.queryByRole("button", { name })).not.toBeInTheDocument()
    }
    await expect(collapsedNav.scrollWidth).toBeLessThanOrEqual(collapsedNav.clientWidth)

    const expanded = within(region(900))
    const expandedNav = expanded.getByRole("navigation", { name: "Paginazione 900px" })
    await expect(within(expandedNav).getAllByRole("button")).toHaveLength(7)
    for (const name of ["Pagina 1", "Pagina 3", "Pagina 4", "Pagina 5", "Pagina 12"]) {
      await expect(expanded.getByRole("button", { name })).toBeVisible()
    }
  },
}

// One page has nothing to move through: the control renders nothing at all.
export const SinglePage: Story = {
  render: () => (
    <div className="grid gap-3">
      <p>Solo una pagina: il controllo non compare.</p>
      <Pagination currentPage={1} totalPages={1} onPageChange={selectEmptyPage} />
    </div>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await expect(canvas.getByText("Solo una pagina: il controllo non compare.")).toBeVisible()
    await expect(canvas.queryByRole("navigation")).not.toBeInTheDocument()
    await expect(canvas.queryByRole("button")).not.toBeInTheDocument()
  },
}

export const PaginationEmpty: Story = {
  render: () => (
    <div className="grid gap-3">
      <p>Nessun risultato: il controllo non compare.</p>
      <Pagination currentPage={1} totalPages={0} onPageChange={selectEmptyPage} />
    </div>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    // An empty collection hides the control exactly like a single page; the
    // integer guard still rejects a negative or fractional total.
    await expect(canvas.queryByRole("navigation", { name: "Paginazione" })).not.toBeInTheDocument()
    await expect(canvas.queryByRole("button")).not.toBeInTheDocument()
  },
}
