import type { Meta, StoryObj } from "@storybook/react-vite"
import { expect, userEvent, within } from "storybook/test"

import { figmaEmbedUrl } from "@/catalog/figma/file"
import { CorrectionNotValid, CorrectionValid } from "@/components/content"
import { Timeline, type TimelineItemStatus } from "@/components/data-display"
import { PagoPAIcon } from "@/components/icons/PagoPAIcon"

import timelineGuide from "./guides/timeline.md?raw"

// The source sample of set `12812:16248` (`Device=Desktop|Mobile`): one Default
// item with its correction tag. The element publishes a single item, so the
// device captures map the variant to exactly this row.
const sourceDescription =
  "Né {name/ragione sociale} né un suo delegato hanno effettuato un accesso entro i termini, ma la notifica SEND si è comunque perfezionata il giorno {DD/MM/YYYY}.  01 FEB, 14:30"

const meta = {
  title: "Components/Data display/Timeline",
  component: Timeline,
  args: {
    label: "Cronologia della notifica",
    items: [
      {
        id: "sent",
        title: "Richiesta inviata",
        description: "Protocollo 2026/0421",
        dot: "outlined",
        timestamp: { month: "FEB", day: "01", time: "14:30" },
      },
      {
        id: "delivered",
        title: "Consegnata",
        description: "La notifica digitale è stata consegnata al destinatario.",
        status: "success",
        correction: <CorrectionValid />,
        timestamp: { month: "FEB", day: "02", time: "09:12" },
      },
      {
        id: "invalid",
        title: "Evento non valido",
        description: "Nessun accesso entro i termini previsti.",
        status: "warning",
      },
      {
        id: "manual",
        title: "Verifica manuale",
        description: "La comunicazione è in attesa di verifica.",
        status: "info",
      },
      {
        id: "result",
        title: "Esito",
        dot: "small",
      },
    ],
  },
  argTypes: { items: { control: false }, label: { control: "text" } },
  parameters: {
    design: { type: "figma", url: figmaEmbedUrl("12812:16248") },
    docs: {
      description: {
        component: `Event timeline with the source cursors, vertical timestamps, plain contents or status cards with the correction tag.

${timelineGuide}`,
      },
    },
  },
} satisfies Meta<typeof Timeline>

export default meta
type Story = StoryObj<typeof meta>

export const Playground: Story = {
  // Reflow exemption pending a design request: docs/design-requests/2026-10-16-a11y-reflow-conditions.md.
  parameters: { a11yContract: { reflow: false } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const timeline = canvas.getByRole("list", { name: "Cronologia della notifica" })
    await expect(within(timeline).getAllByRole("listitem")).toHaveLength(5)
    await expect(within(timeline).getAllByText("FEB")).toHaveLength(2)
    await expect(within(timeline).getByText("EVENTO RETTIFICATO")).toBeVisible()
    await expect(within(timeline).getByText("Esito")).toBeVisible()
  },
}

export const PlainItems: Story = {
  // Reflow exemption pending a design request: docs/design-requests/2026-10-16-a11y-reflow-conditions.md.
  parameters: { a11yContract: { reflow: false } },
  args: {
    items: [
      {
        id: "one",
        title: "Richiesta inviata",
        description: "La richiesta è stata protocollata.",
        dot: "outlined",
        timestamp: { month: "GEN", day: "12", time: "08:45" },
      },
      {
        id: "two",
        title: "Verifica in corso",
        description: "Stiamo controllando i dati della richiesta.",
        dot: "filled",
        timestamp: { month: "GEN", day: "13", time: "10:15" },
      },
      {
        id: "three",
        title: "Completamento",
        dot: "small",
      },
    ],
  },
}

