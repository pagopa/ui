import type { Meta, StoryObj } from "@storybook/react-vite"
import { expect, within } from "storybook/test"

import { OrganizationModule } from "@/components/composites"
import { StatusTile, Tag } from "@/components/content"

const meta = {
  title: "Components/Composites/OrganizationModule",
  component: OrganizationModule,
  args: { name: "Comune di Milano", fiscalCode: "P.IVA 01199250158" },
  argTypes: { children: { control: false } },
  parameters: {
    docs: {
      description: {
        component:
          "Organisation summary with caller-owned optional content: it does not infer pagoPA membership and exposes no actions of its own.",
      },
    },
  },
} satisfies Meta<typeof OrganizationModule>

export default meta
type Story = StoryObj<typeof meta>

export const Playground: Story = { parameters: { a11yContract: { reflow: false } } }

export const WithoutMembershipClaim: Story = {
  // Reflow exemption pending a design request: docs/design-requests/2026-10-16-a11y-reflow-conditions.md.
  parameters: { a11yContract: { reflow: false } },
  args: { name: "Comune di Firenze", fiscalCode: "Codice fiscale 01307110484" },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await expect(canvas.getByRole("heading", { name: "Comune di Firenze" })).toBeVisible()
    await expect(canvas.getByText("Codice fiscale 01307110484")).toBeVisible()
    await expect(canvas.queryByText("Ente aderente a pagoPA")).not.toBeInTheDocument()
    await expect(canvas.queryAllByRole("button")).toHaveLength(0)
  },
}

export const WithCallerContent: Story = {
  // Reflow exemption pending a design request: docs/design-requests/2026-10-16-a11y-reflow-conditions.md.
  parameters: { a11yContract: { reflow: false } },
  args: {
    children: (
      <StatusTile title="Ente aderente a pagoPA" tag={<Tag status="success">Attivo</Tag>} />
    ),
  },
}
