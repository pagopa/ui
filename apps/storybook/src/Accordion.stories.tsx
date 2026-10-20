import type { Meta, StoryObj } from "@storybook/react-vite"
import { expect, userEvent, within } from "storybook/test"

import { figmaEmbedUrl } from "@/catalog/figma/file"
import { PagoPAIcon } from "@/components/icons/PagoPAIcon"
import { Chip } from "@/components/inputs/chips"
import { Accordion } from "@/components/navigation"

const items = [
  {
    id: "one",
    icon: <PagoPAIcon name="photo" />,
    title: "Come posso pagare?",
    chip: (
      <Chip variant="neutral" size="compact">
        Novità
      </Chip>
    ),
    description: "Puoi pagare online oppure presso uno dei punti fisici abilitati.",
    content: "Scegli il canale che preferisci: l'esito è sempre tracciato e ricevi la quietanza.",
  },
  {
    id: "two",
    icon: <PagoPAIcon name="photo" />,
    title: "Dove trovo la ricevuta?",
    description: "La ricevuta viene inviata all'indirizzo email indicato durante il pagamento.",
    content: "La trovi anche nello storico dei pagamenti della tua area riservata.",
  },
  {
    id: "three",
    icon: <PagoPAIcon name="photo" />,
    title: "Il pagamento è sicuro?",
    chip: (
      <Chip variant="neutral" size="compact">
        Garanzia
      </Chip>
    ),
    description: "Le transazioni utilizzano sistemi conformi ai più elevati standard di sicurezza.",
    content: "I dati sono cifrati e non condivisi con terze parti oltre a quelle necessarie.",
  },
]

const meta = {
  title: "Components/Navigation/Accordion",
  component: Accordion,
  args: { items, defaultValue: "one" },
  argTypes: {
    items: { control: false },
    defaultValue: { control: "text" },
  },
  parameters: {
    design: { type: "figma", url: figmaEmbedUrl("759:6399") },
    docs: {
      description: {
        component:
          "Expandable details with a native trigger and its associated panel: the title opens and closes, the state is announced by `aria-expanded`.",
      },
    },
  },
} satisfies Meta<typeof Accordion>

export default meta
type Story = StoryObj<typeof meta>

export const Playground: Story = {
  // Reflow exemption pending a design request: docs/design-requests/2026-10-16-a11y-reflow-conditions.md.
  parameters: { a11yContract: { reflow: false } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const faq = canvas.getByRole("button", { name: /Dove trovo la ricevuta\?/ })
    await userEvent.click(faq)
    await expect(faq).toHaveAttribute("aria-expanded", "true")
    // The preview a human opens must show the source State=Open card, not the
    // clicked one: re-open the first item and drop the interaction focus ring.
    const first = canvas.getByRole("button", { name: /Come posso pagare\?/ })
    await userEvent.click(first)
    await expect(first).toHaveAttribute("aria-expanded", "true")
    await expect(faq).toHaveAttribute("aria-expanded", "false")
    if (document.activeElement instanceof HTMLElement) document.activeElement.blur()
  },
}

export const WithDisabledItem: Story = {
  // Reflow exemption pending a design request: docs/design-requests/2026-10-16-a11y-reflow-conditions.md.
  parameters: { a11yContract: { reflow: false } },
  args: {
    items: [
      ...items,
      {
        id: "four",
        icon: <PagoPAIcon name="photo" />,
        title: "Sezione non disponibile",
        chip: (
          <Chip variant="neutral" size="compact">
            Non attiva
          </Chip>
        ),
        content: "Contenuto non raggiungibile.",
        disabled: true,
      },
    ],
  },
}

export const Loading: Story = {
  // Reflow exemption pending a design request: docs/design-requests/2026-10-16-a11y-reflow-conditions.md.
  parameters: { a11yContract: { reflow: false } },
  args: {
    items: [
      {
        id: "loading",
        title: "",
        content: null,
        skeleton: true,
      },
      ...items,
    ],
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await expect(canvas.getByText("Caricamento in corso")).toBeInTheDocument()
    await expect(canvas.getByRole("button", { name: /Come posso pagare\?/ })).toBeVisible()
  },
}
