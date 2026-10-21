import * as React from "react"
import type { Meta, StoryObj } from "@storybook/react-vite"
import { expect, userEvent, waitFor, within } from "storybook/test"

import productLogo from "@/assets/storybook/1526-6505.png"
import coverPhoto from "@/assets/storybook/757-6293.jpeg"
import { Avatar } from "@/components/content/avatar"
import { PagoPAIcon } from "@/components/icons/PagoPAIcon"
import { Button } from "@/components/primitives/button"
import { figmaEmbedUrl } from "@/catalog/figma/file"

import avatarsGuide from "./guides/avatars.md?raw"

const meta = {
  title: "Components/Content/Avatar",
  component: Avatar,
  args: { alt: "Identità dell'organizzazione" },
  parameters: {
    docs: {
      description: {
        component: `A single accessible visual identity for images, initials and source states. The Avatar is not a control: navigation and selection belong to the container.

${avatarsGuide}`,
      },
    },
  },
  argTypes: {
    size: { control: "select", options: ["compact", "small", "medium", "large"] },
    imageFit: { control: "select", options: ["cover", "contain"] },
    tone: { control: "select", options: ["default", "inverse"] },
    selected: { control: "boolean" },
    loading: { control: "boolean" },
    status: { control: "select", options: ["online", "offline", "busy"] },
  },
} satisfies Meta<typeof Avatar>

export default meta
type Story = StoryObj<typeof meta>

// A source image that must be painted: `decode()` settles loading before the
// visibility and pixel assertions. The visibility wait alone raced in Firefox
// under load (the coverage suite), which flapped the suite.
async function expectLoadedImage(identity: HTMLElement) {
  // The image element only appears once the source artwork has loaded, which
  // can take longer than the default wait under a loaded coverage run.
  const image = await waitFor(
    () => {
      const candidate = identity.querySelector("[data-slot=avatar-image]")
      expect(candidate).not.toBeNull()
      return candidate
    },
    { timeout: 10_000 },
  )
  if (!(image instanceof HTMLImageElement)) throw new Error("Expected the loaded native image")
  await image.decode()
  await waitFor(() => expect(image).toBeVisible())
  await expect(image.naturalWidth).toBeGreaterThan(0)
  return image
}
const pairedSizes: NonNullable<React.ComponentProps<typeof Avatar>["size"]>[] = [
  "small",
  "medium",
  "large",
]

export const Playground: Story = {
  args: { alt: "Identità dell'organizzazione", size: "small" },
}

export const SourceRowSize: Story = {
  args: { alt: "Identità nella riga di scelta", size: "compact" },
  play: async ({ canvasElement }) => {
    const identity = within(canvasElement).getByRole("img", {
      name: "Identità nella riga di scelta",
    })
    const bounds = identity.getBoundingClientRect()
    await expect(bounds.width).toBe(32)
    await expect(bounds.height).toBe(32)
    const surface = identity.querySelector("[data-slot=avatar]")
    const glyph = identity.querySelector("[aria-hidden=true]")
    if (!(surface instanceof HTMLElement) || !(glyph instanceof HTMLElement))
      throw new Error("Expected the visible source row Avatar and placeholder glyph")
    await expect(Number.parseFloat(getComputedStyle(surface).borderRadius)).toBeCloseTo(5.818, 2)
    await expect(glyph.getBoundingClientRect().width).toBe(16)
    await expect(glyph.getBoundingClientRect().height).toBe(16)
    await expect(identity.querySelector("button,a,input,[tabindex]")).not.toBeInTheDocument()
  },
}

export const SourceSizes: Story = {
  render: () => (
    <div className="flex flex-wrap gap-6">
      <Avatar alt="Identità piccola" size="small" />
      <Avatar alt="Identità intermedia" size="medium" />
      <Avatar alt="Identità grande" size="large" />
    </div>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const dimensions: [string, number][] = [
      ["Identità piccola", 44],
      ["Identità intermedia", 48],
      ["Identità grande", 64],
    ]
    for (const [name, dimension] of dimensions) {
      const identity = canvas.getByRole("img", { name })
      const bounds = identity.getBoundingClientRect()
      await expect(bounds.width).toBe(dimension)
      await expect(bounds.height).toBe(dimension)
      const surface = identity.querySelector("[data-slot=avatar]")
      if (!(surface instanceof HTMLElement)) throw new Error("Expected the visible Avatar surface")
      await expect(getComputedStyle(surface).borderRadius).toBe("8px")
    }
  },
}

