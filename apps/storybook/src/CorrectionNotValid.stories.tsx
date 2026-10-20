import type { Meta, StoryObj } from "@storybook/react-vite"

import { CorrectionNotValid } from "@/components/content"

const meta = {
  title: "Components/Content/CorrectionNotValid",
  component: CorrectionNotValid,
  args: { label: "EVENTO NON VALIDO" },
  argTypes: { label: { control: "text" } },
  parameters: {
    docs: {
      description: {
        component: "Negative correction outcome as a warning status tag.",
      },
    },
  },
} satisfies Meta<typeof CorrectionNotValid>

export default meta
type Story = StoryObj<typeof meta>

export const Playground: Story = {}
