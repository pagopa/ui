import type { Meta, StoryObj } from "@storybook/react-vite"

import { CorrectionValid } from "@/components/content"

const meta = {
  title: "Components/Content/CorrectionValid",
  component: CorrectionValid,
  args: { label: "EVENTO RETTIFICATO" },
  argTypes: { label: { control: "text" } },
  parameters: {
    docs: {
      description: {
        component: "Positive correction outcome as a success status tag.",
      },
    },
  },
} satisfies Meta<typeof CorrectionValid>

export default meta
type Story = StoryObj<typeof meta>

export const Playground: Story = {}