export const SourcePlaceholder: Story = {
  tags: ["color-pinned"],
  render: () => (
    <div className="flex items-start gap-6">
      <Avatar alt="Organizzazione non ancora disponibile" size="small" />
      <Avatar alt="Organizzazione grande non ancora disponibile" size="large" />
    </div>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const placeholders: [string, number][] = [
      ["Organizzazione non ancora disponibile", 24],
      ["Organizzazione grande non ancora disponibile", 32],
    ]
    for (const [name, dimension] of placeholders) {
      const identity = canvas.getByRole("img", { name })
      const fallback = identity.querySelector("[data-slot=avatar-fallback]")
      if (!(fallback instanceof HTMLElement))
        throw new Error("Expected the visible source fallback")
      await expect(getComputedStyle(fallback).backgroundColor).toBe("rgb(244, 245, 248)")
      const symbol = fallback.querySelector("[data-figma-node-id='99:666']")
      if (!(symbol instanceof HTMLElement))
        throw new Error("Expected the actual source placeholder")
      await expect(symbol.getBoundingClientRect().width).toBe(dimension)
      await expect(symbol.getBoundingClientRect().height).toBe(dimension)
      await expect(getComputedStyle(symbol).color).toBe("rgb(187, 194, 214)")
      const surface = identity.querySelector("[data-slot=avatar]")
      if (!(surface instanceof HTMLElement)) throw new Error("Expected the visible Avatar surface")
      await expect(getComputedStyle(surface, "::after").borderColor).toBe("rgba(14, 15, 19, 0.06)")
    }
  },
}

export const SourceLogos: Story = {
  render: () => (
    <div className="flex items-start gap-6">
      <Avatar alt="Prodotto piccolo" src={productLogo} imageFit="contain" size="small" />
      <Avatar alt="Prodotto grande" src={productLogo} imageFit="contain" size="large" />
    </div>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const logos: [string, number, number][] = [
      ["Prodotto piccolo", 32, 6],
      ["Prodotto grande", 48, 8],
    ]
    for (const [name, dimension, inset] of logos) {
      const identity = canvas.getByRole("img", { name })
      const image = await expectLoadedImage(identity)
      await expect(image).toHaveAttribute("alt", "")
      const bitmap = document.createElement("canvas")
      bitmap.width = bitmap.height = 48
      const pixels = bitmap.getContext("2d")
      if (!pixels) throw new Error("Expected native image paint")
      pixels.drawImage(image, 0, 0, 48, 48)
      const rgba = pixels.getImageData(0, 0, 48, 48).data
      let sourceBlue = 0
      let sourceWhite = 0
      for (let index = 0; index < rgba.length; index += 4) {
        if (rgba[index + 3] !== 255) continue
        if (rgba[index] === 11 && rgba[index + 1] === 62 && rgba[index + 2] === 227) sourceBlue += 1
        if (rgba[index] === 255 && rgba[index + 1] === 255 && rgba[index + 2] === 255)
          sourceWhite += 1
      }
      await expect(sourceBlue).toBeGreaterThan(500)
      await expect(sourceWhite).toBeGreaterThan(100)
      const bounds = identity.getBoundingClientRect()
      const imageBounds = image.getBoundingClientRect()
      await expect(imageBounds.width).toBe(dimension)
      await expect(imageBounds.height).toBe(dimension)
      await expect(imageBounds.x - bounds.x).toBe(inset)
      await expect(imageBounds.y - bounds.y).toBe(inset)
      await expect(getComputedStyle(image).objectFit).toBe("contain")
      await expect(getComputedStyle(image).borderRadius).toBe("0px")
      const surface = identity.querySelector("[data-slot=avatar]")
      if (!(surface instanceof HTMLElement)) throw new Error("Expected the source logo surface")
      const paint = document.createElement("canvas").getContext("2d")
      if (!paint) throw new Error("Expected native color conversion")
      paint.fillStyle = getComputedStyle(surface).backgroundColor
      paint.fillRect(0, 0, 1, 1)
      await expect([...paint.getImageData(0, 0, 1, 1).data]).toEqual([255, 255, 255, 255])
    }
  },
}

