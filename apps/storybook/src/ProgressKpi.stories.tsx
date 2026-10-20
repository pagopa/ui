import type { Meta, StoryObj } from "@storybook/react-vite"
import { expect, within } from "storybook/test"

import { ProgressKpi } from "@/components/data-display"
import { PagoPAIcon } from "@/components/icons/PagoPAIcon"

const meta = {
  title: "Components/Data display/ProgressKpi",
  component: ProgressKpi,
  args: {
    label: "Obiettivo mensile",
    value: 72,
    detail: "72 operazioni su 100",
    channel: <PagoPAIcon name="send" />,
    info: <PagoPAIcon name="info" />,
  },
  argTypes: {
    value: { control: { type: "number", min: 0 } },
    total: { control: { type: "number", min: 1 } },
    label: { control: "text" },
    detail: { control: "text" },
    channel: { control: false },
    info: { control: false },
    details: { control: false },
  },
  parameters: {
    docs: {
      description: {
        component:
          "KPI card with a channel, title, percentage and bar, plus a value/total footer; the Completed state uses the success bar with check_circle and `details` covers the multiple rows.",
      },
    },
  },
} satisfies Meta<typeof ProgressKpi>

export default meta
type Story = StoryObj<typeof meta>

export const Playground: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await expect(canvas.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "72")
    await expect(canvas.getByText("72%")).toBeVisible()
  },
}

export const States: Story = {
  render: () => (
    <div className="grid w-[min(36rem,calc(100vw-2rem))] gap-4 sm:grid-cols-2">
      <ProgressKpi label="Inviate" value={51} total={69} channel={<PagoPAIcon name="send" />} />
      <ProgressKpi label="Consegnate" value={69} total={69} completed />
      <ProgressKpi
        label="Servizi attivi"
        value={51}
        total={69}
        channel={<PagoPAIcon name="send" />}
        details={[
          { label: "Email", value: 6, total: 11 },
          { label: "PEC", value: 3, total: 11 },
        ]}
      />
    </div>
  ),
}
