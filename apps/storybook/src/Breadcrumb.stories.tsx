import type { Meta, StoryObj } from "@storybook/react-vite"
import { expect, userEvent, within } from "storybook/test"

import { figmaEmbedUrl } from "@/catalog/figma/file"
import { Breadcrumb } from "@/components/navigation/breadcrumb"
import { Button } from "@/components/primitives/button"

import breadcrumbGuide from "./guides/breadcrumb-navigation.md?raw"

const meta = {
  title: "Components/Navigation/Breadcrumb",
  component: Breadcrumb,
  args: {
    items: [
      { label: "Home", href: "#" },
      { label: "Servizi", href: "#servizi" },
      { label: "Pagamenti" },
    ],
  },
  parameters: {
    layout: "padded",
    docs: {
      description: {
        component: `Extended navigation path or compact back link. Ancestors with a destination are real links; the last item is text and announces the current page.

${breadcrumbGuide}`,
      },
    },
  },
} satisfies Meta<typeof Breadcrumb>

export default meta
type Story = StoryObj<typeof meta>

export const Playground: Story = { tags: ["color-pinned"] }

export const BreadcrumbExtended: Story = {
  tags: ["color-pinned"],
  name: "Antenati e pagina corrente",
  parameters: {
    design: { type: "figma", url: figmaEmbedUrl("123:7768") },
  },
  render: () => (
    <div className="grid gap-4">
      <Breadcrumb
        items={[
          { label: "Home", href: "#breadcrumb-home" },
          { label: "Servizi", href: "#breadcrumb-services" },
          { label: "Archivio senza collegamento" },
          { label: "Pagamento corrente", href: "#not-current-navigation" },
        ]}
      />
      <Button>Continua percorso</Button>
    </div>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const navigation = within(canvas.getByRole("navigation", { name: "Percorso di navigazione" }))
    await expect(
      navigation.queryByRole("link", { name: "Archivio senza collegamento" }),
    ).not.toBeInTheDocument()
    await expect(navigation.getAllByRole("listitem")).toHaveLength(4)
    const home = navigation.getByRole("link", { name: "Home" })
    const services = navigation.getByRole("link", { name: "Servizi" })
    await expect(home).toHaveAttribute("href", "#breadcrumb-home")
    await expect(services).toHaveAttribute("href", "#breadcrumb-services")
    const current = navigation.getByText("Pagamento corrente")
    await expect(current).toHaveAttribute("aria-current", "page")
    await expect(
      navigation.queryByRole("link", { name: "Pagamento corrente" }),
    ).not.toBeInTheDocument()
    await expect(getComputedStyle(home).fontSize).toBe("16px")
    await expect(getComputedStyle(home).fontWeight).toBe("600")
    await expect(getComputedStyle(home).color).toBe("rgb(14, 15, 19)")
    await expect(getComputedStyle(current).fontWeight).toBe("400")
    await expect(getComputedStyle(current).color).toBe("rgb(85, 92, 112)")
    await expect(home.getBoundingClientRect().height).toBeGreaterThanOrEqual(44)
    await expect(navigation.queryByText("/")).not.toBeInTheDocument()
    home.focus()
    await userEvent.tab()
    await expect(services).toHaveFocus()
    await userEvent.tab()
    await expect(canvas.getByRole("button", { name: "Continua percorso" })).toHaveFocus()
  },
}

