import type { Meta, StoryObj } from "@storybook/react-vite"
import { expect, userEvent, within } from "storybook/test"
import { Building2, FileText, UserRound } from "lucide-react"

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/primitives/tabs"

interface AccountTabsProps {
  orientation?: "horizontal" | "vertical"
}

function AccountTabs({ orientation }: AccountTabsProps) {
  return (
    <Tabs
      orientation={orientation}
      defaultValue="profile"
      className="w-[min(42rem,calc(100vw-2rem))]"
    >
      <TabsList variant="line" aria-label="Sezioni del profilo" className="w-full overflow-x-auto">
        <TabsTrigger value="profile">
          <UserRound aria-hidden="true" />
          Profilo
        </TabsTrigger>
        <TabsTrigger value="organization">
          <Building2 aria-hidden="true" />
          Ente
        </TabsTrigger>
        <TabsTrigger value="documents">
          <FileText aria-hidden="true" />
          Documenti
        </TabsTrigger>
      </TabsList>
      <TabsContent value="profile" className="rounded-lg border p-5">
        Dati personali e preferenze dell’account.
      </TabsContent>
      <TabsContent value="organization" className="rounded-lg border p-5">
        Informazioni e ruoli associati all’ente.
      </TabsContent>
      <TabsContent value="documents" className="rounded-lg border p-5">
        Documenti disponibili per il profilo.
      </TabsContent>
    </Tabs>
  )
}

const meta = {
  title: "Components/Tabs",
  component: Tabs,
  subcomponents: { TabsList, TabsTrigger, TabsContent },
  args: { orientation: "horizontal" },
  argTypes: {
    orientation: { control: "select", options: ["horizontal", "vertical"] },
  },
  parameters: {
    docs: {
      description: {
        component:
          "Local navigation with keyboard handling: arrows between tabs, manual activation with Enter or Space, Tab into the panel and a visible active state.",
      },
    },
  },
} satisfies Meta<typeof Tabs>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  render: ({ orientation }) => <AccountTabs orientation={orientation} />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const profile = canvas.getByRole("tab", { name: /Profilo/ })
    const organization = canvas.getByRole("tab", { name: /Ente/ })

    await expect(profile).toHaveAttribute("aria-selected", "true")
    profile.focus()
    await userEvent.keyboard("{ArrowRight}")
    // Base UI activates tabs manually: arrow keys move focus only.
    await expect(organization).toHaveFocus()
    await expect(organization).toHaveAttribute("aria-selected", "false")
    await userEvent.keyboard("{Enter}")
    await expect(organization).toHaveAttribute("aria-selected", "true")
    await expect(canvas.getByText(/Informazioni e ruoli associati/)).toBeVisible()
  },
}
