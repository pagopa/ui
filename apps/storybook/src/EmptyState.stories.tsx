import type { Meta, StoryObj } from "@storybook/react-vite"
import { expect, within } from "storybook/test"

import { EmptyState } from "@/components/feedback"
import { PagoPAPictogram } from "@/components/icons/PagoPAPictogram"
import { Button } from "@/components/primitives/button"
import { figmaEmbedUrl } from "@/catalog/figma/file"

import emptyStateGuide from "./guides/empty-state.md?raw"

// Source anatomy (`11149:7765`, 832×184): a 56px `Error` pictogram, a centred
// title/subtitle pair and a 48×22 semibold text action. The 44px pointer target
// comes from the invisible ::after expansion, so the action keeps its 22px
// source line instead of inflating the card by 26px.
const sourceIcon = <PagoPAPictogram name="Error" size={56} />

function SourceAction({ children }: { children: React.ReactNode }) {
  return (
    <Button
      type="button"
      variant="link"
      className="relative min-h-0 px-0 after:absolute after:inset-x-0 after:-inset-y-3"
    >
      {children}
    </Button>
  )
}

const meta = {
  title: "Components/Feedback/EmptyState",
  component: EmptyState,
  args: {
    title: "Nessun pagamento",
    description: "Quando effettuerai un pagamento, lo troverai qui.",
  },
  argTypes: {
    titleAs: { control: "select", options: ["h2", "h3", "h4"] },
    actions: { control: false },
    icon: { control: false },
  },
  parameters: {
    design: { type: "figma", url: figmaEmbedUrl("11149:7765") },
    docs: {
      description: {
        component: emptyStateGuide,
      },
    },
  },
} satisfies Meta<typeof EmptyState>

export default meta
type Story = StoryObj<typeof meta>

export const Playground: Story = {
  // The fixture carries the source frame (832px = `w-208`) and the source state:
  // pictogram + action, not a bare title/subtitle pair at the viewport width.
  args: { icon: sourceIcon, actions: <SourceAction>Inizia ora</SourceAction> },
  render: (args) => <EmptyState {...args} className="w-208 max-w-full" />,
}

export const WithAction: Story = {
  args: { actions: <SourceAction>Inizia ora</SourceAction> },
}

export const Fidelity: Story = {
  name: "Pinned source anatomy",
  tags: ["color-pinned"],
  parameters: {
    design: { type: "figma", url: figmaEmbedUrl("11149:7765") },
  },
  render: () => (
    <div data-fidelity-variant="11149-7765">
      <EmptyState
        title="C’è stato un problema nel caricamento delle opportunità."
        description="Subtitle"
        icon={sourceIcon}
        actions={<SourceAction>Action</SourceAction>}
        className="w-208 max-w-full"
      />
    </div>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const section = canvasElement.querySelector<HTMLElement>("[data-fidelity-variant] section")
    if (!section) throw new Error("Missing EmptyState source frame")

    // 832x184 source card: 8px radius, 1px #e8ebf1 border, 16px padding. The
    // render measures 188: the shared link action keeps its 24px native box
    // (+2 on the source 22) and the CSS border sits inside the 184px card (+2),
    // the residue recorded in the parity case.
    const bounds = section.getBoundingClientRect()
    await expect(bounds.width).toBe(832)
    await expect(bounds.height).toBe(188)
    const style = getComputedStyle(section)
    await expect(style.borderTopLeftRadius).toBe("8px")
    await expect(style.borderTopWidth).toBe("1px")
    await expect(style.paddingTop).toBe("16px")
    await expect(style.paddingLeft).toBe("16px")
    await expect(style.rowGap).toBe("16px")

    const icon = section.querySelector<HTMLElement>("[data-slot='empty-state-icon']")
    if (!icon) throw new Error("Missing EmptyState source pictogram")
    await expect(icon.getAttribute("aria-hidden")).toBe("true")
    await expect(icon.getBoundingClientRect().width).toBe(56)
    await expect(icon.getBoundingClientRect().height).toBe(56)

    const title = canvas.getByRole("heading", { level: 2 })
    await expect(title.getBoundingClientRect().height).toBe(22)
    await expect(getComputedStyle(title).fontSize).toBe("16px")
    await expect(getComputedStyle(title).fontWeight).toBe("600")
    await expect(getComputedStyle(title).color).toBe("rgb(99, 107, 130)")

    const description = canvas.getByText("Subtitle")
    await expect(description.getBoundingClientRect().height).toBe(20)
    await expect(getComputedStyle(description).fontSize).toBe("14px")
    await expect(getComputedStyle(description).fontWeight).toBe("400")
    await expect(getComputedStyle(description).color).toBe("rgb(85, 92, 112)")

    const action = canvas.getByRole("button", { name: "Action" })
    // The shared link action keeps its 24px native box where the source Button
    // instance is a content-sized 22px row (the case's recorded residue).
    await expect(action.getBoundingClientRect().height).toBe(24)
    await expect(getComputedStyle(action).fontWeight).toBe("600")
    // The pointer target is the action plus its invisible vertical ::after expansion.
    const target = getComputedStyle(action, "::after")
    const reach =
      action.getBoundingClientRect().height -
      Number.parseFloat(target.top) -
      Number.parseFloat(target.bottom)
    await expect(reach).toBeGreaterThanOrEqual(44)
  },
}
