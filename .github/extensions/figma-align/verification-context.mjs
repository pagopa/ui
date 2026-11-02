import { createHash } from "node:crypto"

export const VERIFICATION_TREES = [
  ".agents/skills/figma-to-code",
  ".agents/skills/pagopa-ui-standards",
  ".github/extensions/figma-align",
  "apps/storybook/.storybook",
  "apps/storybook/src",
  "docs/design-requests",
  "docs/figma-parity",
  "packages/artwork/src",
  "packages/pagopa-ui/assets",
  "packages/pagopa-ui/src",
  "packages/tokens/src",
  "packages/ui-cli/src",
  "packages/ui-cli/tests",
]

export const VERIFICATION_FILES = [
  ".gitignore",
  ".node-version",
  ".prettierignore",
  "AGENTS.md",
  "CONTRIBUTING.md",
  "README.md",
  "apps/storybook/.oxlintrc.json",
  "apps/storybook/package.json",
  "apps/storybook/project.json",
  "apps/storybook/scripts/storybook-dev.mjs",
  "apps/storybook/tsconfig.json",
  "apps/storybook/vite.config.ts",
  "nx.json",
  "oxfmt.config.ts",
  "package.json",
  "packages/artwork/.oxlintrc.json",
  "packages/artwork/package.json",
  "packages/artwork/project.json",
  "packages/artwork/tsconfig.json",
  "packages/pagopa-ui/.figma/comments.json",
  "packages/pagopa-ui/.figma/live-mcp.json",
  "packages/pagopa-ui/.figma/live-rest.json",
  "packages/pagopa-ui/.figma/rules.json",
  "packages/pagopa-ui/.figma/variables.json",
  "packages/pagopa-ui/.oxlintrc.json",
  "packages/pagopa-ui/CHANGELOG.md",
  "packages/pagopa-ui/figma-to-code.yaml",
  "packages/pagopa-ui/package.json",
  "packages/pagopa-ui/project.json",
  "packages/pagopa-ui/tsconfig.app.json",
  "packages/pagopa-ui/tsconfig.json",
  "packages/pagopa-ui/tsconfig.lib.json",
  "packages/pagopa-ui/tsconfig.node.json",
  "packages/pagopa-ui/vite.config.ts",
  "packages/tokens/.oxlintrc.json",
  "packages/tokens/package.json",
  "packages/tokens/project.json",
  "packages/tokens/tsconfig.json",
  "packages/ui-cli/.oxlintrc.json",
  "packages/ui-cli/README.md",
  "packages/ui-cli/data/css-budget.json",
  "packages/ui-cli/package.json",
  "packages/ui-cli/playwright.config.mjs",
  "packages/ui-cli/project.json",
  "packages/ui-cli/tsconfig.json",
  "pnpm-lock.yaml",
  "pnpm-workspace.yaml",
  "tools/workspace/project.json",
  "tsconfig.base.json",
]

export function isSafeContextPath(path) {
  if (typeof path !== "string" || path.includes("\0")) return false
  const normalized = path.replaceAll("\\", "/")
  if (normalized.startsWith("/") || /^[a-z]:/i.test(normalized)) return false
  const parts = normalized.split("/")
  if (parts.some((part) => !part || part === "." || part === "..")) return false
  return !parts.some((part) => {
    const name = part.toLowerCase()
    return (
      [".git", ".ssh", ".aws", ".azure", ".config", ".nx", ".pnpm-store", "node_modules"].includes(
        name,
      ) ||
      [".npmrc", ".netrc", ".pypirc", ".yarnrc", ".yarnrc.yml", ".git-credentials"].includes(
        name,
      ) ||
      name.startsWith(".env") ||
      /(?:^|[._-])(?:secret|secrets|credential|credentials)(?:[._-]|$)/.test(name) ||
      /^(?:passwords?|token|access[_-]?token|auth)(?:\.(?:json|ya?ml|txt|env))?$/.test(name) ||
      /\.(?:env|pem|key|p12|pfx|jks|keystore|kdbx)$/.test(name) ||
      /^id_(?:rsa|dsa|ecdsa|ed25519)(?:\.|$)/.test(name)
    )
  })
}

export function isVerificationPath(path) {
  if (!isSafeContextPath(path)) return false
  const normalized = path.replaceAll("\\", "/")
  return (
    VERIFICATION_FILES.includes(normalized) ||
    VERIFICATION_TREES.some((root) => normalized === root || normalized.startsWith(`${root}/`))
  )
}

