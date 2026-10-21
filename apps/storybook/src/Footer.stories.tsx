import type { Meta, StoryObj } from "@storybook/react-vite"
import { expect, within } from "storybook/test"

import { figmaEmbedUrl } from "@/catalog/figma/file"
import { PagoPAIcon } from "@/components/icons/PagoPAIcon"
import { Footer, type FooterColumn, type FooterLink } from "@/components/navigation"

const links: FooterLink[] = [
  { label: "Informativa Privacy", href: "#" },
  { label: "Diritto alla protezione dei dati personali", href: "#" },
  { label: "Termini e Condizioni", href: "#" },
  { label: "Accessibilità", href: "#" },
  // Source `Translation` (1360:12618/12599): the label followed by the 24px
  // chevron, so the row is the source 24px (20px text rows keep the ::after).
  { label: "Italiano", href: "#", trailing: <PagoPAIcon name="chevron" variant="down" /> },
]

// Source copy of `Logged user=False, Device=Desktop` (1360:12667): column 1 has
// the logo and no title, column 4 groups the social row with its title and ends
// with the language control.
const columns: FooterColumn[] = [
  {
    brand: true,
    links: [
      { label: "Chi siamo", href: "#" },
      { label: "PNRR", href: "#" },
      { label: "Media", href: "#" },
      { label: "Lavora con noi", href: "#" },
    ],
  },
  {
    title: "PRODOTTI E SERVIZI",
    links: [
      { label: "IO, l’app dei servizi pubblici", href: "#" },
      { label: "Piattaforma pagoPA", href: "#" },
      { label: "SEND", href: "#" },
      { label: "PARI", href: "#" },
      { label: "Check IBAN", href: "#" },
      { label: "Piattaforma Digitale Nazionale Dati", href: "#" },
    ],
  },
  {
    title: "RISORSE",
    links: [
      { label: "Informativa Privacy", href: "#" },
      { label: "Termini e Condizioni", href: "#" },
      { label: "Certificazioni", href: "#" },
      { label: "Sicurezza delle informazioni", href: "#" },
      { label: "Diritto alla protezione dei dati personali", href: "#" },
      { label: "Preferenze Cookie", href: "#" },
      { label: "Società trasparente", href: "#" },
      { label: "Responsible Disclosure Policy", href: "#" },
      { label: "Modello 231", href: "#" },
    ],
  },
  {
    title: "SEGUICI SU",
    social: [
      { label: "LinkedIn", href: "#", icon: <PagoPAIcon name="Media logos" variant="linkedin" /> },
      {
        label: "Instagram",
        href: "#",
        icon: <PagoPAIcon name="Media logos" variant="instagram" />,
      },
      { label: "Threads", href: "#", icon: <PagoPAIcon name="Media logos" variant="threads" /> },
      { label: "YouTube", href: "#", icon: <PagoPAIcon name="Media logos" variant="youtube" /> },
    ],
    links: [
      { label: "Accessibilità", href: "#" },
      { label: "Italiano", href: "#", trailing: <PagoPAIcon name="chevron" variant="down" /> },
    ],
  },
]

const meta = {
  title: "Components/Navigation/Footer",
  component: Footer,
  args: {
    links,
  },
  argTypes: {
    brand: { control: false },
    links: { control: false },
    columns: { control: false },
    company: { control: "text" },
  },
  parameters: {
    layout: "fullscreen",
    design: { type: "figma", url: figmaEmbedUrl("1360:20138") },
    docs: {
      description: {
        component:
          "Institutional footer on a light surface. `links` renders the compact band (source `Logged user=True`); `columns` renders the `Links` block of the source `Logged user=False` — the source columns plus the caller-owned column tail (`end`). The company information stays separate from the divider in both. Below the mobile breakpoint the compact band stacks the brand and the links at the centre (source `1360:12618`, with the accessible target expansion); the columns stack with the source gap.",
      },
    },
  },
} satisfies Meta<typeof Footer>

export default meta
type Story = StoryObj<typeof meta>

export const Playground: Story = {
  tags: ["color-pinned"],
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await expect(canvas.getByRole("link", { name: "Informativa Privacy" })).toBeVisible()
    await expect(canvasElement.querySelectorAll("[data-slot=footer-column]")).toHaveLength(0)
    const company = canvas.getByText(/^PagoPA S\.p\.A\. - Società per azioni/)
    const style = getComputedStyle(company)
    await expect(style.fontSize).toBe("14px")
    await expect(style.fontWeight).toBe("400")
    await expect(style.lineHeight).toBe("20px")
    await expect(style.color).toBe("rgb(85, 92, 112)")
    await expect(style.textAlign).toBe("center")
  },
}

