# ADR-0008 — The case corpus is one value: documents are properties, judgments are methods

- **Status:** Accepted — 2026-11-11.
- **Date:** 2026-11-11
- **Context:** `parity/cases.ts` had become the package's largest module — around
  a thousand lines, thirty-three exports — because it was three modules wearing
  one name. ADR-0007 had already taken the reads out of it, leaving the file to
  hold the domain judgments over the case population (`coverage`, `proposals`,
  `validate`, the id and node lookups) beside the writes that store a reviewed
  decision (`saveCase`, `syncProposals`). Its validation carried the symptom of
  the conflation in its signature:
  `validateCaseFile(workspace, cases, { registry = readRegistry(root), nodes = readInventory(root).components, policy = readDevicePolicy(root) } = {})`.
  Three committed records were read inside default parameter values, so a
  function that judged the cases also performed I/O the caller could neither see
  nor supply, and every call site that already held those documents re-read
  them.
- **Related:** [ADR-0007](./0007-committed-records-reader.md) (the reader that
  took the reads, and the deferred decision this one closes),
  [ADR-0006](./0006-parity-coverage-and-bulk-families.md) (the case population
  and the coverage vocabulary the corpus judges), [ADR-0004](./0004-device-axis.md)
  (the device vocabulary a judgment consults).

## 1. Problem

The judgments were correct and each was reachable, but nothing said what a case
population _is_, so every consumer re-derived the same three structures from the
raw array.

- **The id index was rebuilt per call.** `findCase` scanned the array
  (`cases.find((item) => item.id === id)`), `syncProposals` built
  `new Map(currentCases.map((entry) => [entry.id, entry]))` for the same
  question, and `canonicalCase` a third time with `findIndex`. Three scans, one
  index, and the absent-id error existed only in the first.
- **The node grouping was rebuilt per call.** `cases.filter((entry) => entry.nodeId === nodeId)`
  was written out at the node card, the catalogue render, the handoff media plan
  and the catalogue validation, in three spellings: one kept the drafts to label
  them, one kept only the entries with a story, one filtered drafts out again to
  compute coverage. "Which entries belong to this node" and "which of them count
  as coverage" were answered by whoever wrote the filter.
- **The inventory index was rebuilt per call.** `new Map(nodes.map((node) => [node.nodeId, node]))`
  and `inventory.components.some(...)` were written out at every caller that
  needed to ask "does the inventory know this node".
- **Fan-in was recomputed locally.** `fanInCounts` was a public function, so the
  queue counted dependencies per invocation even though nothing about the count
  changes within a run.
- **Validation's documents were hidden in its defaults.** A caller could not
  hand `validateCaseFile` the registry it had already read, and could not stop
  it reading one it did not need. The defaults made every validation a three-record
  read that no signature declared.

## 2. Decision space

**A — split `cases.ts` into one module per judgment.** A `coverage.ts`, a
`proposals.ts`, a `validation.ts`, and a `lookup.ts` beside them.

- Pros: each module is small and independently importable; the file dissolves.
- Cons: the documents are arguments again at every seam, so each module either
  re-reads them or receives five parameters; nothing owns the indexes, so the
  "rebuild it at the call site" defect survives the split. The problem was never
  the file's length — it was that the shared subject had no name.

**B — keep `cases.ts` and fix the call sites.** Export an index and pass it
around; leave the module as it is.

- Pros: the smallest diff.
- Cons: the hidden reads stay, so validation keeps performing I/O in a default
  argument, and the importer list keeps a module named for a file.

**C — one value named for its subject.** A module whose export is a _case
corpus_: the documents it judges are readonly properties, the judgments are
methods, and construction is the only place a document is obtained.

- Pros: one home for the judgments and their indexes; validation takes no
  arguments because its inputs are already inside; the call sites shrink to the
  question they ask instead of the structure they build.
- Cons: a value with methods is a new shape to learn, and the documents must be
  obtained lazily or construction would read four records to answer a question
  about one.

## 3. Decision

**C.** `parity/corpus.ts` publishes the case corpus. The three-way dissolution
of the old module is complete: the reads went to the reader (ADR-0007), the
judgments went to the corpus (this ADR), and the writes stayed writes.

### CC1 — one value, documents as properties, judgments as methods

```ts
export type CaseCorpus = CorpusDocuments & {
  readonly byId: ReadonlyMap<string, ParityCase>
  readonly nodeIds: ReadonlySet<string>
  readonly drafts: readonly ParityCase[]
  readonly fanIn: ReadonlyMap<string, number>
  of(nodeId: string): readonly ParityCase[]
  reviewed(nodeId: string): readonly ParityCase[]
  node(nodeId: string): InventoryNode | undefined
  find(id: string): ParityCase
  pointed(nodeId: string): ReadonlySet<string>
  coverage(options?: CoverageOptions): DeviceCoverage
  proposals(options?: ProposalOptions): CaseProposals
  stateProposals(options?: StateProposalOptions): CaseStateProposals
  validate(): CaseValidation
}
```

`CorpusDocuments` is the other half: the workspace, the cases, the inventory,
the registry and the device vocabulary. The value is frozen. Its indexes —
`byId`, the two node groupings, the inventory index, fan-in — are built once, in
the constructor, and the methods close over them rather than reaching through
`this`, so a method handed to a callback still works.

A caller states its documents once: `caseCorpus(documents)` when it has the
values, `readCorpus(workspace)` when it has a workspace.

### CC2 — the documents are read when a judgment asks for them

`readCorpus` returns a corpus whose five documents are getters over memoised
reads, and `byId`, `nodeIds` and the node groupings are built from the cases
alone. So `readCorpus(workspace).find(id)` parses `parity-cases.json` and
nothing else, and `readCorpus(workspace).validate()` parses all four records
because validation genuinely consults all four.

