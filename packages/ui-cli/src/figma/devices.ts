#!/usr/bin/env node
// Figma device policy — the vocabulary of the device dimension and the resolver
// every other script reads it through (RA1).
//
// The vocabulary is committed data (`src/catalog/figma/device-policy.json`,
// decision RD2): the axis names that mean "device", the canonical devices with
// their source aliases, the width to fall back on when a source variant carries
// none, and a device's default layout scope. It holds **no component name and
// no file path** (guardrail R8): what a set declares is read from the inventory,
// so adding or retiring a component never edits this module or the policy.
//
// Two rules keep the vocabulary honest without a hand-kept list:
//
//   * an axis is a *device axis* when the policy names it (`axes`) or when every
//     value it declares resolves to a canonical device or to `any` — the source
//     spells the axis `Device`, `Breakpoint`, `Layout` and even `Property 1`;
//     the values, not the name, are the evidence;
//   * a value resolves case-insensitively and with the spaces ignored
//     (`XS Mobile` = `XSMobile`, `SM Table` = the source's spelling of
//     `SM Tablet`). An unmapped value is an error, not a guess.
//
// Usage:
//   node src/cli.ts figma devices [--check] [--json]
import type { Workspace } from "../adapters/workspace.ts"
import { report as checkReport, type CheckReport } from "../checks/report.ts"
import { parseSchema } from "../lib/validate.ts"
import type { InventoryNode } from "../schemas/catalogue.ts"
import { DevicePolicySchema, type DeviceDefinition, type DevicePolicy } from "../schemas/devices.ts"
import { COMMITTED_FILES, readDevicePolicy, readInventory } from "../records/committed.ts"
import { ANY_DEVICE, UNKNOWN_DEVICE } from "../schemas/devices.ts"
export { ANY_DEVICE, UNKNOWN_DEVICE }
export const LAYOUT_SCOPES = ["viewport", "container"] as const

type DeviceAxis = {
  name: string
  token: string
  key: string
  options: string[]
  values: Array<{ value: string; device: string }>
  named: boolean
}

type SeenValue = { value: string; axes: Set<string>; nodes: string[] }
type SeenOtherAxis = { axis: string; value: string; nodes: string[] }
type IgnoredValue = { axis: string; value: string; reason: string }
export type DeviceStats = {
  nodes: number
  sets: number
  declared: number
  byDevice: Record<string, number>
  valuesResolved: number
  valuesTotal: number
  unmapped: number
  unusedAliases: number
  axisNames: { named: string[]; derived: string[] }
}

// ----------------------------------------------------------------- vocabulary

// `XS Mobile` / `XSMobile` / `xs  mobile` are one value: the alias match ignores
// case and every space, exactly as the source's own naming does.
export function normalizeDeviceValue(value: unknown): string {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "")
}

// The identity of an ignored axis value: the axis token and the value, both
// normalized the way the device aliases are, so one spelling is one entry.
function ignoredKey(entry: { axis: string; value: string }): string {
  return `${normalizeDeviceValue(axisToken(entry.axis))}|${normalizeDeviceValue(entry.value)}`
}

// The axis token of a property key: the source writes `Requirement=True` in the
// variant name and `Requirement#10193:0` as the property key, and marks a
// required property with a leading `*`.
export function axisToken(name: unknown): string {
  return String(name ?? "")
    .split("#")[0]
    .trim()
    .replace(/^\*/, "")
    .trim()
}

// The shape is a Zod schema: the policy either parses or names the exact field
// and reason. Cross-field rules (a note attached to an alias the device does
// not declare) live in the schema too, so no caller re-implements them.
export function validateDevicePolicy(policy: unknown, file: string): DevicePolicy {
  return parseSchema(DevicePolicySchema, policy, file)
}

// alias (normalized) -> device key, plus the `any` values that resolve to no
// device. Built once per policy object; the check reports the collisions.
const aliasIndexes = new WeakMap<DevicePolicy, ReturnType<typeof buildAliasIndex>>()

function buildAliasIndex(policy: DevicePolicy) {
  const byValue = new Map<string, string>()
  const duplicates: Array<{ value: string; devices: string[] }> = []
  const aliases = new Map<string, string[]>()
  for (const [device, definition] of Object.entries(policy.devices ?? {})) {
    aliases.set(device, definition.aliases ?? [])
    for (const alias of definition.aliases ?? []) {
      const key = normalizeDeviceValue(alias)
      const previous = byValue.get(key)
      if (previous && previous !== device) {
        duplicates.push({ value: alias, devices: [previous, device] })
      } else {
        byValue.set(key, device)
      }
    }
  }
  for (const value of policy.any ?? []) {
    const key = normalizeDeviceValue(value)
    const previous = byValue.get(key)
    if (previous && previous !== ANY_DEVICE)
      duplicates.push({ value, devices: [previous, ANY_DEVICE] })
    else byValue.set(key, ANY_DEVICE)
  }
  return { byValue, aliases, duplicates }
}

