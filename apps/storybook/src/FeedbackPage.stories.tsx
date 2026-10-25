import type { ReactNode } from "react"
import type { Meta, StoryObj } from "@storybook/react-vite"

import { figmaEmbedUrl } from "@/catalog/figma/file"
import { Avatar } from "@/components/content"
import { ErrorState, SuccessState, WaitingState } from "@/components/feedback"
import { PagoPAIcon } from "@/components/icons/PagoPAIcon"
import { Footer, Header, Preheader } from "@/components/navigation"
import { Button } from "@/components/primitives/button"
import { FeedbackPage } from "./templates/FeedbackPage"

import templatesGuide from "./guides/templates.md?raw"

// The source composition of set `1904:9589`: the application chrome around one
// state block. The copy is caller-owned, so the story carries the source sample
// (the same strings the pinned frames use).
const chrome = {
  product: { label: "Nome del prodotto", href: "#prodotto" },
  user: {
    name: "Nome ente figlio davvero molto lungo",
    parent: "Nome ente padre",
    role: "Tipologia referente",
    href: "#profilo",
  },
}

const footerLinks = [
  { label: "Informativa Privacy", href: "#privacy" },
  { label: "Diritto alla protezione dei dati personali", href: "#dati" },
  { label: "Termini e Condizioni", href: "#termini" },
  { label: "Accessibilità", href: "#accessibilita" },
]

function SourceChrome({ children }: { children: ReactNode }) {
  return (
    <FeedbackPage
      preheader={
        <Preheader
          institution="PagoPA S.p.A."
          links={[
            {
              label: "Manuale operativo",
              href: "#manuale",
              icon: <PagoPAIcon name="menu_book" />,
            },
            { label: "Assistenza", href: "#assistenza", icon: <PagoPAIcon name="support" /> },
            // Source `User` row: the account icon and the name on desktop, the
            // 32px Gravatar on mobile.
            {
              label: "Mario Rossi",
              href: "#utente",
              icon: <PagoPAIcon name="account_circle" />,
              avatar: <Avatar size="compact" initials="MR" alt="Mario Rossi" />,
            },
          ]}
        />
      }
      header={
        <Header
          product={chrome.product}
          user={{ ...chrome.user, avatar: <Avatar size="small" alt="Profilo di Mario Rossi" /> }}
        />
      }
      footer={
        <Footer
          brand="PagoPA"
          links={[
            ...footerLinks,
            {
              label: "Italiano",
              href: "#lingua",
              trailing: <PagoPAIcon name="chevron" variant="down" />,
            },
          ]}
        />
      }
    >
      {children}
    </FeedbackPage>
  )
}

// The source secondary action is the text button (`108:1448`): a 22px line with
// no fill, border or radius, kept with its invisible 44px pointer target.
function TextAction({ label }: { label: string }) {
  return (
    <button
      type="button"
      className="relative inline-flex min-h-0 items-center justify-center text-center text-base leading-[1.375] font-semibold text-primary whitespace-normal [overflow-wrap:anywhere] underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-solid focus-visible:outline-offset-2 focus-visible:outline-ring after:absolute after:inset-x-0 after:-inset-y-3"
    >
      {label}
    </button>
  )
}

const meta = {
  title: "Components/Templates/Feedback Page",
  component: FeedbackPage,
  args: { children: null },
  parameters: {
    design: { type: "figma", url: figmaEmbedUrl("1904:9589") },
    layout: "fullscreen",
    docs: { description: { component: templatesGuide } },
  },
} satisfies Meta<typeof FeedbackPage>

export default meta
type Story = StoryObj<typeof meta>

export const ThankYou: Story = {
  render: () => (
    <SourceChrome>
      <SuccessState
        title="Abbiamo ricevuto la tua richiesta!"
        description="Ti risponderemo al più presto all’indirizzo e-mail che hai indicato."
        actions={
          <>
            <Button type="button">Esci</Button>
            <TextAction label="Scarica il documento" />
          </>
        }
      />
    </SourceChrome>
  ),
}

export const KO: Story = {
  name: "Errore",
  render: () => (
    <SourceChrome>
      <ErrorState
        title="Qualcosa è andato storto"
        description="A causa di un errore del sistema non è possibile completare la procedura. Ti chiediamo di riprovare più tardi."
        code="[Codice errore]"
        actions={
          <>
            <Button type="button">Esci</Button>
            <TextAction label="Contatta l’assistenza" />
          </>
        }
      />
    </SourceChrome>
  ),
}

export const Waiting: Story = {
  // Reflow exemption pending a design request: docs/design-requests/2026-10-16-a11y-reflow-conditions.md.
  parameters: { a11yContract: { reflow: false } },
  name: "In attesa",
  render: () => (
    <SourceChrome>
      <WaitingState
        title="L’ente sta valutando la tua domanda di adesione"
        description="Quando pronto, riceverai l’esito all’indirizzo mail indicato."
        actions={
          <>
            <Button type="button">Esci</Button>
            <TextAction label="Contatta l’assistenza" />
          </>
        }
      />
    </SourceChrome>
  ),
}
