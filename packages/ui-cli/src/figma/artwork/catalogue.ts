import type { BulkRule, InventoryNode, Registry } from "../../schemas/catalogue.ts"
import { catalogueIndex } from "../snapshot.ts"

export function requireBulkRule(
  registry: Registry,
  namesExport: NonNullable<BulkRule["namesExport"]>,
  label: string,
): BulkRule {
  const rules = (registry.bulkRules ?? []).filter((rule) => rule.namesExport === namesExport)
  if (rules.length !== 1 || !rules[0]?.pageId) {
    throw new Error(`${label} require exactly one registry rule with a stable pageId`)
  }
  return rules[0]
}

// A node belongs to the rule that owns it in the manifest; a first export has
// no manifest yet, so the source page is the evidence until then.
export function selectRuleNodes(
  registry: Registry,
  rule: BulkRule,
  nodes: InventoryNode[],
): InventoryNode[] {
  const { byNode } = catalogueIndex(registry)
  return nodes.filter((node) => {
    const owner = byNode.get(node.nodeId)
    return owner ? owner === rule : node.pageId === rule.pageId
  })
}
