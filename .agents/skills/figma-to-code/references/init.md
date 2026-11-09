# Init — config, credentials and the source gate

## Config

Use the config path from `pnpm ui-cli figma status`, or find it with
`git ls-files '*figma-to-code.yaml'`. Read the file; never copy its paths or
defaults into instructions. Paths are relative to its folder, except
`design.requests`, which is workspace-relative. If absent, discover the existing
inventory, registry, case corpus, policies, page surface, rules, artwork and
token manifests, propose a config beside the package it describes, and agree the
paths with the person, then check them with `pnpm nx run pagopa-ui:docs`.

## Credentials and source gate

The CLI resolves `FIGMA_TOKEN` from the process environment, then the macOS
keychain entry `figma-pat`. `pnpm ui-cli figma status --require-token` reports
the source, never the secret, and exits 2 with guidance when none is readable.
No token blocks REST only; never read or source `.env`.

For a node comparison (delta, implementation or review), read the source live
once: `pnpm ui-cli figma status --live` over REST, or one MCP read call on the
file when there is no token. **Done when** it answers. If neither answers, stop
that use case before changing files and report the failed call; a pinned
snapshot does not satisfy this gate. Committed-only coverage and checks run
without it.

A stop for missing source names the prerequisite (`FIGMA_TOKEN` with
`file_content:read` and `library_content:read`, or the MCP connection) and the
command that surfaces it: `figma status --require-token` for the credential,
`figma status --live` for REST, the failing MCP call for the other.

## REST or MCP

The read decides the transport.

| Read | Route |
| --- | --- |
| Page tree, node tree, ids and geometry | CLI over REST |
| Delta, triage, brief, catalogue, parity | CLI over REST |
| Semantic code context | MCP |
| Per-node variable definitions | MCP |
| Remote library discovery | MCP |
| Screenshot | by URL, never base64 |

MCP is the documented fallback for a session with no Figma token, and the gate
above still applies. Read tools only: neither Code Connect publishing nor Figma
comment replies are part of this workflow.