export const LoggedUserFalseDesktop: Story = {
  tags: ["color-pinned"],
  args: { links: [], columns },
  parameters: {
    docs: {
      description: {
        story:
          "Source variant `Logged user=False, Device=Desktop` (1360:12667): the links block with its columns and the company information. The fourth column's tail (EU badge, an external asset not published by the package) stays with the caller through `end`.",
      },
    },
    // The story is the Desktop source variant and its play function asserts the
    // four-column geometry; Chromatic captures and plays it at that width only.
    chromatic: { viewports: [1200] },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    // Four columns: brand column first, then the three source headings.
    const columnNodes = [...canvasElement.querySelectorAll("[data-slot=footer-column]")]
    await expect(columnNodes).toHaveLength(4)
    const headings = columnNodes.map((column) => column.querySelector("h2")?.textContent ?? null)
    await expect(headings).toEqual([null, "PRODOTTI E SERVIZI", "RISORSE", "SEGUICI SU"])
    await expect(columnNodes[0].querySelector("h2")).toBeNull()

    // Source `Label & Caption/Label overline`: 14px, bundled Semibold (600),
    // grey-700; the source 100% line height is the token's own 14px.
    const heading = canvas.getByRole("heading", { name: "PRODOTTI E SERVIZI" })
    const headingStyle = getComputedStyle(heading)
    await expect(headingStyle.fontSize).toBe("14px")
    await expect(headingStyle.fontWeight).toBe("600")
    await expect(headingStyle.lineHeight).toBe("14px")
    await expect(headingStyle.color).toBe("rgb(85, 92, 112)")

    // Source `Label Mini SB`: 14/20, foreground.
    const privacy = canvas.getByRole("link", { name: "Informativa Privacy" })
    const privacyStyle = getComputedStyle(privacy)
    await expect(privacyStyle.fontSize).toBe("14px")
    await expect(privacyStyle.fontWeight).toBe("600")
    await expect(privacyStyle.lineHeight).toBe("20px")
    await expect(privacyStyle.color).toBe("rgb(14, 15, 19)")
    await expect(Math.round(privacy.getBoundingClientRect().height)).toBe(20)

    // The 20px text row keeps a 44px pointer target through `::after`.
    const privacyHit = getComputedStyle(privacy, "::after")
    await expect(privacyHit.position).toBe("absolute")
    await expect(privacyHit.top).toBe("-12px")
    await expect(privacyHit.bottom).toBe("-12px")

    // The source language row is 24px: a 24px chevron follows the label.
    const italian = canvas.getByRole("link", { name: "Italiano" })
    await expect(Math.round(italian.getBoundingClientRect().height)).toBe(24)
    await expect(getComputedStyle(italian, "::after").top).toBe("-10px")

    // Column gap and copy: four equal columns 24px apart, source labels only.
    const first = columnNodes[0].getBoundingClientRect()
    const second = columnNodes[1].getBoundingClientRect()
    await expect(second.left - first.right).toBe(24)
    const columnLabels = (column: Element) =>
      [...column.querySelectorAll("[data-slot=footer-links] > li > a")].map(
        (anchor) => anchor.textContent,
      )
    await expect(columnLabels(columnNodes[1])).toEqual([
      "IO, l’app dei servizi pubblici",
      "Piattaforma pagoPA",
      "SEND",
      "PARI",
      "Check IBAN",
      "Piattaforma Digitale Nazionale Dati",
    ])
    await expect(columnLabels(columnNodes[2])).toEqual([
      "Informativa Privacy",
      "Termini e Condizioni",
      "Certificazioni",
      "Sicurezza delle informazioni",
      "Diritto alla protezione dei dati personali",
      "Preferenze Cookie",
      "Società trasparente",
      "Responsible Disclosure Policy",
      "Modello 231",
    ])
    await expect(columnLabels(columnNodes[3])).toEqual(["Accessibilità", "Italiano"])

    // Source `Social link`: four 24px marks, 32px apart.
    const social = ["LinkedIn", "Instagram", "Threads", "YouTube"].map((name) =>
      canvas.getByRole("link", { name }),
    )
    for (const mark of social) {
      const bounds = mark.getBoundingClientRect()
      await expect(Math.round(bounds.width)).toBe(24)
      await expect(Math.round(bounds.height)).toBe(24)
      await expect(getComputedStyle(mark, "::after").top).toBe("-10px")
    }
    await expect(
      social[1].getBoundingClientRect().left - social[0].getBoundingClientRect().right,
    ).toBe(32)

    // White surface, source divider and company sentence.
    const footer = canvasElement.querySelector("footer")
    if (!(footer instanceof HTMLElement)) throw new Error("footer not rendered")
    await expect(getComputedStyle(footer).backgroundColor).toBe("rgb(255, 255, 255)")
    await expect(getComputedStyle(footer).borderTopWidth).toBe("1px")
    await expect(getComputedStyle(footer).borderTopColor).toBe("rgb(232, 235, 241)")
    await expect(canvas.getByText(/^PagoPA S\.p\.A\. - Società per azioni/)).toBeVisible()
  },
}

export const ConfigurableHeading: Story = {
  args: { links: [], columns, titleAs: "h3" },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    // The caller owns the outline: the column titles render at the requested
    // level instead of a fixed h2.
    await expect(canvas.getAllByRole("heading", { level: 3 }).length).toBeGreaterThan(0)
    await expect(canvas.queryByRole("heading", { level: 2 })).not.toBeInTheDocument()
  },
}
