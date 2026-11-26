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

// Every published icon paints its pinned geometry inline; this returns that
// drawing without the per-icon id namespace that keeps its masks unique.
function iconPaint(icon: Element): string {
  if (!(icon instanceof SVGSVGElement))
    throw new Error("Every published icon must render an inline SVG")
  if (getComputedStyle(icon).maskImage !== "none")
    throw new Error("Icons must paint inline, not through a CSS mask")
  const nodeId = icon.dataset.figmaNodeId
  if (!nodeId) throw new Error("Every published icon must carry its pinned source identity")
  const prefix = nodeId.toLowerCase().replace(/[^a-z0-9]+/g, "-")
  return icon.innerHTML.replaceAll(`${prefix}-`, "")
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
    <main className="pui:w-[min(76rem,calc(100vw-2rem))] pui:space-y-12 pui:p-6">
      <section aria-labelledby="icons-title">
        <h1 id="icons-title" className="pui:text-hero">
          Icone pubblicate
        </h1>
        <p className="pui:text-muted-foreground">
          {iconNames.length} nomi sincronizzati da Figma:{" "}
          {iconOriginCounts["material-symbols"] ?? 0} glifi Material Symbols (Rounded, weight 400,
          fill off, grade normal, 24dp — Apache-2.0), {iconOriginCounts.brand ?? 0} marchi di brand
          riprodotti nei colori sorgente e {iconOriginCounts.custom ?? 0} glifi PagoPA.
        </p>
        <div className="pui:mt-6 pui:grid pui:grid-cols-2 pui:gap-3 pui:tablet:grid-cols-3 pui:tablet-md:grid-cols-5 pui:desktop:grid-cols-7">
          {iconNames.map((name) => {
            const asset = iconCatalogue.get(name)
            return (
              <div
                key={name}
                className="pui:grid pui:min-h-24 pui:place-items-center pui:gap-2 pui:rounded-lg pui:border pui:p-3"
              >
                <span
                  className={cn(
                    "pui:inline-flex",
                    name === "IO logo" &&
                      "pui:rounded-sm pui:bg-navy pui:p-1 pui:forced-color-adjust-none",
                  )}
                >
                  <PagoPAIcon name={name} size={28} />
                </span>
                <code className="pui:max-w-full pui:break-all pui:text-center pui:text-xs">
                  {name}
                </code>
                {asset && asset.provenance.origin !== "material-symbols" ? (
                  <span className="pui:rounded-full pui:border pui:px-2 pui:py-0.5 pui:text-[10px] pui:uppercase pui:tracking-wide pui:text-muted-foreground">
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
        <h2
          id="pictograms-title"
          className="pui:text-[1.625rem] pui:font-semibold pui:leading-[2.125rem]"
        >
          Pittogrammi
        </h2>
        <p className="pui:text-muted-foreground">
          {pictogramNames.length} concetti esposti tramite una API tipizzata.
        </p>
        {pictogramProvenance ? (
          <p className="pui:mt-1 pui:text-sm pui:text-muted-foreground">
            Fonte: {pictogramProvenance.provider}
            {pictogramProvenance.sourceUrl ? (
              <>
                {" — "}
                <a
                  className="pui:underline"
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
        <div className="pui:mt-6 pui:grid pui:grid-cols-2 pui:gap-6 pui:tablet:grid-cols-3 pui:tablet-md:grid-cols-5">
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
    <div className="pui:grid pui:grid-cols-2 pui:gap-4">
      {pictogramNames.map((name) => (
        <div key={name} className="pui:flex pui:gap-4">
          <PagoPAPictogram name={name} label={`${name} Light`} background="light" />
          <div className="pui:rounded-lg pui:bg-navy pui:p-2 pui:text-white">
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
      await expect(icon).toHaveAttribute("viewBox", "0 0 24 24")
      expect(
        iconPaint(icon),
        `raw-name fallback for ${icon.getAttribute("data-figma-node-id")}`,
      ).not.toBe("")
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
    <main className="pui:grid pui:grid-cols-2 pui:gap-4 pui:p-4 pui:text-primary pui:tablet:grid-cols-4">
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
            "pui:flex pui:min-h-20 pui:items-center pui:justify-center pui:rounded-lg pui:border pui:p-4",
            name === "IO logo" && "pui:bg-navy pui:forced-color-adjust-none",
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
    // The brand logo keeps its source paints; the glyphs inherit the text colour.
    await expect(canvas.getByRole("img", { name: "SEND" })).toHaveAttribute(
      "data-figma-node-id",
      "8717:781",
    )
    const feedback = canvas.getByRole("img", { name: "feedback" })
    await expect(feedback).toHaveAttribute("fill", "currentColor")
    await expect(feedback).not.toHaveAttribute("style")
    await expect(getComputedStyle(feedback).fill).toBe(getComputedStyle(feedback).color)
    await expect(canvasElement.querySelector(".material-symbols-outlined")).not.toBeInTheDocument()
    await expect(canvasElement.querySelectorAll("img")).toHaveLength(0)
    await expect(canvasElement.querySelectorAll("svg[data-figma-node-id]")).toHaveLength(13)
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
    <main className="pui:grid pui:grid-cols-2 pui:gap-4 pui:p-4 pui:tablet:grid-cols-3">
      <PagoPAIcon name="Media logos" variant="instagram" decorative={false} label="Instagram" />
      <PagoPAIcon name="Media logos" variant="linkedin" decorative={false} label="LinkedIn" />
      <PagoPAIcon name="Media logos" variant="threads" decorative={false} label="Threads" />
      <PagoPAIcon name="Media logos" variant="youtube" decorative={false} label="Youtube" />
      <div className="pui:rounded-lg pui:bg-navy pui:p-4 pui:forced-color-adjust-none">
        <PagoPAIcon name="IO logo" variant="light" decorative={false} label="IO Light" />
      </div>
      <PagoPAIcon name="IO logo" variant="dark" decorative={false} label="IO Dark" />
    </main>
  ),
  play: async ({ canvas, canvasElement }) => {
    const icons = canvas.getAllByRole("img")
    await expect(icons).toHaveLength(6)
    await expect(icons.map((icon) => icon.getAttribute("data-figma-node-id")).sort()).toEqual([
      "232:1672",
      "232:1674",
      "99:777",
      "99:778",
      "99:779",
      "99:780",
    ])
    await expect(new Set(icons.map(iconPaint)).size).toBe(6)
    await expect(canvasElement.querySelectorAll("img")).toHaveLength(0)
  },
}

export const DirectionalVariants: Story = {
  render: () => (
    <main className="pui:grid pui:grid-cols-4 pui:gap-4 pui:p-4 pui:text-primary">
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
    const paints = new Set<string>()
    for (const icon of icons) {
      await expect(icon.textContent).toBe("")
      await expect(icon).toHaveAttribute("viewBox", "0 0 24 24")
      paints.add(iconPaint(icon))
    }
    await expect(paints.size).toBe(12)
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
    <main className="pui:grid pui:gap-6 pui:p-4 pui:text-primary">
      {filledIcons.map(({ name }) => (
        <div key={name} className="pui:flex pui:items-center pui:gap-6">
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
      await expect(iconPaint(filled)).not.toBe(iconPaint(outlined))
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
    <main className="pui:grid pui:grid-cols-2 pui:gap-4 pui:p-4 pui:tablet:grid-cols-4">
      {stateIcons.map(({ name, variant }) => (
        <figure
          key={`${name}-${variant}`}
          className="pui:grid pui:justify-items-center pui:gap-2 pui:rounded-lg pui:border pui:p-4"
        >
          <PagoPAIcon
            name={name}
            variant={variant}
            decorative={false}
            label={`${name} ${variant}`}
          />
          <figcaption className="pui:text-center pui:text-xs">
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
    const paints = new Set<string>()
    for (const { name, variant, nodeId } of stateIcons) {
      const icon = canvas.getByRole("img", { name: `${name} ${variant}` })
      await expect(icon).toHaveAttribute("data-figma-node-id", nodeId)
      await expect(icon).toHaveAttribute("viewBox", "0 0 24 24")
      paints.add(iconPaint(icon))
    }
    await expect(paints.size).toBe(48)
  },
}
