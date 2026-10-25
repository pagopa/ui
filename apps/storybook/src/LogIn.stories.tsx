import * as React from "react"
import type { Meta, StoryObj } from "@storybook/react-vite"

import { figmaEmbedUrl } from "@/catalog/figma/file"
import { Alert, AlertDescription } from "@/components/primitives/alert"
import { Button } from "@/components/primitives/button"
import { PagoPAIcon } from "@/components/icons/PagoPAIcon"
import { Breadcrumb, Footer, Header, Preheader } from "@/components/navigation"
import { LogIn } from "@/components/templates/figma/LogIn"

// The source composition of set `2339:80916`: the application chrome around the
// login module. The copy is caller-owned, so the story carries the source
// sample (including the source placeholders for the informative banner).
const helpLink = (
  <a
    href="/spid-e-cie"
    className="rounded-sm font-semibold text-primary underline underline-offset-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
  >
    Scopri di più
  </a>
)

const termsLink = (
  <a
    href="/termini"
    className="rounded-sm font-semibold text-primary underline underline-offset-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
  >
    Termini e condizioni d’uso
  </a>
)

// The source alert hides its title and action layers: the visible composition
// is the warning glyph and the placeholding copy.
const sourceAlert = (
  <Alert variant="warning">
    <span
      data-slot="alert-icon"
      aria-hidden="true"
      className="flex size-6 items-center justify-center"
    >
      <PagoPAIcon name="warning" />
    </span>
    <AlertDescription>
      {"<placeholder per banner informativi che segnalano interventi sul portale>"}
    </AlertDescription>
  </Alert>
)

const sourceTerms = (
  <>
    Accedendo accetti i {termsLink} del servizio e confermi di avere letto l’{" "}
    <a
      href="/privacy"
      className="rounded-sm font-semibold text-primary underline underline-offset-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
    >
      Informativa Privacy
    </a>
    .
  </>
)

function ProviderButton({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <Button type="button" className="w-full">
      <span aria-hidden="true" className="flex size-6 shrink-0 items-center justify-center">
        {icon}
      </span>
      {label}
    </Button>
  )
}

function SourcePage() {
  return (
    <div data-slot="login-page" className="flex min-h-[80rem] flex-col bg-background">
      <Preheader
        institution="PagoPA S.p.A."
        links={[{ label: "Assistenza", href: "#assistenza" }]}
      />
      <Header product={{ label: "Nome del prodotto", href: "#prodotto" }} />
      <Breadcrumb layout="compact" back={{ label: "Back", href: "#indietro" }} />
      <main className="flex-1">
        <LogIn
          title="Accedi all’Area Riservata"
          description="Lo spazio dedicato agli enti che utilizzano i prodotti di PagoPA."
          alert={sourceAlert}
          actions={
            <>
              <ProviderButton icon={<PagoPAIcon name="SPID" />} label="Entra con SPID" />
              <ProviderButton icon={<PagoPAIcon name="CIEID" />} label="Entra con CIE" />
              <p className="text-center text-body">Non hai SPID o CIE? {helpLink}</p>
            </>
          }
          terms={sourceTerms}
        />
      </main>
      <Footer
        columns={[
          {
            brand: true,
            links: [
              { label: "Chi siamo", href: "#chi-siamo" },
              { label: "PNRR", href: "#pnrr" },
              { label: "Lavora con noi", href: "#lavora" },
              { label: "Media", href: "#media" },
            ],
          },
          {
            title: "PRODOTTI E SERVIZI",
            links: [
              { label: "IO, l’app dei servizi pubblici", href: "#io" },
              { label: "Piattaforma pagoPA", href: "#pagopa" },
              { label: "SEND", href: "#send" },
              { label: "PARI", href: "#pari" },
              { label: "Check IBAN", href: "#iban" },
              { label: "Piattaforma Digitale Nazionale Dati", href: "#pdnd" },
              { label: "Self Care", href: "#self-care" },
            ],
          },
          {
            title: "RISORSE",
            links: [
              { label: "Informativa Privacy", href: "#privacy" },
              { label: "Termini e Condizioni", href: "#termini" },
              { label: "Certificazioni", href: "#certificazioni" },
              { label: "Sicurezza delle informazioni", href: "#sicurezza" },
              { label: "Diritto alla protezione dei dati personali", href: "#dati" },
              { label: "Preferenze Cookie", href: "#cookie" },
              { label: "Società trasparente", href: "#trasparenza" },
            ],
          },
          {
            title: "SEGUICI SU",
            links: [
              { label: "Accessibilità", href: "#accessibilita" },
              { label: "Assistenza", href: "#assistenza" },
              {
                label: "Italiano",
                href: "#lingua",
                trailing: <PagoPAIcon name="chevron" variant="down" />,
              },
            ],
          },
        ]}
      />
    </div>
  )
}

const meta = {
  title: "Components/Templates/Log In",
  component: LogIn,
  args: { title: "Accedi all’Area Riservata", actions: null },
  parameters: {
    design: { type: "figma", url: figmaEmbedUrl("2339:80916") },
    layout: "fullscreen",
  },
} satisfies Meta<typeof LogIn>

export default meta
type Story = StoryObj<typeof meta>

// The page is responsive through the library chrome (viewport breakpoints), so
// one story shows it: the parity capture reproduces each device frame with its
// own viewport and artboard height.
export const Page: Story = {
  // Reflow exemption: fixture pinned at the source width, not a product surface.
  parameters: { a11yContract: { reflow: false } },
  name: "Page",
  render: () => <SourcePage />,
}

export const Module: Story = {
  // Reflow exemption: fixture pinned at the source width, not a product surface.
  parameters: { a11yContract: { reflow: false } },
  name: "Module (desktop frame)",
  render: () => (
    <div className="w-[56.25rem] max-w-full">
      <LogIn
        title="Accedi all’Area Riservata"
        description="Lo spazio dedicato agli enti che utilizzano i prodotti di PagoPA."
        alert={sourceAlert}
        actions={
          <>
            <ProviderButton icon={<PagoPAIcon name="SPID" />} label="Entra con SPID" />
            <ProviderButton icon={<PagoPAIcon name="CIEID" />} label="Entra con CIE" />
            <p className="text-center text-body">Non hai SPID o CIE? {helpLink}</p>
          </>
        }
        terms={sourceTerms}
      />
    </div>
  ),
}
