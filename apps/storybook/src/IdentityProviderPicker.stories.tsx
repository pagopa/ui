import type { Meta, StoryObj } from "@storybook/react-vite"
import { expect, fn, userEvent, within } from "storybook/test"

import {
  IdentityProviderPicker,
  type IdentityProviderPickerOption,
} from "@/components/composites/identity-provider-picker"
import { figmaEmbedUrl } from "@/catalog/figma/file"

import arubaLogo from "./assets/idp-logos/aruba-id.png"
import etnaLogo from "./assets/idp-logos/etna-id.png"
import infocertLogo from "./assets/idp-logos/infocert-id.png"
import infoCameraLogo from "./assets/idp-logos/info-camera.png"
import intesiLogo from "./assets/idp-logos/intesi-group.png"
import lepidaLogo from "./assets/idp-logos/lepida-id.png"
import namirialLogo from "./assets/idp-logos/namirial-id.png"
import posteLogo from "./assets/idp-logos/poste-id.png"
import sielteLogo from "./assets/idp-logos/sielte-id.png"
import spidItaliaLogo from "./assets/idp-logos/spid-italia.png"
import teamsystemLogo from "./assets/idp-logos/teamsystem-id.png"
import timLogo from "./assets/idp-logos/tim-id.png"
import idModuleGuide from "./guides/id-module.md?raw"

const providerOptions: readonly IdentityProviderPickerOption[] = [
  { id: "poste-id", label: "POSTE ID", logo: sourceLogo(posteLogo), href: "#poste-id" },
  { id: "infocert-id", label: "INFOCERT ID", logo: sourceLogo(infocertLogo), href: "#infocert-id" },
  { id: "aruba-id", label: "ARUBA ID", logo: sourceLogo(arubaLogo), href: "#aruba-id" },
  { id: "lepida-id", label: "LEPIDA ID", logo: sourceLogo(lepidaLogo), href: "#lepida-id" },
  { id: "sielte-id", label: "SIELTE ID", logo: sourceLogo(sielteLogo), href: "#sielte-id" },
  {
    id: "namirial-id",
    label: "NAMIRIAL ID",
    logo: sourceLogo(namirialLogo),
    href: "#namirial-id",
  },
  { id: "tim-id", label: "TIM ID", logo: sourceLogo(timLogo), href: "#tim-id" },
  {
    id: "spid-italia",
    label: "SPID ITALIA",
    logo: sourceLogo(spidItaliaLogo),
    href: "#spid-italia",
  },
  { id: "etna-id", label: "ETNA ID", logo: sourceLogo(etnaLogo), href: "#etna-id" },
  {
    id: "info-camera",
    label: "ID INFOCAMERA",
    logo: sourceLogo(infoCameraLogo),
    href: "#info-camera",
  },
  {
    id: "intesi-group",
    label: "INTESI GROUP",
    logo: sourceLogo(intesiLogo),
    href: "#intesi-group",
  },
  {
    id: "teamsystem-id",
    label: "TEAMSYSTEM ID",
    logo: sourceLogo(teamsystemLogo),
    href: "#teamsystem-id",
  },
]

function sourceLogo(src: string) {
  return (
    <img
      alt=""
      className="block max-h-full max-w-full object-contain"
      height={28}
      src={src}
      width={115}
    />
  )
}

const meta = {
  title: "Components/Composites/IdentityProviderPicker",
  component: IdentityProviderPicker,
  args: {
    title: "Scegli il tuo SPID",
    closeLabel: "Chiudi",
    onClose: fn(),
    providers: providerOptions,
    device: "mobile",
  },
  argTypes: {
    closeLabel: { control: "text" },
    device: { control: "inline-radio", options: ["mobile", "desktop"] },
    onClose: { control: false },
    providers: { control: false },
  },
  parameters: {
    layout: "fullscreen",
    a11y: { test: "error" },
    docs: {
      description: {
        component: idModuleGuide,
      },
      subtitle: "Figma: IDModule",
    },
  },
} satisfies Meta<typeof IdentityProviderPicker>