function RecoveringIdentity() {
  const [available, setAvailable] = React.useState(true)
  return (
    <div className="grid justify-items-start gap-4">
      <Avatar
        alt="Identità con immagine ripristinabile"
        src={available ? productLogo : "data:image/png;base64,invalid"}
        initials="PA"
        imageFit="contain"
        size="small"
        status="online"
      />
      <Button variant="outline" onClick={() => setAvailable((current) => !current)}>
        {available ? "Usa un'immagine non valida" : "Ripristina l'immagine"}
      </Button>
      <Avatar alt="Fotografia senza ritaglio aggiuntivo" src={coverPhoto} size="small" />
    </div>
  )
}

export const NativeImageRecovery: Story = {
  render: () => <RecoveringIdentity />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const identity = canvas.getByRole("img", { name: "Identità con immagine ripristinabile" })
    await waitFor(() => expect(identity.querySelector("[data-slot=avatar-image]")).toBeVisible())
    const status = canvas.getByText("Stato: online")
    await expect(status.closest("[role=img]")).toBeNull()
    await userEvent.click(canvas.getByRole("button", { name: "Usa un'immagine non valida" }))
    await waitFor(() => expect(within(identity).getByText("PA")).toBeVisible())
    await expect(identity).toHaveAccessibleName("Identità con immagine ripristinabile")
    const fallback = identity.querySelector("[data-slot=avatar-fallback]")
    if (!(fallback instanceof HTMLElement)) throw new Error("Expected the available image fallback")
    await expect(fallback.getBoundingClientRect().width).toBe(44)
    await expect(fallback.getBoundingClientRect().height).toBe(44)
    await waitFor(() =>
      expect(identity.querySelector("[data-slot=avatar-image]")).not.toBeInTheDocument(),
    )
    await userEvent.click(canvas.getByRole("button", { name: "Ripristina l'immagine" }))
    await waitFor(() => expect(identity.querySelector("[data-slot=avatar-image]")).toBeVisible())
    await waitFor(() => expect(within(identity).queryByText("PA")).not.toBeInTheDocument())
    const photo = canvas.getByRole("img", { name: "Fotografia senza ritaglio aggiuntivo" })
    const image = await expectLoadedImage(photo)
    await expect(getComputedStyle(image).objectFit).toBe("cover")
    await expect(image.getBoundingClientRect().width).toBe(44)
    await expect(image.getBoundingClientRect().height).toBe(44)
    await expect(getComputedStyle(image).borderRadius).toBe("8px")
  },
}

export const SourceIcons: Story = {
  tags: ["color-pinned"],
  parameters: { design: { type: "figma", url: figmaEmbedUrl("160:1403") } },
  render: () => (
    <div className="flex flex-wrap items-start gap-6">
      <Avatar
        alt="Servizio culturale"
        size="large"
        icon={<PagoPAIcon name="theater_comedy" size={32} />}
      />
      <div className="rounded-lg bg-navy p-4">
        <Avatar
          alt="Servizio culturale su superficie scura"
          size="large"
          icon={<PagoPAIcon name="theater_comedy" size={32} />}
          tone="inverse"
        />
      </div>
    </div>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const appearances: [string, string][] = [
      ["Servizio culturale", "rgb(14, 15, 19)"],
      ["Servizio culturale su superficie scura", "rgb(255, 255, 255)"],
    ]
    for (const [name, color] of appearances) {
      const identity = canvas.getByRole("img", { name })
      const fallback = identity.querySelector("[data-slot=avatar-fallback]")
      if (!(fallback instanceof HTMLElement)) throw new Error("Expected the source icon surface")
      await expect(getComputedStyle(fallback).backgroundColor).toBe("rgba(255, 255, 255, 0.2)")
      const symbol = fallback.querySelector("[data-figma-node-id='99:2278']")
      if (!(symbol instanceof HTMLElement)) throw new Error("Expected the actual source icon")
      await expect(symbol.getBoundingClientRect().width).toBe(32)
      await expect(symbol.getBoundingClientRect().height).toBe(32)
      await expect(getComputedStyle(symbol).color).toBe(color)
      const surface = identity.querySelector("[data-slot=avatar]")
      if (!(surface instanceof HTMLElement)) throw new Error("Expected the icon Avatar surface")
      await expect(getComputedStyle(surface, "::after").borderWidth).toBe("0px")
    }
  },
}

