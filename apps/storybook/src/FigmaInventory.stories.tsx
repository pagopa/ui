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
      dispositivi {coverage.declared.join(", ")} ·{" "}
      {coverage.missing.length ? (
        <span className="text-error-foreground">mancano {coverage.missing.join(", ")}</span>
      ) : (
        <span className="text-success-foreground">coperti</span>
      )}
    </span>
  )
}

function FigmaInventory() {
  return (
    <main className="w-[min(76rem,calc(100vw-2rem))] space-y-10 p-6">
      <header className="max-w-3xl">
        <p className="font-semibold text-primary">Figma alignment registry</p>
        <h1 className="mt-2 text-hero">Componenti pubblicati</h1>
        <p className="mt-2 text-muted-foreground">
          {figmaInventoryMeta.total} nodi pubblicati rilevati dal file Figma; la mappatura nodo →
          implementazione vive in <code>src/catalog/figma/registry.json</code>, insieme a{" "}
          <code>inventory.json</code> (generato). Ultima sincronizzazione:{" "}
          {figmaInventoryMeta.syncedAt}.
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
        <p className="mt-4 flex flex-wrap gap-2 text-sm">
          {figmaStatusOrder.map((status) => (
            <Badge key={status} className={statusStyles[status]}>
              {status} {figmaCoverageCounts[status]}
            </Badge>
          ))}
        </p>
        <p className="mt-4 text-sm text-muted-foreground">
          Dispositivi (nodi <code>implemented</code>/<code>pending</code>):{" "}
          <strong>
            {figmaDeviceCoverageCounts.covered}/{figmaDeviceCoverageCounts.declared}
          </strong>{" "}
          casi coperti · {figmaDeviceCoverageCounts.missing} mancanti su{" "}
          {figmaDeviceCoverageCounts.nodes} set con asse. La colonna unisce l'asse dichiarato
          dall'inventario con i casi committed in <code>src/catalog/figma/parity-cases.json</code>:
          una sorgente senza asse dispositivo non richiede alcun caso, un nodo <code>mocked</code>/
          <code>excluded</code> nemmeno, e i dispositivi mancanti sono la work list di{" "}
          <code>pnpm figma:parity:queue --uncovered</code>.
        </p>
        {unaccountedFigmaNodes.length ? (
          <p role="alert" className="mt-3 text-destructive">
            {unaccountedFigmaNodes.length} nodi non hanno ancora una voce nel registry.
          </p>
        ) : (
          <p role="status" className="mt-3 text-success-foreground">
            Ogni nodo pubblicato è coperto da una voce del registry o da una regola di pagina.
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
              {rows.map((row) => (
                <a
                  key={row.node.nodeId}
                  className="rounded-lg border p-4 transition-colors hover:bg-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                  href={figmaNodeUrl(row.node.nodeId)}
                  rel="noreferrer"
                  target="_blank"
                >
                  <span className="block font-semibold">{row.node.name}</span>
                  <AccountLabel row={row} />
                  <DeviceLabel row={row} />
                </a>
              ))}
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
  parameters: { a11yContract: { reflow: false } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const demo = canvas.getByRole("link", { name: /1154:4493/ })
    await expect(within(demo).getByText("mocked")).toBeVisible()
    await expect(
      within(demo).getByText(/TemplateComponents\.tsx · FormWizardTemplate/),
    ).toBeVisible()
    // RA9: the device column joins the inventory's axis with the committed
    // cases. A mocked node needs no case (the premise above), while an
    // implementation with a declared axis shows its devices.
    expect(demo.querySelector('[data-slot="device-coverage"]')).toBeNull()
    const deviceNode = canvas.getByRole("link", { name: /123:4498/ })
    await expect(within(deviceNode).getByText(/dispositivi mobile, desktop/)).toBeVisible()
  },
}
