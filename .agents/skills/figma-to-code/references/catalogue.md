# Catalogue — the alignment files, the statuses and `figma:check`

Consulted by every use case that reads or writes the catalogue.

## Files and who edits them

| Config key                       | Role                                                                                         | Edited by                                       |
| -------------------------------- | -------------------------------------------------------------------------------------------- | ----------------------------------------------- |
| `catalog.inventory`              | identities, canonical contracts, design fingerprints, dependency edges                       | `pnpm nx run pagopa-ui-cli:figma:triage` / `pnpm nx run pagopa-ui-cli:figma:update` only  |
| `catalog.registry`               | decision per `nodeId`, `pageId` bulk rules, targets, rendered stories, per-node `note`       | agents and people, reviewed in pull requests    |
| `catalog.parityCases`            | the reviewed case per compared variant and device                                            | `figma:parity:check --save-case` only           |
| `catalog.devicePolicy`           | the device vocabulary: axes, canonical devices, aliases, widths, default scopes              | reviewed by hand; never a component name or path |
| `catalog.deviceExceptions`       | `<nodeId>: <reason>` for a node whose declared devices have no case yet                      | by hand, must shrink                            |
| `catalog.pageSurface`            | what a page draws: every identity with its decision, every composition with its cases         | by hand, after reading the page tree            |
| `catalog.apiExceptions`          | public exports with no source mapping: "deliberate extension, not a source-alignment claim"  | by hand, each with a reason, must shrink        |
| `catalog.evidenceExceptions`     | story-evidence exceptions                                                                    | by hand, each with a reason, must shrink        |
| `figma.fileModule`               | the file key and the URL builders                                                            | rarely                                          |
| `catalog.inventoryStory`         | the rendered join of inventory and registry, the map of every node's status                 | —                                               |
| `artwork.*`, `tokens.manifest`, `tokens.generatedCss` | generated artwork, runtime maps, tokens                                 | their generator only (`artwork.md`, `delta.md`) |

Generated files are never edited by hand. The refresh writes unformatted JSON:
run `pnpm nx run-many -t fmt` before the green chain.

`catalog.registry` and `catalog.parityCases` are reviewed by hand, in place: a
parse-and-write round-trip reformats the whole file (the formatter keeps short
arrays on one line), so a one-entry decision lands as a whole-file diff and
hides the review. Change the entry's own lines and leave the rest byte for byte.

`.figma/` is gitignored and can exceed 100 MB: never commit the snapshot, the
renders or the probes. The parity tools never write under `src/` except the case
corpus through `--save-case`.

## Statuses

- `implemented` — a real component is mapped and a story renders it. It is not
  proof of visual parity, complete accessibility or, for a set with a device
  axis, of every device: the device cases in `catalog.parityCases` are.
- `pending` — a known delta, not implemented or not reviewed. The queue is the
  visible signal after every refresh.
- `mocked` — a demo shell outside the public API and the coverage denominator.
  Triage keeps its status, target and note and never queues it: a demo is not an
  approval to renew.
- `excluded` — intentionally not shipped; a reason is required. Excluded
  internal subnodes still contribute to their parents' fingerprints.

An `implemented` entry has `target.module`, `target.export`, `target.story` and
explicit `target.storyExports`. `additionalExports` covers several real
implementations of one set, and the declared stories render all of them. A node
linked to exactly one story export shows that node in the export's
`parameters.design` (`figmaEmbedUrl("<nodeId>")`); multi-node exports keep the
curated choice. A `modulePatterns` rule maps a whole subtree.

Write a per-node constraint, an open decision or an unblock condition in the
node's `note`, self-contained: state the rule and the measurement, never point to
a document. A note stays under 600 characters: it states the current residues
and their reasons, not the history.

## The page surface

The inventory is built from the published library export, and the export lists
only what the file owner published. A page draws more than that: helper
components, variant sets that were never published, and the compositions
themselves — the frame that stacks four rows at 852, the mobile page that draws
them at 304, the drawer panel at 320 or 417. None of them appears in the
inventory, so none of them can drift, be queued or be missed. The page surface is
the committed census that names them.

One record per page read from the page tree — `get_metadata` on the page node, or
the page's frame list — with:

- **identities**, one row per component and component set drawn on the page, each
  with `inLibrary` and the decision the library gives it:

  | Decision      | Meaning                                                                   |
  | ------------- | ------------------------------------------------------------------------- |
  | `shipped`     | published and `implemented` in the registry                               |
  | `excluded`    | published, deliberately not shipped; a reason is required                 |
  | `pending`     | published and mapped, still waiting; a reason is required                 |
  | `unpublished` | not in the export, so not implemented, by rule — no work follows          |

  A drawing that was never published is out of the implementation scope: it is
  recorded so that its absence from the registry is a fact rather than an
  oversight, not so that it gets built. The day it is published the export
  grows, the mirror below fails, and the decision becomes due.

- **compositions**, one row per frame the page draws with the implementation
  inside it: the `device` it is drawn at, how many times the implementation is
  `drawn`, and the parity cases that `mirror` it. A case mirrors a composition
  only if it measures that frame at that device; a composition with no case
  carries a `reason` saying what stays unmeasured and why.

