import * as React from "react"
import type { Meta, StoryObj } from "@storybook/react-vite"
import { expect, userEvent, within } from "storybook/test"

import { Snackbar } from "@/components/feedback/snackbar"
import { Button } from "@/components/primitives/button"
import { figmaEmbedUrl } from "@/catalog/figma/file"
import snackbarGuide from "./guides/snackbars.md?raw"

const meta = {
  title: "Components/Feedback/Snackbar",
  component: Snackbar,
  args: {
    title: "Titolo della snackbar",
    message: "Ut enim ad minim veniam, quis ullamco laboris nisi ut aliquid",
    tone: "info",
  },
  argTypes: {
    tone: { control: "select", options: ["info", "success", "warning", "error"] },
    title: { control: "text" },
    message: { control: "text" },
    action: { control: false },
    onDismiss: { control: false },
  },
  parameters: {
    design: { type: "figma", url: figmaEmbedUrl("357:4970") },
    a11y: { test: "error" },
    docs: {
      description: {
        component: `The four severities reuse the source icons and semantic tokens. Title and description stay configurable content; the action is a separate native control and the close is an accessible button.\n\n${snackbarGuide}`,
      },
    },
  },
} satisfies Meta<typeof Snackbar>

export default meta
type Story = StoryObj<typeof meta>

export const Playground: Story = {}

export const WithAction: Story = {
  args: {
    title: "Operazione completata",
    message: "Elemento spostato nel cestino.",
    action: (
      <Button variant="ghost" size="sm" className="min-h-11 min-w-11">
        Annulla
      </Button>
    ),
  },
}

function SourceSnackbarPreview({
  tone,
  title,
  message,
}: Pick<React.ComponentProps<typeof Snackbar>, "tone" | "title" | "message">) {
  const [visible, setVisible] = React.useState(true)
  if (!visible) return <output>Notifica chiusa</output>
  return (
    <Snackbar tone={tone} title={title} message={message} onDismiss={() => setVisible(false)} />
  )
}

export const SourceCase: Story = {
  args: {
    tone: "error",
    title: "Titolo della snackbar",
    message: "Ut enim ad minim veniam, quis ullamco laboris nisi ut aliquid",
  },
  render: ({ tone, title, message }) => (
    <SourceSnackbarPreview tone={tone} title={title} message={message} />
  ),
}

function DismissableSnackbar() {
  const [visible, setVisible] = React.useState(true)
  if (!visible) return <output>Notifica chiusa</output>
  return (
    <Snackbar
      title="Preferenze salvate"
      message="Preferenze salvate correttamente."
      onDismiss={() => setVisible(false)}
      action={
        <Button variant="ghost" size="sm" className="min-h-11 min-w-11">
          Annulla
        </Button>
      }
    />
  )
}

export const Dismissable: Story = {
  render: () => <DismissableSnackbar />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const cancel = canvas.getByRole("button", { name: "Annulla" })
    const dismiss = canvas.getByRole("button", { name: "Chiudi notifica" })
    await expect(canvas.getByText("Preferenze salvate")).toBeVisible()
    await userEvent.tab()
    await expect(cancel).toHaveFocus()
    await userEvent.tab()
    await expect(dismiss).toHaveFocus()
    await userEvent.keyboard("{Enter}")
    await expect(canvas.getByText("Notifica chiusa")).toBeVisible()
  },
}

const fidelityVariant = (nodeId: string) => nodeId.replace(":", "-")

const fidelityVariants = [
  { nodeId: "357:4971", tone: "error", label: "Error" },
  { nodeId: "357:4981", tone: "warning", label: "Warning" },
  { nodeId: "357:4993", tone: "info", label: "Info" },
  { nodeId: "357:5005", tone: "success", label: "Success" },
] as const

export const Fidelity: Story = {
  parameters: { layout: "fullscreen" },
  render: () => (
    <div id="snackbar-fidelity" className="grid justify-items-start gap-4">
      {fidelityVariants.map((variant) => (
        <div
          key={variant.nodeId}
          data-fidelity-variant={fidelityVariant(variant.nodeId)}
          className="w-[280px] [&>*]:w-full"
        >
          <Snackbar
            tone={variant.tone}
            title="Titolo della snackbar"
            message="Ut enim ad minim veniam, quis ullamco laboris nisi ut aliquid"
            onDismiss={() => undefined}
          />
        </div>
      ))}
    </div>
  ),
}
