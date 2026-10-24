import type { Meta, StoryObj } from "@storybook/react-vite"
import type { ComponentProps } from "react"
import { expect, userEvent, within } from "storybook/test"

import { figmaEmbedUrl } from "@/catalog/figma/file"
import { ButtonGroup } from "@/components/inputs/actions"
import { Button } from "@/components/primitives/button"

import buttonGroupGuide from "./guides/actions.md?raw"

const meta = {
  title: "Components/Inputs/ButtonGroup",
  component: ButtonGroup,
  args: {
    children: (
      <>
        <Button type="button" variant="outline">
          Indietro
        </Button>
        <Button type="button">Conferma</Button>
      </>
    ),
  },
  argTypes: {
    children: { control: false },
    orientation: { control: "select", options: ["horizontal", "vertical"] },
  },
  parameters: {
    // The Design panel shows the published set sheet (built with figmaEmbedUrl): every
    // export of this story is the mapping evidence for `123:4498`.
    design: { type: "figma", url: figmaEmbedUrl("123:4498") },
    docs: {
      description: {
        component: `Semantic group of native actions: the orientation is explicit, horizontal groups wrap only when the available width is not enough, and the caller keeps control of the width.\n\n${buttonGroupGuide}`,
      },
    },
  },
} satisfies Meta<typeof ButtonGroup>

export default meta
type Story = StoryObj<typeof meta>

type ButtonVariant = NonNullable<ComponentProps<typeof Button>["variant"]>

function FidelityAction({
  nodeId,
  label,
  variant,
  className,
}: {
  nodeId: string
  label: string
  variant: ButtonVariant
  className?: string
}) {
  return (
    <Button
      type="button"
      variant={variant}
      className={className}
      data-fidelity-action={nodeId.replace(":", "-")}
    >
      <span data-fidelity-label>{label}</span>
    </Button>
  )
}

// The source `BlockButtons` variants space their actions 24px apart, while the
// imported component rule asks for 8px in both orientations (123:3565;52:896).
// The component paints the rule; these fixtures therefore assert 8px and the
// parity cases record the 16px divergence per subject. The two `2 Button group`
// frames below are the source's own inner compositions (caller markup), so they
// keep the drawn 24px.
const fidelityStates = [
  {
    nodeId: "123:4499",
    name: "Azione singola",
    orientation: "vertical",
    gap: 8,
    labels: ["Primary"],
  },
  {
    nodeId: "123:4501",
    name: "Azioni impilate",
    orientation: "vertical",
    gap: 8,
    labels: ["Primary", "Action"],
  },
  {
    nodeId: "123:4504",
    name: "Azioni mobile",
    orientation: "vertical",
    gap: 8,
    labels: ["Tertiary", "Secondary", "Primary"],
  },
  {
    nodeId: "123:4508",
    name: "Azioni inline",
    orientation: "horizontal",
    gap: 8,
    labels: ["Secondary", "Primary"],
  },
  {
    nodeId: "2939:34214",
    name: "Azioni desktop",
    orientation: "horizontal",
    gap: 8,
    labels: ["Tertiary", "Secondary", "Primary"],
  },
  {
    nodeId: "2939:34947",
    name: "Azioni desktop secondarie",
    orientation: "horizontal",
    gap: 8,
    labels: ["Secondary", "Primary"],
  },
] as const

const fidelityVariant = (nodeId: string) => nodeId.replace(":", "-")

export const Playground: Story = {}

export const DestructivePair: Story = {
  args: {
    children: (
      <>
        <Button type="button" variant="outline">
          Annulla
        </Button>
        <Button type="button" variant="destructive">
          Elimina
        </Button>
      </>
    ),
  },
}

