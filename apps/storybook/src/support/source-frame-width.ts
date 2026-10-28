// The width a source frame is drawn at, read from the parity catalogue: no story
// copies a source number, and no component takes a width prop (R1/R4: a source
// frame width is never a component dimension).
import parityCasesData from "@/catalog/figma/parity-cases.json"

interface ParityCase {
  nodeId: string
  device?: string
  state?: string
  width?: number
}

const parityCases: ParityCase[] = parityCasesData.map((entry) => ({
  nodeId: entry.nodeId,
  device: entry.device,
  state: entry.state,
  width: entry.width,
}))

// The marker the capture reads: `data-source-frame` carries the drawn width, so
// the check compares a number the story declares, not a selector it guesses.
export const SOURCE_FRAME_ATTRIBUTE = "data-source-frame"

// The case width for one node and one device (`desktop`, `mobile`, `tablet`,
// or a variant state when the axis names its values differently).
export function sourceFrameWidth(nodeId: string, device?: string): number {
  const cases = parityCases.filter((entry) => entry.nodeId === nodeId)
  if (cases.length === 0) throw new Error(`${nodeId}: no parity case declares a source width`)
  if (device === undefined) return widthOf(cases[0], nodeId, device)
  return widthOf(
    cases.find((entry) => entry.device === device || entry.state === device),
    nodeId,
    device,
  )
}

function widthOf(match: ParityCase | undefined, nodeId: string, device?: string): number {
  if (!match) throw new Error(`${nodeId}: no parity case declares the device "${device}"`)
  if (typeof match.width !== "number") {
    throw new Error(`${nodeId}: the "${match.state ?? match.device}" case declares no width`)
  }
  return match.width
}
