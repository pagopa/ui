import type { Meta, StoryObj } from "@storybook/react-vite"
import { expect } from "storybook/test"

import {
  expectFocusPaint,
  expectReflowConditions,
  focusWithKeyboard,
  isTestRun,
} from "./support/a11y-contract"

// A support surface, not a product page: it proves that two conditions of the
// accessibility contract can fail. A check that cannot fail is not a check, and
// these two read the browser rather than the markup, so no unit test reaches
// them.
function ContractProof() {
  // Deliberately bare: the page itself has to clear the contract, and only the
  // fixture each story adds is meant to break it. What the proof is for lives in
  // the docs description, where a 200% zoom cannot overflow it.
  return (
    <main className="pui:p-6">
      <p className="pui:text-body">Prova.</p>
    </main>
  )
}

const meta = {
  title: "Components/Accessibility",
  component: ContractProof,
  parameters: {
    // A harness proof: it renders no product surface to compare over time.
    chromatic: { disableSnapshot: true },
    docs: {
      description: {
        component: `Negative tests for the two browser conditions of the accessibility contract (\`apps/storybook/src/support/a11y-contract.ts\`).

The focus proof focuses a control that paints no cue and asserts \`expectFocusPaint\` rejects it. The reflow proof widens the page past the viewport and asserts \`expectReflowConditions\` rejects it — in a browser test run only, because the condition needs the page controller \`@vitest/browser/context\` provides.`,
      },
    },
  },
} satisfies Meta<typeof ContractProof>

export default meta
type Story = StoryObj<typeof meta>

/**
 * WCAG 1.4.11: a focused control must paint a measurable cue. This one is
 * stripped of outline, shadow and background, so the measurement finds nothing
 * to read and the condition has to say so.
 */
export const FocusPaintFailsOnACueLessControl: Story = {
  play: async ({ canvasElement }) => {
    const control = document.createElement("button")
    control.type = "button"
    control.textContent = "Senza indicatore di focus"
    control.style.cssText = "border:0;background:transparent;box-shadow:none;outline:none;padding:0"
    canvasElement.append(control)
    try {
      await focusWithKeyboard(control)
      await expect(expectFocusPaint(control)).rejects.toThrow(/paints no measurable cue/)
    } finally {
      control.blur()
      control.remove()
    }
  },
}

/**
 * WCAG 1.4.10: at 320px the page must not scroll horizontally. A box wider than
 * the viewport makes it scroll, and the condition has to report that instead of
 * measuring the viewport it expected.
 */
export const ReflowFailsOnAWiderThanViewportPage: Story = {
  play: async () => {
    if (!isTestRun()) return
    const overflow = document.createElement("div")
    overflow.style.cssText =
      "position:absolute;top:0;left:0;width:900px;height:2px;background:currentColor"
    document.body.append(overflow)
    try {
      await expect(expectReflowConditions("components-accessibility-reflow-proof")).rejects.toThrow(
        /scrolls horizontally/,
      )
    } finally {
      overflow.remove()
    }
  },
}
