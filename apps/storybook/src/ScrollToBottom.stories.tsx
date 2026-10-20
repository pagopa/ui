import * as React from "react"
import type { Meta, StoryObj } from "@storybook/react-vite"
import { expect, spyOn, userEvent, waitFor, within } from "storybook/test"

import { ScrollToBottom } from "@/components/feedback/scroll-to-bottom"
import { figmaEmbedUrl } from "@/catalog/figma/file"

const meta = {
  title: "Components/Feedback/ScrollToBottom",
  component: ScrollToBottom,
  args: { label: "Vai in fondo" },
  parameters: {
    design: { type: "figma", url: figmaEmbedUrl("180:3931") },
    docs: {
      description: {
        component:
          "Floating button that returns to the bottom of a scrollable region or of the page. Under reduced motion the scroll is instant instead of animated.",
      },
    },
  },
} satisfies Meta<typeof ScrollToBottom>

export default meta
type Story = StoryObj<typeof meta>

function ScrollExample() {
  const target = React.useRef<HTMLDivElement>(null)
  return (
    <div className="grid gap-4">
      <div
        ref={target}
        role="region"
        aria-label="Informazioni"
        tabIndex={0}
        className="h-32 w-64 overflow-auto"
      >
        {Array.from({ length: 20 }, (_, index) => (
          <p key={index} className="py-2">
            Informazione {index + 1}
          </p>
        ))}
      </div>
      <ScrollToBottom target={target} />
    </div>
  )
}

export const Playground: Story = {
  // Reflow exemption pending a design request: docs/design-requests/2026-10-16-a11y-reflow-conditions.md.
  parameters: { a11yContract: { reflow: false } },
  render: () => <ScrollExample />,
}

export const ReducedMotionScroll: Story = {
  // Reflow exemption pending a design request: docs/design-requests/2026-10-16-a11y-reflow-conditions.md.
  parameters: { a11yContract: { reflow: false } },
  beforeEach: () => {
    const original = window.matchMedia.bind(window)
    const preference = spyOn(window, "matchMedia").mockImplementation((query) => {
      const media = original(query)
      if (query === "(prefers-reduced-motion: reduce)")
        Object.defineProperty(media, "matches", { value: true })
      return media
    })
    return () => preference.mockRestore()
  },
  render: () => <ScrollExample />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const region = canvas.getByRole("region", { name: "Informazioni" })
    const scroll = spyOn(region, "scrollTo")
    try {
      await userEvent.click(canvas.getByRole("button", { name: "Vai in fondo" }))
      await expect(scroll).toHaveBeenCalledWith({ top: region.scrollHeight, behavior: "instant" })
      await waitFor(() =>
        expect(region.scrollTop).toBeGreaterThanOrEqual(
          region.scrollHeight - region.clientHeight - 1,
        ),
      )
    } finally {
      scroll.mockRestore()
    }
  },
}
