// Figma parity — the Storybook identity guard.
//
// Sibling worktrees share the port, and the dev server never says which tree it
// serves: two checkouts on the same `:6006` render each other's code, and the
// numbers that come back are evidence for neither. The probe asks the server
// for a file that exists only in this tree through Vite's `/@fs/` endpoint —
// 200 is this tree, 403 is another one.
//
// The probe rests on two Vite facts: `/@fs/` serves a file only when it sits
// inside `server.fs.allow` (the workspace root, by default the tree the server
// was started from), and a file outside it is refused with 403 rather than 404
// when it is readable. Widening `server.fs.allow` past the workspace root would
// turn every tree into a match: the guard is a heuristic that fails towards
// "unknown", not a proof.
import { STORYBOOK_IDENTITY, STORYBOOK_URL } from "./render.ts"
import { resolveWorkspaceRoot } from "../lib/paths.ts"

export const START_STORYBOOK = "pnpm nx run pagopa-ui-storybook:storybook"

export type StorybookIdentity = {
  state: "match" | "foreign" | "static" | "missing" | "unknown"
  url: string
  marker: string
  status?: number
  detail?: string
}

async function probe(
  baseUrl: string,
  pathname: string,
): Promise<{ response: Response } | { error: string }> {
  try {
    return { response: await fetch(`${baseUrl}${pathname}`, { signal: AbortSignal.timeout(3000) }) }
  } catch (error) {
    return { error: error instanceof Error ? error.message : String(error) }
  }
}

export async function storybookIdentity(baseUrl = STORYBOOK_URL): Promise<StorybookIdentity> {
  const marker = resolveWorkspaceRoot() + STORYBOOK_IDENTITY
  const asked = await probe(baseUrl, `/@fs${marker}`)
  if ("error" in asked) {
    const missing = /ECONNREFUSED|fetch failed|timed out|ENOTFOUND/i.test(asked.error)
    return { state: missing ? "missing" : "unknown", url: baseUrl, marker, detail: asked.error }
  }
  const { response } = asked
  if (response.ok) return { state: "match", url: baseUrl, marker, status: response.status }
  if (response.status === 403) return { state: "foreign", url: baseUrl, marker, status: 403 }
  if (response.status !== 404) {
    return {
      state: "unknown",
      url: baseUrl,
      marker,
      status: response.status,
      detail: `answered ${response.status} for ${marker}`,
    }
  }
  // A 404 on the marker is either a built Storybook, which has no dev server and
  // no tree to confuse, or a dev server that cannot read this path: the Vite
  // client module tells the two apart. A build is accepted, because refusing it
  // would call a legitimate render "another tree".
  const client = await probe(baseUrl, "/@vite/client")
  if ("error" in client) {
    return {
      state: "unknown",
      url: baseUrl,
      marker,
      status: 404,
      detail: `answered 404 for ${marker} and ${client.error} for the Vite client`,
    }
  }
  if (client.response.ok) {
    return {
      state: "unknown",
      url: baseUrl,
      marker,
      status: 404,
      detail: `a dev server answered 404 for ${marker}`,
    }
  }
  return {
    state: "static",
    url: baseUrl,
    marker,
    status: 404,
    detail: `answered 404 for ${marker} and ${client.response.status} for the Vite client`,
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
  if (identity.state === "static") {
    console.error(
      `warning: the Storybook on ${identity.url} is a build, not a dev server (${identity.detail}); ` +
        "its renders cannot prove which tree they came from, and they are accepted as they are",
    )
    return true
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
