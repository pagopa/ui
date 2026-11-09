# Init — config, credentials and the source gate

## Config

Use the config path from `pnpm ui-cli figma status`, or locate it with
`git ls-files '*figma-to-code.yaml'`. Read the file rather than copying its
paths or defaults into instructions. Paths are relative to the config's folder,
except `design.requests`, which is workspace-relative.

If absent, discover the existing inventory, registry, case corpus, policies,
page surface, rules, artwork/token manifests and public entry. Propose a config
beside the package it describes. In an interactive session, agree the grouped
paths with the person; otherwise report unresolved paths with the proposal.
There is no config-init command.

**Done when** the config exists and `pnpm ui-cli check docs` accepts every
committed path and command it names.

## Credentials and source gate

The CLI resolves `FIGMA_TOKEN` from the process environment, then the macOS
keychain entry `figma-pat`. `pnpm ui-cli figma status --require-token` reports
the source, never the secret, and exits 2 with guidance when none is readable.
Use that strict preflight only for a route requiring REST; no token blocks
REST, not the MCP source route. Never read, source or load `.env`.

For a node comparison (delta, implementation or review), make one read call
through the session's Figma MCP (`get_metadata` or `get_screenshot` on the
file). **Done when** it answers. If unavailable or refused, stop that use case
before changing files and report the failed call. A pinned snapshot alone does
not satisfy this source gate. Committed-only catalogue coverage and checks can
run without it.

A stop for missing source is a setup answer, not a shrug: name the prerequisite
(`FIGMA_TOKEN` with `file_content:read` and `library_content:read`, or the Figma
MCP connection) and the command that surfaces or fixes it —
`pnpm ui-cli figma status --require-token` for the credential,
`pnpm ui-cli figma status --live` for the REST route, the failing MCP call for
the other — so the person unblocks the session in one step.

Choose the route from status: live REST where credentials are available;
otherwise fresh read-only MCP evidence or an export the person supplies
([delta.md](delta.md)). Missing source evidence remains a blocker. Read tools
only: neither Code Connect publishing nor Figma comment replies/resolution is
part of this workflow.
