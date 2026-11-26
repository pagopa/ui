import type { Meta, StoryObj } from "@storybook/react-vite"
import * as React from "react"
import { expect, userEvent, within } from "storybook/test"

import { figmaEmbedUrl } from "@/catalog/figma/file"
import { PagoPAIcon } from "@/components/icons/PagoPAIcon"
import { Chip } from "@/components/inputs/chips"
import { Accordion } from "@/components/navigation"
import { Button } from "@/components/primitives/button"

import accordionGuide from "./guides/accordion.md?raw"

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
  args: { items, defaultValue: ["one"] },
  argTypes: {
    items: { control: false },
    defaultValue: { control: "object" },
  },
  parameters: {
    design: { type: "figma", url: figmaEmbedUrl("759:6399") },
    docs: {
      description: {
        component: `Expandable details with a native trigger and its associated panel: the title opens and closes, the state is announced by \`aria-expanded\`.

${accordionGuide}`,
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
        icon: <PagoPAIcon name="photo" />,
        title: "Come posso pagare?",
        chip: (
          <Chip variant="neutral" size="compact">
            Novità
          </Chip>
        ),
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

// The caller owns the open sections: a change on its side opens and closes
// them, and every click reports back so the caller keeps the single source.
function ControlledValueHarness() {
  const [value, setValue] = React.useState<string[]>(["one"])
  const [changes, setChanges] = React.useState(0)

  return (
    <div className="grid gap-3">
      <div className="flex flex-wrap gap-2">
        <Button variant="outline" onClick={() => setValue(["two"])}>
          Apri la seconda sezione
        </Button>
        <Button variant="outline" onClick={() => setValue([])}>
          Chiudi tutte le sezioni
        </Button>
      </div>
      <output data-testid="controlled-open">
        Aperte: {value.length > 0 ? value.join(", ") : "nessuna"}
      </output>
      <output data-testid="controlled-changes">Cambi: {changes}</output>
      <Accordion
        items={items}
        value={value}
        onValueChange={(next) => {
          setValue(next)
          setChanges((count) => count + 1)
        }}
      />
    </div>
  )
}

export const ControlledValue: Story = {
  // Reflow exemption pending a design request: docs/design-requests/2026-10-16-a11y-reflow-conditions.md.
  parameters: { a11yContract: { reflow: false } },
  render: () => <ControlledValueHarness />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const first = canvas.getByRole("button", { name: /Come posso pagare\?/ })
    const second = canvas.getByRole("button", { name: /Dove trovo la ricevuta\?/ })
    await expect(first).toHaveAttribute("aria-expanded", "true")
    await expect(second).toHaveAttribute("aria-expanded", "false")

    // A caller update, not a click, moves the open section.
    await userEvent.click(canvas.getByRole("button", { name: "Apri la seconda sezione" }))
    await expect(second).toHaveAttribute("aria-expanded", "true")
    await expect(first).toHaveAttribute("aria-expanded", "false")
    await expect(canvas.getByTestId("controlled-open")).toHaveTextContent("Aperte: two")
    await expect(canvas.getByTestId("controlled-changes")).toHaveTextContent("Cambi: 0")

    await userEvent.click(canvas.getByRole("button", { name: "Chiudi tutte le sezioni" }))
    await expect(second).toHaveAttribute("aria-expanded", "false")
    await expect(canvas.getByTestId("controlled-open")).toHaveTextContent("Aperte: nessuna")

    await userEvent.click(first)
    await expect(first).toHaveAttribute("aria-expanded", "true")
    await expect(canvas.getByTestId("controlled-open")).toHaveTextContent("Aperte: one")
    await expect(canvas.getByTestId("controlled-changes")).toHaveTextContent("Cambi: 1")

    await userEvent.click(first)
    await expect(first).toHaveAttribute("aria-expanded", "false")
    await expect(second).toHaveAttribute("aria-expanded", "false")
    await expect(canvas.getByTestId("controlled-changes")).toHaveTextContent("Cambi: 2")
  },
}

export const UncontrolledMultiple: Story = {
  // Reflow exemption pending a design request: docs/design-requests/2026-10-16-a11y-reflow-conditions.md.
  parameters: { a11yContract: { reflow: false } },
  args: { defaultValue: ["one", "two"], multiple: true },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const first = canvas.getByRole("button", { name: /Come posso pagare\?/ })
    const second = canvas.getByRole("button", { name: /Dove trovo la ricevuta\?/ })
    const third = canvas.getByRole("button", { name: /Il pagamento è sicuro\?/ })
    await expect(first).toHaveAttribute("aria-expanded", "true")
    await expect(second).toHaveAttribute("aria-expanded", "true")
    await expect(third).toHaveAttribute("aria-expanded", "false")

    // Expanding a section leaves the open ones open.
    await userEvent.click(third)
    await expect(third).toHaveAttribute("aria-expanded", "true")
    await expect(first).toHaveAttribute("aria-expanded", "true")
    await expect(second).toHaveAttribute("aria-expanded", "true")

    // Collapsing one leaves the others alone.
    await userEvent.click(first)
    await expect(first).toHaveAttribute("aria-expanded", "false")
    await expect(second).toHaveAttribute("aria-expanded", "true")
    await expect(third).toHaveAttribute("aria-expanded", "true")
  },
}

// The root the caller measures and styles: the forwarded node carries its own
// class, the caller's class and the caller's standard attribute.
function ForwardedContractHarness() {
  const [root, setRoot] = React.useState<HTMLDivElement | null>(null)
  const contract = root
    ? `classe=${root.classList.contains("max-w-md") ? "inoltrata" : "assente"} ` +
      `unione=${root.classList.contains("grid") ? "unita" : "persa"} ` +
      `attributo=${root.dataset.contractSlot ?? "assente"}`
    : "nessun elemento"

  return (
    <div className="grid gap-3">
      <output data-testid="root-contract">{contract}</output>
      <Accordion
        ref={setRoot}
        items={items}
        defaultValue={["one"]}
        className="max-w-md"
        data-contract-slot="accordion"
      />
    </div>
  )
}

export const ForwardedContract: Story = {
  // Reflow exemption pending a design request: docs/design-requests/2026-10-16-a11y-reflow-conditions.md.
  parameters: { a11yContract: { reflow: false } },
  render: () => <ForwardedContractHarness />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await expect(canvas.getByTestId("root-contract")).toHaveTextContent(
      "classe=inoltrata unione=unita attributo=accordion",
    )
  },
}

