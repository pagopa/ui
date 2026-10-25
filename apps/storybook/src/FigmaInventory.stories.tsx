import type { Meta, StoryObj } from "@storybook/react-vite"
import { expect, userEvent, waitFor, within } from "storybook/test"

import { FigmaInventoryDashboard } from "./figma-inventory/dashboard"

// The inventory is a documentation surface, not a product page: it reads the
// committed Figma snapshot and maps every published node to its implementation.
function FigmaInventory() {
  return <FigmaInventoryDashboard />
}

const meta = {
  title: "Foundations/Figma inventory",
  component: FigmaInventory,
  parameters: {
    layout: "fullscreen",
    docs: {
      description: {
        component: `Every published Figma node with its registry status, variant matrix and parity cases, rendered as a filterable dashboard with an inspector drawer.

The data is committed: \`inventory.json\` (generated), \`registry.json\` (reviewed), \`parity-cases.json\` (the case corpus) and \`story-titles.json\`. The **Area** filter is derived from the registry target module folder; the status filter uses the registry's own statuses. There is no per-component mapping to maintain: a new folder or status appears from the data. Nothing on the page calls Figma at runtime.

Refresh the snapshot with \`pnpm nx run pagopa-ui-cli:figma:plan\` and \`pnpm nx run pagopa-ui-cli:figma:triage\`, then review the delta.`,
      },
    },
  },
  // A catalogue of other stories: it changes whenever any of them does.
  tags: ["no-visual"],
} satisfies Meta<typeof FigmaInventory>

export default meta
type Story = StoryObj<typeof meta>

export const PublishedComponents: Story = {
  parameters: {
    // The generated inventory (353 cards) exceeds Chromatic's 25,000,000px
    // capture cap at every configured viewport (1168x31,472 on desktop).
    // Chromatic skips the snapshot and its interaction run; the browser suite
    // still runs the play function below.
    chromatic: { disableSnapshot: true },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    function card(nodeId: string) {
      const target = canvasElement.querySelector<HTMLElement>(`[data-node-id="${nodeId}"]`)
      if (!target) throw new Error(`The story must render a card for ${nodeId}`)
      return target
    }

    await expect(
      canvas.getByRole("heading", { name: "Published components", level: 1 }),
    ).toBeVisible()
    await expect(canvas.getByText(/Every published node is covered/)).toBeVisible()

    // Search lands on a node that is not on the first page: a mocked demo that
    // shows its raw registry status, no device column (a mock needs no case)
    // and no Storybook page (it maps none).
    const search = canvas.getByRole("searchbox", { name: "Search components" })
    await userEvent.type(search, "Form Wizard")
    await expect(canvas.getByText("1 of 353 components")).toBeVisible()
    const demo = card("1154:4493")
    await expect(within(demo).getByText("Mocked")).toBeVisible()
    await expect(
      within(demo).getByText(/TemplateComponents\.tsx · FormWizardTemplate/),
    ).toBeVisible()
    expect(demo.querySelector('[data-slot="device-coverage"]')).toBeNull()
    expect(within(demo).queryByRole("link", { name: /Storybook/ })).toBeNull()

    // The inspector opens as a modal dialog, exposes the three tabs and
    // compares the canvas with the code contract.
    await userEvent.click(
      within(demo).getByRole("button", { name: "Inspect Form Wizard Template" }),
    )
    const dialog = await canvas.findByRole("dialog", { name: "Form Wizard Template" })
    await expect(within(dialog).getByRole("tab", { name: "Overview" })).toBeVisible()
    await userEvent.click(within(dialog).getByRole("tab", { name: /Version diff/ }))
    await expect(within(dialog).getByText("Figma canvas")).toBeVisible()
    await expect(within(dialog).getByText("Code contract")).toBeVisible()
    await expect(
      within(dialog).getByText(
        "The registry record explains why this node is not compared as shipped.",
      ),
    ).toBeVisible()
    await userEvent.keyboard("{Escape}")
    await waitFor(() => {
      expect(canvas.queryByRole("dialog", { name: "Form Wizard Template" })).not.toBeInTheDocument()
    })
    await userEvent.click(canvas.getByRole("button", { name: "Clear search" }))
    await expect(canvas.getByText("353 components")).toBeVisible()

    // The two filters are derived from the data: the area comes from the target
    // module folder and the status is the registry's own vocabulary.
    const areaFilter = canvas.getByRole("combobox", { name: "Filter by area" })
    await userEvent.selectOptions(areaFilter, "Inputs")
    await expect(canvas.getByText("20 of 353 components")).toBeVisible()
    await userEvent.selectOptions(areaFilter, "all")
    const statusGroup = canvas.getByRole("group", { name: "Filter by status" })
    await userEvent.click(within(statusGroup).getByRole("button", { name: /^Mocked/ }))
    await expect(canvas.getByText("19 of 353 components")).toBeVisible()
    await userEvent.click(within(statusGroup).getByRole("button", { name: /^All/ }))
    await expect(canvas.getByText("353 components")).toBeVisible()

    // A shipped implementation on the first page with a device axis shows the
    // declared devices and opens its first story export.
    const deviceNode = card("123:4498")
    await expect(within(deviceNode).getByText(/devices mobile, desktop/)).toBeVisible()
    const story = within(deviceNode).getByRole("link", { name: /Storybook/ })
    await expect(story).toBeVisible()
    expect(story.getAttribute("href")).toContain("?path=/story/components-inputs-buttongroup--")

    // The data-dense view is a real table with header cells.
    await userEvent.click(canvas.getByRole("button", { name: "Table view" }))
    await expect(canvas.getByRole("table")).toBeVisible()
    await expect(canvas.getByRole("columnheader", { name: /Figma v/ })).toBeVisible()

    // Search matches across name, page, export and source fields, and clearing
    // it restores the full inventory in the grid view.
    await userEvent.click(canvas.getByRole("button", { name: "Grid view" }))
    await userEvent.type(
      canvas.getByRole("searchbox", { name: "Search components" }),
      "ButtonGroup",
    )
    await expect(canvas.getByText("3 of 353 components")).toBeVisible()
    await expect(canvasElement.querySelector('[data-node-id="123:4498"]')).not.toBeNull()
    await expect(canvasElement.querySelector('[data-node-id="1154:4493"]')).toBeNull()
    await userEvent.click(canvas.getByRole("button", { name: "Clear search" }))
    await expect(canvas.getByText("353 components")).toBeVisible()
    // Leaving the story at the top keeps the docs page readable after the play
    // has scrolled to the cards and back.
    window.scrollTo(0, 0)
  },
}