export const DecorativeIconSlot: Story = {
  parameters: { design: { type: "figma", url: figmaEmbedUrl("160:1403") } },
  render: () => (
    <div className="grid justify-items-start gap-4">
      <Button variant="outline">Prima dell'identità</Button>
      <Avatar
        alt="Identità visiva non interattiva"
        size="large"
        icon={
          <a href="#avatar-service-destination">
            <PagoPAIcon name="theater_comedy" size={32} />
          </a>
        }
      />
      <Button variant="outline">Dopo l'identità</Button>
      <p id="avatar-service-destination">La navigazione appartiene al contenitore del servizio.</p>
    </div>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const identity = canvas.getByRole("img", { name: "Identità visiva non interattiva" })
    const nestedLink = identity.querySelector("a")
    if (!(nestedLink instanceof HTMLAnchorElement)) throw new Error("Expected the caller icon")
    nestedLink.focus()
    await expect(nestedLink).not.toHaveFocus()
    await expect(canvas.queryByRole("link")).not.toBeInTheDocument()
  },
}

function RecoveringIconIdentity() {
  const [available, setAvailable] = React.useState(false)
  return (
    <div className="grid justify-items-start gap-4">
      <div className="rounded-lg bg-navy p-4">
        <Avatar
          alt="Servizio con icona alternativa"
          src={available ? productLogo : "data:image/png;base64,invalid"}
          imageFit="contain"
          icon={<PagoPAIcon name="theater_comedy" size={32} />}
          tone="inverse"
          size="large"
        />
      </div>
      <Button variant="outline" onClick={() => setAvailable((current) => !current)}>
        {available ? "Simula il logo non disponibile" : "Ripristina il logo del servizio"}
      </Button>
    </div>
  )
}

export const ImageIconRecovery: Story = {
  parameters: { design: { type: "figma", url: figmaEmbedUrl("160:1403") } },
  render: () => <RecoveringIconIdentity />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const identity = canvas.getByRole("img", { name: "Servizio con icona alternativa" })
    await waitFor(() =>
      expect(identity.querySelector("[data-figma-node-id='99:2278']")).toBeVisible(),
    )
    const surface = identity.querySelector("[data-slot=avatar]")
    if (!(surface instanceof HTMLElement)) throw new Error("Expected the visible Avatar surface")
    const paint = document.createElement("canvas").getContext("2d")
    if (!paint) throw new Error("Expected native color conversion")
    paint.fillStyle = getComputedStyle(surface).backgroundColor
    paint.fillRect(0, 0, 1, 1)
    await expect([...paint.getImageData(0, 0, 1, 1).data]).toEqual([0, 0, 0, 0])
    await expect(getComputedStyle(surface, "::after").borderWidth).toBe("0px")
    await userEvent.click(canvas.getByRole("button", { name: "Ripristina il logo del servizio" }))
    await waitFor(() => expect(identity.querySelector("[data-slot=avatar-image]")).toBeVisible())
    paint.clearRect(0, 0, 1, 1)
    paint.fillStyle = getComputedStyle(surface).backgroundColor
    paint.fillRect(0, 0, 1, 1)
    await expect([...paint.getImageData(0, 0, 1, 1).data]).toEqual([255, 255, 255, 255])
    await expect(getComputedStyle(surface, "::after").borderWidth).toBe("1px")
    await expect(identity.querySelector("[data-figma-node-id='99:2278']")).not.toBeInTheDocument()
  },
}

function SelectableIdentity() {
  const [selected, setSelected] = React.useState(false)
  return (
    <div className="flex items-center gap-3">
      <input
        id="avatar-product-choice"
        type="checkbox"
        checked={selected}
        onChange={(event) => setSelected(event.currentTarget.checked)}
      />
      <label htmlFor="avatar-product-choice" className="flex items-center gap-3">
        <Avatar
          alt="Identità del prodotto associato"
          src={productLogo}
          imageFit="contain"
          size="small"
          selected={selected}
        />
        <span>Associa questo prodotto</span>
      </label>
    </div>
  )
}

