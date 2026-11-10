import fs from "node:fs"
import { z } from "zod"

import type { Workspace } from "../../adapters/workspace.ts"
import type {
  ApiExceptions,
  InventoryNode,
  Registry,
  RegistryEntry,
} from "../../schemas/catalogue.ts"
import { parseSchema } from "../../lib/validate.ts"
import { catalogueIndex } from "../snapshot.ts"
import {
  compareNames,
  exportNames,
  iconListConstant,
  matchesModulePattern,
  moduleExports,
  targetIdentities,
  type SourceModules,
} from "./source.ts"

const INVENTORY_PATH = "src/catalog/figma/inventory.json"
const ICONS_PATH = "src/components/icons/figma-inventory.ts"
const EVIDENCE_EXCEPTIONS_PATH = "src/catalog/figma/evidence-exceptions.json"
const API_EXCEPTIONS_PATH = "src/catalog/figma/api-exceptions.json"
const VALID_STATUSES = new Set(["implemented", "mocked", "excluded", "pending"])

type CatalogueIndex = ReturnType<typeof catalogueIndex>

export function validateBulkRules(
  workspace: Workspace,
  registry: Registry,
): {
  errors: string[]
  bulkByPage: Map<string, Registry["bulkRules"][number]>
  bulkByNode: CatalogueIndex["byNode"]
  manifests: CatalogueIndex["manifests"]
} {
  const errors: string[] = []
  const bulkByPage = new Map<string, Registry["bulkRules"][number]>()
  for (const rule of registry.bulkRules ?? []) {
    if (!/^\d+:\d+$/.test(rule.pageId) || !VALID_STATUSES.has(rule.status ?? ""))
      errors.push(
        `bulk rule invalid: ${JSON.stringify(rule)} — a bulk rule needs a \`<page>:<node>\` pageId and a status of ${STATUSES}, then run \`${CATALOGUE_GATE}\``,
      )
    else if (bulkByPage.has(rule.pageId))
      errors.push(
        `duplicate bulk rule for page ${rule.pageId} — keep one bulk rule per page, then run \`${CATALOGUE_GATE}\``,
      )
    else bulkByPage.set(rule.pageId, rule)
    if (rule.status === "excluded" && !rule.reason)
      errors.push(
        `bulk rule ${rule.page}: excluded requires reason — state why the page is excluded, then run \`${CATALOGUE_GATE}\``,
      )
    if (
      rule.namesExport &&
      (!rule.assetManifest || !fs.existsSync(`${workspace.artworkRoot}/${rule.assetManifest}`))
    ) {
      errors.push(
        `${rule.page}: namesExport requires an existing node-keyed assetManifest — point assetManifest at a file that exists, then run \`${CATALOGUE_GATE}\``,
      )
    }
  }
  const { byNode, manifests } = catalogueIndex(registry, workspace)
  return { errors, bulkByPage, bulkByNode: byNode, manifests }
}

export function validateRegistry(
  workspace: Workspace,
  registry: Registry,
  nodes: InventoryNode[],
  source: SourceModules,
  storyImportsByFile: Map<string, Set<string>>,
  allStoryImports: Set<string>,
  evidenceExceptions: Record<string, string>,
): string[] {
  const errors: string[] = []
  const entries = registry.entries ?? {}
  const committedById = new Map(nodes.map((node) => [node.nodeId, node]))
  const storiesByFile = new Map<string, Map<string, Set<string>>>()
  for (const [nodeId, entry] of Object.entries(entries)) {
    validateRegistryEntry(
      workspace,
      source,
      nodeId,
      entry,
      committedById,
      evidenceExceptions,
      storyImportsByFile,
      allStoryImports,
      storiesByFile,
      errors,
    )
  }
  validateStoryDesign(source, entries, errors)
  validateEvidenceExceptions(
    workspace,
    source,
    entries,
    evidenceExceptions,
    allStoryImports,
    errors,
  )
  return errors
}

