import type { Meta, StoryObj } from "@storybook/react-vite"
import type { ComponentProps } from "react"
import { ArrowRight, Star } from "lucide-react"
import { expect, fn, userEvent, within } from "storybook/test"

import { PagoPAIcon } from "@/components/icons/PagoPAIcon"
import { Button } from "@/components/primitives/button"
import { figmaEmbedUrl } from "@/catalog/figma/file"

import buttonGuide from "./guides/actions.md?raw"

const meta = {
  title: "Components/Button",
  component: Button,
  args: {
    children: "Azione",
  },
  argTypes: {
    variant: {
      control: "select",
      options: [
        "default",
        "outline",
        "ghost",
        "secondary",
        "destructive",
        "outline-destructive",
        "ghost-destructive",
        "contrast",
        "outline-contrast",
        "ghost-contrast",
        "link",
      ],
    },
    size: {
      control: "select",
      options: ["xs", "sm", "default", "lg", "icon"],
    },
  },
  parameters: {
    docs: {
      description: {
        component: `PagoPA primary action. Use a link for navigation and Button for actions. The default target is an accessible minimum; contained and outlined variants keep the shared token geometry rather than one-off compensation.\n\n${buttonGuide}`,
      },
    },
  },
} satisfies Meta<typeof Button>

export default meta
type Story = StoryObj<typeof meta>

const figmaAppearances: {
  id: string
  variant: ComponentProps<typeof Button>["variant"]
  color: string
  background: string
  border?: string
  sourceInset?: number
  onBrand?: boolean
  sourceVariants: {
    label: string
    skeleton: string
    rightIcon: string
    spinner: string
    leftIcon: string
  }
}[] = [
  {
    id: "contained",
    variant: "default",
    color: "rgb(255, 255, 255)",
    background: "rgb(11, 62, 227)",
    sourceInset: 24,
    sourceVariants: {
      label: "108:1403",
      skeleton: "108:1405",
      rightIcon: "108:1415",
      spinner: "108:1417",
      leftIcon: "108:1427",
    },
  },
  {
    id: "outlined",
    variant: "outline",
    color: "rgb(11, 62, 227)",
    background: "rgba(0, 0, 0, 0)",
    border: "rgb(11, 62, 227)",
    sourceInset: 24,
    sourceVariants: {
      label: "108:1435",
      skeleton: "108:1437",
      rightIcon: "108:1453",
      spinner: "108:1455",
      leftIcon: "108:1471",
    },
  },
  {
    id: "text",
    variant: "ghost",
    color: "rgb(11, 62, 227)",
    background: "rgba(0, 0, 0, 0)",
    sourceVariants: {
      label: "108:1447",
      skeleton: "108:1449",
      rightIcon: "108:1465",
      spinner: "108:1467",
      leftIcon: "108:1495",
    },
  },
  {
    id: "contained-contrast",
    variant: "contrast",
    color: "rgb(11, 62, 227)",
    background: "rgb(255, 255, 255)",
    sourceInset: 24,
    onBrand: true,
    sourceVariants: {
      label: "108:1407",
      skeleton: "108:1409",
      rightIcon: "108:1419",
      spinner: "108:1421",
      leftIcon: "108:1429",
    },
  },
  {
    id: "outlined-contrast",
    variant: "outline-contrast",
    color: "rgb(255, 255, 255)",
    background: "rgba(0, 0, 0, 0)",
    border: "rgb(255, 255, 255)",
    sourceInset: 24,
    onBrand: true,
    sourceVariants: {
      label: "108:1479",
      skeleton: "108:1481",
      rightIcon: "108:1485",
      spinner: "108:1487",
      leftIcon: "108:1491",
    },
  },
  {
    id: "text-contrast",
    variant: "ghost-contrast",
    color: "rgb(255, 255, 255)",
    background: "rgba(0, 0, 0, 0)",
    onBrand: true,
    sourceVariants: {
      label: "108:1535",
      skeleton: "108:1537",
      rightIcon: "108:1541",
      spinner: "108:1543",
      leftIcon: "108:1547",
    },
  },
  {
    id: "contained-error",
    variant: "destructive",
    color: "rgb(255, 255, 255)",
    background: "rgb(209, 51, 51)",
    sourceInset: 24,
    sourceVariants: {
      label: "108:1439",
      skeleton: "108:1441",
      rightIcon: "108:1457",
      spinner: "108:1459",
      leftIcon: "108:1473",
    },
  },
  {
    id: "outlined-error",
    variant: "outline-destructive",
    color: "rgb(209, 51, 51)",
    background: "rgba(0, 0, 0, 0)",
    border: "rgb(209, 51, 51)",
    sourceInset: 24,
    sourceVariants: {
      label: "1527:26757",
      skeleton: "1527:26769",
      rightIcon: "1527:26761",
      spinner: "1527:26773",
      leftIcon: "1527:26765",
    },
  },
  {
    id: "text-error",
    variant: "ghost-destructive",
    color: "rgb(209, 51, 51)",
    background: "rgba(0, 0, 0, 0)",
    sourceVariants: {
      label: "1527:26759",
      skeleton: "1527:26771",
      rightIcon: "1527:26763",
      spinner: "1527:26775",
      leftIcon: "1527:26767",
    },
  },
]

