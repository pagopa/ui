import type { Meta, StoryObj } from "@storybook/react-vite"
import { expect, userEvent, within } from "storybook/test"
import { Building2, FileText, UserRound } from "lucide-react"

import { figmaEmbedUrl } from "@/catalog/figma/file"
import { PagoPAIcon } from "@/components/icons/PagoPAIcon"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/primitives/tabs"

import tabsGuide from "./guides/tabs.md?raw"

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
    design: { type: "figma", url: figmaEmbedUrl("1137:8910") },
    docs: {
      description: {
        component: `Local navigation with keyboard handling: arrows between tabs, manual activation with Enter or Space, Tab into the panel and a visible active state.

${tabsGuide}`,
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

// The source TabGroup (1137:8910) is a plain component, not a set: one 658px
// row of seven 94px tabs, the first active. The labels stay "Tab" because the
// source sample string is not a component default.
const fidelityTabs = Array.from({ length: 7 }, (_, index) => `source-${index + 1}`)

export const FidelityTabs: Story = {
  tags: ["color-pinned"],
  parameters: {
    // Reflow exemption: fixture pinned at the source width, not a product surface.
    a11yContract: { reflow: false },
    design: { type: "figma", url: figmaEmbedUrl("1137:8910") },
  },
  render: () => (
    <div data-fidelity-variant="1137-8910" className="w-[658px] max-w-full">
      <Tabs defaultValue="source-1">
        <TabsList variant="line" aria-label="Sezioni di esempio" className="w-full overflow-x-auto">
          {fidelityTabs.map((value) => (
            <TabsTrigger key={value} value={value}>
              <PagoPAIcon name="kid_star" />
              Tab
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>
    </div>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const tabs = canvas.getAllByRole("tab")
    await expect(tabs).toHaveLength(7)
    await expect(tabs[0]).toHaveAttribute("aria-selected", "true")
    await expect(tabs[1]).toHaveAttribute("aria-selected", "false")
  },
}
