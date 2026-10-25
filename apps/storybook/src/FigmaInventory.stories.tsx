import type { Meta, StoryObj } from "@storybook/react-vite"
import { expect, within } from "storybook/test"

import {
  figmaCoverageCounts,
  figmaCoverageGroups,
  figmaDeviceCoverage,
  figmaDeviceCoverageCounts,
  figmaStatusOrder,
  unaccountedFigmaNodes,
  type FigmaCoverageRow,
} from "@/catalog/figma/coverage"
import { FIGMA_DESIGN_URL, figmaNodeUrl } from "@/catalog/figma/file"
import { figmaInventoryMeta } from "@/catalog/figma/registry"
import storyTitlesData from "@/catalog/figma/story-titles.json"
import { Badge } from "@/components/primitives/badge"

const statusStyles: Record<FigmaCoverageRow["status"], string> = {
  implemented: "bg-success-soft text-success-foreground",
  mocked: "bg-warning-soft text-warning-foreground",
  excluded: "bg-muted text-muted-foreground",
  pending: "bg-info-soft text-info-foreground",
  unaccounted: "bg-error-soft text-error-foreground",
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
}

// Storybook derives both halves of a story id from words: the title
// (`Components/Inputs/TextField`) and the export name (`SourceCase`) become
// `components-inputs-textfield--source-case`, the identity the parity tooling
// records in `parity-cases.json`.
function exportSlug(name: string) {
  return slugify(
    name.replace(/([a-z0-9])([A-Z])/g, "$1 $2").replace(/([A-Z]+)([A-Z][a-z])/g, "$1 $2"),
  )
}

const storyTitles: Record<string, string> = storyTitlesData

// The Storybook page of a mapped node: its first declared story export, or the
// story's docs page when the registry declares none. A node with no story
// carries no link.
function storyUrl(row: FigmaCoverageRow) {
  const target = row.entry?.target
  const title = target?.story ? storyTitles[target.story] : undefined
  if (!title) return null
  const story = target?.storyExports?.[0]
  const path = story
    ? `story/${slugify(title)}--${exportSlug(story)}`
    : `docs/${slugify(title)}--docs`
  return `${import.meta.env.BASE_URL}?path=/${path}`
}

function AccountLabel({ row }: { row: FigmaCoverageRow }) {
  const { entry, rule, status } = row
  const detail = entry?.target
    ? `${entry.target.module.split("/").pop()} · ${entry.target.export}`
    : (entry?.reason ?? entry?.note ?? rule?.reason ?? rule?.evidence ?? null)

  return (
    <>
      <span className="mt-1 block text-sm break-all text-muted-foreground">
        {row.node.type} · {row.node.nodeId}
      </span>
      <Badge className={`mt-3 ${statusStyles[status]}`}>{status}</Badge>
      {detail ? (
        <span className="mt-2 block text-xs break-all text-muted-foreground">{detail}</span>
      ) : null}
    </>
  )
}

// The device dimension of the row (RA9): the devices the set declares against
// the cases the corpus commits. Only `implemented`/`pending` rows show it — a
// `mocked`/`excluded` node needs no case, and a source without a device axis is
// not in the join at all.
function DeviceLabel({ row }: { row: FigmaCoverageRow }) {
  const coverage = figmaDeviceCoverage.get(row.node.nodeId)
  if (!coverage || (row.status !== "implemented" && row.status !== "pending")) return null
  return (
    <span className="mt-2 block text-xs text-muted-foreground" data-slot="device-coverage">
      devices {coverage.declared.join(", ")} ·{" "}
      {coverage.missing.length ? (
        <span className="text-error-foreground">missing {coverage.missing.join(", ")}</span>
      ) : (
        <span className="text-success-foreground">covered</span>
      )}
    </span>
  )
}