export function deviceAliasIndex(policy: DevicePolicy) {
  const cached = aliasIndexes.get(policy)
  if (cached) return cached
  const index = buildAliasIndex(policy)
  aliasIndexes.set(policy, index)
  return index
}

// A source axis value -> the canonical device it names, `any` when it declares
// one composition for every width, `unknown` when the policy does not map it.
export function deviceOf(policy: DevicePolicy, axisValue: unknown): string {
  return deviceAliasIndex(policy).byValue.get(normalizeDeviceValue(axisValue)) ?? UNKNOWN_DEVICE
}

export function canonicalWidth(policy: DevicePolicy, device: string): number | undefined {
  return policy.devices?.[device]?.canonicalWidth
}

// The scope a case for this device uses unless the case declares its own.
export function defaultLayoutScope(
  policy: DevicePolicy,
  device: string,
): DeviceDefinition["defaultLayoutScope"] | undefined {
  return policy.devices?.[device]?.defaultLayoutScope
}

// -------------------------------------------------------------- the inventory

// The device axes of one inventory node: the names the policy declares, or —
// name-free — every axis whose values all resolve and at least one of them is a
// device.
type NodeProperties = Pick<InventoryNode, "properties">
type NodeVariants = Pick<InventoryNode, "properties" | "variants">

export function deviceAxes(policy: DevicePolicy, node: NodeProperties): DeviceAxis[] {
  const axes: DeviceAxis[] = []
  for (const [name, definition] of Object.entries(node?.properties ?? {})) {
    if (definition?.type !== "VARIANT") continue
    const options = definition.variantOptions ?? []
    const values = options.map((value) => ({ value, device: deviceOf(policy, value) }))
    const named = policy.axes.some(
      (axis) => normalizeDeviceValue(axisToken(axis)) === normalizeDeviceValue(axisToken(name)),
    )
    const byValues =
      options.length > 0 &&
      values.every((item) => item.device !== UNKNOWN_DEVICE) &&
      values.some((item) => item.device !== ANY_DEVICE)
    if (named || byValues) {
      axes.push({
        name,
        token: axisToken(name),
        key: normalizeDeviceValue(axisToken(name)),
        options,
        values,
        named,
      })
    }
  }
  return axes
}

// The variant records of one set, grouped by the device they declare (RA2's
// per-variant records). Variants whose axis maps to `any` group under `any`.
export function variantsByDevice(
  node: NodeVariants,
): Map<string, NonNullable<InventoryNode["variants"]>> {
  const groups = new Map<string, NonNullable<InventoryNode["variants"]>>()
  for (const variant of node.variants ?? []) {
    const key = variant.device ?? ANY_DEVICE
    const group = groups.get(key)
    if (group) group.push(variant)
    else groups.set(key, [variant])
  }
  return groups
}

// The device a variant name declares. The variant name carries every axis
// (`Device=Mobile, Logo=True`); only the set's device axes are read, and a value
// the policy maps to `any` means "one composition at every width".
type VariantPart = { token: string; name: string; value: string }

export function variantDevice(
  policy: DevicePolicy,
  node: NodeProperties,
  variantName: string,
): { device: string | null; axis: string | undefined; value: string | undefined } {
  const axes = deviceAxes(policy, node)
  if (!axes.length) return { device: null, axis: undefined, value: undefined }
  const parts = String(variantName ?? "")
    .split(",")
    .flatMap((part): VariantPart[] => {
      const index = part.indexOf("=")
      if (index < 0) return []
      return [
        {
          token: normalizeDeviceValue(axisToken(part.slice(0, index))),
          name: part.slice(0, index).trim(),
          value: part.slice(index + 1).trim(),
        },
      ]
    })
  const declared = parts.filter((part) => axes.some((axis) => axis.key === part.token))
  // A set with two device axes (the source mixes them) resolves the first axis
  // the policy names, then the alphabetically first: the choice is deterministic.
  const order = (token: string): number => {
    const position = policy.axes.map((axis) => normalizeDeviceValue(axisToken(axis))).indexOf(token)
    return position < 0 ? Number.POSITIVE_INFINITY : position
  }
  declared.sort((a, b) => order(a.token) - order(b.token) || a.token.localeCompare(b.token))
  for (const part of declared) {
    const device = deviceOf(policy, part.value)
    if (device === UNKNOWN_DEVICE) continue
    return { device: device === ANY_DEVICE ? null : device, axis: part.name, value: part.value }
  }
  return { device: null, axis: declared[0]?.name, value: declared[0]?.value }
}