const fidelityVariant = (nodeId: string) => nodeId.replace(":", "-")
const actionLabel = () => <span data-fidelity-label>Action</span>
const kidStar = () => (
  <span data-fidelity-icon className="inline-flex shrink-0">
    <PagoPAIcon name="kid_star" />
  </span>
)

function fidelityButton(canvasElement: HTMLElement, nodeId: string) {
  const button = canvasElement.querySelector<HTMLButtonElement>(
    `[data-fidelity-variant="${fidelityVariant(nodeId)}"]`,
  )
  if (!button) throw new Error(`Button source variant ${nodeId} is missing`)
  return button
}

export const FigmaStateMatrix: Story = {
  tags: ["color-pinned"],
  parameters: {
    // Reflow exemption: fixture pinned at the source width, not a product surface.
    a11yContract: { reflow: false },
    design: { type: "figma", url: figmaEmbedUrl("108:1402") },
  },
  render: () => (
    <div className="grid gap-4">
      {figmaAppearances.map((appearance) => (
        <div
          key={appearance.id}
          data-fidelity-appearance={appearance.id}
          className={
            appearance.onBrand
              ? "flex gap-4 rounded-lg bg-navy p-4"
              : "flex gap-4 rounded-lg bg-background p-4"
          }
        >
          <Button
            variant={appearance.variant}
            data-fidelity-variant={fidelityVariant(appearance.sourceVariants.label)}
          >
            {actionLabel()}
          </Button>
          <Button
            variant={appearance.variant}
            data-fidelity-variant={fidelityVariant(appearance.sourceVariants.leftIcon)}
          >
            {kidStar()}
            {actionLabel()}
          </Button>
          <Button
            variant={appearance.variant}
            data-fidelity-variant={fidelityVariant(appearance.sourceVariants.rightIcon)}
          >
            {actionLabel()}
            {kidStar()}
          </Button>
          <Button
            variant={appearance.variant}
            data-fidelity-variant={fidelityVariant(appearance.sourceVariants.skeleton)}
            skeleton
          >
            {actionLabel()}
          </Button>
          <Button
            variant={appearance.variant}
            data-fidelity-variant={fidelityVariant(appearance.sourceVariants.spinner)}
            loading
          >
            {actionLabel()}
          </Button>
        </div>
      ))}
    </div>
  ),
  play: async ({ canvasElement }) => {
    const fidelityButtons = canvasElement.querySelectorAll("[data-fidelity-variant]")
    await expect(fidelityButtons).toHaveLength(45)
    for (const appearance of figmaAppearances) {
      for (const sourceId of Object.values(appearance.sourceVariants)) {
        const button = fidelityButton(canvasElement, sourceId)
        const style = getComputedStyle(button)
        await expect(style.color).toBe(appearance.color)
        await expect(style.backgroundColor).toBe(appearance.background)
        await expect(style.fontSize).toBe("16px")
        await expect(style.lineHeight).toBe("22px")
        await expect(style.gap).toBe("8px")
        await expect(button.getBoundingClientRect().height).toBe(48)
        if (appearance.border) {
          await expect(style.borderTopColor).toBe(appearance.border)
          await expect(style.borderTopWidth).toBe("2px")
        }
        if (appearance.sourceInset) {
          const padding = Number.parseFloat(style.paddingLeft)
          const border = Number.parseFloat(style.borderLeftWidth)
          await expect(padding).toBe(appearance.sourceInset)
          // Keep the spacing token instead of subtracting the 1-2px CSS border.
          await expect(Math.abs(padding + border - appearance.sourceInset)).toBeLessThanOrEqual(2)
        }
      }

      const leftButton = fidelityButton(canvasElement, appearance.sourceVariants.leftIcon)
      const leftIcon = leftButton.querySelector<HTMLElement>("[data-fidelity-icon]")
      const leftLabel = leftButton.querySelector<HTMLElement>("[data-fidelity-label]")
      const rightButton = fidelityButton(canvasElement, appearance.sourceVariants.rightIcon)
      const rightIcon = rightButton.querySelector<HTMLElement>("[data-fidelity-icon]")
      const rightLabel = rightButton.querySelector<HTMLElement>("[data-fidelity-label]")
      if (!leftIcon || !leftLabel || !rightIcon || !rightLabel) {
        throw new Error(`Button ${appearance.id} is missing its source icon or label`)
      }
      await expect(leftIcon.getBoundingClientRect().width).toBe(24)
      await expect(leftIcon.getBoundingClientRect().height).toBe(24)
      await expect(
        leftLabel.getBoundingClientRect().left - leftIcon.getBoundingClientRect().right,
      ).toBe(8)
      await expect(rightIcon.getBoundingClientRect().width).toBe(24)
      await expect(rightIcon.getBoundingClientRect().height).toBe(24)
      await expect(
        rightIcon.getBoundingClientRect().left - rightLabel.getBoundingClientRect().right,
      ).toBe(8)
      await expect(
        Math.abs(
          leftIcon.getBoundingClientRect().top +
            leftIcon.getBoundingClientRect().height / 2 -
            (leftLabel.getBoundingClientRect().top + leftLabel.getBoundingClientRect().height / 2),
        ),
      ).toBeLessThanOrEqual(1)
      await expect(
        getComputedStyle(fidelityButton(canvasElement, appearance.sourceVariants.label)).fontFamily,
      ).toContain("Titillio")
      const label = fidelityButton(
        canvasElement,
        appearance.sourceVariants.label,
      ).querySelector<HTMLElement>("[data-fidelity-label]")
      if (!label) throw new Error(`Button ${appearance.id} is missing its source label`)
      await expect(getComputedStyle(label).fontWeight).toBe("600")

      const skeletonButton = fidelityButton(canvasElement, appearance.sourceVariants.skeleton)
      const skeleton = skeletonButton.querySelector<HTMLElement>('[data-slot="button-skeleton"]')
      if (!skeleton)
        throw new Error(
          `Button source variant ${appearance.sourceVariants.skeleton} is missing its skeleton`,
        )
      await expect(skeletonButton).toHaveAttribute("aria-disabled", "true")
      await expect(skeletonButton).toHaveAttribute("aria-busy", "true")
      await expect(getComputedStyle(skeletonButton).opacity).toBe("1")
      await expect(getComputedStyle(skeletonButton).backgroundColor).toBe(appearance.background)
      await expect(getComputedStyle(skeleton).opacity).toBe("0.3")
      // The 93px source bar uses the nearest existing spacing token (92px).
      await expect(skeleton.getBoundingClientRect().width).toBe(92)
      await expect(skeleton.getBoundingClientRect().height).toBe(16)
      await expect(getComputedStyle(skeleton).backgroundColor).toBe("rgb(153, 163, 193)")

      const spinnerButton = fidelityButton(canvasElement, appearance.sourceVariants.spinner)
      const spinner = spinnerButton.querySelector<HTMLElement>(
        '[data-slot="button-loading-spinner"]',
      )
      if (!spinner)
        throw new Error(
          `Button source variant ${appearance.sourceVariants.spinner} is missing its spinner`,
        )
      await expect(spinnerButton).toHaveAttribute("aria-disabled", "true")
      await expect(spinnerButton).toHaveAttribute("aria-busy", "true")
      await expect(getComputedStyle(spinnerButton).opacity).toBe("1")
      await expect(getComputedStyle(spinnerButton).backgroundColor).toBe(appearance.background)
      await expect(spinner.offsetWidth).toBe(24)
      await expect(spinner.offsetHeight).toBe(24)
      await expect(getComputedStyle(spinner).color).toBe(appearance.color)
      await expect(spinner).toHaveAttribute("aria-hidden", "true")
      await expect(spinner.querySelector('[data-figma-node-id="5966:24996"]')).toBeInTheDocument()
      const ring = spinner.querySelector<HTMLElement>('[data-slot="spinner-ring"]')
      if (!ring) throw new Error("Button source spinner ring is missing")
      await expect(getComputedStyle(ring).backgroundImage).toContain("conic-gradient")
      await expect(getComputedStyle(ring).maskImage).toContain("radial-gradient")
      if (appearance.border) {
        await expect(getComputedStyle(spinnerButton).borderTopWidth).toBe("2px")
      }
    }
  },
}