The laziness is not an optimisation. It is what makes the value safe to
construct: a command that resolves one case id, or renders one node card, must
not start reading the registry because a type happened to hold it. The eager
version of this value was tried and broke `parity check --case`, which is
expected to work in a fixture tree that carries no `registry.json`.

### CC3 — `validate()` takes no arguments

The judgment's inputs are the corpus. `validateCaseFile` needed three committed
records and took them as defaulted parameters that read from disk; the corpus
already holds them, so the parameters have nowhere left to be. Deleting them is
the point, not a side effect:

- a signature that reads files cannot be tested without a file system, and the
  tests that did so described the defaults rather than the rules;
- a caller that held a registry could not give it to the validation, so the same
  bytes were parsed twice in one run;
- a default argument performing I/O is invisible at the call site — the one
  place a reader looks for what a function touches.

Validation stays hermetic: no snapshot, no browser, no network. What it drops is
the file read it never should have owned.

### CC4 — no importer rebuilds an index over the cases

`of`, `reviewed`, `node`, `find`, `pointed`, `nodeIds`, `fanIn` and `drafts`
exist so that no caller writes `new Map(cases.map(...))`, `cases.filter(...)`
or `inventory.components.some(...)` over the corpus again. Twelve modules import
the corpus; the ones that previously built their own index — the node card, the
catalogue render, the handoff media plan, the parity check, align, the queue and
the catalogue validation — now ask the value. `byId` stays exposed for the one
caller that iterates the whole index rather than probing it.

One local index survives on purpose: `figma/surface.ts` builds a case index from
a `ParityCase[]` it receives as part of `SurfaceCheckInput`, a public input type
exercised with plain arrays by its tests. That boundary is not the corpus, and
changing it would change a public shape to satisfy an internal rule.

### CC5 — what stayed free, and what stayed put

Ten exports remain free functions because they take one value and need no
document: `slug`, `exportSlug`, `storyId`, `isDraftCase`, `caseIdFor`,
`caseKey`, `variantOfCase`, `caseVariant`, `CASE_FIELDS` and `DRAFT_NOTE`.
Putting them behind `this` would make the corpus's interface claim a dependency
it does not have, and they are the vocabulary the writers and the rows share.

`buildCases`, `CaseRow` and `CaseList` moved to `parity/case-rows.ts`: they walk
the registry and emit one row per registry target, including the nodes that carry
no case at all. That is a join over the registry, not a judgment over the corpus,
and folding it in would have made the corpus depend on the status vocabulary.

`loadDeviceExceptions` and `DEVICE_EXCEPTIONS_PATH` moved to
`parity/device-exceptions.ts`. `device-exceptions.json` is not one of the four
committed records — it is a burn-down list beside them — so it is not a corpus
document and did not join the reader.

### CC6 — the writes did not move into the corpus

`saveCase` and `canonicalCase` went to `parity/case-writer.ts`, and
`syncProposals` stayed in `parity/proposals.ts` beside the proposals it writes.
Their bodies are unchanged, including the `forgetCommitted(file)` call that
ADR-0007's RD3 requires after each write. A writer holds domain decisions — which
proposal becomes a case, which note is renewed — and the corpus is a reader's
value: it is built from documents and derives from them. Folding the writers in
would make every construction able to write, and would put the invalidation rule
inside the thing being invalidated.

## 4. Consequences

- `parity/cases.ts` is gone. No module is named for a file; the corpus is named
  for its subject and the writer for what it does.
- Validation is a pure function of a value: the same corpus gives the same
  verdict, and a test can state the documents a rule needs and nothing else.
- A judgment that needs a document reads it once per corpus, and a judgment that
  does not need one reads nothing. The memoised reader underneath still makes a
  run's several thousand record reads one parse.
- The draft rule is decided in one place. Three filters that disagreed about
  whether a draft counts as coverage are now `reviewed`, and the disagreement is
  not expressible.
- The corpus is frozen and its indexes are built eagerly from the cases; a caller
  may not mutate a corpus, and adding a case means building a new one. The
  writers already work that way — read, change, write.
- Importers lost their parameters: `coverage`, `proposals` and `validate` take
  options, not documents, so an importer that used to thread a registry through
  three layers now threads nothing.

## 5. Deferred decisions with triggers

| Deferred                                                    | Trigger                                                                                                                                  |
| ----------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| `syncProposals` folds into the case writer                  | A third writer of the case file appears, or the proposal sync needs the case writer's identity rules; the two are then one write module  |
| `buildCases` joins the corpus                               | A corpus judgment needs the registry's case-less targets — coverage over targets rather than over cases — which is a judgment, not a row |
| Device exceptions join the reader                           | A second module reads `device-exceptions.json`, or the list gains a schema the reader should own; today one gate reads it                |
| `figma/surface.ts` takes the corpus instead of a case array | The surface check stops being called with plain arrays, or a second public input needs the corpus's indexes                              |

## 6. Related

- [ADR-0007](./0007-committed-records-reader.md) — the reader that owns the four
  records, and the deferral this ADR answers.
- [ADR-0006](./0006-parity-coverage-and-bulk-families.md) — the case population
  and the draft rule the corpus now decides once.
- `packages/ui-cli/src/parity/corpus.ts` — the value this ADR decides.
- `packages/ui-cli/src/parity/case-writer.ts`,
  `packages/ui-cli/src/parity/case-rows.ts`,
  `packages/ui-cli/src/parity/device-exceptions.ts` — the modules `cases.ts`
  dissolved into, beside the corpus.
