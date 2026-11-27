// The width a source frame is drawn at, read from the generated Figma inventory:
// no story copies a source number, and no component takes a width prop (R1/R4: a
// source frame width is never a component dimension).
import inventoryData from "@/catalog/figma/inventory.json"
import devicePolicyData from "@/catalog/figma/device-policy.json"

interface InventoryVariant {
  nodeId: string
  name: string
  device: string | null
  box: { width: number; height: number } | null
}

const inventory: { components: { nodeId: string; variants?: InventoryVariant[] }[] } = inventoryData
const policy: { devices: Record<string, { canonicalWidth: number }> } = devicePolicyData

const variants = new Map<string, InventoryVariant[]>(
  inventory.components
    .filter((node) => node.variants?.length)
    .map((node) => [node.nodeId, node.variants ?? []]),
)

const canonicalWidths: Record<string, number> = Object.fromEntries(
  Object.entries(policy.devices).map(([device, entry]) => [device, entry.canonicalWidth]),
)

// The marker the capture reads: `data-source-frame` carries the drawn width, so
// the check compares a number the story declares, not a selector it guesses.
export const SOURCE_FRAME_ATTRIBUTE = "data-source-frame"

// The source width for one node and one device (`desktop`, `mobile`, `tablet`).
// A set draws many variants per device — the type, the state, the product — and
// usually at one width; only a set that draws the device at several widths
// answers with the device policy's canonical width, the one a page is drawn at.
export function sourceFrameWidth(nodeId: string, device?: string): number {
  const declared = variants.get(nodeId) ?? []
  if (declared.length === 0) throw new Error(`${nodeId}: the Figma inventory declares no variant`)
  if (device === undefined) {
    if (declared.length > 1) throw new Error(`${nodeId}: the source draws more than one variant`)
    return widthOf(declared[0], nodeId)
  }
  const matches = declared.filter((variant) => variant.device === device)
  if (matches.length === 0) throw new Error(`${nodeId}: the source draws no "${device}" variant`)
  const widths = [...new Set(matches.map((variant) => widthOf(variant, nodeId)))]
  if (widths.length === 1) return widths[0]
  const canonical = canonicalWidths[device]
  if (!widths.includes(canonical)) {
    throw new Error(
      `${nodeId}: the source draws "${device}" at several widths (${widths.join(", ")})`,
    )
  }
  return canonical
}

function widthOf(variant: InventoryVariant, nodeId: string): number {
  if (!variant.box) throw new Error(`${nodeId}: the inventory records no box for this variant`)
  return variant.box.width
}