const CATALOGUE_GATE = "pnpm nx run pagopa-ui:check:catalogue"
// Every error below names what to change and the gate that says whether it is
// fixed: a rule a session can hit has to carry its own repair.
const STATUSES = [...VALID_STATUSES].join(", ")

function validateRegistryEntry(
  workspace: Workspace,
  source: SourceModules,
  nodeId: string,
  entry: RegistryEntry,
  committedById: Map<string, InventoryNode>,
  evidenceExceptions: Record<string, string>,
  storyImportsByFile: Map<string, Set<string>>,
  allStoryImports: Set<string>,
  storiesByFile: Map<string, Map<string, Set<string>>>,
  errors: string[],
): void {
  if (!VALID_STATUSES.has(entry.status))
    errors.push(
      `registry ${nodeId}: invalid status ${entry.status} — set one of ${STATUSES}, then run \`${CATALOGUE_GATE}\``,
    )
  if (!committedById.has(nodeId))
    errors.push(
      `registry ${nodeId}: stale entry (node not in ${INVENTORY_PATH}) — drop it or refresh the inventory, then run \`${CATALOGUE_GATE}\``,
    )
  if (entry.status === "implemented" || entry.status === "mocked") {
    validateTarget(workspace, source, nodeId, entry, errors)
    if (entry.status === "implemented") {
      validateStoryTarget(workspace, nodeId, entry, errors)
      validateDeclaredStoryExports(workspace, source, nodeId, entry, storiesByFile, errors)
    }
    if (entry.status === "mocked" && !entry.note)
      errors.push(
        `registry ${nodeId}: mocked requires note — state what the mock leaves open, then run \`${CATALOGUE_GATE}\``,
      )
  }
  if (entry.status === "excluded" && !entry.reason)
    errors.push(
      `registry ${nodeId}: excluded requires reason — state why the node is excluded, then run \`${CATALOGUE_GATE}\``,
    )
  if (entry.status === "implemented" && entry.target?.export) {
    validateStoryEvidence(
      source,
      nodeId,
      entry,
      evidenceExceptions,
      storyImportsByFile,
      allStoryImports,
      errors,
    )
  }
}

function validateTarget(
  workspace: Workspace,
  source: SourceModules,
  nodeId: string,
  entry: RegistryEntry,
  errors: string[],
): void {
  if (!entry.target?.module) {
    errors.push(
      `registry ${nodeId}: ${entry.status} requires target.module — add the module that exports the component, then run \`${CATALOGUE_GATE}\``,
    )
    return
  }
  if (!fs.existsSync(workspace.path(entry.target.module))) {
    errors.push(
      `registry ${nodeId}: module not found ${entry.target.module} — fix target.module, then run \`${CATALOGUE_GATE}\``,
    )
    return
  }
  if (!entry.target.export) {
    errors.push(
      `registry ${nodeId}: ${entry.status} requires target.export — name the exported component, then run \`${CATALOGUE_GATE}\``,
    )
    return
  }
  for (const pair of targetIdentities(entry.target)) {
    if (!pair.module || !pair.export) {
      errors.push(
        `registry ${nodeId}: additionalTargets require module and export — give every additional target both, then run \`${CATALOGUE_GATE}\``,
      )
      continue
    }
    if (!fs.existsSync(workspace.path(pair.module)))
      errors.push(
        `registry ${nodeId}: module not found ${pair.module} — fix the module path, then run \`${CATALOGUE_GATE}\``,
      )
    else if (!exportNames(source, pair.module).has(pair.export))
      errors.push(
        `registry ${nodeId}: export "${pair.export}" not found in ${pair.module} — fix target.export, then run \`${CATALOGUE_GATE}\``,
      )
  }
}

function validateStoryTarget(
  workspace: Workspace,
  nodeId: string,
  entry: RegistryEntry,
  errors: string[],
): void {
  if (!entry.target?.story)
    errors.push(
      `registry ${nodeId}: implemented requires target.story — add the story that renders the component, then run \`${CATALOGUE_GATE}\``,
    )
  else if (!fs.existsSync(workspace.path(entry.target.story)))
    errors.push(
      `registry ${nodeId}: story not found ${entry.target.story} — fix target.story, then run \`${CATALOGUE_GATE}\``,
    )
}

