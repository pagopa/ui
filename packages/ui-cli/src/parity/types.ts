import type { ParityCase } from "../schemas/parity.ts"
import type { Delta } from "./diff.ts"
export type CaseSpec = Partial<ParityCase> & {
  nodeId: string
  export: string
  storyId: string
  id?: string
  screenshot?: string
  strict?: boolean
}
export type CaseReport = {
  nodeId: string
  variant: string
  variantName: string
  device: string | null
  storyId: string
  verdict: string
  deltas: Delta[]
  advisories: Delta[]
  residues: Array<Delta & { reason: string }>
  notes: Array<{ path: string; note: unknown }>
  responsive?: unknown
  scope?: Scope
  capture?: {
    dpr: number
    rulerWidth: number
    rootWidth: number
    focus?: string
    offsetOrigin?: string
    state?: { state?: string; ok?: boolean }
  }
  [key: string]: unknown
}
export type Scope = {
  declared: string
  changed: Record<string, boolean>
  probes: number[]
  changedAt: number[]
  widthTarget: string | undefined
}

export type CheckOptions = Omit<Partial<CaseSpec>, "nodeId"> & {
  nodeId?: string
  caseId?: string
  casesFile?: string
  input?: string
  devices?: boolean
  saved?: boolean
  saveCase?: boolean
  notes?: boolean
  json?: boolean
}
export type QueueOptions = {
  status?: string
  nodeId?: string
  casesFile?: string
  order?: string
  unmapped?: boolean
  coverage?: boolean
  uncovered?: boolean
  json?: boolean
  next?: boolean
  size?: number
}
export type WaveOptions = CheckOptions & {
  status?: string
  includeCatalogue?: boolean
  limit?: number
  dryRun?: boolean
  outDir?: string
  wave?: string
}