// The four source states of AccordionItem (759:6399), captured one per story so
// the root is the single item the source draws at its 580 width.
const sourceHeader = () => ({
  icon: <PagoPAIcon name="photo" />,
  title: "Accordion heading",
  chip: (
    <Chip variant="neutral" size="compact">
      Status
    </Chip>
  ),
})

const sourceItemWidth = "w-[580px] max-w-full"

export const FidelityClosed: Story = {
  tags: ["color-pinned"],
  parameters: {
    // Reflow exemption: fixture pinned at the source width, not a product surface.
    a11yContract: { reflow: false },
    design: { type: "figma", url: figmaEmbedUrl("759:6399") },
  },
  render: () => (
    <div data-fidelity-variant="759-6398" className={sourceItemWidth}>
      <Accordion
        items={[
          {
            id: "source-closed",
            ...sourceHeader(),
            content: null,
          },
        ]}
      />
    </div>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const trigger = canvas.getByRole("button", { name: /Accordion heading/ })
    await expect(trigger).toHaveAttribute("aria-expanded", "false")
    await expect(canvas.getByText("Status")).toBeVisible()
  },
}

export const FidelityOpen: Story = {
  tags: ["color-pinned"],
  parameters: {
    a11yContract: { reflow: false },
    design: { type: "figma", url: figmaEmbedUrl("759:6399") },
  },
  render: () => (
    <div data-fidelity-variant="759-6537" className={sourceItemWidth}>
      <Accordion
        defaultValue={["source-open"]}
        items={[
          {
            id: "source-open",
            ...sourceHeader(),
            description: "Support paragraph",
            content: "Il contenuto della sezione espansa.",
          },
        ]}
      />
    </div>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const trigger = canvas.getByRole("button", { name: /Accordion heading/ })
    await expect(trigger).toHaveAttribute("aria-expanded", "true")
    await expect(canvas.getByText("Support paragraph")).toBeVisible()
  },
}

export const FidelityDisabled: Story = {
  tags: ["color-pinned"],
  parameters: {
    a11yContract: { reflow: false },
    design: { type: "figma", url: figmaEmbedUrl("759:6399") },
  },
  render: () => (
    <div data-fidelity-variant="13027-5052" className={sourceItemWidth}>
      <Accordion
        items={[
          {
            id: "source-disabled",
            ...sourceHeader(),
            chip: (
              <Chip variant="neutral" appearance="outline" size="compact">
                Status
              </Chip>
            ),
            content: null,
            disabled: true,
          },
        ]}
      />
    </div>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const trigger = canvas.getByRole("button", { name: /Accordion heading/ })
    await expect(trigger).toBeDisabled()
  },
}

export const FidelitySkeleton: Story = {
  tags: ["color-pinned"],
  parameters: {
    a11yContract: { reflow: false },
    design: { type: "figma", url: figmaEmbedUrl("759:6399") },
  },
  render: () => (
    <div data-fidelity-variant="13027-5623" className={sourceItemWidth}>
      <Accordion
        items={[
          {
            id: "source-skeleton",
            ...sourceHeader(),
            content: null,
            skeleton: true,
          },
        ]}
      />
    </div>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await expect(canvas.getByText("Caricamento in corso")).toBeInTheDocument()
    await expect(canvas.queryByRole("button")).not.toBeInTheDocument()
  },
}