export const BreadcrumbCompact: Story = {
  tags: ["color-pinned"],
  name: "Ritorno compatto esplicito",
  parameters: {
    design: { type: "figma", url: figmaEmbedUrl("123:7777") },
  },
  render: () => (
    <div className="grid gap-4">
      <Breadcrumb
        layout="compact"
        back={{ label: "Torna ai servizi", href: "#explicit-breadcrumb-parent" }}
        aria-label="Navigazione compatta"
      />
      <Button>Prosegui</Button>
    </div>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const navigation = within(canvas.getByRole("navigation", { name: "Navigazione compatta" }))
    const back = navigation.getByRole("link", { name: "Torna ai servizi" })
    await expect(back).toHaveAttribute("href", "#explicit-breadcrumb-parent")
    await expect(back).not.toHaveAttribute("aria-current")
    await expect(navigation.getAllByRole("listitem")).toHaveLength(1)
    await expect(navigation.getAllByRole("link")).toHaveLength(1)
    await expect(navigation.queryByRole("button")).not.toBeInTheDocument()
    await expect(back.getBoundingClientRect().height).toBeGreaterThanOrEqual(44)
    await expect(getComputedStyle(back).fontSize).toBe("16px")
    await expect(getComputedStyle(back).fontWeight).toBe("600")
    await expect(getComputedStyle(back).color).toBe("rgb(14, 15, 19)")
    const artwork = back.querySelector("[aria-hidden='true']")
    await expect(artwork).not.toBeNull()
    if (!artwork) throw new Error("Missing source back artwork")
    await expect(artwork.getBoundingClientRect().width).toBe(24)
    await expect(artwork.getBoundingClientRect().height).toBe(24)
    back.focus()
    await userEvent.tab()
    await expect(canvas.getByRole("button", { name: "Prosegui" })).toHaveFocus()
  },
}

export const BreadcrumbReflow: Story = {
  name: "Etichette lunghe in griglia stretta",
  parameters: { layout: "padded" },
  render: () => (
    <section
      aria-label="Percorsi stretti"
      style={{ display: "grid", gap: 16, width: 240, maxWidth: "100%" }}
    >
      <Breadcrumb
        aria-label="Percorso esteso stretto"
        items={[
          { label: "Home", href: "#breadcrumb-home" },
          {
            label: "AmbienteDiVerificaDellaPubblicaAmministrazione",
            href: "#breadcrumb-services",
          },
          { label: "PagamentoConUnaDescrizioneParticolarmenteLunga" },
        ]}
      />
      <Breadcrumb
        aria-label="Ritorno stretto"
        layout="compact"
        back={{
          label: "TornaAlServizioDellaPubblicaAmministrazione",
          href: "#explicit-breadcrumb-parent",
        }}
      />
    </section>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const container = canvas.getByRole("region", { name: "Percorsi stretti" })
    await expect(container.scrollWidth).toBeLessThanOrEqual(container.clientWidth)
    for (const navigation of within(container).getAllByRole("navigation")) {
      await expect(navigation.getBoundingClientRect().right).toBeLessThanOrEqual(
        container.getBoundingClientRect().right + 0.5,
      )
      for (const link of within(navigation).getAllByRole("link")) {
        await expect(link.getBoundingClientRect().height).toBeGreaterThanOrEqual(44)
        await expect(link.scrollWidth).toBeLessThanOrEqual(link.clientWidth)
      }
    }
    await expect(
      within(container).getByText("PagamentoConUnaDescrizioneParticolarmenteLunga"),
    ).toHaveAttribute("aria-current", "page")
  },
}

