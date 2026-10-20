import type { Meta, StoryObj } from "@storybook/react-vite"
import { expect, fn, userEvent, within } from "storybook/test"

import { Avatar } from "@/components/content"
import { DragAndDrop } from "@/components/inputs"

const meta = {
  title: "Components/Inputs/DragAndDrop",
  component: DragAndDrop,
  args: {
    label: "Allega la ricevuta",
    accept: "application/pdf,image/*",
    description: "PDF o immagine.",
  },
  argTypes: {
    accept: { control: "text" },
    multiple: { control: "boolean" },
    onFilesChange: { control: false },
    onCancel: { control: false },
    onRetry: { control: false },
    preview: { control: false },
  },
  parameters: {
    docs: {
      description: {
        component:
          "File upload with a drag-and-drop area: a native input with an associated label, the source Processing and Failed states with their actions, uploaded files with removal, and an Avatar variant for the logo with a caller-owned preview.",
      },
    },
  },
} satisfies Meta<typeof DragAndDrop>

export default meta
type Story = StoryObj<typeof meta>

// Source dropzone frame: 272x236 with a 24px-inset helper (`760:7433`).
export const Playground: Story = {
  render: (args) => (
    <div className="w-68 max-w-full">
      <DragAndDrop {...args} />
    </div>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    // Source dropzone anatomy: instruction + support copy and one contained
    // "Carica il file" action. The action is decorative — the native file input
    // stays the only interactive control of the surface.
    await expect(canvas.getByText("Trascina qui i file o selezionali")).toBeVisible()
    await expect(canvas.getByText("Seleziona un file")).toBeVisible()
    const upload = canvas.getByText("Carica il file")
    await expect(upload).toBeVisible()
    await expect(upload.closest("button")).toBeNull()
    const receipt = new File(["ricevuta"], "ricevuta.pdf", { type: "application/pdf" })
    await userEvent.upload(canvas.getByLabelText(/Allega la ricevuta/), receipt)
    await expect(canvas.getByText("ricevuta.pdf")).toBeInTheDocument()
    await userEvent.click(canvas.getByRole("button", { name: "Rimuovi ricevuta.pdf" }))
    await expect(canvas.queryByText("ricevuta.pdf")).not.toBeInTheDocument()
  },
}

export const Multiple: Story = {
  args: { multiple: true, label: "Documenti", accept: ".pdf,.png,.jpg,.jpeg" },
}

export const Processing: Story = {
  // Reflow exemption pending a design request: docs/design-requests/2026-10-16-a11y-reflow-conditions.md.
  parameters: { a11yContract: { reflow: false } },
  args: { loading: true, onCancel: fn() },
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement)
    await expect(canvas.getByText("Caricamento in corso...")).toBeVisible()
    await userEvent.click(canvas.getByRole("button", { name: "Annulla" }))
    await expect(args.onCancel).toHaveBeenCalledTimes(1)
  },
}

export const Failed: Story = {
  // Reflow exemption pending a design request: docs/design-requests/2026-10-16-a11y-reflow-conditions.md.
  parameters: { a11yContract: { reflow: false } },
  args: {
    failed: true,
    error: "Il caricamento non è andato a buon fine.",
    onRetry: fn(),
  },
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement)
    await expect(canvas.getByText("Caricamento fallito")).toBeVisible()
    await userEvent.click(canvas.getByRole("button", { name: "Riprova" }))
    await expect(args.onRetry).toHaveBeenCalledTimes(1)
  },
}

export const AvatarVariant: Story = {
  args: {
    label: "Logo dell'ente",
    variant: "avatar",
    helper: "Dimensione massima 300 x 300px. Formato .jpg o .png.",
    preview: <Avatar alt="Comune di Milano" initials="CM" size="large" />,
  },
}
