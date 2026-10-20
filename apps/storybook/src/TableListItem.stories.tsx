import * as React from "react"
import type { Meta, StoryObj } from "@storybook/react-vite"
import { expect, userEvent, within } from "storybook/test"

import { TableListItem, type TableListItemField } from "@/components/data-display"
import { PagoPAIcon } from "@/components/icons/PagoPAIcon"
import { Chip } from "@/components/inputs"
import { figmaEmbedUrl } from "@/catalog/figma/file"

import tablesGuide from "./guides/tables.md?raw"

const campaignFields: TableListItemField[] = [
  { label: "22/11/2025", value: "[Titolo campagna]" },
  { label: "Codice ID", value: "000000000", mono: true },
  {
    label: "Comunicazioni",
    value: "000000000",
    mono: true,
    icon: <PagoPAIcon name="mail" />,
  },
  { label: "Stato", value: <Chip size="compact">Default</Chip> },
]

const meta = {
  title: "Components/Data display/TableListItem",
  component: TableListItem,
  args: { fields: campaignFields },
  argTypes: {
    action: { control: false },
    fields: { control: false },
  },
  parameters: {
    design: { type: "figma", url: figmaEmbedUrl("9520:2537") },
    docs: {
      description: {
        component: `Card row of a list: labelled fields (text, mono code, chip) and an optional trailing text action. In narrow containers the card stacks the fields and aligns the action to the end of the row; the action stays a native link with \`href\` or a native button with \`onPress\`.

${tablesGuide}`,
      },
    },
  },
} satisfies Meta<typeof TableListItem>

export default meta
type Story = StoryObj<typeof meta>

export const Playground: Story = {
  render: (args) => (
    <ul className="w-[min(53.25rem,calc(100vw-2rem))]">
      <TableListItem {...args} action={{ label: "Apri", href: "/campagne/000000000" }} />
    </ul>
  ),
}

export const WrappingTitle: Story = {
  render: (args) => (
    <ul className="flex w-[min(53.25rem,calc(100vw-2rem))] flex-col gap-4">
      <TableListItem
        {...args}
        fields={[
          {
            label: "22/11/2025",
            value: "Titolo campagna molto lungo che va su due righe",
          },
          ...campaignFields.slice(1),
        ]}
        action={{
          label: "Apri",
          ariaLabel: "Apri Titolo campagna molto lungo che va su due righe",
          href: "/campagne/1",
        }}
      />
      <TableListItem
        {...args}
        fields={[{ label: "22/11/2025", value: "[Titolo campagna]" }, ...campaignFields.slice(1)]}
        action={{ label: "Apri", ariaLabel: "Apri [Titolo campagna]", href: "/campagne/2" }}
      />
    </ul>
  ),
}

function OpenableRow() {
  const [opened, setOpened] = React.useState("")
  return (
    <div className="w-[min(53.25rem,calc(100vw-2rem))]">
      <ul>
        <TableListItem
          fields={campaignFields}
          action={{ onPress: () => setOpened("Campagna aperta") }}
        />
      </ul>
      <output>{opened}</output>
    </div>
  )
}

export const OpenAction: Story = {
  render: () => <OpenableRow />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await userEvent.click(canvas.getByRole("button", { name: "Apri" }))
    await expect(canvas.getByRole("status")).toHaveTextContent("Campagna aperta")
  },
}

export const StaticRow: Story = {
  render: (args) => (
    <ul className="w-[min(53.25rem,calc(100vw-2rem))]">
      <TableListItem {...args} />
    </ul>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await expect(canvas.queryAllByRole("button")).toHaveLength(0)
    await expect(canvas.queryAllByRole("link")).toHaveLength(0)
    await expect(canvas.getByText("[Titolo campagna]")).toBeVisible()
  },
}

export const Mobile: Story = {
  render: (args) => (
    <div style={{ width: 272 }}>
      <ul>
        <TableListItem {...args} action={{ label: "Apri", href: "/campagne/1" }} />
      </ul>
    </div>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const card = canvas.getByRole("listitem")
    const date = canvas.getByText("22/11/2025")
    const code = canvas.getByText("Codice ID")
    const action = canvas.getByRole("link", { name: "Apri" })
    await expect(code.getBoundingClientRect().top).toBeGreaterThan(
      date.getBoundingClientRect().bottom,
    )
    await expect(
      Math.round(card.getBoundingClientRect().right - action.getBoundingClientRect().right),
    ).toBeGreaterThanOrEqual(24)
    await expect(
      Math.round(card.getBoundingClientRect().right - action.getBoundingClientRect().right),
    ).toBeLessThanOrEqual(26)
  },
}
