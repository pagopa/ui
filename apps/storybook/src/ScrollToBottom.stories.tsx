import * as React from "react"
import type { Meta, StoryObj } from "@storybook/react-vite"
import { expect, spyOn, userEvent, waitFor, within } from "storybook/test"

import { ScrollToBottom } from "@/components/feedback/scroll-to-bottom"
import { figmaEmbedUrl } from "@/catalog/figma/file"

import scrollToBottomGuide from "./guides/scroll-to-bottom.md?raw"

const meta = {
  title: "Components/Feedback/ScrollToBottom",
  component: ScrollToBottom,
  args: { label: "Vai in fondo" },
  parameters: {
    design: { type: "figma", url: figmaEmbedUrl("180:3931") },
    docs: {
      description: {
        component: `Floating button that returns to the bottom of a scrollable region or of the page. Under reduced motion the scroll is instant instead of animated.

${scrollToBottomGuide}`,
      },
    },
  },
} satisfies Meta<typeof ScrollToBottom>

export default meta
type Story = StoryObj<typeof meta>

function ScrollExample() {
  const target = React.useRef<HTMLDivElement>(null)
  return (
    <div className="pui:grid pui:gap-4">
      <div
        ref={target}
        role="region"
        aria-label="Informazioni"
        tabIndex={0}
        className="pui:h-32 pui:w-64 pui:overflow-auto"
      >
        {Array.from({ length: 20 }, (_, index) => (
          <p key={index} className="pui:py-2">
            Informazione {index + 1}
          </p>
        ))}
      </div>
      <ScrollToBottom target={target} />
    </div>
  )
}

export const Playground: Story = {
  // Reflow exemption debt, tracked in docs/design-requests/2026-11-26-reflow-exemption-debt.md.
  parameters: { a11yContract: { reflow: false } },
  render: () => <ScrollExample />,
}

export const ReducedMotionScroll: Story = {
  // Reflow exemption debt, tracked in docs/design-requests/2026-11-26-reflow-exemption-debt.md.
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

/**
 * The same control with the engine's own preference, not a mock. It is the
 * harness proof for the `storybook-reduced-motion` pass: the story asserts the
 * behaviour the media query implies at that moment, so it reads `smooth` in the
 * default pass and `instant` in the reduced-motion pass. If the condition ever
 * stopped reaching the browser, one of the two passes would fail instead of
 * quietly passing twice.
 */
export const RealMotionPreference: Story = {
  // Reflow exemption debt, tracked in docs/design-requests/2026-11-26-reflow-exemption-debt.md.
  parameters: { a11yContract: { reflow: false } },
  render: () => <ScrollExample />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const region = canvas.getByRole("region", { name: "Informazioni" })
    const behavior = window.matchMedia("(prefers-reduced-motion: reduce)").matches
      ? "instant"
      : "smooth"
    const scroll = spyOn(region, "scrollTo")
    try {
      await userEvent.click(canvas.getByRole("button", { name: "Vai in fondo" }))
      await expect(scroll).toHaveBeenCalledWith({ top: region.scrollHeight, behavior })
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

// The source draws the floating button alone: a 56x56 primary circle with
// Shadow 32 and the 24px arrow/down artwork. The scroll region only keeps the
// button in its visible state, since the component hides itself once the
// region has reached its end.
function SourceButtonFixture() {
  const target = React.useRef<HTMLDivElement>(null)
  return (
    <div className="pui:grid pui:w-14 pui:gap-4">
      <ScrollToBottom target={target} />
      <div
        ref={target}
        role="region"
        aria-label="Informazioni"
        tabIndex={0}
        className="pui:h-56 pui:w-14 pui:overflow-auto"
      >
        {Array.from({ length: 8 }, (_, index) => (
          <p key={index} className="pui:py-2">
            Informazione {index + 1}
          </p>
        ))}
      </div>
    </div>
  )
}

export const SourceButton: Story = {
  // Reflow exemption: the fixture pins the source 56px button, not a product surface.
  parameters: { layout: "fullscreen", a11yContract: { reflow: false } },
  render: () => <SourceButtonFixture />,
}
