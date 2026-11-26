import type { Delta } from "./diff.ts"

// The comparison the ephemeral diagnostic runs: a source variant, the story
// that renders it and the mapping between the two. It is built per run from the
// registry target and the command line — it is never stored or read back.
export type CaseSpec = {
  nodeId: string
  export: string
  storyId: string
  state?: string
  device?: string
  layoutScope?: "viewport" | "container"
  variant?: string
  width?: number
  viewport?: number
  height?: number
  depth?: number
  root?: string
  subjectRoot?: string
  offsetOrigin?: string
  subjects?: Record<string, string>
  residues?: Array<{ path: string; reason: string }>
  ignores?: string[]
  fill?: Array<[string, string]>
  click?: string[]
  focus?: string[]
  blur?: boolean
  keepFocus?: boolean
  compareText?: boolean
  compareBox?: "height" | "full"
  compareOffset?: boolean | string
  expectState?: string
  stateEvidence?: string
  interactive?: boolean
  strict?: boolean
  screenshot?: string
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

export type DiagnoseOptions = Partial<CaseSpec> & {
  nodeId?: string
  input?: string
  notes?: boolean
  json?: boolean
}
