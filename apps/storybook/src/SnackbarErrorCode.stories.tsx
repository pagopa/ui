import type { Meta, StoryObj } from "@storybook/react-vite"
import { expect, fn, spyOn, userEvent, within } from "storybook/test"

import { SnackbarErrorCode } from "@/components/feedback/snackbar-error-code"
import { figmaEmbedUrl } from "@/catalog/figma/file"

const dismissSource = fn()

// The 44px pointer target is the invisible `after:-inset-2.5` expansion around
// the 24px source box, so the DOM box stays source-exact and the accessible
// target is proven by hit-testing just outside each edge.
function hasExpandedTarget(element: HTMLElement) {
  const box = element.getBoundingClientRect()
  const midX = box.left + box.width / 2
  const midY = box.top + box.height / 2
  return [
    [box.left - 8, midY],
    [box.right + 8, midY],
    [midX, box.top - 8],
    [midX, box.bottom + 8],
  ].every(([x, y]) => {
    const hit = document.elementFromPoint(x, y)
    return hit != null && element.contains(hit)
  })
}

const meta = {
  title: "Components/Feedback/SnackbarErrorCode",
  component: SnackbarErrorCode,
  args: { code: "PPT_001" },
  parameters: {
    design: { type: "figma", url: figmaEmbedUrl("392:4667") },
    docs: {
      description: {
        component:
          "Error snackbar with title, description and a copyable code. The copy uses the Clipboard API: if it is unavailable or rejected, the outcome is announced and the code stays readable by hand.",
      },
    },
  },
} satisfies Meta<typeof SnackbarErrorCode>

export default meta
type Story = StoryObj<typeof meta>

export const Playground: Story = {}

export const SourceCase: Story = {
  args: {
    message: "Titolo della snackbar",
    description: "Ut enim ad minim veniam, quis ullamco laboris nisi ut aliquid",
    code: "[Codice errore]",
    onDismiss: dismissSource,
  },
  parameters: { layout: "fullscreen" },
  render: (args) => (
    <div className="flex w-full justify-start">
      <div className="w-[280px] [&>*]:w-full">
        <SnackbarErrorCode {...args} />
      </div>
    </div>
  ),
  beforeEach: () => {
    dismissSource.mockClear()
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const snackbar = canvas.getByRole("alert")
    const copy = canvas.getByRole("button", { name: "Copia codice" })
    const dismiss = canvas.getByRole("button", { name: "Chiudi notifica" })
    const bounds = snackbar.getBoundingClientRect()

    await expect(canvas.getByText("[Codice errore]")).toBeVisible()
    await expect(copy).toHaveAttribute("type", "button")
    expect(bounds.x).toBeGreaterThanOrEqual(0)
    expect(bounds.right).toBeLessThanOrEqual(window.innerWidth)
    expect(hasExpandedTarget(copy)).toBe(true)
    expect(hasExpandedTarget(dismiss)).toBe(true)
  },
}

export const DismissAction: Story = {
  args: {
    message: "Titolo della snackbar",
    description: "Ut enim ad minim veniam, quis ullamco laboris nisi ut aliquid",
    code: "[Codice errore]",
    onDismiss: dismissSource,
  },
  beforeEach: () => {
    dismissSource.mockClear()
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await userEvent.click(canvas.getByRole("button", { name: "Chiudi notifica" }))
    await expect(dismissSource).toHaveBeenCalledTimes(1)
  },
}

export const ClipboardUnavailable: Story = {
  beforeEach: () => {
    const descriptor = Object.getOwnPropertyDescriptor(navigator, "clipboard")
    Object.defineProperty(navigator, "clipboard", { configurable: true, value: undefined })
    return () => {
      if (descriptor) Object.defineProperty(navigator, "clipboard", descriptor)
      else Reflect.deleteProperty(navigator, "clipboard")
    }
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await userEvent.click(canvas.getByRole("button", { name: "Copia codice" }))
    await expect(
      canvas.getByText("Impossibile copiare il codice. Copialo manualmente."),
    ).toBeVisible()
    await expect(canvas.queryByText("Codice copiato")).not.toBeInTheDocument()
  },
}

export const ClipboardSuccess: Story = {
  // The copy outcome is announced, not only shown: the story is the proof.
  tags: ["live-region"],
  beforeEach: () => {
    const clipboard = spyOn(navigator.clipboard, "writeText").mockResolvedValue(undefined)
    return () => clipboard.mockRestore()
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const status = canvas.getByRole("status")
    await expect(status).toBeEmptyDOMElement()
    const copy = canvas.getByRole("button", { name: "Copia codice" })
    await userEvent.click(copy)
    await expect(navigator.clipboard.writeText).toHaveBeenLastCalledWith("PPT_001")
    await expect(status).toHaveTextContent("Codice copiato")
    await userEvent.click(copy)
    await expect(navigator.clipboard.writeText).toHaveBeenCalledTimes(2)
    await expect(canvas.getByRole("status")).toBe(status)
    await expect(status).toHaveTextContent("Codice copiato")
    await expect(
      canvas.queryByText("Impossibile copiare il codice. Copialo manualmente."),
    ).not.toBeInTheDocument()
  },
}

export const ClipboardRejected: Story = {
  beforeEach: () => {
    const clipboard = spyOn(navigator.clipboard, "writeText").mockRejectedValue(
      new DOMException("Clipboard permission denied", "NotAllowedError"),
    )
    return () => clipboard.mockRestore()
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await userEvent.click(canvas.getByRole("button", { name: "Copia codice" }))
    await expect(
      canvas.getByText("Impossibile copiare il codice. Copialo manualmente."),
    ).toBeVisible()
    await expect(canvas.getByRole("status")).toBeEmptyDOMElement()
    await expect(canvas.getByText("PPT_001")).toBeVisible()
  },
}