export const BreadcrumbFidelity: Story = {
  tags: ["color-pinned"],
  name: "Pinned source anatomy",
  parameters: {
    layout: "padded",
    design: { type: "figma", url: figmaEmbedUrl("123:7768") },
  },
  render: () => (
    <div className="grid gap-4">
      <div data-fidelity-variant="123-7769">
        <Breadcrumb
          items={[{ label: "Link", href: "#breadcrumb-source-parent" }, { label: "Current" }]}
        />
      </div>
      <div data-fidelity-variant="123-7777">
        <Breadcrumb
          layout="compact"
          back={{ label: "Back", href: "#breadcrumb-source-parent" }}
          aria-label="Navigazione compatta"
        />
      </div>
    </div>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const extendedNav = canvas.getByRole("navigation", {
      name: "Percorso di navigazione",
    })
    const extended = within(extendedNav)
    const link = extended.getByRole("link", { name: "Link" })
    const current = extended.getByText("Current")
    const separator = extendedNav.querySelector(".breadcrumb-separator")

    await expect(link).toHaveAttribute("href", "#breadcrumb-source-parent")
    await expect(current).toHaveAttribute("aria-current", "page")
    await expect(extended.queryByRole("link", { name: "Current" })).not.toBeInTheDocument()
    await expect(link.getBoundingClientRect().height).toBeGreaterThanOrEqual(44)
    await expect(getComputedStyle(link).fontSize).toBe("16px")
    await expect(getComputedStyle(link).lineHeight).toBe("22px")
    await expect(getComputedStyle(link).fontWeight).toBe("600")
    await expect(getComputedStyle(link).color).toBe("rgb(14, 15, 19)")
    await expect(getComputedStyle(current).fontWeight).toBe("400")
    await expect(getComputedStyle(current).color).toBe("rgb(85, 92, 112)")
    await expect(separator).not.toBeNull()
    if (!separator) throw new Error("Missing decorative source separator")
    await expect(separator).toHaveAttribute("aria-hidden", "true")
    await expect(separator.getBoundingClientRect().width).toBe(16)
    await expect(separator.getBoundingClientRect().height).toBe(16)
    await expect(getComputedStyle(separator).color).toBe("rgb(14, 15, 19)")
    await expect(getComputedStyle(separator).opacity).toBe("0.8")

    const compactNav = within(canvas.getByRole("navigation", { name: "Navigazione compatta" }))
    const back = compactNav.getByRole("link", { name: "Back" })
    const backIcon = back.querySelector(".breadcrumb-back-icon")

    await expect(back).toHaveAttribute("href", "#breadcrumb-source-parent")
    await expect(back.getBoundingClientRect().height).toBeGreaterThanOrEqual(44)
    await expect(backIcon).not.toBeNull()
    if (!backIcon) throw new Error("Missing source back arrow")
    await expect(backIcon).toHaveAttribute("aria-hidden", "true")
    await expect(backIcon.getBoundingClientRect().width).toBe(24)
    await expect(backIcon.getBoundingClientRect().height).toBe(24)
  },
}

export const BreadcrumbFidelityHoverLink: Story = {
  name: "Source link hover",
  parameters: {
    layout: "padded",
    design: { type: "figma", url: figmaEmbedUrl("123:7769") },
  },
  render: () => (
    <div data-fidelity-variant="124-3604">
      <Breadcrumb
        items={[{ label: "Link", href: "#breadcrumb-source-parent" }, { label: "Current" }]}
      />
    </div>
  ),
  play: async ({ canvasElement }) => {
    const navigation = within(
      within(canvasElement).getByRole("navigation", {
        name: "Percorso di navigazione",
      }),
    )
    const link = navigation.getByRole("link", { name: "Link" })

    // Storybook's synthetic hover does not set CSS :hover; real-pointer captures verify that state.
    await userEvent.hover(link)
    await expect(link).toHaveAttribute("href", "#breadcrumb-source-parent")
    await expect(getComputedStyle(link).lineHeight).toBe("22px")
    await expect(getComputedStyle(link).fontWeight).toBe("600")
  },
}

export const BreadcrumbFidelityHoverBack: Story = {
  name: "Source compact back hover",
  parameters: {
    layout: "padded",
    design: { type: "figma", url: figmaEmbedUrl("123:7777") },
  },
  render: () => (
    <div data-fidelity-variant="124-3608">
      <Breadcrumb
        layout="compact"
        back={{ label: "Back", href: "#breadcrumb-source-parent" }}
        aria-label="Navigazione compatta"
      />
    </div>
  ),
  play: async ({ canvasElement }) => {
    const navigation = within(
      within(canvasElement).getByRole("navigation", { name: "Navigazione compatta" }),
    )
    const back = navigation.getByRole("link", { name: "Back" })
    const backIcon = back.querySelector(".breadcrumb-back-icon")

    // Storybook's synthetic hover does not set CSS :hover; real-pointer captures verify that state.
    await userEvent.hover(back)
    await expect(back).toHaveAttribute("href", "#breadcrumb-source-parent")
    await expect(getComputedStyle(back).lineHeight).toBe("22px")
    await expect(getComputedStyle(back).fontWeight).toBe("600")
    await expect(backIcon).not.toBeNull()
    if (!backIcon) throw new Error("Missing source back arrow")
    await expect(backIcon.getBoundingClientRect().width).toBe(24)
  },
}