const renderFidelityMatrix = () => (
  <div className="grid justify-items-start gap-8">
    <ButtonGroup
      aria-label="Azione singola"
      className="w-fit"
      data-fidelity-variant={fidelityVariant("123:4499")}
      orientation="vertical"
    >
      <FidelityAction nodeId="123:4500" label="Primary" variant="default" />
    </ButtonGroup>

    <ButtonGroup
      aria-label="Azioni impilate"
      className="w-[312px] items-center"
      data-fidelity-variant={fidelityVariant("123:4501")}
      orientation="vertical"
    >
      <FidelityAction nodeId="123:4502" label="Primary" variant="default" className="w-full" />
      <FidelityAction nodeId="123:4503" label="Action" variant="ghost" />
    </ButtonGroup>

    <ButtonGroup
      aria-label="Azioni mobile"
      className="w-[312px] items-start"
      data-fidelity-variant={fidelityVariant("123:4504")}
      orientation="vertical"
    >
      <FidelityAction nodeId="123:4507" label="Tertiary" variant="ghost" />
      <div className="flex w-full gap-6" data-fidelity-subgroup={fidelityVariant("123:4504")}>
        <FidelityAction
          nodeId="123:4506"
          label="Secondary"
          variant="outline"
          className="min-w-0 flex-1"
        />
        <FidelityAction
          nodeId="123:4505"
          label="Primary"
          variant="default"
          className="min-w-0 flex-1"
        />
      </div>
    </ButtonGroup>

    <ButtonGroup
      aria-label="Azioni inline"
      className="w-fit items-center"
      data-fidelity-variant={fidelityVariant("123:4508")}
      orientation="horizontal"
    >
      <>
        <FidelityAction nodeId="123:4509" label="Secondary" variant="outline" />
        <FidelityAction nodeId="123:4510" label="Primary" variant="default" />
      </>
    </ButtonGroup>

    <ButtonGroup
      aria-label="Azioni desktop"
      className="w-[560px] items-center"
      data-fidelity-variant={fidelityVariant("2939:34214")}
      orientation="horizontal"
    >
      <FidelityAction nodeId="2939:34215" label="Tertiary" variant="ghost" />
      <div
        className="ml-auto flex flex-1 justify-end gap-6"
        data-fidelity-subgroup={fidelityVariant("2939:34216")}
      >
        <FidelityAction nodeId="2939:34218" label="Secondary" variant="outline" />
        <FidelityAction nodeId="2939:34217" label="Primary" variant="default" />
      </div>
    </ButtonGroup>

    <ButtonGroup
      aria-label="Azioni desktop secondarie"
      className="w-[560px] items-center"
      data-fidelity-variant={fidelityVariant("2939:34947")}
      orientation="horizontal"
    >
      <FidelityAction nodeId="2939:34958" label="Secondary" variant="outline" />
      <div
        className="ml-auto flex flex-1 justify-end"
        data-fidelity-subgroup={fidelityVariant("2939:34949")}
      >
        <FidelityAction nodeId="2939:34951" label="Primary" variant="default" />
      </div>
    </ButtonGroup>

    <div className="w-40">
      <ButtonGroup
        aria-label="Azioni con larghezza ridotta"
        className="w-full"
        data-fidelity-reflow
        orientation="horizontal"
      >
        <Button type="button" variant="outline">
          Secondaria
        </Button>
        <Button type="button">Primaria</Button>
      </ButtonGroup>
    </div>
  </div>
)

export const FigmaStateMatrix: Story = {
  // Reflow exemption: fixture pinned at the source width, not a product surface.
  parameters: { a11yContract: { reflow: false } },
  render: renderFidelityMatrix,
}

export const InteractionChecks: Story = {
  // Reflow exemption: fixture pinned at the source width, not a product surface.
  parameters: { a11yContract: { reflow: false } },
  render: renderFidelityMatrix,
  play: async ({ canvasElement }) => {
    for (const state of fidelityStates) {
      const group = canvasElement.querySelector<HTMLElement>(
        `[data-fidelity-variant="${fidelityVariant(state.nodeId)}"]`,
      )
      if (!group) throw new Error(`ButtonGroup source variant ${state.nodeId} is missing`)

      const buttons = Array.from(group.querySelectorAll<HTMLButtonElement>("button"))
      await expect(within(group).getAllByRole("button")).toHaveLength(buttons.length)
      await expect(group).toHaveAttribute("role", "group")
      await expect(group).toHaveAccessibleName(state.name)
      await expect(group).toHaveAttribute("data-orientation", state.orientation)
      await expect(buttons).toHaveLength(state.labels.length)
      await expect(getComputedStyle(group).flexDirection).toBe(
        state.orientation === "vertical" ? "column" : "row",
      )
      await expect(getComputedStyle(group).gap).toBe(`${state.gap}px`)

      for (const [index, button] of buttons.entries()) {
        await expect(button.tagName).toBe("BUTTON")
        await expect(button.type).toBe("button")
        await expect(button).toHaveAccessibleName(state.labels[index])
        await expect(button.getBoundingClientRect().height).toBeGreaterThanOrEqual(44)
      }
    }

    for (const nodeId of ["123-4504", "2939-34216"]) {
      const subgroup = canvasElement.querySelector<HTMLElement>(
        `[data-fidelity-subgroup="${nodeId}"]`,
      )
      if (!subgroup) throw new Error(`ButtonGroup source subgroup ${nodeId} is missing`)
      // Caller markup inside the source frame, not the group's own gap.
      await expect(getComputedStyle(subgroup).gap).toBe("24px")
    }

    const narrowGroup = canvasElement.querySelector<HTMLElement>("[data-fidelity-reflow]")
    if (!narrowGroup) throw new Error("ButtonGroup narrow reflow example is missing")
    const narrowButtons = within(narrowGroup).getAllByRole("button")
    await expect(narrowButtons).toHaveLength(2)
    await expect(narrowButtons[1].getBoundingClientRect().top).toBeGreaterThan(
      narrowButtons[0].getBoundingClientRect().top,
    )
    await expect(narrowGroup.scrollWidth).toBeLessThanOrEqual(narrowGroup.clientWidth)

    const nativeButtons = Array.from(
      canvasElement.querySelectorAll<HTMLButtonElement>("[data-fidelity-action]"),
    )
    const document = canvasElement.ownerDocument
    nativeButtons[0]?.focus()
    for (let index = 0; index < nativeButtons.length - 1; index += 1) {
      await userEvent.tab()
      await expect(document.activeElement).toBe(nativeButtons[index + 1])
    }
  },
}