`figma:check` enforces, so the census cannot go stale or polite:

- `inLibrary` works both ways. Marked in the library, the identity must be an
  inventory node with the same name, kind and page; marked outside it, it must
  not be in the inventory. Every inventory node on a censused page must appear in
  the census.
- The decision agrees with the registry: `shipped` is `implemented`, `excluded`
  is `excluded`, `pending` is `pending`; `excluded` and `pending` carry a reason.
- A composition's cases exist in the case corpus, measure an identity on that
  page, and are measured on the device the composition declares; the device is
  one the device policy declares.
- A page is listed once, and identities and compositions once each; the recorded
  `fileKey` is the inventory's.

It cannot see Figma: a component added to a page without re-reading the page tree
leaves the census short. Re-reading the tree is what closes a Figma session on a
page, and the census line in `figma:check` and `figma:status` is what says whether
the page still reads as it did:

```text
surface: <n> page(s) · <n> identities (<n> in the library, <n> not) · <n> pending · <n> composition(s) · <n> case mirror(s)
```

`figma:plan` adds `surfaceWaiting` (published identities still owed an
implementation) and `surfaceUnmirrored` (compositions the source draws that no
case measures) instead of hiding them behind the delta.

## Review semantics

- The review record is the drift pull request merge (the audit trail is the
  history of `catalog.registry`) or the decision recorded in the session. There
  is no fingerprint attestation: never add `reviewedFingerprint` or
  `reviewRequired`. The contract and design fingerprints stay as the drift
  detector.
- Per node of a drift pull request, one decision: still matches → `implemented`;
  must change → fix the component and its story in the same pull request, then
  `implemented`; out of scope → `excluded` with a reason.
- Never mark a node `implemented` without inspecting the source and the render.
  Historical `pending` and `implemented` entries are reviewed per node on
  request, never in bulk.
- Rendered instance-swap defaults are real dependencies: a swappable slot still
  carries its master's identity, so a change to it reaches every parent.
- Exception lists shrink. A new entry needs a reason; `figma:check` fails a stale
  one. The public export surface stays frozen until the first publication: a new
  public export needs a source mapping or a reasoned `catalog.apiExceptions`
  entry.
- `catalog.registry` is the only status source: no workbench, packet, ledger or
  approval file beside it, and no hand-written component list anywhere else.

## What `pnpm nx run pagopa-ui:figma:check` enforces

Hermetic, no network:

- the inventory and `figma.fileModule` agree on the file key;
- every published node is accounted for by a registry entry or a bulk rule;
- every identity a censused page draws is accounted for ([the page
  surface](#the-page-surface)): the census mirrors the inventory both ways, each
  decision agrees with the registry, and every composition the page draws is
  mirrored by a case at its own device or excused in writing;
- every `implemented`/`mocked` target module and export exists; `implemented`
  also needs a story file that renders the export through its actual declaring
  identity (nested stories count; an unused or type-only import never does);
- canonical contracts, property defaults and dependency identities are valid;
- declared story exports exist and together render the mapped implementations;
- the single-export `parameters.design` rule above;
- every public export maps to a registry target, a `modulePatterns` rule or
  `catalog.apiExceptions`;
- `excluded` entries and bulk rules carry a reason, `mocked` entries a note;
- changed or affected `mocked` demos keep their status and note and never enter
  `implementationOrder`;
- icon and pictogram public names cover the node-keyed asset manifests,
  independently of source renames;
- the device vocabulary resolves every declared axis value, and two lines report
  it:

  ```text
  devices: <n> sets with an axis · declared <n> · aliases resolved <n>/<n> · unmapped 0
  devices: <n> implemented sets · covered <n> · missing <n> · exceptions <n>
  ```

  A node that enters the live delta, or is newly closed `implemented`, fails
  while a declared device has neither a reviewed case nor a
  `catalog.deviceExceptions` entry. The historical burn-down is one warning
  whose work list is `pnpm nx run pagopa-ui-cli:figma:parity:queue --uncovered`;
- it warns when the inventory is older than 30 days: run the delta use case.

With `--input <snapshot>` or `--rest` it also fails on live contract, design and
identity drift; missing credentials or missing pinned nodes fail explicitly,
never as a partial synchronization.

## Limits

- Zero drift against the pinned export is not a fresh live certification. The
  REST drift check keeps the known MCP-only roots but discovers new ones only
  from a fresh MCP component list.
- Static story analysis does not replace browser tests, the visual review or
  assistive-technology testing.

## The scheduled drift job

`.github/workflows/figma-drift.yml` runs every Monday at 04:00 UTC
`node packages/ui-cli/src/cli.ts figma sync --rest --pr-body .figma/pr-body.md`. It needs the
read-only `FIGMA_TOKEN` secret and fails when it is missing: a skipped check
cannot certify alignment. With drift it refreshes the inventory, queues the
production delta as `pending`, lowers the note-length ratchet when the queued
stubs shorten its notes, formats the payload and opens one review pull
request with the job's `GITHUB_TOKEN`; the runs on that pull request wait for
the reviewer's approval. Its body is the handoff: per node the name, `nodeId`,
link, change class, current status and target, the per-device variants and the
three decisions.