export const SourceSelection: Story = {
  tags: ["color-pinned"],
  parameters: { design: { type: "figma", url: figmaEmbedUrl("160:1344") } },
  render: () => <SelectableIdentity />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const identity = canvas.getByRole("img", { name: "Identità del prodotto associato" })
    const choice = canvas.getByRole("checkbox", { name: /Associa questo prodotto/ })
    await waitFor(() => expect(identity.querySelector("[data-slot=avatar-image]")).toBeVisible())
    await userEvent.click(choice)
    await expect(choice).toBeChecked()
    await waitFor(() =>
      expect(identity.querySelector("[data-figma-node-id='98:1156']")).toBeVisible(),
    )
    await expect(identity.querySelector("[data-slot=avatar-image]")).not.toBeInTheDocument()
    await expect(identity).not.toHaveAttribute("aria-selected")
    const selectedText = canvas.getByText("Selezionato")
    await expect(selectedText.closest("[role=img]")).toBeNull()
    const surface = identity.querySelector("[data-slot=avatar]")
    if (!(surface instanceof HTMLElement)) throw new Error("Expected the selected source surface")
    await expect(getComputedStyle(surface).backgroundColor).toBe("rgb(11, 62, 227)")
    const mark = surface.querySelector("[data-figma-node-id='98:1156']")
    if (!(mark instanceof HTMLElement)) throw new Error("Expected the genuine selection mark")
    await expect(mark.getBoundingClientRect().width).toBe(24)
    await expect(mark.getBoundingClientRect().height).toBe(24)
    await expect(getComputedStyle(mark).color).toBe("rgb(255, 255, 255)")
    await userEvent.keyboard(" ")
    await expect(choice).not.toBeChecked()
    await waitFor(() => expect(identity.querySelector("[data-slot=avatar-image]")).toBeVisible())
    await expect(canvas.queryByText("Selezionato")).not.toBeInTheDocument()
  },
}

function LoadingIdentities() {
  const [loading, setLoading] = React.useState(true)
  return (
    <div className="grid justify-items-start gap-4">
      <div className="flex items-start gap-6">
        <Avatar
          alt="Prodotto selezionato in caricamento"
          src={productLogo}
          imageFit="contain"
          size="small"
          selected
          loading={loading}
        />
        <Avatar
          alt="Organizzazione grande in caricamento"
          src={productLogo}
          imageFit="contain"
          size="large"
          loading={loading}
        />
      </div>
      <Button variant="outline" onClick={() => setLoading((current) => !current)}>
        {loading ? "Mostra le identità caricate" : "Ricarica le identità"}
      </Button>
    </div>
  )
}

export const SourceSkeleton: Story = {
  tags: ["color-pinned"],
  render: () => <LoadingIdentities />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const identities: [string, number][] = [
      ["Prodotto selezionato in caricamento", 44],
      ["Organizzazione grande in caricamento", 64],
    ]
    for (const [name, dimension] of identities) {
      const identity = canvas.getByRole("img", { name })
      await expect(identity).toHaveAttribute("aria-busy", "true")
      const skeleton = identity.querySelector("[data-slot=skeleton]")
      if (!(skeleton instanceof HTMLElement)) throw new Error("Expected the source Avatar skeleton")
      await expect(skeleton).toHaveAttribute("aria-hidden", "true")
      await expect(skeleton.getBoundingClientRect().width).toBe(dimension)
      await expect(skeleton.getBoundingClientRect().height).toBe(dimension)
      await expect(getComputedStyle(skeleton).borderRadius).toBe("8px")
      await expect(getComputedStyle(skeleton).backgroundColor).toBe("rgb(232, 235, 241)")
      await expect(identity.querySelector("[data-slot=avatar-image]")).not.toBeInTheDocument()
    }
    await expect(canvas.getByText("Selezionato").closest("[role=img]")).toBeNull()
    await userEvent.click(canvas.getByRole("button", { name: "Mostra le identità caricate" }))
    const selected = canvas.getByRole("img", { name: "Prodotto selezionato in caricamento" })
    await expect(selected).not.toHaveAttribute("aria-busy")
    await expect(selected.querySelector("[data-figma-node-id='98:1156']")).toBeVisible()
    const loaded = canvas.getByRole("img", { name: "Organizzazione grande in caricamento" })
    await expect(loaded).not.toHaveAttribute("aria-busy")
    await waitFor(() => expect(loaded.querySelector("[data-slot=avatar-image]")).toBeVisible())
    await expect(canvasElement.querySelector("[data-slot=skeleton]")).not.toBeInTheDocument()
  },
}

