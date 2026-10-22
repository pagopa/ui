import * as React from "react"
import type { Meta, StoryObj } from "@storybook/react-vite"
import { expect, fn, userEvent, within } from "storybook/test"

import productLogo from "@/assets/storybook/1527-8132.svg"
import productCover from "@/assets/storybook/757-6293.jpeg"
import { figmaEmbedUrl } from "@/catalog/figma/file"
import { Avatar, Image } from "@/components/content"
import { CatalogueCard, ProductCard } from "@/components/data-display"
import { PagoPAIcon } from "@/components/icons/PagoPAIcon"
import { Chip } from "@/components/inputs/chips"

import productCardsGuide from "./guides/product-cards.md?raw"

const meta = {
  title: "Components/Data display/ProductCard",
  component: ProductCard,
  args: { title: "Nome prodotto" },
  parameters: {
    docs: {
      description: {
        component: productCardsGuide,
      },
    },
  },
} satisfies Meta<typeof ProductCard>

export default meta
type Story = StoryObj<typeof meta>

function SourceProductLogo() {
  return (
    <img src={productLogo} alt="Logo PARI" className="size-12 rounded bg-primary object-none" />
  )
}

function ProductWithAction() {
  const [opened, setOpened] = React.useState(false)
  return (
    <div className="flex w-68 flex-col gap-4">
      <ProductCard
        data-testid="product"
        title="Nome prodotto"
        logo={<SourceProductLogo />}
        chip={
          <Chip size="compact" variant="highlight">
            Premium
          </Chip>
        }
        description="Gestisci il prodotto con i suoi amministratori."
        actionLabel="Vai al prodotto"
        onAction={() => setOpened(true)}
      />
      <output>{opened ? "Prodotto aperto" : ""}</output>
    </div>
  )
}

export const SourceProduct: Story = {
  // Reflow exemption: fixture pinned at the source width, not a product surface.
  parameters: {
    a11yContract: { reflow: false },
    // The play function asserts the desktop type scale (24/32) and spacing; at
    // the mobile modes the card renders the 18/28 step, so Chromatic captures
    // and plays this fixture at the desktop width only.
    chromatic: { viewports: [1200] },
  },
  tags: ["color-pinned"],
  // The text-only source set (`757:10713`) was unpublished in the 2026-10-14
  // export, so this fixture is the caller composition of the card, not a
  // Design-panel source. The cover set `757:6288` remains the published one.
  render: () => <ProductWithAction />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const title = canvas.getByRole("heading", { name: "Nome prodotto", level: 3 })
    const card = canvas.getByTestId("product")
    const description = canvas.getByText("Gestisci il prodotto con i suoi amministratori.")
    const action = canvas.getByRole("button", { name: "Vai al prodotto" })

    await expect(title).toBeVisible()
    await expect(getComputedStyle(title).fontSize).toBe("24px")
    await expect(getComputedStyle(title).lineHeight).toBe("32px")
    await expect(getComputedStyle(card).borderRadius).toBe("24px")
    await expect(getComputedStyle(card).paddingTop).toBe("24px")
    await expect(getComputedStyle(card).rowGap).toBe("24px")
    await expect(getComputedStyle(description).fontSize).toBe("14px")
    await expect(getComputedStyle(description).lineHeight).toBe("20px")
    await expect(action).toHaveAttribute("type", "button")
    await expect(action.getBoundingClientRect().height).toBeGreaterThanOrEqual(48)
    await expect(getComputedStyle(action).backgroundColor).toBe("rgb(11, 62, 227)")

    action.focus()
    await userEvent.keyboard("{Enter}")
    await expect(canvas.getByRole("status")).toHaveTextContent("Prodotto aperto")
  },
}

