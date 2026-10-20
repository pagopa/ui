import * as React from "react"
import type { Meta, StoryObj } from "@storybook/react-vite"
import { expect, fn, userEvent, within } from "storybook/test"

import { Pagination } from "@/components/navigation"

const selectEmptyPage = fn()

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
        component:
          "Application-controlled pagination: the current page is normalised, the controls stay native buttons, the ellipses are decorative and not announced.",
      },
    },
  },
  // The component sizes itself with a container query, so the centered canvas
  // would otherwise collapse it: give every story a real content width.
  decorators: [
    (Story) => (
      <div className="w-[min(48rem,calc(100vw-2rem))]">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof Pagination>

export default meta
type Story = StoryObj<typeof meta>

export const Playground: Story = {}

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
  render: () => <InteractivePagination />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await userEvent.click(canvas.getByRole("button", { name: "Pagina successiva" }))
    await expect(canvas.getByText("Pagina selezionata: 5")).toBeInTheDocument()
  },
}

export const PaginationEmpty: Story = {
  render: () => <Pagination currentPage={1} totalPages={0} onPageChange={selectEmptyPage} />,
  play: async ({ canvasElement }) => {
    const pagination = within(canvasElement).getByRole("navigation", { name: "Paginazione" })
    const controls = within(pagination)
    await expect(controls.queryByRole("button", { name: /^Pagina \d+$/ })).not.toBeInTheDocument()
    await expect(controls.getByRole("button", { name: "Pagina precedente" })).toBeDisabled()
    await expect(controls.getByRole("button", { name: "Pagina successiva" })).toBeDisabled()
  },
}
