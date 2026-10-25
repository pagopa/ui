import type { Meta, StoryObj } from "@storybook/react-vite"
import type { ComponentProps } from "react"
import { cn } from "@/lib/cn"
import { expect, waitFor } from "storybook/test"

import {
  type FigmaIconName,
  iconNames,
  pictogramNames,
  PagoPAIcon,
  PagoPAPictogram,
} from "@/components/icons"
import { iconManifest, pictogramManifest } from "pagopa-ui-artwork"
import { figmaEmbedUrl } from "@/catalog/figma/file"
import registry from "@/catalog/figma/registry.json"

// The bulk rules own the page identity; stories never hardcode a Figma URL.
const catalogueRules: { namesExport?: string; pageId?: string }[] = registry.bulkRules
function cataloguePageId(namesExport: string) {
  const rule = catalogueRules.find((entry) => entry.namesExport === namesExport)
  if (!rule?.pageId) throw new Error(`Missing registry bulk rule for ${namesExport}`)
  return rule.pageId
}

const iconCatalogue = new Map(
  Object.values(iconManifest.entries).map((entry) => [entry.name, entry] as const),
)
const iconOriginCounts = iconNames.reduce<Record<string, number>>((counts, name) => {
  const origin = iconCatalogue.get(name)?.provenance.origin ?? "unknown"
  counts[origin] = (counts[origin] ?? 0) + 1
  return counts
}, {})
const pictogramProvenance = Object.values(pictogramManifest.entries)[0]?.provenance

function IconCatalogue() {
  return (
    <main className="w-[min(76rem,calc(100vw-2rem))] space-y-12 p-6">
      <section aria-labelledby="icons-title">
        <h1 id="icons-title" className="text-hero">
          Icone pubblicate
        </h1>
        <p className="text-muted-foreground">
          {iconNames.length} nomi sincronizzati da Figma:{" "}
          {iconOriginCounts["material-symbols"] ?? 0} glifi Material Symbols (Rounded, weight 400,
          fill off, grade normal, 24dp — Apache-2.0), {iconOriginCounts.brand ?? 0} marchi di brand
          riprodotti nei colori sorgente e {iconOriginCounts.custom ?? 0} glifi PagoPA.
        </p>
        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-5 lg:grid-cols-7">
          {iconNames.map((name) => {
            const asset = iconCatalogue.get(name)
            return (
              <div
                key={name}
                className="grid min-h-24 place-items-center gap-2 rounded-lg border p-3"
              >
                <span
                  className={cn(
                    "inline-flex",
                    name === "IO logo" && "rounded-sm bg-navy p-1 forced-color-adjust-none",
                  )}
                >
                  <PagoPAIcon name={name} size={28} />
                </span>
                <code className="max-w-full break-all text-center text-xs">{name}</code>
                {asset && asset.provenance.origin !== "material-symbols" ? (
                  <span className="rounded-full border px-2 py-0.5 text-[10px] uppercase tracking-wide text-muted-foreground">
                    {asset.provenance.origin}
                  </span>
                ) : null}
              </div>
            )
          })}
        </div>
      </section>

      <section aria-labelledby="pictograms-title">
        {/* 26/34: the Figma Headings/H2 scale is not captured in the pinned
            variable snapshot yet; map it to text-h3 only after the refresh. */}
        <h2 id="pictograms-title" className="text-[1.625rem] font-semibold leading-[2.125rem]">
          Pittogrammi
        </h2>
        <p className="text-muted-foreground">
          {pictogramNames.length} concetti esposti tramite una API tipizzata.
        </p>
        {pictogramProvenance ? (
          <p className="mt-1 text-sm text-muted-foreground">
            Fonte: {pictogramProvenance.provider}
            {pictogramProvenance.sourceUrl ? (
              <>
                {" — "}
                <a
                  className="underline"
                  href={pictogramProvenance.sourceUrl}
                  target="_blank"
                  rel="noreferrer"
                >
                  {pictogramProvenance.attribution ?? pictogramProvenance.provider}
                </a>
              </>
            ) : null}
            {" · "}
            {pictogramProvenance.license}
          </p>
        ) : null}
        <div className="mt-6 grid grid-cols-2 gap-6 sm:grid-cols-3 md:grid-cols-5">
          {pictogramNames.map((name) => (
            <PagoPAPictogram key={name} name={name} label={name} />
          ))}
        </div>
      </section>
    </main>
  )
}

import iconsGuide from "./guides/icons.md?raw"
import pictogramsGuide from "./guides/pictograms.md?raw"

