# Catalogue files and who edits them

| Config key | Role | Edited by |
| --- | --- | --- |
| `catalog.inventory` | identities, canonical contracts, design fingerprints, dependency edges | `pnpm ui-cli update inventory --triage` |
| `catalog.registry` | decision per `nodeId`, `pageId` bulk rules, targets, rendered stories, per-node `note` | `figma registry set`; unsupported fields reviewed in place |
| `catalog.parityCases` | the reviewed case per compared variant and device | `parity check --save-case` |
| `catalog.devicePolicy` | the device vocabulary: axes, canonical devices, aliases, widths, default scopes | by hand; never a component name or path |
| `catalog.deviceExceptions` | `<nodeId>: <reason>` for a node whose declared devices have no case yet | by hand, must shrink |
| `catalog.pageSurface` | page identities and decisions, compositions and their cases | `figma surface sync` for identities; compositions by hand |
| `catalog.apiExceptions` | public exports with no source mapping: a deliberate extension, not a source-alignment claim | by hand, each with a reason, must shrink |
| `catalog.evidenceExceptions` | story-evidence exceptions | by hand, each with a reason, must shrink |
| `figma.fileModule` | the file key and the URL builders | rarely |
| `catalog.inventoryStory` | the rendered join of inventory and registry | its generator |
| `artwork.*`, `tokens.manifest`, `tokens.generatedCss` | generated artwork, runtime maps, tokens | their generator only |

Generated files are owned by their writers. Use `figma registry set` and
`parity check --save-case` for decisions and cases, then review the diff;
unsupported registry fields (bulk rules, artwork metadata, `additionalExports`)
still need a surgical in-place edit. `.figma/` is gitignored and can exceed
100 MB: never commit the snapshot, the renders or the probes. The parity tools
never write under `src/` except the case corpus through `--save-case`.

`catalog.registry` is the only status source: no workbench, packet, ledger or
approval file beside it, and no hand-written component list anywhere else.

## What the check owns

`pnpm nx run pagopa-ui:check:catalogue` is hermetic and decides the predicates
this file only names: the file key agreement, an accounting for every published
node and every identity a censused page draws, target module/export/story
existence, canonical contracts and property defaults, declared story exports,
the single-export `parameters.design` rule, the public-export mapping, reasons on
`excluded` entries and bulk rules, notes on `mocked` entries, the icon and
pictogram manifests, and the device vocabulary. Each error names the fix and the
command; read it instead of remembering the rule.

With `--input <snapshot>` or `--rest` it also fails on live contract, design and
identity drift; missing credentials or missing pinned nodes fail explicitly,
never as a partial synchronization. It warns when the inventory is older than 30
days.

## Limits

- Zero drift against the pinned export is not a fresh live certification. The
  REST drift check keeps the known MCP-only roots but discovers new ones only
  from a fresh MCP component list.
- Static story analysis does not replace browser tests, the visual review or
  assistive-technology testing.

## The scheduled drift handoff

The drift workflow and its schedule are defined in the repository, not this
skill. Its body and artifacts carry the delta classes, targets, device variants
and work order; a skipped export is not alignment evidence.

The run writes the census side of what it queued: each queued identity becomes
`pending` with the delta's reason, and an identity the file published after its
page was read joins as `pending`. The observations are the job's and the
judgements the reviewer's, so a decision the run did not queue stays as reviewed.
An identity whose node moved onto a page the census never read leaves the
census: it is the next page read, not a row to invent.