// Every device the set declares: from the per-variant records when the inventory
// carries them (RA2), else from the axis options. `any` never appears: it needs
// no case. The order follows the policy's own device order.
export function declaredDevices(policy: DevicePolicy, node: NodeVariants): string[] {
  const found = new Set<string>()
  const variants = node?.variants ?? []
  if (variants.length) {
    for (const variant of variants) if (variant.device) found.add(variant.device)
  } else {
    for (const axis of deviceAxes(policy, node)) {
      for (const { device } of axis.values) {
        if (device !== ANY_DEVICE && device !== UNKNOWN_DEVICE) found.add(device)
      }
    }
  }
  return Object.keys(policy.devices).filter((device) => found.has(device))
}

// The projection that needs a case: one capture per device the set declares, and
// none for a device it never names. Kept apart from `declaredDevices` so the
// intent has a name — they differ only where a policy rule filters a device out.
export function requiredDevices(policy: DevicePolicy, node: NodeVariants): string[] {
  return declaredDevices(policy, node)
}

// --------------------------------------------------------------------- check

// Hermetic: the policy, the inventory and nothing else. Returns the verdict and
// the counts the `check:catalogue` device line prints.
type DeviceAnalysis = {
  seenAxes: Set<string>
  seenValues: Map<string, SeenValue>
  sets: string[]
  byDevice: Record<string, number>
  derivedAxes: Set<string>
  deviceValuesOnOtherAxes: Map<string, SeenOtherAxis>
  otherAxisValues: Map<string, SeenOtherAxis>
  declared: number
}

function ignoredValueIndex(policy: DevicePolicy): {
  index: Map<string, IgnoredValue>
  errors: string[]
} {
  const index = new Map<string, IgnoredValue>()
  const errors: string[] = []
  for (const entry of policy.ignoredValues ?? []) {
    const key = ignoredKey(entry)
    if (index.has(key)) {
      errors.push(
        `the ignored value "${entry.value}" on the "${entry.axis}" axis is listed twice — one entry per axis and value`,
      )
    } else index.set(key, entry)
  }
  return { index, errors }
}

function inspectDeviceInventory(
  policy: DevicePolicy,
  nodes: InventoryNode[],
  ignored: Map<string, IgnoredValue>,
): DeviceAnalysis {
  const analysis: DeviceAnalysis = {
    seenAxes: new Set(),
    seenValues: new Map(),
    sets: [],
    byDevice: {},
    derivedAxes: new Set(),
    deviceValuesOnOtherAxes: new Map(),
    otherAxisValues: new Map(),
    declared: 0,
  }
  for (const node of nodes) {
    const axes = deviceAxes(policy, node)
    if (axes.length) analysis.sets.push(node.nodeId)
    inspectNodeAxes(analysis, node, axes)
    inspectOtherVariantAxes(policy, analysis, node, axes, ignored)
    for (const device of requiredDevices(policy, node)) {
      analysis.declared += 1
      analysis.byDevice[device] = (analysis.byDevice[device] ?? 0) + 1
    }
  }
  return analysis
}

function inspectNodeAxes(analysis: DeviceAnalysis, node: InventoryNode, axes: DeviceAxis[]): void {
  for (const axis of axes) {
    analysis.seenAxes.add(normalizeDeviceValue(axis.token))
    if (!axis.named) analysis.derivedAxes.add(axis.token)
    for (const { value } of axis.values) {
      let seen = analysis.seenValues.get(value)
      if (!seen) {
        seen = { value, axes: new Set(), nodes: [] }
        analysis.seenValues.set(value, seen)
      }
      seen.axes.add(axis.token)
      if (!seen.nodes.includes(node.nodeId)) seen.nodes.push(node.nodeId)
    }
  }
}