const meta = {
  title: "Foundations/Icons and pictograms",
  component: IconCatalogue,
  parameters: {
    layout: "fullscreen",
    docs: {
      description: {
        component: iconsGuide,
      },
    },
    design: { type: "figma", url: figmaEmbedUrl(cataloguePageId("figmaIconNames")) },
  },
} satisfies Meta<typeof IconCatalogue>

export default meta
type Story = StoryObj<typeof meta>

export const PictogramVariants: Story = {
  parameters: {
    // Reflow exemption: fixture pinned at the source width, not a product surface.
    a11yContract: { reflow: false },
    docs: { description: { story: pictogramsGuide } },
    design: { type: "figma", url: figmaEmbedUrl(cataloguePageId("figmaPictogramNames")) },
  },
  render: () => (
    <div className="grid grid-cols-2 gap-4">
      {pictogramNames.map((name) => (
        <div key={name} className="flex gap-4">
          <PagoPAPictogram name={name} label={`${name} Light`} background="light" />
          <div className="rounded-lg bg-navy p-2 text-white">
            <PagoPAPictogram name={name} label={`${name} Dark`} background="dark" />
          </div>
        </div>
      ))}
    </div>
  ),
  play: async ({ canvasElement }) => {
    const images = canvasElement.querySelectorAll("img")
    await expect(images).toHaveLength(pictogramNames.length * 2)
    await expect(canvasElement.querySelector(".material-symbols-outlined")).not.toBeInTheDocument()
    for (let index = 0; index < images.length; index += 2) {
      await expect(images[index].src).not.toBe(images[index + 1].src)
    }
    await Promise.all([...images].map((image) => image.decode()))
    for (const image of images) {
      await expect(image.complete).toBe(true)
      await expect(image.naturalWidth).toBeGreaterThanOrEqual(120)
      await expect(image.naturalHeight).toBeGreaterThanOrEqual(120)
      await expect(image.naturalWidth / image.naturalHeight).toBeGreaterThan(0.95)
      await expect(image.naturalWidth / image.naturalHeight).toBeLessThan(1.05)
    }
  },
}

