// Joined view of inventory + registry, used by the "Foundations/Figma inventory"
// story and by any tooling that needs the per-node alignment status.
import { accountFor, figmaInventoryNodes, type FigmaNodeStatus } from "./registry"

export type FigmaCoverageRow = ReturnType<typeof accountFor>

export const figmaCoverage: FigmaCoverageRow[] = figmaInventoryNodes.map((node) => accountFor(node))

export const figmaStatusOrder: (FigmaNodeStatus | "unaccounted")[] = [
  "implemented",
  "mocked",
  "excluded",
  "pending",
  "unaccounted",
]

export const figmaCoverageCounts = figmaStatusOrder.reduce<Record<string, number>>(
  (accumulator, status) => {
    accumulator[status] = figmaCoverage.filter((row) => row.status === status).length
    return accumulator
  },
  {},
)

export const unaccountedFigmaNodes = figmaCoverage.filter((row) => row.status === "unaccounted")

export const figmaCoverageGroups = Object.entries(
  figmaCoverage.reduce<Record<string, FigmaCoverageRow[]>>((accumulator, row) => {
    const page = row.node.pageName
    accumulator[page] ??= []
    accumulator[page].push(row)
    return accumulator
  }, {}),
).sort(([left], [right]) => left.localeCompare(right))