export const SourceDoubleAvatar: Story = {
  parameters: { design: { type: "figma", url: figmaEmbedUrl("160:1344") } },
  render: () => (
    <Avatar
      alt="Prodotto principale"
      src={productLogo}
      imageFit="contain"
      size="small"
      secondary={{ alt: "Prodotto collegato", src: productLogo, imageFit: "contain" }}
    />
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await expect(canvas.getAllByRole("img")).toHaveLength(2)
    const primary = canvas.getByRole("img", { name: "Prodotto principale" })
    const secondary = canvas.getByRole("img", { name: "Prodotto collegato" })
    const pair = primary.closest("[data-slot=avatar-pair]")
    if (!(pair instanceof HTMLElement)) throw new Error("Expected the shared double Avatar frame")
    const bounds = pair.getBoundingClientRect()
    await expect(bounds.width).toBe(44)
    await expect(bounds.height).toBe(44)
    const identities: [HTMLElement, number][] = [
      [primary, 0],
      [secondary, 16],
    ]
    for (const [identity, offset] of identities) {
      await waitFor(() => expect(identity.querySelector("[data-slot=avatar-image]")).toBeVisible())
      const identityBounds = identity.getBoundingClientRect()
      await expect(identityBounds.width).toBeCloseTo(28, 2)
      await expect(identityBounds.height).toBeCloseTo(28, 2)
      // The faces are scaled boxes: Chromatic's renderer can report the pair's
      // origin one device pixel off the transformed face. The contract under
      // test is the 44/28 grid and the 16px step, not its sub-pixel origin.
      await expect(Math.abs(identityBounds.x - bounds.x - offset)).toBeLessThanOrEqual(1)
      await expect(Math.abs(identityBounds.y - bounds.y - offset)).toBeLessThanOrEqual(1)
    }
    await expect(pair.querySelector("button,a,input,[tabindex]")).not.toBeInTheDocument()
  },
}

function RecoveringPair() {
  const [failed, setFailed] = React.useState(false)
  return (
    <div className="grid justify-items-start gap-4">
      <Avatar
        alt="Prodotto principale della coppia"
        src={productLogo}
        imageFit="contain"
        size="small"
        status="busy"
        secondary={{
          alt: "Organizzazione associata della coppia",
          src: failed ? "data:image/png;base64,invalid" : productLogo,
          initials: "OR",
          imageFit: "contain",
        }}
      />
      <Button variant="outline" onClick={() => setFailed((current) => !current)}>
        {failed
          ? "Ripristina l'organizzazione associata"
          : "Simula l'immagine associata non valida"}
      </Button>
    </div>
  )
}

export const PairedImageRecovery: Story = {
  parameters: { design: { type: "figma", url: figmaEmbedUrl("160:1344") } },
  render: () => <RecoveringPair />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const primary = canvas.getByRole("img", { name: "Prodotto principale della coppia" })
    const secondary = canvas.getByRole("img", { name: "Organizzazione associata della coppia" })
    await waitFor(() => expect(secondary.querySelector("[data-slot=avatar-image]")).toBeVisible())
    await userEvent.click(
      canvas.getByRole("button", { name: "Simula l'immagine associata non valida" }),
    )
    await waitFor(() => expect(within(secondary).getByText("OR")).toBeVisible())
    await expect(primary.querySelector("[data-slot=avatar-image]")).toBeVisible()
    await expect(secondary).toHaveAccessibleName("Organizzazione associata della coppia")
    const fallback = secondary.querySelector("[data-slot=avatar-fallback]")
    if (!(fallback instanceof HTMLElement))
      throw new Error("Expected the associated image fallback")
    const scale = fallback.getBoundingClientRect().width / fallback.offsetWidth
    await expect(Number.parseFloat(getComputedStyle(fallback).fontSize) * scale).toBeCloseTo(14, 1)
    const root = document.documentElement
    const previousSize = root.style.fontSize
    const previousPriority = root.style.getPropertyPriority("font-size")
    try {
      root.style.fontSize = "32px"
      const resizedScale = fallback.getBoundingClientRect().width / fallback.offsetWidth
      await expect(
        Number.parseFloat(getComputedStyle(fallback).fontSize) * resizedScale,
      ).toBeCloseTo(28, 1)
      await expect(fallback.scrollWidth).toBeLessThanOrEqual(fallback.clientWidth)
    } finally {
      root.style.setProperty("font-size", previousSize, previousPriority)
    }
    await expect(canvas.getByText("Stato: occupato").closest("[role=img]")).toBeNull()
    await userEvent.click(
      canvas.getByRole("button", { name: "Ripristina l'organizzazione associata" }),
    )
    await waitFor(() => expect(secondary.querySelector("[data-slot=avatar-image]")).toBeVisible())
    await waitFor(() => expect(within(secondary).queryByText("OR")).not.toBeInTheDocument())
    await expect(canvas.getAllByRole("img")).toHaveLength(2)
  },
}