export const FigmaIconButton: Story = {
  tags: ["color-pinned"],
  parameters: { design: { type: "figma", url: figmaEmbedUrl("192:1208") } },
  render: () => (
    <Button
      data-fidelity-variant={fidelityVariant("192:1208")}
      variant="ghost"
      size="icon"
      aria-label="Apri menu"
    >
      <span data-fidelity-icon className="inline-flex shrink-0">
        <PagoPAIcon name="menu" />
      </span>
    </Button>
  ),
  play: async ({ canvasElement }) => {
    const button = fidelityButton(canvasElement, "192:1208")
    const icon = button.querySelector<HTMLElement>("[data-fidelity-icon]")
    if (!icon) throw new Error("Figma IconButton source icon is missing")
    await expect(button).toHaveAccessibleName("Apri menu")
    await expect(button.getBoundingClientRect().width).toBe(44)
    await expect(button.getBoundingClientRect().height).toBe(44)
    await expect(getComputedStyle(button).color).toBe("rgb(11, 62, 227)")
    await expect(getComputedStyle(button).backgroundColor).toBe("rgba(0, 0, 0, 0)")
    await expect(icon.getBoundingClientRect().width).toBe(24)
    await expect(icon.getBoundingClientRect().height).toBe(24)
  },
}

export const Playground: Story = {}