export const LogoAndChip: Story = {
  // Reflow exemption pending a design request: docs/design-requests/2026-10-16-a11y-reflow-conditions.md.
  parameters: { a11yContract: { reflow: false } },
  tags: ["color-pinned"],
  render: () => (
    <div className="w-68">
      <ProductCard
        data-testid="product"
        title="Nome prodotto"
        titleAs="h2"
        logo={
          <PagoPAIcon
            name="IO logo"
            variant="dark"
            decorative={false}
            label="Logo di IO"
            size={48}
          />
        }
        chip={
          <Chip data-testid="premium" size="compact" variant="highlight">
            Premium
          </Chip>
        }
      />
    </div>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const card = canvas.getByTestId("product")
    const title = canvas.getByRole("heading", { name: "Nome prodotto", level: 2 })
    const chip = canvas.getByTestId("premium")
    await expect(canvas.getByRole("img", { name: "Logo di IO" })).toBeVisible()
    await expect(title.getBoundingClientRect().left - card.getBoundingClientRect().left).toBe(98)
    await expect(title.getBoundingClientRect().top - chip.getBoundingClientRect().bottom).toBe(4)
    await expect(chip.getBoundingClientRect().height).toBe(24)
    await expect(getComputedStyle(chip).fontSize).toBe("12px")
    await expect(getComputedStyle(chip).lineHeight).toBe("18px")
    await expect(getComputedStyle(chip).color).toBe("rgb(0, 59, 61)")
    await expect(getComputedStyle(chip).backgroundColor).toBe("rgb(219, 249, 250)")
    await expect(canvas.queryAllByRole("link")).toHaveLength(0)
    await expect(canvas.queryAllByRole("button")).toHaveLength(0)
  },
}

function ProductWithLinks() {
  const [submitted, setSubmitted] = React.useState(false)
  return (
    <form
      aria-label="Prodotto con navigazione"
      className="flex w-68 flex-col gap-4"
      onSubmit={(event) => {
        event.preventDefault()
        setSubmitted(true)
      }}
    >
      <ProductCard
        title="Nome prodotto"
        description={
          <>
            Per gestire questo prodotto, chiedi a uno dei suoi{" "}
            <a
              href="/prodotti/amministratori"
              className="rounded-sm font-semibold text-primary underline underline-offset-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
            >
              Amministratori
            </a>
          </>
        }
        href="/prodotti/pari"
        actionLabel="Vai al prodotto"
      />
      <output>{submitted ? "Modulo inviato" : "Nessun invio"}</output>
    </form>
  )
}

export const NativeProductLinks: Story = {
  // Reflow exemption pending a design request: docs/design-requests/2026-10-16-a11y-reflow-conditions.md.
  parameters: { a11yContract: { reflow: false } },
  render: () => <ProductWithLinks />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const action = canvas.getByRole("link", { name: "Vai al prodotto" })
    await expect(action.tagName).toBe("A")
    await expect(action).toHaveAttribute("href", "/prodotti/pari")
    await expect(action).not.toHaveAttribute("role", "button")
    await expect(canvas.getByRole("link", { name: "Amministratori" })).toHaveAttribute(
      "href",
      "/prodotti/amministratori",
    )
    await expect(canvas.queryAllByRole("button")).toHaveLength(0)

    let navigations = 0
    const recordNavigation = (event: Event) => {
      event.preventDefault()
      navigations += 1
    }
    action.addEventListener("click", recordNavigation)
    try {
      action.focus()
      await userEvent.keyboard(" ")
      await expect(navigations).toBe(0)
      await userEvent.keyboard("{Enter}")
      await expect(navigations).toBe(1)
      await expect(canvas.getByRole("status")).toHaveTextContent("Nessun invio")
    } finally {
      action.removeEventListener("click", recordNavigation)
    }
  },
}

function ImageProduct() {
  const [joined, setJoined] = React.useState(false)
  return (
    <div className="flex w-68 flex-col gap-4">
      <ProductCard
        data-testid="image-product"
        title="Firma con IO"
        logo={<SourceProductLogo />}
        image={<Image src={productCover} alt="Messaggi dei servizi pubblici nell'app IO" />}
        description={
          <>
            Consenti ai cittadini di firmare digitalmente documenti tramite l'app IO.{" "}
            <a
              href="/prodotti/firma-con-io"
              className="rounded-sm font-semibold text-primary underline underline-offset-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
            >
              Scopri di più
            </a>
          </>
        }
        actionLabel="Aderisci"
        onAction={() => setJoined(true)}
      />
      <output>{joined ? "Richiesta di adesione inviata" : ""}</output>
    </div>
  )
}