function inspectOtherVariantAxes(
  policy: DevicePolicy,
  analysis: DeviceAnalysis,
  node: InventoryNode,
  axes: DeviceAxis[],
  ignored: Map<string, IgnoredValue>,
): void {
  for (const [name, definition] of Object.entries(node.properties ?? {})) {
    if (definition?.type !== "VARIANT" || axes.some((axis) => axis.name === name)) continue
    for (const value of definition.variantOptions ?? []) {
      const axis = axisToken(name)
      const key = ignoredKey({ axis, value })
      const other = analysis.otherAxisValues.get(key) ?? { axis, value, nodes: [] }
      if (!other.nodes.includes(node.nodeId)) other.nodes.push(node.nodeId)
      analysis.otherAxisValues.set(key, other)
      if (ignored.has(key)) continue
      if ([UNKNOWN_DEVICE, ANY_DEVICE].includes(deviceOf(policy, value))) continue
      const seen = analysis.deviceValuesOnOtherAxes.get(key) ?? { axis, value, nodes: [] }
      if (!seen.nodes.includes(node.nodeId)) seen.nodes.push(node.nodeId)
      analysis.deviceValuesOnOtherAxes.set(key, seen)
    }
  }
}

function deviceVocabularyErrors(
  policy: DevicePolicy,
  analysis: DeviceAnalysis,
  file: string,
): {
  errors: string[]
  unmapped: SeenValue[]
} {
  const errors: string[] = []
  for (const axis of policy.axes) {
    if (!analysis.seenAxes.has(normalizeDeviceValue(axisToken(axis)))) {
      errors.push(
        `the policy declares the axis "${axis}": the inventory never uses it — drop it from "axes" or map the values it declares, then run \`pnpm nx run pagopa-ui-cli:check:devices\``,
      )
    }
  }
  const unmapped = [...analysis.seenValues.values()].filter(
    (seen) => deviceOf(policy, seen.value) === UNKNOWN_DEVICE,
  )
  for (const seen of unmapped) {
    errors.push(
      `value "${seen.value}" on axis ${[...seen.axes].map((axis) => `"${axis}"`).join(", ")} (${seen.nodes.slice(0, 3).join(", ")}${seen.nodes.length > 3 ? ", …" : ""}) is not mapped — add it to an alias list in ${file}, then run \`pnpm nx run pagopa-ui-cli:check:devices\``,
    )
  }
  return { errors, unmapped }
}

function unusedDeviceAliases(
  policy: DevicePolicy,
  analysis: DeviceAnalysis,
): Array<{ device: string; alias: string }> {
  const used = new Set(
    [...analysis.seenValues.values()].map((seen) => normalizeDeviceValue(seen.value)),
  )
  const unused: Array<{ device: string; alias: string }> = []
  for (const [device, list] of deviceAliasIndex(policy).aliases) {
    for (const alias of list)
      if (!used.has(normalizeDeviceValue(alias))) unused.push({ device, alias })
  }
  for (const value of policy.any ?? []) {
    if (!used.has(normalizeDeviceValue(value))) unused.push({ device: ANY_DEVICE, alias: value })
  }
  return unused
}

export function checkDevicePolicy(
  policy: DevicePolicy,
  nodes: InventoryNode[],
  { file = COMMITTED_FILES["device-policy"] }: { file?: string } = {},
): {
  errors: string[]
  warnings: string[]
  stats: DeviceStats
  unmapped: SeenValue[]
  unused: Array<{ device: string; alias: string }>
} {
  const { index: ignored, errors } = ignoredValueIndex(policy)
  const { duplicates } = deviceAliasIndex(policy)
  for (const duplicate of duplicates)
    errors.push(
      `alias "${duplicate.value}" is claimed by ${duplicate.devices.join(" and ")} — one source value maps to one device; drop the alias from one of them in ${COMMITTED_FILES["device-policy"]} and run \`pnpm nx run pagopa-ui-cli:check:devices\``,
    )
  const analysis = inspectDeviceInventory(policy, nodes, ignored)
  const vocabulary = deviceVocabularyErrors(policy, analysis, file)
  errors.push(...vocabulary.errors)
  const warnings = deviceWarnings(policy, analysis, ignored)
  errors.push(...warnings.errors)
  const stats: DeviceStats = {
    nodes: nodes.length,
    sets: analysis.sets.length,
    declared: analysis.declared,
    byDevice: analysis.byDevice,
    valuesResolved: [...analysis.seenValues.values()].filter(
      (seen) => deviceOf(policy, seen.value) !== UNKNOWN_DEVICE,
    ).length,
    valuesTotal: analysis.seenValues.size,
    unmapped: vocabulary.unmapped.length,
    unusedAliases: warnings.unused.length,
    axisNames: {
      named: policy.axes.filter((axis) =>
        analysis.seenAxes.has(normalizeDeviceValue(axisToken(axis))),
      ),
      derived: [...analysis.derivedAxes].sort(),
    },
  }
  return {
    errors,
    warnings: warnings.messages,
    stats,
    unmapped: vocabulary.unmapped,
    unused: warnings.unused,
  }
}