export const Catalogue: Story = {
  // Reflow exemption: fixture pinned at the source width, not a product surface.
  parameters: { a11yContract: { reflow: false } },
  play: async ({ canvas }) => {
    const section = canvas.getByRole("heading", { name: "Icone pubblicate" }).closest("section")
    if (!section) throw new Error("Missing public icon catalogue")
    await document.fonts.ready
    const icons = section.querySelectorAll('[aria-hidden="true"]')
    await expect(icons).toHaveLength(iconNames.length)
    await expect(section.querySelector(".material-symbols-outlined")).not.toBeInTheDocument()
    for (const icon of icons) {
      await expect(icon).toHaveAttribute("data-figma-node-id")
      const image = icon instanceof HTMLImageElement ? icon : new Image()
      if (!(icon instanceof HTMLImageElement)) {
        const source = getComputedStyle(icon).maskImage.match(/^url\(["']?(.*?)["']?\)$/)?.[1]
        if (!source) throw new Error("Every published icon must render genuine source artwork")
        image.src = source
      }
      await image.decode()
      await expect(image.naturalWidth).toBe(24)
      await expect(image.naturalHeight).toBe(24)
    }
    await waitFor(() => {
      for (const icon of icons) {
        expect(
          icon.getBoundingClientRect().width,
          `raw-name fallback for ${icon.textContent}`,
        ).toBe(28)
      }
    })
    const io = section.querySelector('[data-figma-node-id="232:1672"]')
    if (!io) throw new Error("Missing source-default IO Light logo")
    let surface = io.parentElement
    while (surface && getComputedStyle(surface).backgroundColor === "rgba(0, 0, 0, 0)") {
      surface = surface.parentElement
    }
    if (!surface) throw new Error("The source-default IO logo needs a painted background")
    const background = getComputedStyle(surface).backgroundColor
    const channels = background.match(/^rgb\((\d+), (\d+), (\d+)\)$/)
    if (!channels) throw new Error(`Expected an opaque IO logo surface, received ${background}`)
    const weights = [0.2126, 0.7152, 0.0722]
    const luminance = channels
      .slice(1)
      .map(Number)
      .reduce((total, channel, index) => {
        const value = channel / 255
        const linear = value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4
        return total + linear * weights[index]
      }, 0)
    await expect(
      1.05 / (luminance + 0.05),
      `IO Light must be visible against ${background}`,
    ).toBeGreaterThanOrEqual(3)
  },
}

export const LocalDefaults: Story = {
  render: () => (
    <main className="grid grid-cols-2 gap-4 p-4 text-primary sm:grid-cols-4">
      {(
        [
          "feedback",
          "Media logos",
          "location_on",
          "IO logo",
          "SPID",
          "CIEID",
          "CIE",
          "pagoPA",
          "SEND",
          "first_letter",
          "second_letter",
          "online_address",
          "third_letter",
        ] satisfies FigmaIconName[]
      ).map((name) => (
        <div
          key={name}
          className={cn(
            "flex min-h-20 items-center justify-center rounded-lg border p-4",
            name === "IO logo" && "bg-navy forced-color-adjust-none",
          )}
        >
          <PagoPAIcon name={name} decorative={false} label={name} />
        </div>
      ))}
    </main>
  ),
  play: async ({ canvas, canvasElement }) => {
    await expect(canvas.getAllByRole("img")).toHaveLength(13)
    for (const icon of canvas.getAllByRole("img")) {
      await expect(icon.textContent).toBe("")
      const bounds = icon.getBoundingClientRect()
      await expect(bounds.width).toBe(24)
      await expect(bounds.height).toBe(24)
    }
    const send = canvas.getByRole("img", { name: "SEND" })
    // The production build rewrites the asset to `8717-781-<hash>.svg`, the dev
    // server keeps the `?no-inline` query: match the pinned node id and accept
    // both, so the assertion does not depend on the delivery transform.
    await expect(send).toHaveAttribute("src", expect.stringMatching(/8717-781[-\w]*\.svg(?:\?|$)/))
    const feedback = canvas.getByRole("img", { name: "feedback" })
    await expect(getComputedStyle(feedback).maskImage).not.toBe("none")
    await expect(getComputedStyle(feedback).backgroundColor).toBe(getComputedStyle(feedback).color)
    await expect(canvasElement.querySelector(".material-symbols-outlined")).not.toBeInTheDocument()
    const images = canvasElement.querySelectorAll("img")
    await expect(images).toHaveLength(7)
    await waitFor(() => {
      for (const image of images) {
        expect(image.complete).toBe(true)
        expect(image.naturalWidth).toBe(24)
        expect(image.naturalHeight).toBe(24)
      }
    })
    await expect(canvas.getByRole("img", { name: "Media logos" })).toHaveAttribute(
      "data-figma-node-id",
      "99:777",
    )
    await expect(canvas.getByRole("img", { name: "IO logo" })).toHaveAttribute(
      "data-figma-node-id",
      "232:1672",
    )
  },
}

export const LocalVariants: Story = {
  render: () => (
    <main className="grid grid-cols-2 gap-4 p-4 sm:grid-cols-3">
      <PagoPAIcon name="Media logos" variant="instagram" decorative={false} label="Instagram" />
      <PagoPAIcon name="Media logos" variant="linkedin" decorative={false} label="LinkedIn" />
      <PagoPAIcon name="Media logos" variant="threads" decorative={false} label="Threads" />
      <PagoPAIcon name="Media logos" variant="youtube" decorative={false} label="Youtube" />
      <div className="rounded-lg bg-navy p-4 forced-color-adjust-none">
        <PagoPAIcon name="IO logo" variant="light" decorative={false} label="IO Light" />
      </div>
      <PagoPAIcon name="IO logo" variant="dark" decorative={false} label="IO Dark" />
    </main>
  ),
  play: async ({ canvas, canvasElement }) => {
    await expect(canvas.getAllByRole("img")).toHaveLength(6)
    const images = canvasElement.querySelectorAll("img")
    await expect(images).toHaveLength(6)
    await expect(new Set([...images].map((image) => image.src)).size).toBe(6)
    await expect([...images].map((image) => image.dataset.figmaNodeId).sort()).toEqual([
      "232:1672",
      "232:1674",
      "99:777",
      "99:778",
      "99:779",
      "99:780",
    ])
    await waitFor(() => {
      for (const image of images) {
        expect(image.complete).toBe(true)
        expect(image.naturalWidth).toBe(24)
        expect(image.naturalHeight).toBe(24)
      }
    })
  },
}

export const DirectionalVariants: Story = {
  render: () => (
    <main className="grid grid-cols-4 gap-4 p-4 text-primary">
      <PagoPAIcon name="arrow" variant="right" decorative={false} label="Freccia destra" />
      <PagoPAIcon name="arrow" variant="left" decorative={false} label="Freccia sinistra" />
      <PagoPAIcon name="arrow" variant="down" decorative={false} label="Freccia in basso" />
      <PagoPAIcon name="arrow" variant="up" decorative={false} label="Freccia in alto" />
      <PagoPAIcon name="chevron" variant="right" decorative={false} label="Chevron destra" />
      <PagoPAIcon name="chevron" variant="left" decorative={false} label="Chevron sinistra" />
      <PagoPAIcon name="chevron" variant="down" decorative={false} label="Chevron in basso" />
      <PagoPAIcon name="chevron" variant="up" decorative={false} label="Chevron in alto" />
      <PagoPAIcon
        name="radio_button"
        variant="unchecked"
        decorative={false}
        label="Non selezionato"
      />
      <PagoPAIcon name="radio_button" variant="checked" decorative={false} label="Selezionato" />
      <PagoPAIcon name="unfold" variant="less" decorative={false} label="Comprimi" />
      <PagoPAIcon name="unfold" variant="more" decorative={false} label="Espandi" />
    </main>
  ),
  play: async ({ canvas }) => {
    const icons = canvas.getAllByRole("img")
    await expect(icons).toHaveLength(12)
    await expect(icons.map((icon) => icon.getAttribute("data-figma-node-id")).sort()).toEqual(
      [
        "96:669",
        "96:670",
        "98:867",
        "98:868",
        "98:869",
        "98:870",
        "98:915",
        "98:916",
        "98:917",
        "98:918",
        "98:1014",
        "98:1015",
      ].sort(),
    )
    const urls = new Set<string>()
    for (const icon of icons) {
      await expect(icon.textContent).toBe("")
      const source = getComputedStyle(icon).maskImage.match(/^url\(["']?(.*?)["']?\)$/)?.[1]
      if (!source) throw new Error("Missing source mask for a direction or state variant")
      const image = new Image()
      image.src = source
      await image.decode()
      await expect(image.naturalWidth).toBe(24)
      await expect(image.naturalHeight).toBe(24)
      urls.add(source)
    }
    await expect(urls.size).toBe(12)
  },
}

const filledIcons = [
  { name: "info", defaultId: "98:1114", filledId: "98:1115", outlinedId: "98:1114" },
  { name: "error", defaultId: "98:1159", filledId: "98:1160", outlinedId: "98:1159" },
  { name: "inventory_2", defaultId: "98:1298", filledId: "98:1299", outlinedId: "98:1298" },
  { name: "near_me", defaultId: "99:2329", filledId: "99:2330", outlinedId: "99:2329" },
  { name: "send", defaultId: "9584:66408", filledId: "9584:66408", outlinedId: "9584:66411" },
] satisfies { name: FigmaIconName; defaultId: string; filledId: string; outlinedId: string }[]

export const SourceFilled: Story = {
  // Reflow exemption: fixture pinned at the source width, not a product surface.
  parameters: { a11yContract: { reflow: false } },
  render: () => (
    <main className="grid gap-6 p-4 text-primary">
      {filledIcons.map(({ name }) => (
        <div key={name} className="flex items-center gap-6">
          <code>{name}</code>
          <PagoPAIcon name={name} decorative={false} label={`${name} default`} />
          <PagoPAIcon name={name} filled decorative={false} label={`${name} filled`} />
          <PagoPAIcon name={name} filled={false} decorative={false} label={`${name} outlined`} />
        </div>
      ))}
    </main>
  ),
  play: async ({ canvas }) => {
    await expect(canvas.getAllByRole("img")).toHaveLength(15)
    for (const icon of filledIcons) {
      await expect(canvas.getByRole("img", { name: `${icon.name} default` })).toHaveAttribute(
        "data-figma-node-id",
        icon.defaultId,
      )
      const filled = canvas.getByRole("img", { name: `${icon.name} filled` })
      const outlined = canvas.getByRole("img", { name: `${icon.name} outlined` })
      await expect(filled).toHaveAttribute("data-figma-node-id", icon.filledId)
      await expect(outlined).toHaveAttribute("data-figma-node-id", icon.outlinedId)
      await expect(getComputedStyle(filled).maskImage).not.toBe(
        getComputedStyle(outlined).maskImage,
      )
    }
  },
}

const stateIcons = [
  { name: "category", variant: "unselected", nodeId: "94:1980" },
  { name: "category", variant: "selected", nodeId: "94:1981" },
  { name: "supervised_user_circle", variant: "unselected", nodeId: "94:1996" },
  { name: "supervised_user_circle", variant: "selected", nodeId: "94:1995" },
  { name: "person", variant: "unselected", nodeId: "94:2016" },
  { name: "person", variant: "selected", nodeId: "94:2020" },
  { name: "mail", variant: "unselected", nodeId: "94:2034" },
  { name: "mail", variant: "selected", nodeId: "94:2035" },
  { name: "settings", variant: "unselected", nodeId: "94:2055" },
  { name: "settings", variant: "selected", nodeId: "94:2056" },
  { name: "vpn_key", variant: "unselected", nodeId: "94:2071" },
  { name: "vpn_key", variant: "selected", nodeId: "94:2070" },
  { name: "view_sidebar", variant: "unselected", nodeId: "94:2091" },
  { name: "view_sidebar", variant: "selected", nodeId: "94:2092" },
  { name: "lock", variant: "closed", nodeId: "95:1689" },
  { name: "lock", variant: "open", nodeId: "95:1690" },
  { name: "filter", variant: "filter-alt", nodeId: "95:1676" },
  { name: "filter", variant: "tune", nodeId: "95:1675" },
  { name: "check_box", variant: "unchecked", nodeId: "96:666" },
  { name: "check_box", variant: "checked", nodeId: "96:667" },
  { name: "check_box", variant: "indeterminate", nodeId: "96:665" },
  { name: "visibility", variant: "visible", nodeId: "96:685" },
  { name: "visibility", variant: "hidden", nodeId: "96:684" },
  { name: "keep", variant: "pinned", nodeId: "96:699" },
  { name: "keep", variant: "unpinned", nodeId: "96:715" },
  { name: "close", variant: "big", nodeId: "98:666" },
  { name: "close", variant: "small", nodeId: "98:667" },
  { name: "add", variant: "big", nodeId: "98:689" },
  { name: "add", variant: "small", nodeId: "98:688" },
  { name: "info", variant: "outlined", nodeId: "98:1114" },
  { name: "info", variant: "filled", nodeId: "98:1115" },
  { name: "check", variant: "big", nodeId: "98:1156" },
  { name: "check", variant: "small", nodeId: "98:1157" },
  { name: "error", variant: "outlined", nodeId: "98:1159" },
  { name: "error", variant: "filled", nodeId: "98:1160" },
  { name: "error", variant: "stroke", nodeId: "98:1161" },
  { name: "favorite", variant: "unselected", nodeId: "98:1256" },
  { name: "favorite", variant: "selected", nodeId: "98:1255" },
  { name: "kid_star", variant: "unselected", nodeId: "98:1250" },
  { name: "kid_star", variant: "selected", nodeId: "98:1251" },
  { name: "inventory_2", variant: "outlined", nodeId: "98:1298" },
  { name: "inventory_2", variant: "filled", nodeId: "98:1299" },
  { name: "receipt_long", variant: "active", nodeId: "99:614" },
  { name: "receipt_long", variant: "inactive", nodeId: "99:615" },
  { name: "near_me", variant: "filled", nodeId: "99:2330" },
  { name: "near_me", variant: "outlined", nodeId: "99:2329" },
  { name: "send", variant: "filled", nodeId: "9584:66408" },
  { name: "send", variant: "outlined", nodeId: "9584:66411" },
] satisfies {
  name: FigmaIconName
  variant: NonNullable<ComponentProps<typeof PagoPAIcon>["variant"]>
  nodeId: string
}[]

export const StateVariants: Story = {
  // Reflow exemption: fixture pinned at the source width, not a product surface.
  parameters: { a11yContract: { reflow: false } },
  render: () => (
    <main className="grid grid-cols-2 gap-4 p-4 sm:grid-cols-4">
      {stateIcons.map(({ name, variant }) => (
        <figure
          key={`${name}-${variant}`}
          className="grid justify-items-center gap-2 rounded-lg border p-4"
        >
          <PagoPAIcon
            name={name}
            variant={variant}
            decorative={false}
            label={`${name} ${variant}`}
          />
          <figcaption className="text-center text-xs">
            <code>
              {name} {variant}
            </code>
          </figcaption>
        </figure>
      ))}
    </main>
  ),
  play: async ({ canvas }) => {
    await expect(canvas.getAllByRole("img")).toHaveLength(48)
    const urls = new Set<string>()
    for (const { name, variant, nodeId } of stateIcons) {
      const icon = canvas.getByRole("img", { name: `${name} ${variant}` })
      await expect(icon).toHaveAttribute("data-figma-node-id", nodeId)
      const source = getComputedStyle(icon).maskImage.match(/^url\(["']?(.*?)["']?\)$/)?.[1]
      if (!source) throw new Error("Missing actual source artwork for an icon state")
      const image = new Image()
      image.src = source
      await image.decode()
      await expect(image.naturalWidth).toBe(24)
      await expect(image.naturalHeight).toBe(24)
      urls.add(source)
    }
    await expect(urls.size).toBe(48)
  },
}
