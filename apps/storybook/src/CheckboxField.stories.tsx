import type { Meta, StoryObj } from "@storybook/react-vite"
import { expect, userEvent, within } from "storybook/test"

import { CheckboxField } from "@/components/inputs/checkbox-field"
import { Default as PrivacyTipIcon } from "@/components/icons/generated/privacy-tip"
import { figmaEmbedUrl } from "@/catalog/figma/file"

import checkboxGuide from "./guides/checkbox-choices.md?raw"
import { fieldError } from "./support/a11y-contract"

const figmaLabel = "Checkbox label"
const figmaDescription = "Testo descrittivo"
const fidelityParameters = { layout: "fullscreen" } as const

const meta = {
  title: "Components/Inputs/CheckboxField",
  component: CheckboxField,
  args: { label: "Comunicazioni di servizio", className: "pui:w-80 pui:max-w-full" },
  argTypes: {
    description: { control: "text" },
    error: { control: "text" },
    success: { control: "text" },
    required: { control: "boolean" },
    disabled: { control: "boolean" },
    leadingIcon: { control: false },
    indicatorPlacement: { control: "select", options: ["start", "end"] },
  },
  parameters: {
    docs: {
      description: {
        component: `Native choice box with label, description, validation and an announced required state.\n\n${checkboxGuide}`,
      },
    },
  },
} satisfies Meta<typeof CheckboxField>

export default meta
type Story = StoryObj<typeof meta>

export const Playground: Story = {
  // Reflow exemption debt, tracked in https://github.com/pagopa/ui/issues/192.
  parameters: { a11yContract: { reflow: false } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const checkbox = canvas.getByRole("checkbox", { name: /Comunicazioni di servizio/ })
    await userEvent.click(checkbox)
    await expect(checkbox).toBeChecked()
  },
}

export const WithDescription: Story = {
  // Reflow exemption debt, tracked in https://github.com/pagopa/ui/issues/192.
  parameters: { a11yContract: { reflow: false } },
  args: { label: "Ricevi aggiornamenti", description: "Una email quando cambia lo stato." },
}

export const Validation: Story = {
  args: { label: "Accetto i termini", error: "Devi accettare per continuare.", required: true },
}

export const RichOption: Story = {
  // Reflow exemption debt, tracked in https://github.com/pagopa/ui/issues/192.
  parameters: { a11yContract: { reflow: false } },
  args: {
    label: "Consenso al trattamento dei dati",
    description: "I dati sono trattati secondo l'informativa privacy.",
    leadingIcon: <PrivacyTipIcon />,
    indicatorPlacement: "end",
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await expect(
      canvas.getByRole("checkbox", { name: /Consenso al trattamento dei dati/ }),
    ).toBeVisible()
  },
}

export const SourceDefault: Story = {
  args: { label: figmaLabel },
  parameters: { ...fidelityParameters, design: { type: "figma", url: figmaEmbedUrl("194:3661") } },
}

export const SourceDefaultDisabled: Story = {
  args: { label: figmaLabel, disabled: true },
  parameters: { ...fidelityParameters, design: { type: "figma", url: figmaEmbedUrl("194:3661") } },
  play: async ({ canvasElement }) => {
    const checkbox = within(canvasElement).getByRole("checkbox", { name: figmaLabel })
    await expect(checkbox).toHaveAttribute("aria-disabled", "true")
    await expect(checkbox).toHaveAttribute("tabindex", "-1")
    await userEvent.click(checkbox)
    await expect(checkbox).not.toBeChecked()
  },
}

export const SourceSelected: Story = {
  args: { label: figmaLabel, defaultChecked: true },
  parameters: { ...fidelityParameters, design: { type: "figma", url: figmaEmbedUrl("194:3661") } },
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).getByRole("checkbox", { name: figmaLabel })).toBeChecked()
  },
}

export const SourceSelectedDisabled: Story = {
  args: { label: figmaLabel, defaultChecked: true, disabled: true },
  parameters: { ...fidelityParameters, design: { type: "figma", url: figmaEmbedUrl("194:3661") } },
  play: async ({ canvasElement }) => {
    const checkbox = within(canvasElement).getByRole("checkbox", { name: figmaLabel })
    await expect(checkbox).toHaveAttribute("aria-disabled", "true")
    await expect(checkbox).toHaveAttribute("tabindex", "-1")
    await userEvent.click(checkbox)
    await expect(checkbox).toBeChecked()
  },
}