function deviceWarnings(
  policy: DevicePolicy,
  analysis: DeviceAnalysis,
  ignored: Map<string, IgnoredValue>,
): { messages: string[]; errors: string[]; unused: Array<{ device: string; alias: string }> } {
  const messages: string[] = []
  const errors: string[] = []
  const unused = unusedDeviceAliases(policy, analysis)
  for (const { device, alias } of unused) {
    messages.push(
      `the alias "${alias}" (${device}) is not used by the inventory — the vocabulary may stay ahead of the library`,
    )
  }
  for (const { axis, value, nodes } of analysis.deviceValuesOnOtherAxes.values()) {
    messages.push(
      `the "${axis}" axis of ${nodes.slice(0, 3).join(", ")}${nodes.length > 3 ? ", …" : ""} declares "${value}", which names a device, but the axis is not a device axis (not every value resolves) — split the axis or add the missing values`,
    )
  }
  for (const [key, entry] of ignored) {
    if (!analysis.otherAxisValues.has(key)) {
      errors.push(
        `the ignored value "${entry.value}" on the "${entry.axis}" axis matches no non-device axis value in the inventory — remove it from "ignoredValues"`,
      )
    }
  }
  return { messages, errors, unused }
}

// The one line `check:catalogue` prints (RA1; RA4 appends its coverage line).
export function formatDeviceLine(stats: DeviceStats): string {
  return (
    `devices: ${stats.sets} sets with an axis · declared ${stats.declared} · ` +
    `aliases resolved ${stats.valuesResolved}/${stats.valuesTotal} · unmapped ${stats.unmapped}`
  )
}

// ------------------------------------------------------------------------ reports

export function formatDevices(policy: DevicePolicy, stats: DeviceStats): string[] {
  const lines = [
    `device policy: ${Object.keys(policy.devices).length} devices · ` +
      `${Object.values(policy.devices).reduce((count, device) => count + device.aliases.length, 0)} aliases · ` +
      `no-device values ${(policy.any ?? []).join(", ") || "none"}`,
    `axes: ${stats.axisNames.named.join(", ")} (named)` +
      (stats.axisNames.derived.length
        ? ` · ${stats.axisNames.derived.join(", ")} (by their values)`
        : ""),
    `sets: ${stats.sets} of ${stats.nodes} nodes declare a device axis`,
    `declared: ${stats.declared} case(s) (` +
      `${
        Object.entries(stats.byDevice)
          .map(([device, count]) => `${device} ${count}`)
          .join(" · ") || "none"
      })`,
    `values: ${stats.valuesResolved}/${stats.valuesTotal} resolved`,
    `unused aliases: ${stats.unusedAliases}`,
  ]
  return [lines.join("\n")]
}

export interface DeviceReport {
  policy: string
  errors: string[]
  warnings: string[]
  stats: DeviceStats
  unmapped: ReturnType<typeof checkDevicePolicy>["unmapped"]
  unused: ReturnType<typeof checkDevicePolicy>["unused"]
  vocabulary: DevicePolicy
}

export function readDevices(workspace: Workspace): DeviceReport {
  const policy = readDevicePolicy(workspace.root)
  const nodes = readInventory(workspace.root).components
  return {
    policy: COMMITTED_FILES["device-policy"],
    ...checkDevicePolicy(policy, nodes),
    vocabulary: policy,
  }
}

export function checkDevices(workspace: Workspace): CheckReport {
  try {
    const result = readDevices(workspace)
    return checkReport("devices", formatDeviceLine(result.stats), result.errors, {
      warnings: result.warnings,
    })
  } catch (error) {
    return checkReport("devices", "device policy could not be loaded", [
      error instanceof Error ? error.message : String(error),
    ])
  }
}

export function formatDeviceReport(
  result: DeviceReport,
  check: boolean,
): { out: string[]; err: string[] } {
  return {
    out: [
      ...(check ? [] : formatDevices(result.vocabulary, result.stats)),
      formatDeviceLine(result.stats),
    ],
    err: [
      ...result.warnings.map((warning) => `warn: ${warning}`),
      ...result.errors.map((error) => `error: ${error}`),
    ],
  }
}
