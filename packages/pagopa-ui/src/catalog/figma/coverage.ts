// Joined view of inventory + registry + the committed case corpus, used by the
// "Foundations/Figma inventory" story and by any tooling that needs the per-node
// alignment status.
import devicePolicyData from "./device-policy.json"
import parityCasesData from "./parity-cases.json"
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

// ------------------------------------------------------- device coverage (RA9)

// The reviewed case corpus as the story reads it: only the fields the join
// needs. A draft case (`cases --sync`) never counts as coverage — the same R9
// rule `packages/ui-cli/src/parity/cases.ts` applies, so the story's numbers agree
// with `pnpm figma:parity:queue --coverage`.
interface FigmaDeviceCase {
  nodeId: string
  device?: string | null
  note?: string
}

const deviceCases: FigmaDeviceCase[] = parityCasesData

// The policy's own device order (`mobile, tablet, desktop`): the same order the
// CLI's `queue --coverage` prints, so the two joins read the same.
const deviceOrder = Object.keys(devicePolicyData.devices)

function isDraftCase(entry: FigmaDeviceCase) {
  return typeof entry.note === "string" && entry.note.trim().startsWith("draft")
}

export interface FigmaDeviceCoverageRow {
  /** The devices the source set declares (the inventory's per-variant records). */
  declared: string[]
  /** The declared devices a committed case covers. */
  covered: string[]
  /** The declared devices still without a reviewed case: the burn-down. */
  missing: string[]
}

// One row per node that declares a device axis; a set without one needs no
// case and stays absent. The declared devices follow the policy's own order.
export const figmaDeviceCoverage = new Map<string, FigmaDeviceCoverageRow>(
  figmaInventoryNodes.flatMap((node) => {
    const declared = [
      ...new Set(
        (node.variants ?? [])
          .map((variant) => variant.device)
          .filter((device): device is string => Boolean(device)),
      ),
    ].sort((left, right) => deviceOrder.indexOf(left) - deviceOrder.indexOf(right))
    if (!declared.length) return []
    const covered = declared.filter((device) =>
      deviceCases.some(
        (entry) => entry.nodeId === node.nodeId && entry.device === device && !isDraftCase(entry),
      ),
    )
    return [
      [
        node.nodeId,
        { declared, covered, missing: declared.filter((device) => !covered.includes(device)) },
      ] as const,
    ]
  }),
)

// The totals the story prints. Only `implemented`/`pending` rows count: a
// `mocked`/`excluded` node needs no case, and neither does a set without a
// device axis — the same statuses `pnpm figma:parity:queue --coverage` counts.
export const figmaDeviceCoverageCounts = figmaCoverage.reduce(
  (counts, row) => {
    if (row.status !== "implemented" && row.status !== "pending") return counts
    const coverage = figmaDeviceCoverage.get(row.node.nodeId)
    if (!coverage) return counts
    counts.nodes += 1
    counts.declared += coverage.declared.length
    counts.covered += coverage.covered.length
    counts.missing += coverage.missing.length
    return counts
  },
  { nodes: 0, declared: 0, covered: 0, missing: 0 },
)