function validateDeclaredStoryExports(
  workspace: Workspace,
  source: SourceModules,
  nodeId: string,
  entry: RegistryEntry,
  storiesByFile: Map<string, Map<string, Set<string>>>,
  errors: string[],
): void {
  if (!entry.target?.storyExports) return
  if (!Array.isArray(entry.target.storyExports) || !entry.target.storyExports.length) {
    errors.push(
      `registry ${nodeId}: storyExports must be a nonempty list — list the exports that render the component, then run \`${CATALOGUE_GATE}\``,
    )
    return
  }
  const storyFile = entry.target.story
  if (!storyFile || !fs.existsSync(workspace.path(storyFile))) return
  if (!storiesByFile.has(storyFile))
    storiesByFile.set(storyFile, source.renderedStoryExports(storyFile))
  const stories = storiesByFile.get(storyFile)
  if (!stories) return
  const identities = targetIdentities(entry.target).map((pair) => ({
    ...pair,
    identity: source.runtimeExports(pair.module).get(pair.export),
  }))
  const rendered = new Set<string | undefined>()
  for (const name of entry.target.storyExports) {
    if (
      !stories.has(name) ||
      !identities.some(({ identity }) => stories.get(name)?.has(identity ?? ""))
    ) {
      errors.push(
        `registry ${nodeId}: story export "${name}" does not render the mapped component — render it or drop the export, then run \`${CATALOGUE_GATE}\``,
      )
    }
    for (const identity of stories.get(name) ?? []) rendered.add(identity)
  }
  for (const pair of identities) {
    if (!rendered.has(pair.identity))
      errors.push(
        `registry ${nodeId}: declared story exports do not render "${pair.export}" from ${pair.module} — declare the export that renders it, then run \`${CATALOGUE_GATE}\``,
      )
  }
}

function validateStoryEvidence(
  source: SourceModules,
  nodeId: string,
  entry: RegistryEntry,
  evidenceExceptions: Record<string, string>,
  storyImportsByFile: Map<string, Set<string>>,
  allStoryImports: Set<string>,
  errors: string[],
): void {
  const target = entry.target
  if (!target) return
  for (const pair of targetIdentities(target)) {
    const identity = source.runtimeExports(pair.module).get(pair.export)
    if (!identity) continue
    const verifiedInDeclared = entry.target?.story
      ? (storyImportsByFile.get(entry.target.story)?.has(identity) ?? false)
      : false
    if (!allStoryImports.has(identity)) {
      if (!Object.hasOwn(evidenceExceptions, nodeId))
        errors.push(
          `registry ${nodeId}: no story renders "${pair.export}" from ${pair.module} — add coverage or list it in ${EVIDENCE_EXCEPTIONS_PATH}, then run \`${CATALOGUE_GATE}\``,
        )
    } else if (!verifiedInDeclared)
      errors.push(
        `registry ${nodeId}: linked story ${entry.target?.story} does not render "${pair.export}" — update target.story, then run \`${CATALOGUE_GATE}\``,
      )
  }
}

function validateStoryDesign(
  source: SourceModules,
  entries: Registry["entries"],
  errors: string[],
): void {
  const expectations = new Map<string, Set<string>>()
  for (const [nodeId, entry] of Object.entries(entries)) {
    if (entry.status !== "implemented" || !entry.target?.story || !entry.target.storyExports)
      continue
    for (const name of entry.target.storyExports) {
      const key = `${entry.target.story}::${name}`
      if (!expectations.has(key)) expectations.set(key, new Set())
      expectations.get(key)?.add(nodeId)
    }
  }
  const designByFile = new Map<string, ReturnType<SourceModules["storyDesignNodes"]>>()
  for (const [key, nodeIds] of expectations) {
    if (nodeIds.size !== 1) continue
    const [file, name] = key.split("::")
    let design = designByFile.get(file)
    if (!design) {
      design = source.storyDesignNodes(file)
      designByFile.set(file, design)
    }
    const { meta, stories } = design
    const [nodeId] = nodeIds
    if (!(stories.get(name) ?? meta).has(nodeId))
      errors.push(
        `registry ${nodeId}: story export "${name}" in ${file} must show the node in parameters.design — set parameters.design, then run \`${CATALOGUE_GATE}\``,
      )
  }
}