export const Touchpoints: Story = {
  // Reflow exemption pending a design request: docs/design-requests/2026-10-16-a11y-reflow-conditions.md.
  parameters: { a11yContract: { reflow: false } },
  args: {
    label: "Touchpoint della notifica",
    items: [
      {
        id: "validation",
        title: "Notifica in validazione",
        status: "default",
        icon: <PagoPAIcon name="troubleshoot" size={24} />,
        correction: <CorrectionValid />,
        touchpoints: [
          {
            id: "digital",
            label: "Prima comunicazione digitale",
            icon: <PagoPAIcon name="mark_email_read" size={24} />,
            correction: <CorrectionValid />,
          },
          {
            id: "paper",
            label: "Seconda {Raccomandata A/R}",
            icon: <PagoPAIcon name="second_letter" size={24} />,
            defaultOpen: true,
            events: [
              {
                id: "printed",
                correction: <CorrectionNotValid />,
                description: "L'invio per via cartacea è stato annullato.",
              },
              {
                id: "progress",
                description: "Aggiornamento sull'invio della raccomandata.",
              },
            ],
          },
          {
            id: "analog",
            label: "Invio analogico",
            icon: <PagoPAIcon name="mail" size={24} />,
          },
        ],
      },
    ],
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const digital = canvas.getByRole("button", { name: /Prima comunicazione digitale/ })
    const analog = canvas.getByRole("button", { name: /Invio analogico/ })
    await expect(digital).toHaveAttribute("aria-expanded", "false")
    await expect(canvas.getAllByText("EVENTO NON VALIDO").length).toBeGreaterThan(0)
    await userEvent.click(digital)
    await expect(digital).toHaveAttribute("aria-expanded", "true")
    await userEvent.click(analog)
    await expect(analog).toHaveAttribute("aria-expanded", "true")
  },
}

export const Multidestinatario: Story = {
  // Reflow exemption pending a design request: docs/design-requests/2026-10-16-a11y-reflow-conditions.md.
  parameters: { a11yContract: { reflow: false } },
  args: {
    label: "Touchpoint per destinatario",
    items: [
      {
        id: "multi",
        title: "Notifica in validazione",
        status: "default",
        icon: <PagoPAIcon name="troubleshoot" size={24} />,
        correction: <CorrectionValid />,
        recipients: [
          {
            id: "mario",
            label: "Mario Rossi - RSSMRA80A01H501U",
            touchpoints: [
              {
                id: "mario-digital",
                label: "Prima comunicazione digitale",
                icon: <PagoPAIcon name="mark_email_read" size={24} />,
              },
              {
                id: "mario-paper",
                label: "Seconda {Raccomandata A/R}",
                icon: <PagoPAIcon name="second_letter" size={24} />,
              },
            ],
          },
          {
            id: "ente",
            label: "Comune di Milano - 01199250158",
            touchpoints: [
              {
                id: "ente-digital",
                label: "Prima comunicazione digitale",
                icon: <PagoPAIcon name="mark_email_read" size={24} />,
                correction: <CorrectionValid />,
              },
            ],
          },
        ],
      },
    ],
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await expect(canvas.getByText("Mario Rossi - RSSMRA80A01H501U")).toBeVisible()
    await expect(canvas.getByText("Comune di Milano - 01199250158")).toBeVisible()
    await expect(canvas.getAllByRole("button")).toHaveLength(3)
  },
}

// The cursor components are 24x24 frames whose 12px dot the element draws from
// `item.status`. Each capture is its own export so the Design panel shows the
// cursor node, and each renders a single-item timeline so the cursor is alone:
// a last item carries no rail, and the source `Rectangle 777` stub is that rail.
const cursorFixture = (nodeId: string, status: TimelineItemStatus, label: string) => () => (
  <div data-fidelity-variant={nodeId.replace(":", "-")} className="w-[320px]">
    <Timeline items={[{ id: status, title: label, status }]} />
  </div>
)

export const DotSuccess: Story = {
  // Reflow exemption pending a design request: docs/design-requests/2026-10-16-a11y-reflow-conditions.md.
  parameters: {
    layout: "fullscreen",
    a11yContract: { reflow: false },
    design: { type: "figma", url: figmaEmbedUrl("9866:4494") },
  },
  render: cursorFixture("9866:4494", "success", "Success"),
}

