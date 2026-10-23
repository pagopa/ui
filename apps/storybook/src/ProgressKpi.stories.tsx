import type { Meta, StoryObj } from "@storybook/react-vite"
import { expect, within } from "storybook/test"

import { figmaEmbedUrl } from "@/catalog/figma/file"
import { ProgressKpi } from "@/components/data-display"
import { PagoPAIcon } from "@/components/icons/PagoPAIcon"

import progressKpiGuide from "./guides/progress-kpi.md?raw"

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
    design: { type: "figma", url: figmaEmbedUrl("12133:82475") },
    docs: {
      description: {
        component: progressKpiGuide,
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

// The source card is 202px wide; the block wrapper lets `max-w-full` cap it
// instead of a grid track growing to the fixed width at 200% text.
function SourceCard({ variant, children }: { variant: string; children: React.ReactNode }) {
  return (
    <div data-fidelity-variant={variant} className="w-50.5 max-w-full">
      {children}
    </div>
  )
}

export const FidelityDefault: Story = {
  name: "Pinned source anatomy — Type=Default",
  tags: ["color-pinned"],
  parameters: {
    design: { type: "figma", url: figmaEmbedUrl("12133:82475") },
  },
  render: () => (
    <SourceCard variant="9612-4303">
      <ProgressKpi
        label="Inviate "
        value={51}
        total={100}
        channel={<PagoPAIcon name="send" />}
        info={<PagoPAIcon name="info" />}
      />
    </SourceCard>
  ),
  play: async ({ canvasElement }) => {
    const section = canvasElement.querySelector<HTMLElement>(
      '[data-fidelity-variant="9612-4303"] section',
    )
    if (!section) throw new Error("Missing ProgressKpi source card")
    const canvas = within(section)

    // Source 202x190; the render measures +2 because the 1px CSS border sits
    // inside the card while the Figma stroke is drawn inside the frame (within
    // the case's 2px tolerance).
    const bounds = section.getBoundingClientRect()
    await expect(bounds.width).toBe(202)
    await expect(bounds.height).toBe(192)
    const style = getComputedStyle(section)
    await expect(style.borderTopLeftRadius).toBe("24px")
    await expect(style.borderTopWidth).toBe("1px")
    await expect(style.paddingTop).toBe("24px")
    await expect(style.rowGap).toBe("12px")
    await expect(section.getAttribute("aria-label")).toBe("Inviate ")

    const header = section.querySelector<HTMLElement>("header")
    if (!header) throw new Error("Missing ProgressKpi source header")
    await expect(header.getBoundingClientRect().height).toBe(24)
    await expect(getComputedStyle(header).columnGap).toBe("8px")
    const title = [...header.querySelectorAll<HTMLElement>("span")].find(
      (span) => span.textContent?.trim() === "Inviate",
    )
    if (!title) throw new Error("Missing ProgressKpi source title")
    await expect(getComputedStyle(title).fontSize).toBe("16px")
    await expect(getComputedStyle(title).fontWeight).toBe("600")
    await expect(getComputedStyle(title).color).toBe("rgb(85, 92, 112)")

    const percentage = canvas.getByText("51%")
    await expect(percentage.getBoundingClientRect().height).toBe(48)
    await expect(getComputedStyle(percentage).fontSize).toBe("32px")
    await expect(getComputedStyle(percentage).lineHeight).toBe("48px")

    const bars = section.querySelectorAll<HTMLElement>("[role='progressbar']")
    await expect(bars).toHaveLength(1)
    await expect(bars[0].getBoundingClientRect().width).toBe(152)
    await expect(bars[0].getBoundingClientRect().height).toBe(16)
    await expect(getComputedStyle(bars[0]).backgroundColor).toBe("rgb(232, 235, 241)")
    await expect(bars[0].getAttribute("aria-valuenow")).toBe("51")

    const footer = section.querySelector<HTMLElement>("[data-slot='progress-kpi-footer']")
    if (!footer) throw new Error("Missing ProgressKpi source footer")
    await expect(footer.getBoundingClientRect().height).toBe(22)
    await expect(getComputedStyle(footer).columnGap).toBe("2px")
    await expect(canvas.getByText("51")).toBeVisible()
    await expect(canvas.getByText("/ 100")).toBeVisible()
  },
}

export const FidelityMulti: Story = {
  name: "Pinned source anatomy — Type=Multi",
  tags: ["color-pinned"],
  parameters: {
    design: { type: "figma", url: figmaEmbedUrl("12133:82475") },
  },
  render: () => (
    <SourceCard variant="12133-82476">
      <ProgressKpi
        label="Inviate "
        value={51}
        total={100}
        channel={<PagoPAIcon name="send" />}
        info={<PagoPAIcon name="info" />}
        details={[{ label: "Label", value: 6, total: 11 }]}
      />
    </SourceCard>
  ),
  play: async ({ canvasElement }) => {
    const section = canvasElement.querySelector<HTMLElement>(
      '[data-fidelity-variant="12133-82476"] section',
    )
    if (!section) throw new Error("Missing ProgressKpi multi source card")
    const canvas = within(section)

    // Source 202x282 (+2 for the retained inner border, see the Default story).
    const bounds = section.getBoundingClientRect()
    await expect(bounds.width).toBe(202)
    await expect(bounds.height).toBe(284)

    // The secondary row: label, 8px bar, its own footer, inside the 10px Data slot.
    const data = section.querySelector<HTMLElement>("[data-slot='progress-kpi-details']")
    if (!data) throw new Error("Missing ProgressKpi source Data slot")
    await expect(data.getBoundingClientRect().height).toBe(80)
    await expect(getComputedStyle(data).rowGap).toBe("10px")
    const row = data.querySelector<HTMLElement>("[data-slot='progress-kpi-row']")
    if (!row) throw new Error("Missing ProgressKpi source row")
    await expect(row.getBoundingClientRect().height).toBe(80)
    await expect(getComputedStyle(row).rowGap).toBe("8px")
    await expect(getComputedStyle(row).paddingTop).toBe("8px")
    const description = canvas.getByText("Label")
    await expect(getComputedStyle(description).fontSize).toBe("12px")
    await expect(getComputedStyle(description).fontWeight).toBe("600")
    await expect(getComputedStyle(description).color).toBe("rgb(85, 92, 112)")

    const bars = section.querySelectorAll<HTMLElement>("[role='progressbar']")
    await expect(bars).toHaveLength(2)
    await expect(bars[0].getBoundingClientRect().height).toBe(16)
    await expect(bars[1].getBoundingClientRect().height).toBe(8)
    await expect(bars[1].getAttribute("aria-valuenow")).toBe("55")
    await expect(canvas.getByText("6")).toBeVisible()
    await expect(canvas.getByText("/ 11")).toBeVisible()
  },
}