export const PairedReadableInitials: Story = {
  parameters: { design: { type: "figma", url: figmaEmbedUrl("160:1344") } },
  render: () => (
    <div className="flex flex-wrap gap-6">
      {pairedSizes.map((size) => (
        <Avatar
          key={size}
          alt={`Identità principale ${size}`}
          initials="PA"
          size={size}
          secondary={{ alt: `Identità associata ${size}`, initials: "OR" }}
        />
      ))}
    </div>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const paint = document.createElement("canvas").getContext("2d")
    if (!paint) throw new Error("Expected native glyph metrics")
    await document.fonts.ready
    const verifyVisibleInitials = async () => {
      for (const size of pairedSizes) {
        const primary = canvas.getByRole("img", { name: `Identità principale ${size}` })
        const secondary = canvas.getByRole("img", { name: `Identità associata ${size}` })
        const fallback = secondary.querySelector("[data-slot=avatar-fallback]")
        if (!(fallback instanceof HTMLElement)) throw new Error("Expected the associated initials")
        const style = getComputedStyle(fallback)
        paint.font = `${style.fontStyle} ${style.fontWeight} ${style.fontSize} ${style.fontFamily}`
        const metrics = paint.measureText("OR")
        const range = document.createRange()
        range.selectNodeContents(fallback)
        const scale = fallback.getBoundingClientRect().width / fallback.offsetWidth
        const baseline = range.getBoundingClientRect().top + metrics.fontBoundingBoxAscent * scale
        await expect(baseline - metrics.actualBoundingBoxAscent * scale).toBeGreaterThanOrEqual(
          primary.getBoundingClientRect().bottom,
        )
        await expect(baseline + metrics.actualBoundingBoxDescent * scale).toBeLessThanOrEqual(
          secondary.getBoundingClientRect().bottom,
        )
      }
    }
    await verifyVisibleInitials()
    const root = document.documentElement
    const previousSize = root.style.fontSize
    const previousPriority = root.style.getPropertyPriority("font-size")
    try {
      root.style.fontSize = "32px"
      await verifyVisibleInitials()
    } finally {
      root.style.setProperty("font-size", previousSize, previousPriority)
    }
  },
}

export const NonColorStatuses: Story = {
  render: () => (
    <div className="flex flex-wrap gap-6">
      <Avatar alt="Identità disponibile" initials="PA" size="small" status="online" />
      <Avatar alt="Identità non in linea" initials="PA" size="small" status="offline" />
      <Avatar alt="Identità occupata" initials="PA" size="small" status="busy" />
    </div>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const appearances: [string, "disc" | "ring" | "square"][] = [
      ["Stato: online", "disc"],
      ["Stato: non in linea", "ring"],
      ["Stato: occupato", "square"],
    ]
    for (const [label, shape] of appearances) {
      const text = canvas.getByText(label)
      await expect(text.closest("[role=img]")).toBeNull()
      const indicator = text.previousElementSibling
      if (!(indicator instanceof HTMLElement)) throw new Error("Expected the visible status cue")
      await expect(indicator).toHaveAttribute("aria-hidden", "true")
      await expect(indicator.getBoundingClientRect().width).toBe(12)
      await expect(indicator.getBoundingClientRect().height).toBe(12)
      const radius = Number.parseFloat(getComputedStyle(indicator).borderRadius)
      if (shape === "square") {
        await expect(radius).toBe(2)
      } else {
        await expect(radius).toBeGreaterThanOrEqual(6)
      }
      if (shape === "ring") {
        await expect(getComputedStyle(indicator, "::after").borderWidth).toBe("2px")
        const paint = document.createElement("canvas").getContext("2d")
        if (!paint) throw new Error("Expected native color conversion")
        paint.fillStyle = getComputedStyle(indicator).backgroundColor
        paint.fillRect(0, 0, 1, 1)
        await expect([...paint.getImageData(0, 0, 1, 1).data]).toEqual([255, 255, 255, 255])
      }
    }
  },
}