export const SourceFeedback: Story = {
  args: { label: figmaLabel, error: "Helper text" },
  parameters: { ...fidelityParameters, design: { type: "figma", url: figmaEmbedUrl("194:3661") } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const checkbox = canvas.getByRole("checkbox", { name: figmaLabel })
    await userEvent.tab()
    await expect(checkbox).toHaveFocus()
    await expect(checkbox).toHaveAttribute("aria-invalid", "true")
    await expect(fieldError(canvasElement)).toHaveTextContent("Helper text")
  },
}

export const SourceRichSelected: Story = {
  args: {
    label: figmaLabel,
    description: figmaDescription,
    leadingIcon: <PrivacyTipIcon />,
    indicatorPlacement: "end",
    defaultChecked: true,
  },
  // Reflow exemption: fixture pinned at the source width, not a product surface.
  parameters: {
    layout: "fullscreen",
    design: { type: "figma", url: figmaEmbedUrl("194:3763") },
    a11yContract: { reflow: false },
  },
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).getByRole("checkbox", { name: figmaLabel })).toBeChecked()
  },
}

export const SourceRichSelectedUnavailable: Story = {
  args: {
    label: figmaLabel,
    description: figmaDescription,
    leadingIcon: <PrivacyTipIcon />,
    indicatorPlacement: "end",
    defaultChecked: true,
    disabled: true,
  },
  // Reflow exemption: fixture pinned at the source width, not a product surface.
  parameters: {
    layout: "fullscreen",
    design: { type: "figma", url: figmaEmbedUrl("194:3763") },
    a11yContract: { reflow: false },
  },
  play: async ({ canvasElement }) => {
    const checkbox = within(canvasElement).getByRole("checkbox", { name: figmaLabel })
    await expect(checkbox).toHaveAttribute("aria-disabled", "true")
    await expect(checkbox).toHaveAttribute("tabindex", "-1")
    await userEvent.click(checkbox)
    await expect(checkbox).toBeChecked()
  },
}

export const SourceRichDefault: Story = {
  args: {
    label: figmaLabel,
    description: figmaDescription,
    leadingIcon: <PrivacyTipIcon />,
    indicatorPlacement: "end",
  },
  // Reflow exemption: fixture pinned at the source width, not a product surface.
  parameters: {
    layout: "fullscreen",
    design: { type: "figma", url: figmaEmbedUrl("194:3763") },
    a11yContract: { reflow: false },
  },
  play: async ({ canvasElement }) => {
    await expect(
      within(canvasElement).getByRole("checkbox", { name: figmaLabel }),
    ).not.toBeChecked()
  },
}

export const SourceRichDefaultUnavailable: Story = {
  args: {
    label: figmaLabel,
    description: figmaDescription,
    leadingIcon: <PrivacyTipIcon />,
    indicatorPlacement: "end",
    disabled: true,
  },
  // Reflow exemption: fixture pinned at the source width, not a product surface.
  parameters: {
    layout: "fullscreen",
    design: { type: "figma", url: figmaEmbedUrl("194:3763") },
    a11yContract: { reflow: false },
  },
  play: async ({ canvasElement }) => {
    const checkbox = within(canvasElement).getByRole("checkbox", { name: figmaLabel })
    await expect(checkbox).toHaveAttribute("aria-disabled", "true")
    await expect(checkbox).toHaveAttribute("tabindex", "-1")
    await userEvent.click(checkbox)
    await expect(checkbox).not.toBeChecked()
  },
}

export const SourceRichError: Story = {
  args: {
    label: figmaLabel,
    description: figmaDescription,
    error: "Helper text",
    leadingIcon: <PrivacyTipIcon />,
    indicatorPlacement: "end",
  },
  // Reflow exemption: fixture pinned at the source width, not a product surface.
  parameters: {
    layout: "fullscreen",
    design: { type: "figma", url: figmaEmbedUrl("194:3763") },
    a11yContract: { reflow: false },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await expect(canvas.getByRole("checkbox", { name: figmaLabel })).toHaveAttribute(
      "aria-invalid",
      "true",
    )
    await expect(fieldError(canvasElement)).toHaveTextContent("Helper text")
  },
}
