import type { Meta, StoryObj } from "@storybook/react-vite"
import { expect, userEvent, within } from "storybook/test"

import { DownloadCard } from "@/components/data-display"

const meta = {
  title: "Components/Data display/DownloadCard",
  component: DownloadCard,
  args: { fileName: "ricevuta.pdf", meta: "PDF · 320 KB" },
  argTypes: {
    href: { control: "text" },
    onDownload: { control: false },
    fileName: { control: "text" },
    meta: { control: "text" },
  },
  parameters: {
    docs: {
      description: {
        component:
          "Download row: with `href` it is a native link with a `download` attribute and keeps keyboard navigation; with `onDownload` it is an application button. Choose one or the other.",
      },
    },
  },
} satisfies Meta<typeof DownloadCard>

export default meta
type Story = StoryObj<typeof meta>

export const Playground: Story = {}

export const NativeDownloadLink: Story = {
  args: { href: "/ricevute/ricevuta.pdf" },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const download = canvas.getByRole("link", { name: "Scarica ricevuta.pdf" })
    await expect(download).toHaveAttribute("href", "/ricevute/ricevuta.pdf")
    await expect(download).toHaveAttribute("download", "ricevuta.pdf")
    let downloads = 0
    const recordDownload = (event: Event) => {
      event.preventDefault()
      downloads += 1
    }
    download.addEventListener("click", recordDownload)
    try {
      download.focus()
      await userEvent.keyboard(" ")
      await expect(downloads).toBe(0)
      await userEvent.keyboard("{Enter}")
      await expect(downloads).toBe(1)
    } finally {
      download.removeEventListener("click", recordDownload)
    }
  },
}

export const ApplicationAction: Story = {
  args: { fileName: "dati.csv", onDownload: () => undefined },
}
