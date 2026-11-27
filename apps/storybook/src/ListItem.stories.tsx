import type { Meta, StoryObj } from "@storybook/react-vite"
import { expect, userEvent, within } from "storybook/test"

import { Avatar } from "@/components/content/avatar"
import { ListItem } from "@/components/content/list-item"
import { Icon } from "@/components/icons/icon"
import { Default as ContentCopyIcon } from "@/components/icons/generated/content-copy"
import { Default as CreditCardIcon } from "@/components/icons/generated/credit-card"
import { Default as PhotoIcon } from "@/components/icons/generated/photo"
import { Default as ReportIcon } from "@/components/icons/generated/report"
import { Chip } from "@/components/inputs/chips"
import { figmaEmbedUrl } from "@/catalog/figma/file"
import listItemGuide from "./guides/list-items.md?raw"

const meta = {
  title: "Components/Content/ListItem",
  component: ListItem,
  args: {
    leading: <Icon source={PhotoIcon} className="pui:text-decorative-secondary" />,
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
    design: { type: "figma", url: figmaEmbedUrl("908:2234") },
    docs: {
      description: {
        component: `List row in the source composition: description, value, caller chip, suggestion line, primary amount, trailing icon and text action, plus a skeleton state. \`href\` makes the value a native link, \`onPress\` a native button.

${listItemGuide}`,
      },
    },
  },
} satisfies Meta<typeof ListItem>

export default meta
type Story = StoryObj<typeof meta>

export const Playground: Story = {
  // Reflow exemption debt, tracked in docs/design-requests/2026-11-26-reflow-exemption-debt.md.
  parameters: { a11yContract: { reflow: false } },
  // The fixture carries the source row (`897:18749`, 320×96): the row chip is part
  // of the source anatomy, and the 320px frame is `w-80` instead of the viewport.
  args: {
    chip: <Chip size="compact">Default</Chip>,
    className: "pui:w-80 pui:max-w-full",
    onPress: () => undefined,
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await userEvent.click(canvas.getByRole("button", { name: /Pagamento TARI 2025/ }))
  },
}

export const WithAvatar: Story = {
  // Reflow exemption debt, tracked in docs/design-requests/2026-11-26-reflow-exemption-debt.md.
  parameters: { a11yContract: { reflow: false } },
  args: {
    leading: <Avatar size="small" alt="Comune di Milano" initials="CM" />,
    chip: <Chip size="compact">Default</Chip>,
    onPress: () => undefined,
  },
}

export const LinkWithAvatar: Story = {
  // Reflow exemption debt, tracked in docs/design-requests/2026-11-26-reflow-exemption-debt.md.
  parameters: { a11yContract: { reflow: false } },
  args: {
    variant: "link",
    href: "#servizio",
    leading: <Avatar size="small" alt="Comune di Milano" initials="CM" />,
    chip: <Chip size="compact">Default</Chip>,
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const link = canvas.getByRole("link", { name: /Accertamento 00016\/2025/ })
    await expect(link).toHaveAttribute("href", "#servizio")
  },
}

export const Link: Story = {
  // Reflow exemption debt, tracked in docs/design-requests/2026-11-26-reflow-exemption-debt.md.
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
  // Reflow exemption debt, tracked in docs/design-requests/2026-11-26-reflow-exemption-debt.md.
  parameters: { a11yContract: { reflow: false } },
  args: {
    variant: "actionable",
    trailingIcon: <Icon source={ContentCopyIcon} />,
    chip: <Chip size="compact">Default</Chip>,
  },
}

export const Transactional: Story = {
  // Reflow exemption debt, tracked in docs/design-requests/2026-11-26-reflow-exemption-debt.md.
  parameters: { a11yContract: { reflow: false } },
  args: {
    variant: "transactional",
    leading: (
      <span className="pui:grid pui:size-11 pui:place-items-center pui:rounded-lg pui:border">
        <Icon source={CreditCardIcon} />
      </span>
    ),
    value: "Carta •••• 4532",
    amount: "744,00 €",
    onPress: () => undefined,
  },
}

export const WithSuggestion: Story = {
  // Reflow exemption debt, tracked in docs/design-requests/2026-11-26-reflow-exemption-debt.md.
  parameters: { a11yContract: { reflow: false } },
  args: {
    variant: "transactional",
    leading: (
      <span className="pui:grid pui:size-11 pui:place-items-center pui:rounded-lg pui:border">
        <Icon source={CreditCardIcon} />
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
    leading: <Icon source={ReportIcon} className="pui:text-destructive" />,
    value: "Avviso non trovato",
    description: undefined,
    helperText: "Controlla il codice avviso e riprova.",
    onPress: () => undefined,
  },
}

export const WithAction: Story = {
  // Reflow exemption debt, tracked in docs/design-requests/2026-11-26-reflow-exemption-debt.md.
  parameters: { a11yContract: { reflow: false } },
  args: {
    chip: <Chip size="compact">Default</Chip>,
    action: { label: "Aggiungi", onPress: () => undefined },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await userEvent.click(canvas.getByRole("button", { name: "Aggiungi" }))
  },
}

export const Loading: Story = {
  // Reflow exemption debt, tracked in docs/design-requests/2026-11-26-reflow-exemption-debt.md.
  parameters: { a11yContract: { reflow: false } },
  args: { loading: true, value: undefined, description: undefined },
  play: async ({ canvasElement }) => {
    const row = canvasElement.querySelector('[aria-busy="true"]')
    if (!row) throw new Error("Expected the skeleton row")
    await expect(row).toBeVisible()
  },
}