export const SourceImage: Story = {
  tags: ["color-pinned"],
  // Source set `757:6288` (product card with image); the registry evidence for
  // the node hangs on this export.
  parameters: {
    // Reflow exemption: fixture pinned at the source width, not a product surface.
    a11yContract: { reflow: false },
    design: { type: "figma", url: figmaEmbedUrl("757:6288") },
  },
  render: () => <ImageProduct />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const card = canvas.getByTestId("image-product")
    const title = canvas.getByRole("heading", { name: "Firma con IO", level: 3 })
    const cover = canvas.getByRole("img", { name: "Messaggi dei servizi pubblici nell'app IO" })
    const logo = canvas.getByRole("img", { name: "Logo PARI" })
    const description = canvas.getByText(/Consenti ai cittadini di firmare/)
    const action = canvas.getByRole("button", { name: "Aderisci" })

    if (!(cover instanceof HTMLImageElement)) throw new Error("The source cover must load")
    await cover.decode()
    const coverBounds = cover.getBoundingClientRect()
    await expect(coverBounds.width).toBe(272)
    await expect(coverBounds.height).toBe(191)
    await expect(coverBounds.top).toBe(card.getBoundingClientRect().top)
    await expect(logo.getBoundingClientRect().top).toBe(coverBounds.bottom - 24)
    await expect(logo.getBoundingClientRect().bottom).toBe(coverBounds.bottom + 24)
    await expect(title.getBoundingClientRect().top).toBe(coverBounds.bottom + 48)
    await expect(getComputedStyle(description).fontSize).toBe("16px")
    await expect(getComputedStyle(description).lineHeight).toBe("22px")
    await expect(action.getBoundingClientRect().height).toBeGreaterThanOrEqual(48)
    // The source 2px inside stroke is an inset ring: it paints inside the box
    // instead of widening it, so the border stays 0 and the ring is the stroke.
    await expect(getComputedStyle(action).backgroundColor).toBe("rgba(0, 0, 0, 0)")
    await expect(getComputedStyle(action).borderTopWidth).toBe("0px")
    await expect(getComputedStyle(action).boxShadow).toContain(
      "rgb(11, 62, 227) 0px 0px 0px 2px inset",
    )
    await expect(canvas.getByRole("link", { name: "Scopri di più" })).toHaveAttribute(
      "href",
      "/prodotti/firma-con-io",
    )

    action.focus()
    await userEvent.keyboard("{Enter}")
    await expect(canvas.getByRole("status")).toHaveTextContent("Richiesta di adesione inviata")
  },
}

