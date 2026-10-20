import * as React from "react"
import type { Meta, StoryObj } from "@storybook/react-vite"

import { Avatar } from "@/components/content/avatar"
import { PagoPAIcon } from "@/components/icons/PagoPAIcon"
import { Chip } from "@/components/inputs/chips"
import { DropDown, type DropDownItem } from "@/components/inputs/menus"
import { figmaEmbedUrl } from "@/catalog/figma/file"

interface FidelityVariant {
  type: "default" | "cta"
  product?: boolean
  multiple: boolean
  checked: boolean
  selected: boolean
  level?: "first" | "second"
}

const variants: Record<string, FidelityVariant> = {
  "default-single": {
    type: "default",
    multiple: false,
    checked: false,
    selected: false,
  },
  "product-single": {
    type: "default",
    product: true,
    multiple: false,
    checked: false,
    selected: false,
  },
  "product-multi-unchecked": {
    type: "default",
    product: true,
    multiple: true,
    checked: false,
    selected: false,
  },
  "default-multi-unchecked": {
    type: "default",
    multiple: true,
    checked: false,
    selected: false,
  },
  "default-single-selected": {
    type: "default",
    multiple: false,
    checked: false,
    selected: true,
  },
  "product-single-selected": {
    type: "default",
    product: true,
    multiple: false,
    checked: true,
    selected: true,
  },
  "product-multi-selected": {
    type: "default",
    product: true,
    multiple: true,
    checked: true,
    selected: true,
  },
  "default-multi-selected": {
    type: "default",
    multiple: true,
    checked: true,
    selected: true,
  },
  "cta-multi": {
    type: "cta",
    multiple: true,
    checked: false,
    selected: false,
  },
  "cta-single-selected": {
    type: "cta",
    multiple: false,
    checked: false,
    selected: true,
  },
  "second-multi-selected": {
    type: "default",
    multiple: true,
    checked: true,
    selected: true,
    level: "second",
  },
  "second-multi-unchecked": {
    type: "default",
    multiple: true,
    checked: false,
    selected: false,
    level: "second",
  },
}

function DropDownFidelityFixture({ variant }: { variant: string }) {
  const configuration = variants[variant] ?? variants["default-single"]
  const [checked, setChecked] = React.useState(configuration.checked)
  const leading =
    configuration.type === "cta" ? (
      <PagoPAIcon name="my_location" size={24} className="text-primary" />
    ) : configuration.product ? (
      <Avatar alt="Account" size="compact" />
    ) : configuration.level === "second" ? null : (
      <PagoPAIcon name="location_on" size={16} />
    )
  const chip = (
    <Chip variant="warning" size="compact" data-slot="chip">
      <span data-slot="chip-label" className="font-medium">
        Warning
      </span>
    </Chip>
  )
  const common = {
    id: "value",
    label: "Value",
    description: configuration.type === "cta" ? undefined : "Description",
    leading,
    chip: configuration.type === "cta" ? undefined : chip,
    level: configuration.level,
    leadingAlignment:
      configuration.type === "default" && !configuration.product
        ? ("label" as const)
        : ("center" as const),
  }
  const sourceItem: DropDownItem =
    configuration.type === "cta"
      ? {
          ...common,
          type: "cta",
          multiple: configuration.multiple,
          onSelect: () => undefined,
        }
      : configuration.multiple
        ? {
            ...common,
            multiple: true,
            checked,
            onCheckedChange: setChecked,
          }
        : {
            ...common,
            multiple: false,
            onSelect: () => undefined,
          }
  const contextItem: DropDownItem = {
    id: "context",
    label: "Context",
    onSelect: () => undefined,
  }
  const items = configuration.selected ? [sourceItem, contextItem] : [contextItem, sourceItem]

  return (
    <div style={{ width: 274 }}>
      <DropDown triggerLabel="Open options" className="w-full" items={items} />
    </div>
  )
}

const meta = {
  title: "Components/Inputs/DropDown Fidelity",
  component: DropDownFidelityFixture,
  args: { variant: "default-single" },
  argTypes: {
    variant: {
      control: "select",
      options: Object.keys(variants),
    },
  },
  parameters: {
    design: { type: "figma", url: figmaEmbedUrl("616:3864") },
    docs: {
      description: {
        component:
          "Source-bound DropDown rows use the public item composition and shared Avatar, Chip and PagoPAIcon implementations. The anchor width is a Storybook-only evidence fixture; the component remains anchor-sized at runtime.",
      },
    },
  },
} satisfies Meta<typeof DropDownFidelityFixture>

export default meta
type Story = StoryObj<typeof meta>

export const Fidelity: Story = {}