function validateEvidenceExceptions(
  workspace: Workspace,
  source: SourceModules,
  entries: Registry["entries"],
  exceptions: Record<string, string>,
  allStoryImports: Set<string>,
  errors: string[],
): void {
  for (const [nodeId, reason] of Object.entries(exceptions)) {
    const entry = entries[nodeId]
    if (!entry) {
      errors.push(
        `${EVIDENCE_EXCEPTIONS_PATH}: ${nodeId} is not a registry entry — drop the exception or add the entry, then run \`${CATALOGUE_GATE}\``,
      )
      continue
    }
    if (entry.status !== "implemented")
      errors.push(
        `${EVIDENCE_EXCEPTIONS_PATH}: ${nodeId} is not implemented — drop the exception or implement the node, then run \`${CATALOGUE_GATE}\``,
      )
    if (!reason)
      errors.push(
        `${EVIDENCE_EXCEPTIONS_PATH}: ${nodeId} requires a reason — state why no story covers it, then run \`${CATALOGUE_GATE}\``,
      )
    const identity = entry.target
      ? moduleExports(workspace, source, entry.target.module).get(entry.target.export)
      : undefined
    if (identity && allStoryImports.has(identity))
      errors.push(
        `${EVIDENCE_EXCEPTIONS_PATH}: ${nodeId} is now rendered by a story — remove the exception, then run \`${CATALOGUE_GATE}\``,
      )
  }
}

export function validatePublicApi(
  workspace: Workspace,
  source: SourceModules,
  entries: Registry["entries"],
  apiExceptions: ApiExceptions,
  publicExports: Map<string, string>,
): string[] {
  const found: string[] = []
  const targets = new Set(
    Object.values(entries)
      .flatMap((entry) =>
        entry.target
          ? targetIdentities(entry.target).map((pair) =>
              moduleExports(workspace, source, pair.module).get(pair.export),
            )
          : [],
      )
      .filter((value): value is string => Boolean(value)),
  )
  const modulePatterns = apiExceptions.modulePatterns ?? {}
  const exportExceptions = apiExceptions.exports ?? {}
  for (const [pattern, reason] of Object.entries(modulePatterns)) {
    if (!reason)
      found.push(
        `${API_EXCEPTIONS_PATH}: module pattern ${pattern} requires a reason — state why the module is unsourced, then run \`${CATALOGUE_GATE}\``,
      )
    if (
      ![...publicExports.values()].some((identity) =>
        matchesModulePattern(identity.split("#")[0], pattern),
      )
    ) {
      found.push(
        `${API_EXCEPTIONS_PATH}: module pattern ${pattern} matches no public export — remove it, then run \`${CATALOGUE_GATE}\``,
      )
    }
  }
  const unsourced = [...publicExports]
    .filter(
      ([name, identity]) =>
        !targets.has(identity) &&
        !Object.entries(modulePatterns).some(([pattern]) =>
          matchesModulePattern(identity.split("#")[0], pattern),
        ) &&
        !Object.hasOwn(exportExceptions, name),
    )
    .map(([name, identity]) => `${name} (${identity.split("#")[0]})`)
  if (unsourced.length)
    found.push(
      `public exports without a Figma mapping (${unsourced.length}) — map them or list them in ${API_EXCEPTIONS_PATH}, then run \`${CATALOGUE_GATE}\`:\n${unsourced.map((line) => `  ${line}`).join("\n")}`,
    )
  for (const [name, reason] of Object.entries(exportExceptions)) {
    if (!reason)
      found.push(
        `${API_EXCEPTIONS_PATH}: ${name} requires a reason — state why the export is unsourced, then run \`${CATALOGUE_GATE}\``,
      )
    const identity = publicExports.get(name)
    if (identity === undefined)
      found.push(
        `${API_EXCEPTIONS_PATH}: ${name} is not a public export — remove it, then run \`${CATALOGUE_GATE}\``,
      )
    else if (targets.has(identity))
      found.push(
        `${API_EXCEPTIONS_PATH}: ${name} now maps to a registry entry — remove the exception, then run \`${CATALOGUE_GATE}\``,
      )
  }
  return found
}

