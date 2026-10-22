---
name: figma-to-code
description: Figma → React process for this design system. Use when Figma gained or changed components, icons, pictograms or variables; when a drift pull request needs its alignment; when a component is created from a Figma node, aligned, verified against its source frame or re-reviewed; when a component with no node joins the public API; when a set declares a Device/Breakpoint axis; or when `figma:check` reports stale or missing evidence.
---

# Figma to code

Keeps the components of this repository aligned with their Figma source. Project
data — paths, the device vocabulary, per-node decisions, tokens — lives in the
files the config names: read them, never copy them into this skill.

## Config first

Read `figma-to-code.yaml` at the repository root; when it is missing, run
[init](references/init.md). Paths below are its keys, written as
`catalog.registry`. Every command runs from the repository root.

## Rules for every use case

- **Figma is read-only.** Read through the REST export or the Figma MCP read
  tools (`get_design_context`, `get_screenshot`, `get_metadata`,
  `get_variable_defs`, `list_file_components_for_code_connect`). Never rename,
  move or edit a node, never call a tool that writes (`use_figma`, Code Connect
  publishing). Drift is reconciled in the repository.
- **Credentials.** The person exports `FIGMA_TOKEN` (scopes
  `file_content:read`, `library_content:read`) in the process environment.
  Never read, source or load `.env`, never print the token. The preflight is in
  [init](references/init.md); when it fails, stop the live steps, relay its
  guidance and keep working from the pinned snapshot.
- **`nodeId` is identity.** Names and pages change; the registry is keyed by
  `nodeId`, bulk rules by `pageId`.
- **Figma URLs come from `figma.fileModule`** (`FIGMA_FILE_KEY`,
  `figmaNodeUrl`, `figmaEmbedUrl`); never hardcode the file URL. A story's
  `design` parameter uses `figmaEmbedUrl`: the addon only rewrites a URL with a
  path segment after the file key into its embeddable form.
- **Parity is the render.** The story, captured at the source width and state,
  matches the source variant in numbers and images. A code read, a green suite or
  a set thumbnail is not evidence.
- **Devices are part of the contract.** A set with a `Device`/`Breakpoint` axis
  is aligned for every declared device, each from its own variant.
- **Token ladder.** The existing token, else the compatible one within 2px with
  the residue recorded, else a new token through `tokens.manifest`. Never an
  inline pixel value.
- **Review is a decision, not a refresh.** `implemented` follows an inspection
  of the source and the render; the record is the drift pull request merge or the
  decision written in the session. Historical nodes are reviewed one at a time on
  request, never in bulk; `mocked` demos are never queued or renewed.
- **An open point goes to the design owner.** A question the source cannot answer
  becomes a design request at `design.requests`; the node stays `pending` until
  the answer is recorded ([design-request.md](references/design-request.md)).
- **A drift branch is the handoff.** Commit the alignment on the drift branch;
  the person pushes and merges ([handoff.md](references/handoff.md)).
- **The registry is the only status source.** Per-node constraints live in the
  node's registry `note`, component behaviour in its guide under `code.guides`.
  Read both before touching a component.

## Use cases

| Use case                                     | Reference                                             |
| -------------------------------------------- | ----------------------------------------------------- |
| Figma delta: snapshot, triage, pending queue | [delta.md](references/delta.md)                       |
| Drift handoff: branch, artifacts, local alignment | [handoff.md](references/handoff.md)               |
| New component from a Figma node              | [new-from-figma.md](references/new-from-figma.md)     |
| Component without a Figma node: coverage     | [new-without-node.md](references/new-without-node.md) |
| Name and props of a new or revised node      | [prop-conventions.md](references/prop-conventions.md) |
| Visual comparison and fix, a parity wave     | [visual-parity.md](references/visual-parity.md)       |
| Device and breakpoint variants               | [devices.md](references/devices.md)                   |
| Foundation tokens: refresh, extensions        | [tokens.md](references/tokens.md)                     |
| Icons and pictograms                         | [artwork.md](references/artwork.md)                   |
| Review of an existing node                   | [node-review.md](references/node-review.md)           |
| An open question for the design owner        | [design-request.md](references/design-request.md)     |

Shared references, loaded when a use case points at them:
[definition-of-done.md](references/definition-of-done.md) (source alignment:
what a node-backed component proves), [catalogue.md](references/catalogue.md)
(alignment files, statuses, the `figma:check` contract),
[parity-tooling.md](references/parity-tooling.md) (the parity commands),
[init.md](references/init.md) (config and token preflight).

## Closing every use case

1. **Source alignment** satisfied for each touched node
   ([definition-of-done.md](references/definition-of-done.md)).
2. **Green chain**: the repository's full pre-commit chain. Stories run in a
   browser: when they cannot start, say so and never count them as passed.
3. **Delivery stop**: report and ask before commit, push or pull request.
   Stories, registry, inventory and exception changes travel with the
   implementation. On a drift branch, commit the alignment there and leave the
   push and merge to the person ([handoff.md](references/handoff.md)).
4. **Report**: what changed; per node the decision and its reason; per device
   the verdict; the residues with their reasons; what stays open and why; files
   touched; each command with its result.