export default meta
type Story = StoryObj<typeof meta>

export const Playground: Story = {
  parameters: {
    // Reflow exemption pending a design request: docs/design-requests/2026-10-16-a11y-reflow-conditions.md.
    a11yContract: { reflow: false },
    design: { type: "figma", url: figmaEmbedUrl("731:20386") },
  },
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement)
    const closeButton = canvas.getByRole("button", { name: "Chiudi" })
    const firstProvider = canvas.getByRole("link", { name: "POSTE ID" })

    await userEvent.tab()
    await expect(closeButton).toHaveFocus()
    await userEvent.keyboard("{Enter}")
    await expect(args.onClose).toHaveBeenCalledTimes(1)
    await userEvent.tab()
    await expect(firstProvider).toHaveFocus()
    await expect(firstProvider).toHaveAttribute("href", "#poste-id")
    firstProvider.blur()
    await expect(firstProvider).not.toHaveFocus()
  },
}

export const Desktop: Story = {
  parameters: {
    // Reflow exemption pending a design request: docs/design-requests/2026-10-16-a11y-reflow-conditions.md.
    a11yContract: { reflow: false },
    design: { type: "figma", url: figmaEmbedUrl("731:20386") },
  },
  args: { device: "desktop" },
}

export const SingleProvider: Story = {
  parameters: {
    // Reflow exemption pending a design request: docs/design-requests/2026-10-16-a11y-reflow-conditions.md.
    a11yContract: { reflow: false },
    design: { type: "figma", url: figmaEmbedUrl("731:20386") },
  },
  render: () => (
    <div className="w-80 px-1">
      <IdentityProviderPicker.Provider {...providerOptions[0]} />
    </div>
  ),
}

export const ConfigurableHeading: Story = {
  // Reflow exemption pending a design request: docs/design-requests/2026-10-16-a11y-reflow-conditions.md.
  parameters: { a11yContract: { reflow: false } },
  args: { titleAs: "h3" },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    // The caller owns the outline: the module title renders at the requested
    // level instead of a fixed h2.
    await expect(canvas.getByRole("heading", { level: 3 })).toBeVisible()
    await expect(canvas.queryByRole("heading", { level: 2 })).not.toBeInTheDocument()
  },
}

// The browser provider resizes the page inside the test runner only; the
// interactive Storybook has no page controller and the check is skipped there.
async function viewportController() {
  const module = await import("@vitest/browser/context").catch(() => undefined)
  return module?.page
}

async function applyViewport(width: number, height: number) {
  const page = await viewportController()
  await page?.viewport(width, height)
  for (let frame = 0; frame < 60; frame += 1) {
    if (window.innerWidth === width && window.innerHeight === height) break
    await new Promise((resolve) => requestAnimationFrame(() => resolve(null)))
  }
  await new Promise((resolve) =>
    requestAnimationFrame(() => requestAnimationFrame(() => resolve(null))),
  )
}

// The source keeps the module 410px wide from 600 to 1440; below the tablet
// device step it takes the available width.
export const ResponsiveWidth: Story = {
  parameters: {
    layout: "fullscreen",
    // Reflow exemption pending a design request: docs/design-requests/2026-10-16-a11y-reflow-conditions.md.
    a11yContract: { reflow: false },
  },
  play: async ({ canvasElement }) => {
    const module = canvasElement.querySelector<HTMLElement>("[data-id-module]")
    if (!module) throw new Error("Expected the ID module")
    const page = await viewportController()
    if (!page) return
    const previous = { width: window.innerWidth, height: window.innerHeight }
    const measured = () => Math.round(module.getBoundingClientRect().width)
    const available = () => Math.round(module.parentElement?.getBoundingClientRect().width ?? 0)
    try {
      for (const width of [320, 599]) {
        await applyViewport(width, 900)
        await expect(measured()).toBe(available())
      }
      for (const width of [600, 900, 1200, 1440]) {
        await applyViewport(width, 900)
        await expect(measured()).toBe(410)
      }
    } finally {
      await applyViewport(previous.width, previous.height)
    }
  },
}
