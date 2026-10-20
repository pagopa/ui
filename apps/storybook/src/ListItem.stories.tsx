import type { Meta, StoryObj } from "@storybook/react-vite"
import { expect, userEvent, within } from "storybook/test"

import { Avatar, ListItem } from "@/components/content"
import { PagoPAIcon } from "@/components/icons/PagoPAIcon"
import { Chip } from "@/components/inputs"

const meta = {
  title: "Components/Content/ListItem",
  component: ListItem,
  args: {
    leading: <PagoPAIcon name="photo" className="text-(--figma-color-neutrals-grey-300)" />,
    description: "Pagamento TARI 2025",
    value: "Accertamento 00016/2025",
  },
  argTypes: {
    leading: { control: false },
    chip: { control: false },
    suggestion: { control: false },
    trailingIcon: { control: false },
    action: { control: false },
    onPress: { control: false },
    variant: {
      control: "select",
      options: [
        "informative",
        "link",
        "actionable",
        "transactional",
        "amount",
        "error",
        "skeleton",
      ],
    },
  },
  parameters: {
    docs: {
      description: {
        component:
          "List row in the source composition: description, value, caller chip, suggestion line, primary amount, trailing icon and text action, plus a skeleton state. `href` makes the value a native link, `onPress` a native button.",
      },
    },
  },
} satisfies Meta<typeof ListItem>

export default meta
type Story = StoryObj<typeof meta>

export const Playground: Story = {
  // Reflow exemption pending a design request: docs/design-requests/2026-10-16-a11y-reflow-conditions.md.
  parameters: { a11yContract: { reflow: false } },
  // The fixture carries the source row (`897:18749`, 320×96): the row chip is part
  // of the source anatomy, and the 320px frame is `w-80` instead of the viewport.
  args: {
    chip: <Chip size="compact">Default</Chip>,
    className: "w-80 max-w-full",
    onPress: () => undefined,
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await userEvent.click(canvas.getByRole("button", { name: /Pagamento TARI 2025/ }))
  },
}

export const WithAvatar: Story = {
  // Reflow exemption pending a design request: docs/design-requests/2026-10-16-a11y-reflow-conditions.md.
  parameters: { a11yContract: { reflow: false } },
  args: {
    leading: <Avatar size="small" alt="Comune di Milano" initials="CM" />,
    chip: <Chip size="compact">Default</Chip>,
    onPress: () => undefined,
  },
}

export const Link: Story = {
  // Reflow exemption pending a design request: docs/design-requests/2026-10-16-a11y-reflow-conditions.md.
  parameters: { a11yContract: { reflow: false } },
  args: { variant: "link", href: "#servizio" },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const link = canvas.getByRole("link", { name: /Accertamento 00016\/2025/ })
    await expect(link).toHaveAttribute("href", "#servizio")
    await expect(canvas.queryByRole("button")).not.toBeInTheDocument()
  },
}

export const Actionable: Story = {
  // Reflow exemption pending a design request: docs/design-requests/2026-10-16-a11y-reflow-conditions.md.
  parameters: { a11yContract: { reflow: false } },
  args: {
    variant: "actionable",
    trailingIcon: <PagoPAIcon name="content_copy" />,
    chip: <Chip size="compact">Default</Chip>,
  },
}

export const Transactional: Story = {
  // Reflow exemption pending a design request: docs/design-requests/2026-10-16-a11y-reflow-conditions.md.
  parameters: { a11yContract: { reflow: false } },
  args: {
    variant: "transactional",
    leading: (
      <span className="grid size-11 place-items-center rounded-lg border">
        <PagoPAIcon name="credit_card" />
      </span>
    ),
    value: "Carta •••• 4532",
    suggestion: { label: "Sei già cliente" },
    amount: "744,00 €",
    onPress: () => undefined,
  },
}

export const Amount: Story = {
  args: {
    variant: "amount",
    leading: undefined,
    description: "Importo disponibile",
    value: "100,00 €",
    onPress: () => undefined,
  },
}

export const ErrorState: Story = {
  args: {
    variant: "error",
    leading: <PagoPAIcon name="report" className="text-destructive" />,
    value: "Avviso non trovato",
    description: undefined,
    helperText: "Controlla il codice avviso e riprova.",
    onPress: () => undefined,
  },
}

export const WithAction: Story = {
  // Reflow exemption pending a design request: docs/design-requests/2026-10-16-a11y-reflow-conditions.md.
  parameters: { a11yContract: { reflow: false } },
  args: {
    action: { label: "Aggiungi", onPress: () => undefined },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await userEvent.click(canvas.getByRole("button", { name: "Aggiungi" }))
  },
}

export const Loading: Story = {
  // Reflow exemption pending a design request: docs/design-requests/2026-10-16-a11y-reflow-conditions.md.
  parameters: { a11yContract: { reflow: false } },
  args: { loading: true, value: undefined, description: undefined },
  play: async ({ canvasElement }) => {
    const row = canvasElement.querySelector('[aria-busy="true"]')
    if (!row) throw new Error("Expected the skeleton row")
    await expect(row).toBeVisible()
  },
}