export const NarrowContent: Story = {
  render: () => (
    <section
      aria-label="Card in griglia stretta"
      style={{ width: 240, maxWidth: "100%", display: "grid", gap: 16 }}
    >
      <ProductCard
        data-testid="narrow-product"
        title="GestioneDocumentalePerLeAmministrazioniPubbliche"
        logo={<SourceProductLogo />}
        chip={
          <Chip size="compact" variant="highlight">
            Servizio amministrativo avanzato
          </Chip>
        }
        description={
          <>
            Visita{" "}
            <a
              href="/prodotti/documenti"
              className="rounded-sm text-primary underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
            >
              https://servizi.example/gestionedocumentaleperleamministrazionipubbliche
            </a>{" "}
            per gestire tutti i documenti.
          </>
        }
        actionLabel="Richiedi l'accesso alla gestione amministrativa del prodotto"
        onAction={fn()}
      />
      <ProductCard
        data-testid="narrow-image-product"
        title="GestioneDocumentalePerLeAmministrazioniPubbliche"
        logo={<SourceProductLogo />}
        image={<Image src={productCover} alt="Messaggi nell'app IO" />}
        description="La documentazione del servizio rimane leggibile anche in una colonna stretta."
        href="/prodotti/documenti"
        actionLabel="Richiedi l'adesione al servizio di gestione amministrativa"
      />
    </section>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const region = canvas.getByRole("region", { name: "Card in griglia stretta" })
    await expect(region.scrollWidth).toBeLessThanOrEqual(region.clientWidth)
    for (const card of [
      canvas.getByTestId("narrow-product"),
      canvas.getByTestId("narrow-image-product"),
    ]) {
      const bounds = card.getBoundingClientRect()
      await expect(bounds.width).toBeLessThanOrEqual(240)
      await expect(card.scrollWidth).toBeLessThanOrEqual(card.clientWidth)
      const title = within(card).getByRole("heading")
      await expect(title).toBeVisible()
      await expect(title.getBoundingClientRect().height).toBeGreaterThan(32)
      const action =
        within(card).queryByRole("button") ??
        within(card).getByRole("link", { name: /Richiedi l'adesione/ })
      const actionBounds = action.getBoundingClientRect()
      await expect(actionBounds.left).toBeGreaterThanOrEqual(bounds.left + 24)
      await expect(actionBounds.right).toBeLessThanOrEqual(bounds.right - 24)
      await expect(actionBounds.height).toBeGreaterThanOrEqual(48)
      action.focus()
      await expect(action).toHaveFocus()
    }
  },
}

export const OptionalSlotsAndCatalogueContent: Story = {
  // Reflow exemption pending a design request: docs/design-requests/2026-10-16-a11y-reflow-conditions.md.
  parameters: { a11yContract: { reflow: false } },
  render: () => (
    <div className="grid w-68 gap-4">
      <ProductCard
        data-testid="informative-product"
        title="Guida ai servizi"
        image={<Image src={productCover} alt="Messaggi nell'app IO" />}
        description="Informazioni sul servizio."
        actionLabel="Non deve diventare un'azione"
      />
      <CatalogueCard
        title="Servizio anagrafico"
        titleAs="h2"
        eyebrow="Servizio regionale"
        organization="Comune di Milano"
        tags={["Anagrafe", "Online"]}
      >
        <p>Contenuto aggiuntivo del chiamante.</p>
      </CatalogueCard>
    </div>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const card = within(canvas.getByTestId("informative-product"))
    const cover = card.getByRole("img", { name: "Messaggi nell'app IO" })
    const title = card.getByRole("heading", { name: "Guida ai servizi" })
    await expect(title.getBoundingClientRect().top).toBe(cover.getBoundingClientRect().bottom + 24)
    await expect(
      canvas.getByRole("heading", { name: "Servizio anagrafico", level: 2 }),
    ).toBeVisible()
    await expect(canvas.getByText("Servizio regionale")).toBeVisible()
    await expect(canvas.getByText("Comune di Milano")).toBeVisible()
    await expect(canvas.getByText("Anagrafe")).toBeVisible()
    await expect(canvas.getByText("Online")).toBeVisible()
    await expect(canvas.getByText("Contenuto aggiuntivo del chiamante.")).toBeVisible()
    await expect(canvas.queryByText("Non deve diventare un'azione")).not.toBeInTheDocument()
    await expect(canvas.queryAllByRole("link")).toHaveLength(0)
    await expect(canvas.queryAllByRole("button")).toHaveLength(0)
  },
}

// The source CatalogueCard (808:6302) at its 360px frame width: 44px Avatar small,
// 16/22 title over the grey `Ente`, 14/20 description, then two 16/22 blue text
// actions and the right feedback glyphs. The text actions keep the source 22px
// line: their >=44px pointer target is the invisible ::after expansion.
const catalogueCardSource = {
  title: "Colonnine di ricarica auto elettriche",
  organization: "Comune di Milano",
  description:
    "Il servizio rivolto agli enti dell’area metropolitana per monitorare lo stato delle colonnine di ricarica delle auto elettriche gestito dal Comune di Milano",
}

function SourceCatalogue() {
  const [joined, setJoined] = React.useState(false)
  return (
    <div className="flex w-90 flex-col gap-4">
      <CatalogueCard
        data-testid="catalogue-card"
        avatar={<Avatar size="small" alt="Immagine dell'ente" />}
        {...catalogueCardSource}
        actions={[
          { label: "Ispeziona", href: "/servizi/colonnine" },
          { label: "Iscriviti", onPress: () => setJoined(true) },
        ]}
        feedback={[
          <PagoPAIcon
            key="person"
            name="person"
            variant="selected"
            size={24}
            className="text-primary"
          />,
          <PagoPAIcon key="check" name="check" variant="big" size={24} className="text-primary" />,
        ]}
      />
      <output>{joined ? "Iscrizione inviata" : ""}</output>
    </div>
  )
}

export const SourceCatalogueCard: Story = {
  tags: ["color-pinned"],
  parameters: {
    // Reflow exemption: fixture pinned at the source width, not a product surface.
    a11yContract: { reflow: false },
    design: { type: "figma", url: figmaEmbedUrl("808:6302") },
  },
  render: () => <SourceCatalogue />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const card = canvas.getByTestId("catalogue-card")
    const cardBounds = card.getBoundingClientRect()
    const style = getComputedStyle(card)
    const slot = (name: string) => {
      const element = card.querySelector(`[data-slot=${name}]`)
      if (!(element instanceof HTMLElement)) throw new Error(`missing [data-slot=${name}]`)
      return element
    }
    const child = (parent: HTMLElement, selector: string) => {
      const element = parent.querySelector(selector)
      if (!(element instanceof HTMLElement)) throw new Error(`missing ${selector}`)
      return element
    }

    await expect(cardBounds.width).toBe(360)
    await expect(cardBounds.height).toBe(236)
    await expect(style.borderRadius).toBe("8px")
    // The source 1px `#e8ebf1` stroke is INSIDE-aligned on the 360x236 frame and
    // consumes no layout space: the Card family models it as `ring-1 ring-border`,
    // which keeps the source 24px insets and the resulting 312px content width.
    await expect(style.borderTopWidth).toBe("0px")
    await expect(style.boxShadow).toContain("rgb(232, 235, 241)")
    await expect(style.backgroundColor).toBe("rgb(255, 255, 255)")
    await expect(style.padding).toBe("24px")
    await expect(style.rowGap).toBe("24px")

    const avatar = canvas.getByRole("img", { name: "Immagine dell'ente" })
    const avatarBounds = avatar.getBoundingClientRect()
    await expect(slot("catalogue-card-avatar").getBoundingClientRect().width).toBe(44)
    await expect(avatarBounds.width).toBe(44)
    await expect(avatarBounds.height).toBe(44)
    await expect(avatarBounds.top).toBe(cardBounds.top + 24)
    await expect(avatarBounds.left).toBe(cardBounds.left + 24)
    await expect(getComputedStyle(slot("avatar")).borderRadius).toBe("8px")

    const title = canvas.getByRole("heading", { name: catalogueCardSource.title, level: 3 })
    const titleBounds = title.getBoundingClientRect()
    const titleStyle = getComputedStyle(title)
    await expect(titleBounds.left).toBe(avatarBounds.right + 12)
    await expect(titleBounds.width).toBe(256)
    await expect(titleBounds.height).toBe(44)
    await expect(titleStyle.fontSize).toBe("16px")
    await expect(titleStyle.lineHeight).toBe("22px")
    await expect(titleStyle.fontWeight).toBe("600")
    await expect(titleStyle.color).toBe("rgb(14, 15, 19)")

    const organization = canvas.getByText(catalogueCardSource.organization)
    await expect(organization.getBoundingClientRect().top).toBe(titleBounds.bottom + 2)
    await expect(getComputedStyle(organization).fontSize).toBe("16px")
    await expect(getComputedStyle(organization).lineHeight).toBe("22px")
    await expect(getComputedStyle(organization).fontWeight).toBe("400")
    await expect(getComputedStyle(organization).color).toBe("rgb(85, 92, 112)")

    const description = canvas.getByText(/Il servizio rivolto agli enti/)
    const descriptionBounds = description.getBoundingClientRect()
    await expect(descriptionBounds.top).toBe(organization.getBoundingClientRect().bottom + 12)
    await expect(descriptionBounds.width).toBe(312)
    await expect(descriptionBounds.height).toBe(60)
    await expect(getComputedStyle(description).fontSize).toBe("14px")
    await expect(getComputedStyle(description).lineHeight).toBe("20px")
    await expect(getComputedStyle(description).fontWeight).toBe("400")
    await expect(getComputedStyle(description).color).toBe("rgb(85, 92, 112)")

    const actionsBox = slot("catalogue-card-actions")
    const feedbackBox = slot("catalogue-card-feedback")
    const inspect = canvas.getByRole("link", { name: "Ispeziona" })
    const join = canvas.getByRole("button", { name: "Iscriviti" })
    await expect(actionsBox.getBoundingClientRect().height).toBe(22)
    await expect(actionsBox.getBoundingClientRect().left).toBe(cardBounds.left + 24)
    await expect(inspect).toHaveAttribute("href", "/servizi/colonnine")
    await expect(join.getBoundingClientRect().left).toBe(inspect.getBoundingClientRect().right + 24)
    for (const action of [inspect, join]) {
      const bounds = action.getBoundingClientRect()
      const textStyle = getComputedStyle(action)
      const expansion = getComputedStyle(action, "::after")
      await expect(bounds.height).toBe(22)
      await expect(textStyle.fontSize).toBe("16px")
      await expect(textStyle.lineHeight).toBe("22px")
      await expect(textStyle.fontWeight).toBe("600")
      await expect(textStyle.color).toBe("rgb(11, 62, 227)")
      await expect(bounds.height - 2 * parseFloat(expansion.top)).toBeGreaterThanOrEqual(44)
    }

    const feedback = [...feedbackBox.children].filter(
      (element): element is HTMLElement => element instanceof HTMLElement,
    )
    await expect(feedback).toHaveLength(2)
    await expect(feedbackBox.getBoundingClientRect().right).toBe(cardBounds.right - 24)
    await expect(feedbackBox.getBoundingClientRect().height).toBe(24)
    await expect(feedback[1].getBoundingClientRect().left).toBe(
      feedback[0].getBoundingClientRect().right + 24,
    )
    for (const icon of feedback) {
      const glyph = child(icon, "span")
      await expect(icon.getBoundingClientRect().width).toBe(24)
      await expect(icon.getBoundingClientRect().height).toBe(24)
      // The source instance is a 24px box whose artwork is the source 16x16/15x11 glyph.
      await expect(glyph.getBoundingClientRect().width).toBe(24)
      await expect(glyph.getBoundingClientRect().height).toBe(24)
      await expect(getComputedStyle(glyph).backgroundColor).toBe("rgb(11, 62, 227)")
    }

    join.focus()
    await userEvent.keyboard("{Enter}")
    await expect(canvas.getByRole("status")).toHaveTextContent("Iscrizione inviata")
  },
}

// The two right-hand slots are caller-owned and independent: a card may carry
// actions without feedback, and feedback without actions, without inventing a
// source frame that does not exist.
export const CatalogueCardSlots: Story = {
  // Reflow exemption pending a design request: docs/design-requests/2026-10-16-a11y-reflow-conditions.md.
  parameters: { a11yContract: { reflow: false } },
  render: () => (
    <div className="flex w-90 flex-col gap-4">
      <CatalogueCard
        data-testid="actions-only"
        title="Servizio con solo azioni"
        actions={[
          { label: "Ispeziona", href: "/servizi/colonnine" },
          { label: "Iscriviti", onPress: fn() },
        ]}
      />
      <CatalogueCard
        data-testid="feedback-only"
        title="Servizio con solo indicatori"
        organization="Comune di Milano"
        feedback={[
          <PagoPAIcon key="check" name="check" variant="big" size={24} className="text-primary" />,
        ]}
      />
    </div>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const actionsOnly = canvas.getByTestId("actions-only")
    const feedbackOnly = canvas.getByTestId("feedback-only")

    await expect(actionsOnly.querySelector("[data-slot=catalogue-card-actions]")).not.toBeNull()
    await expect(actionsOnly.querySelector("[data-slot=catalogue-card-feedback]")).toBeNull()
    await expect(actionsOnly.querySelector("[data-slot=catalogue-card-organization]")).toBeNull()
    await expect(actionsOnly.querySelector("[data-slot=catalogue-card-description]")).toBeNull()
    const inspect = within(actionsOnly).getByRole("link", { name: "Ispeziona" })
    const inspectBounds = inspect.getBoundingClientRect()
    // Forced colors wraps the text action in a real 1px border; the text line
    // itself keeps the source 22px.
    const inspectBorder =
      parseFloat(getComputedStyle(inspect).borderTopWidth) +
      parseFloat(getComputedStyle(inspect).borderBottomWidth)
    await expect(inspectBounds.height - inspectBorder).toBe(22)
    await expect(getComputedStyle(inspect).lineHeight).toBe("22px")
    await expect(
      inspectBounds.height - 2 * parseFloat(getComputedStyle(inspect, "::after").top),
    ).toBeGreaterThanOrEqual(44)
    await expect(within(actionsOnly).getByRole("button", { name: "Iscriviti" })).toBeInTheDocument()

    await expect(feedbackOnly.querySelector("[data-slot=catalogue-card-feedback]")).not.toBeNull()
    await expect(feedbackOnly.querySelector("[data-slot=catalogue-card-actions]")).toBeNull()
    await expect(feedbackOnly.querySelector("[data-slot=catalogue-card-avatar]")).toBeNull()
    await expect(within(feedbackOnly).getByText("Comune di Milano")).toBeVisible()
  },
}