export function validateIconNames(
  workspace: Workspace,
  registry: Registry,
  nodes: InventoryNode[],
  entries: Registry["entries"],
  bulkByPage: Map<string, Registry["bulkRules"][number]>,
  bulkByNode: CatalogueIndex["byNode"],
  manifests: CatalogueIndex["manifests"],
): string[] {
  const errors: string[] = []
  for (const rule of registry.bulkRules ?? []) {
    if (!rule.namesExport) continue
    const manifest = manifests.get(rule.pageId)
    if (!manifest) continue
    const selected = nodes.filter(
      (node) => (bulkByNode.get(node.nodeId) ?? bulkByPage.get(node.pageId)) === rule,
    )
    const names: string[] = []
    for (const [id, raw] of Object.entries(manifest.entries)) {
      const asset = parseSchema(
        z.looseObject({ name: z.string() }),
        raw,
        `${rule.page}: asset ${id}`,
      )
      if (!selected.some((node) => node.nodeId === id))
        errors.push(
          `${rule.page}: stale asset identity ${id} — drop the asset or map the node, then run \`${CATALOGUE_GATE}\``,
        )
      if (!asset.name.trim() || names.includes(asset.name))
        errors.push(
          `${rule.page}: ${id} requires a unique public catalogue name — give the asset a name no other asset uses, then run \`${CATALOGUE_GATE}\``,
        )
      names.push(asset.name)
    }
    const implemented = selected.filter(
      (node) => (entries[node.nodeId]?.status ?? rule.status) === "implemented",
    )
    for (const node of implemented)
      if (!manifest.entries[node.nodeId])
        errors.push(
          `${rule.page}: implemented identity ${node.nodeId} has no source asset mapping — add the asset to the manifest or set the node to pending, then run \`${CATALOGUE_GATE}\``,
        )
    const expected = implemented
      .map((node) => {
        const raw = manifest.entries[node.nodeId]
        return raw
          ? parseSchema(
              z.looseObject({ name: z.string().optional() }),
              raw,
              `${rule.page}: asset ${node.nodeId}`,
            ).name
          : undefined
      })
      .filter((name): name is string => typeof name === "string")
    errors.push(
      ...compareNames(
        iconListConstant(workspace, rule.namesExport),
        expected,
        rule.page ?? rule.pageId,
        ICONS_PATH,
        names,
      ).map(
        (error) =>
          `${error} — sync ${ICONS_PATH} with the manifest, then run \`${CATALOGUE_GATE}\``,
      ),
    )
  }
  return errors
}

export function findUnaccountedNodes(
  nodes: InventoryNode[],
  registry: Registry,
  bulkByPage: Map<string, Registry["bulkRules"][number]>,
  bulkByNode: CatalogueIndex["byNode"],
): string[] {
  const missing = nodes.filter(
    (node) =>
      !registry.entries[node.nodeId] &&
      !bulkByNode.has(node.nodeId) &&
      !bulkByPage.has(node.pageId),
  )
  return missing.length
    ? [
        `unaccounted nodes (${missing.length}) — add registry entries, then run \`${CATALOGUE_GATE}\`:\n${missing.map((node) => `  ${node.nodeId}  ${node.name}  (${node.pageName})`).join("\n")}`,
      ]
    : []
}