export function isIgnorableExcludedEntry(path, entry) {
  const name = path.split("/").at(-1).toLowerCase()
  if ([".git", ".nx", ".pnpm-store", "node_modules"].includes(name)) return true
  const environment = /^\.env(?:rc)?(?:\.[a-z0-9_-]+)*$/i.test(name)
  const source =
    /\.(?:cjs|css|graphql|html|js|json|jsonc|jsx|md|mdx|mjs|mts|scss|svg|ts|tsx|ya?ml)$/i
  return environment && !source.test(name) && entry.isFile()
}

export function contextSignature(entries) {
  const hash = createHash("sha256")
  const sorted = [...entries].sort(([left], [right]) => left.localeCompare(right))
  for (const [path, value] of sorted) hash.update(`${JSON.stringify([path, value])}\n`)
  return hash.digest("hex")
}

export async function collectVerification({ readContext, verify, signal }) {
  let startContext
  try {
    startContext = await readContext()
  } catch (error) {
    if (signal?.aborted) throw error
    return { verification: null, contextError: String(error?.message ?? error) }
  }
  const verification = await verify()
  try {
    return { verification, startContext, endContext: await readContext() }
  } catch (error) {
    if (signal?.aborted) throw error
    return { verification, startContext, contextError: String(error?.message ?? error) }
  }
}

export async function reverifyStaleResults({
  results,
  finalContext,
  greenFixFailed,
  parallel,
  verify,
}) {
  const candidates = results.flatMap((result, index) => {
    const nodeId = result?.node?.nodeId
    const verifier = result?.verification
    const completeContext =
      typeof result?.startContext === "string" &&
      result.startContext &&
      typeof result.endContext === "string" &&
      result.endContext
    if (
      greenFixFailed ||
      !finalContext ||
      !nodeId ||
      result.writerFailure ||
      result.contextError ||
      result.alignment?.nodeId !== nodeId ||
      verifier?.nodeId !== nodeId ||
      verifier.pass !== true ||
      verifier.findings?.length ||
      !completeContext ||
      (result.startContext === result.endContext && result.endContext === finalContext)
    ) {
      return []
    }
    return [{ index, result }]
  })
  if (!candidates.length) return { results, attempted: 0 }

  const missing = {
    verification: null,
    contextError: "Final re-verification failed: the verifier returned no result",
  }
  const tasks = candidates.map(
    ({ result }) =>
      () =>
        verify(result.node, result.alignment),
  )
  const refreshed = await parallel(tasks)
  const next = [...results]
  for (const [position, { index, result }] of candidates.entries()) {
    const replacement = refreshed?.[position]
    next[index] = {
      ...result,
      ...(replacement ?? missing),
    }
  }
  return { results: next, attempted: candidates.length }
}

export function assessVerification({
  nodeId,
  alignment,
  verification,
  startContext,
  endContext,
  finalContext,
  contextError,
  writerFailure,
  greenFixFailed,
}) {
  const findings = Array.isArray(verification?.findings) ? [...verification.findings] : []
  if (writerFailure) findings.push(writerFailure)
  if (!alignment) findings.push("The writer returned no result; this node was not verified.")
  else if (alignment.nodeId !== nodeId) findings.push("The writer returned a different node.")

  if (!verification) findings.push("The verifier returned no result or failed.")
  else {
    if (verification.nodeId !== nodeId) findings.push("The verifier returned a different node.")
    if (verification.pass !== true && findings.length === 0) {
      findings.push("The verifier did not pass and returned no findings.")
    }
  }

  if (contextError) findings.push(`The verification context could not be captured: ${contextError}`)
  if (
    ![startContext, endContext, finalContext].every((value) => typeof value === "string" && value)
  ) {
    findings.push("The verification context is missing; the result cannot be trusted.")
  } else {
    if (startContext !== endContext) {
      findings.push("Relevant source or case context changed during verification; repeat it.")
    }
    if (endContext !== finalContext) {
      findings.push("Relevant source or case context changed after verification; repeat it.")
    }
  }
  if (greenFixFailed) {
    findings.push("The green-chain fix writer returned no result; repeat verification.")
  }
  return { verified: verification?.pass === true && findings.length === 0, findings }
}