export const DotError: Story = {
  // Reflow exemption pending a design request: docs/design-requests/2026-10-16-a11y-reflow-conditions.md.
  parameters: {
    layout: "fullscreen",
    a11yContract: { reflow: false },
    design: { type: "figma", url: figmaEmbedUrl("9866:4497") },
  },
  render: cursorFixture("9866:4497", "error", "Error"),
}

export const DotWarning: Story = {
  // Reflow exemption pending a design request: docs/design-requests/2026-10-16-a11y-reflow-conditions.md.
  parameters: {
    layout: "fullscreen",
    a11yContract: { reflow: false },
    design: { type: "figma", url: figmaEmbedUrl("9866:4500") },
  },
  render: cursorFixture("9866:4500", "warning", "Warning"),
}

export const DotInfo: Story = {
  // Reflow exemption pending a design request: docs/design-requests/2026-10-16-a11y-reflow-conditions.md.
  parameters: {
    layout: "fullscreen",
    a11yContract: { reflow: false },
    design: { type: "figma", url: figmaEmbedUrl("9866:4503") },
  },
  render: cursorFixture("9866:4503", "info", "Info"),
}

// The element captures (`Device=Desktop` at the 848 page column,
// `Device=Mobile` at the 417 drawer panel) map this single item.
export const SourceCase: Story = {
  // Reflow exemption: fixture pinned at the source width, not a product surface.
  parameters: { a11yContract: { reflow: false } },
  name: "Source case",
  args: {
    label: "Cronologia della notifica",
    items: [
      {
        id: "law",
        title: "La notifica ha assunto valore di legge",
        description: sourceDescription,
        status: "default",
        correction: <CorrectionNotValid />,
      },
    ],
  },
}

export const Spacing: Story = {
  // Reflow exemption: fixture pinned at the source width, not a product surface.
  parameters: { layout: "fullscreen", a11yContract: { reflow: false } },
  args: {
    label: "Spaziatura della timeline",
    items: [
      {
        id: "card-with-description",
        title: "Scheda con descrizione",
        description: "Descrizione della scheda.",
        status: "default",
        touchpoints: [{ id: "card-a", label: "Primo touchpoint" }],
      },
      {
        id: "card-without-description",
        title: "Scheda senza descrizione",
        status: "default",
        touchpoints: [{ id: "card-b", label: "Secondo touchpoint" }],
      },
      {
        id: "plain-with-description",
        title: "Testo con descrizione",
        description: "Descrizione del testo.",
        touchpoints: [{ id: "plain-a", label: "Terzo touchpoint" }],
      },
      {
        id: "plain-without-description",
        title: "Testo senza descrizione",
        touchpoints: [{ id: "plain-b", label: "Quarto touchpoint" }],
      },
    ],
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const gap = (from: HTMLElement, to: HTMLElement) =>
      to.getBoundingClientRect().top - from.getBoundingClientRect().bottom

    const cardTitle = canvas.getByText("Scheda con descrizione")
    const cardDescription = canvas.getByText("Descrizione della scheda.", { selector: "p" })
    await expect(Math.round(gap(cardTitle, cardDescription))).toBe(4)

    const cardBareTitle = canvas.getByText("Scheda senza descrizione")
    const cardFirstTouchpoint = canvas.getByRole("button", { name: /Secondo touchpoint/ })
    await expect(Math.round(gap(cardBareTitle, cardFirstTouchpoint))).toBe(12)

    const plainTitle = canvas.getByText("Testo con descrizione")
    const plainDescription = canvas.getByText("Descrizione del testo.", { selector: "p" })
    await expect(Math.round(gap(plainTitle, plainDescription))).toBe(4)

    const plainBareTitle = canvas.getByText("Testo senza descrizione")
    const plainLastTouchpoint = canvas.getByRole("button", { name: /Quarto touchpoint/ })
    await expect(Math.round(gap(plainBareTitle, plainLastTouchpoint))).toBe(12)
  },
}