export const LightThemeOnly: Story = {
  tags: ["color-pinned"],
  render: () => (
    <div className="dark">
      <Button>Tema supportato</Button>
    </div>
  ),
  play: async ({ canvasElement }) => {
    const button = within(canvasElement).getByRole("button", { name: "Tema supportato" })
    await expect(getComputedStyle(button).backgroundColor).toBe("rgb(11, 62, 227)")
    await expect(getComputedStyle(button).color).toBe("rgb(255, 255, 255)")
  },
}

export const Variants: Story = {
  render: () => (
    <div className="flex flex-wrap items-center gap-4">
      <Button>Azione primaria</Button>
      <Button variant="outline">Azione secondaria</Button>
      <Button variant="ghost">Azione testuale</Button>
      <Button variant="destructive">Elimina</Button>
    </div>
  ),
}

export const WithIcons: Story = {
  parameters: { design: { type: "figma", url: figmaEmbedUrl("108:1402") } },
  render: () => (
    <div className="flex flex-wrap gap-4">
      <Button>
        <Star aria-hidden="true" />
        Preferiti
      </Button>
      <Button variant="outline">
        Continua
        <ArrowRight aria-hidden="true" />
      </Button>
      <Button size="icon" aria-label="Aggiungi ai preferiti">
        <Star aria-hidden="true" />
      </Button>
    </div>
  ),
}

export const Disabled: Story = {
  args: {
    disabled: true,
    children: "Azione non disponibile",
  },
}

export const Loading: Story = {
  parameters: { design: { type: "figma", url: figmaEmbedUrl("108:1402") } },
  args: {
    loading: true,
    children: "Salvataggio",
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const button = canvas.getByRole("button", { name: "Salvataggio" })
    await expect(button).toHaveAttribute("aria-disabled", "true")
    await expect(button).toHaveAttribute("aria-busy", "true")
    // The busy action keeps the user's place in the tab order and announces
    // itself: a disabled button would drop both.
    button.focus()
    await expect(button).toHaveFocus()
    await expect(canvas.getByRole("button", { name: "Salvataggio" })).toHaveAttribute(
      "aria-busy",
      "true",
    )
  },
}

export const ClickInteraction: Story = {
  parameters: { design: { type: "figma", url: figmaEmbedUrl("108:1402") } },
  args: {
    children: "Conferma",
    onClick: fn(),
  },
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement)
    await userEvent.click(canvas.getByRole("button", { name: "Conferma" }))
    await expect(args.onClick).toHaveBeenCalledTimes(1)
  },
}

export const Skeleton: Story = {
  parameters: { design: { type: "figma", url: figmaEmbedUrl("108:1402") } },
  args: {
    skeleton: true,
    children: "Caricamento azione",
  },
}

export const OnBrand: Story = {
  args: {
    variant: "contrast",
    children: "Azione a contrasto",
  },
  parameters: {
    backgrounds: { default: "brand" },
  },
}

export const FontPreferenceReflow: Story = {
  parameters: { design: { type: "figma", url: figmaEmbedUrl("108:1402") } },
  render: () => (
    <div className="grid w-[240px] min-w-0 justify-items-start">
      <Button variant="outline">Prima dell'Avatar</Button>
    </div>
  ),
  play: async ({ canvasElement }) => {
    const button = within(canvasElement).getByRole("button", { name: "Prima dell'Avatar" })
    const container = button.parentElement
    if (!container) throw new Error("Expected the narrow action container")
    await document.fonts.ready
    const root = document.documentElement
    const previousSize = root.style.fontSize
    const previousPriority = root.style.getPropertyPriority("font-size")
    try {
      root.style.fontSize = "32px"
      await expect(getComputedStyle(button).fontSize).toBe("32px")
      await expect(button.getBoundingClientRect().width).toBeLessThanOrEqual(
        container.getBoundingClientRect().width,
      )
      await expect(button.scrollWidth).toBeLessThanOrEqual(button.clientWidth)
      await expect(Number.parseFloat(getComputedStyle(button).lineHeight)).toBeGreaterThanOrEqual(
        32,
      )
      await expect(button.getBoundingClientRect().height).toBeGreaterThanOrEqual(44)
    } finally {
      root.style.setProperty("font-size", previousSize, previousPriority)
    }
  },
}