function FigmaInventory() {
  return (
    <main className="w-[min(76rem,calc(100vw-2rem))] space-y-10 p-6">
      <header className="max-w-3xl">
        <p className="font-semibold text-primary">Figma alignment registry</p>
        <h1 className="mt-2 text-hero">Published components</h1>
        <p className="mt-2 text-muted-foreground">
          {figmaInventoryMeta.total} published nodes found in the Figma file; the node →
          implementation mapping lives in <code>src/catalog/figma/registry.json</code>, together
          with <code>inventory.json</code> (generated). Last sync: {figmaInventoryMeta.syncedAt}.
        </p>
        <p className="mt-2 text-sm text-muted-foreground">
          File:{" "}
          <a
            className="rounded-sm text-primary underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
            href={FIGMA_DESIGN_URL}
            rel="noreferrer"
            target="_blank"
          >
            {figmaInventoryMeta.fileKey}
          </a>
        </p>
        <p className="mt-2 text-sm text-muted-foreground">
          Every card opens the Figma node; where the registry maps one, it opens the component's
          Storybook page too.
        </p>
        <p className="mt-4 flex flex-wrap gap-2 text-sm">
          {figmaStatusOrder.map((status) => (
            <Badge key={status} className={statusStyles[status]}>
              {status} {figmaCoverageCounts[status]}
            </Badge>
          ))}
        </p>
        <p className="mt-4 text-sm text-muted-foreground">
          Devices (<code>implemented</code>/<code>pending</code> nodes):{" "}
          <strong>
            {figmaDeviceCoverageCounts.covered}/{figmaDeviceCoverageCounts.declared}
          </strong>{" "}
          cases covered · {figmaDeviceCoverageCounts.missing} missing across{" "}
          {figmaDeviceCoverageCounts.nodes} sets with an axis. The column joins the axis declared by
          the inventory with the cases committed in <code>src/catalog/figma/parity-cases.json</code>
          {". A source with no device axis needs no case, and neither does a "}
          <code>mocked</code>/<code>excluded</code> node, while the missing devices are the work
          list of <code>pnpm figma:parity:queue --uncovered</code>.
        </p>
        {unaccountedFigmaNodes.length ? (
          <p role="alert" className="mt-3 text-destructive">
            {unaccountedFigmaNodes.length} nodes do not have a registry entry yet.
          </p>
        ) : (
          <p role="status" className="mt-3 text-success-foreground">
            Every published node is covered by a registry entry or a page rule.
          </p>
        )}
      </header>

      {figmaCoverageGroups.map(([pageName, rows]) => {
        const sectionId = `group-${slugify(pageName)}`
        return (
          <section key={pageName} aria-labelledby={sectionId}>
            <div className="flex flex-wrap items-center gap-3">
              <h2 id={sectionId} className="text-h3">
                {pageName}
              </h2>
              <Badge variant="secondary">{rows.length}</Badge>
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {rows.map((row) => {
                const story = storyUrl(row)
                return (
                  <article key={row.node.nodeId} className="rounded-lg border p-4">
                    <a
                      className="rounded-sm font-semibold underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                      href={figmaNodeUrl(row.node.nodeId)}
                      rel="noreferrer"
                      target="_blank"
                    >
                      {row.node.name}
                    </a>
                    <AccountLabel row={row} />
                    <DeviceLabel row={row} />
                    {story ? (
                      <a
                        className="mt-3 inline-flex items-center gap-1 rounded-sm text-sm font-semibold text-primary underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                        href={story}
                        rel="noreferrer"
                        target="_blank"
                        aria-label={`${row.node.name} in Storybook`}
                      >
                        Storybook{" "}
                        <span aria-hidden="true" className="text-xs">
                          ↗
                        </span>
                      </a>
                    ) : null}
                  </article>
                )
              })}
            </div>
          </section>
        )
      })}
    </main>
  )
}

const meta = {
  title: "Foundations/Figma inventory",
  component: FigmaInventory,
  parameters: { layout: "fullscreen" },
} satisfies Meta<typeof FigmaInventory>

export default meta
type Story = StoryObj<typeof meta>

export const PublishedComponents: Story = {
  // Reflow exemption: fixture pinned at the source width, not a product surface.
  parameters: {
    a11yContract: { reflow: false },
    // The generated inventory (353 cards) exceeds Chromatic's 25,000,000px
    // capture cap at every configured viewport (1168x31,472 on desktop).
    // Chromatic skips the snapshot and its interaction run; the browser suite
    // still runs the play function below.
    chromatic: { disableSnapshot: true },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    function card(nodeId: string) {
      const target = canvas.getByText(new RegExp(nodeId)).closest("article")
      if (!target) throw new Error(`The story must render a card for ${nodeId}`)
      return target
    }
    const demo = card("1154:4493")
    await expect(within(demo).getByText("mocked")).toBeVisible()
    await expect(
      within(demo).getByText(/TemplateComponents\.tsx · FormWizardTemplate/),
    ).toBeVisible()
    // RA9: the device column joins the inventory's axis with the committed
    // cases. A mocked node needs no case (the premise above), while an
    // implementation with a declared axis shows its devices.
    expect(demo.querySelector('[data-slot="device-coverage"]')).toBeNull()
    // A mocked demo maps no story, so its card carries no Storybook link.
    expect(within(demo).queryByRole("link", { name: /Storybook/ })).toBeNull()
    const deviceNode = card("123:4498")
    await expect(within(deviceNode).getByText(/devices mobile, desktop/)).toBeVisible()
    const story = within(deviceNode).getByRole("link", { name: /Storybook/ })
    await expect(story).toBeVisible()
    expect(story.getAttribute("href")).toContain("?path=/story/components-inputs-buttongroup--")
  },
}
