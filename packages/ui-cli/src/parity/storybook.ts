// Figma parity — the Storybook identity guard.
//
// Sibling worktrees share the port, and the dev server never says which tree it
// serves: two checkouts on the same `:6006` render each other's code, and the
// numbers that come back are evidence for neither. The probe asks the server
// for a file that exists only in this tree through Vite's `/@fs/` endpoint —
// 200 is this tree, 403 is another one.
import { STORYBOOK_IDENTITY, STORYBOOK_URL } from "./render.ts"
import { resolveWorkspaceRoot } from "../lib/paths.ts"

export const START_STORYBOOK = "pnpm nx run pagopa-ui-storybook:storybook"

export type StorybookIdentity = {
  state: "match" | "foreign" | "missing" | "unknown"
  url: string
  marker: string
  status?: number
  detail?: string
}

export async function storybookIdentity(baseUrl = STORYBOOK_URL): Promise<StorybookIdentity> {
  const marker = resolveWorkspaceRoot() + STORYBOOK_IDENTITY
  let response: Response
  try {
    response = await fetch(`${baseUrl}/@fs${marker}`, { signal: AbortSignal.timeout(3000) })
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error)
    const missing = /ECONNREFUSED|fetch failed|timed out|ENOTFOUND/i.test(detail)
    return { state: missing ? "missing" : "unknown", url: baseUrl, marker, detail }
  }
  if (response.ok) return { state: "match", url: baseUrl, marker, status: response.status }
  if (response.status === 403 || response.status === 404) {
    return { state: "foreign", url: baseUrl, marker, status: response.status }
  }
  return {
    state: "unknown",
    url: baseUrl,
    marker,
    status: response.status,
    detail: `answered ${response.status} for ${marker}`,
  }
}

// The refusal names the fix, because the alternative — a verdict from another
// checkout — is silent. An operator who knows both trees carry the same commit
// opts out with `PARITY_ALLOW_FOREIGN_STORYBOOK=1`.
export async function guardStorybook(): Promise<boolean> {
  const identity = await storybookIdentity()
  if (identity.state === "match") return true
  if (identity.state === "missing") {
    console.error(`error: no Storybook on ${identity.url}; start it with: ${START_STORYBOOK}`)
    return false
  }
  if (identity.state === "unknown") {
    console.error(
      `warning: cannot prove the Storybook on ${identity.url} serves this tree (${identity.detail})`,
    )
    return true
  }
  if (process.env.PARITY_ALLOW_FOREIGN_STORYBOOK === "1") {
    console.error(
      `warning: the Storybook on ${identity.url} serves another tree (${identity.marker} -> ` +
        `${identity.status}); PARITY_ALLOW_FOREIGN_STORYBOOK=1 accepts its renders`,
    )
    return true
  }
  console.error(
    `error: the Storybook on ${identity.url} serves another tree (${identity.marker} -> ` +
      `${identity.status}), so its renders describe that checkout. Run one Storybook per ` +
      "worktree on its own port and pass STORYBOOK_URL, or set " +
      "PARITY_ALLOW_FOREIGN_STORYBOOK=1 when both trees carry the same commit.",
  )
  return false
}
