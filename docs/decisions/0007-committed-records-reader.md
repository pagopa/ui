# ADR-0007 — The committed records are read through one reader, and it never writes

- **Status:** Accepted — 2026-11-10.
- **Date:** 2026-11-10
- **Context:** the four committed records — `inventory.json`, `registry.json`,
  `device-policy.json` and `parity-cases.json` — were read by five loaders
  (`loadInventory`, `loadInventoryNodes`, `loadRegistry`, `loadCaseFile`,
  `loadDevicePolicy`) plus a dozen bare `readJson` + schema pairs, each module
  carrying its own copy of the default path. The copies had already drifted: two
  same-named inventory loaders with different contracts, one of them a one-line
  alias of the other, and a path literal built from a bare `root` string in
  `rules.ts` while the rest went through `Workspace.path`. The read posture was
  inconsistent too: a missing record raised in one place, returned `[]` in
  another, and `card.ts` mapped "the registry did not load" to "no diagnostics",
  so a corrupt registry read as a clean gate.
- **Related:** [ADR-0006](./0006-parity-coverage-and-bulk-families.md) (the case
  population the corpus counts), [ADR-0004](./0004-device-axis.md) (the device
  vocabulary and its gate), [ADR-0001](./0001-rework.md) (the review model the
  records serve).

## 1. Problem

Every consumer of a committed record re-decided four things: where the file is,
how to parse it, what a missing file means, and what to say when it cannot be
read. The consequences were not stylistic.

- **The paths drifted.** A record's default path existed up to seven times. One
  copy in `figma/catalogue-state.ts`, one in `figma/comments.ts`, two in
  `figma/status.ts`, three in `parity/cases.ts`, plus literals at call sites.
  Moving a record was a search-and-replace with no compiler behind it.
- **The contracts drifted.** `parity/cases.ts` re-exported an inventory loader
  that delegated to `figma/devices.ts`, so the parity side imported a
  higher-level module to reach a lower-level one. Two modules published the same
  name with different shapes.
- **The errors were unreadable.** A corrupt record surfaced as
  `src/catalog/figma/registry.json: Expected string, received undefined` from a
  bare `parseSchema`, with nothing naming the _record_ a command failed to read
  or the file a caller had overridden.
- **The absence was silent.** `loadCaseFile` returns `[]` when the case file is
  absent — correct, the file is legitimately optional — but the same shape was
  copied to records that are not optional, and `card.ts` inherited it:
  `loadCatalogueBase` returning `null` was mapped to "no catalogue diagnostics",
  so the gate that guards the registry reported the opposite of the truth.
- **The reads repeated.** One `parity check` run reads the inventory from five
  modules and the registry from four, each parsing the same bytes.

## 2. Decision space

**A — leave each loader and fix the defects where they are.** Correct the
duplicated paths case by case and make `catalogueGate` report its failure.

- Pros: no new module, no migration.
- Cons: the duplication is the defect. Seven path copies stay seven, the
  inverted dependency stays, and the next record repeats the whole pattern.

**B — one module that reads and writes the records.** Fold the writers in too:
`saveCase`, the registry and inventory writers, the device-vocabulary writer.

- Pros: one owner of the records end to end; invalidation is trivial because the
  writer that invalidates is in the same module.
- Cons: the writers carry domain logic that is not a read — case identity, note
  ratchets, proposal sync, snapshot merging. Moving them is a larger, riskier
  change than the read duplication justifies, and it would put the review logic
  in a module named for file handling.

**C — one read-only reader now, the writers later.** A single module owns the
default paths, the parse posture, the error and a memory keyed by the resolved
file. The writers stay where they are, untouched, and the migration is limited
to readers.

- Pros: the duplication is removed at its root; every reader gains one error and
  one memoized parse; the change is mechanical at every call site.
- Cons: the memory and the writers live in different modules, so invalidation
  becomes a rule rather than a local fact (RD3); a reader that silently caches
  will serve stale data to a writer that forgets it.

## 3. Decision

**C.** One reader module owns the four committed records for reads. It is deep
in one dimension only — paths, parsing, memory and errors — and derives nothing.

### RD1 — one module, four lazy reads, one memory

The reader exports one function per record. Each returns the schema's type and
nothing else: no index, no convenience accessor, no aggregate document object
over the four files. The read is lazy per record, so a command that needs the
registry never parses the inventory, and it accepts a root plus a per-record
path override because the evidence bundle reads the same documents from a
different root (`parity/evidence.ts`, whose `dataRoot` is a genuine second root —
the override is why it exists, not a convenience). The record's name is not an
argument: each read is `readInventory(root, file?)` and its three siblings, so a
caller states a root, never a record. The path form stays exported as
`committedFile(record, root, file?)` for the writers, which need the file rather
than its value, and for the callers that hand a path on.

The memory is keyed by the resolved absolute path and scoped to the process. Two
reads of the same file in one command return the identical value, which is what
makes a run's several thousand record reads one parse. No reset hook: each
command is one process, and each test file is one process with its own fixture
tree.

### RD2 — read-only by decision

The reader never writes. The registry, the inventory and the case file keep
their writers where they are, with their own write posture: those writers hold
domain decisions (which proposal becomes a case, which note is renewed, which
inventory entry is merged) that a reader module must not learn. A module that
read and wrote would need a name for the workflow, not for the records.

The migration is therefore one-directional: every module that used to read a
committed record from disk now reads it through the reader, and no module keeps
a default path for one. With the readers unified, a future writer is a small,
separate change instead of a refactor of both directions at once.

### RD3 — invalidating the memory is the writer's obligation

Because the memory is process-scoped and the writers are elsewhere, a writer
that writes a committed record and then reads it back in the same process must
invalidate that record's entry. Writing the file is not enough: the reader will
return the value it parsed earlier.

The same sharing carries a second obligation: a record the reader hands out is
shared, not a copy. A caller must not mutate it — the value it received is what
the next read returns and what every other caller sees — so a writer that must
change a record clones what it edits before it edits, which is why `saveCase`
spreads the cases document before appending to it.

The rule is not hypothetical: `parity cases` saves one case per proposal in a
single process, and every save reads the corpus, appends and writes it. Without
invalidation the second save would rewrite the corpus it read before the first
one, dropping the first case. So each writer of a committed record forgets that
record after writing it — `saveCase`, `setRegistry`, `design-requests.ts`,
`catalogue/finish.ts` and `catalogue-refresh.ts` — which is the writer paying
RD3's price at the only point it applies today. When the writers move into the
reader, that call stops being a rule the caller must remember and becomes the
writer's own implementation detail, which is the other reason RD2 defers them.

### RD4 — one error, one clause at the CLI boundary

A record that is present but unreadable — unparseable JSON, a schema mismatch, a
permission failure — throws one error type carrying the record, the file and the
reason. A record that may legitimately be absent declares it in its own read and
returns `null`; every caller handles the `null`, and absence never arrives as an
empty collection pretending to be a successful read.

The CLI's error mapping gains one clause for that type: an unreadable committed
record exits as a repository-state failure. It is not a usage mistake — the
command line was right — and it is not a silent success, which is what the node
card used to report.

## 4. Consequences

- A record's default path exists once. Moving one is a single edit that the
  compiler follows through every caller, including the callers that build a path
  from a bare root.
- The dependency direction is restored: low-level readers no longer import
  higher-level modules to reach a record, and the same-named pair of inventory
  loaders is gone rather than reconciled.
- A corrupt record reaches the user as one diagnostic naming the record and the
  file, and reaches the node card as a gate line instead of "no problems".
- A run parses each record once. The `parity check` path that read the inventory
  five times now reads it once.
- The reader cannot serve stale data to a writer by accident only if RD3 is
  honoured: the writers that exist today honour it, and a writer added later that
  forgets it is invisible until a command writes and re-reads in one process.
- The optional record keeps its sharp edge deliberately: `readCases` returns
  `null` for an absent corpus, so a caller that treats it as a list fails to
  compile rather than silently reviewing nothing.

## 5. Deferred decisions with triggers

| Deferred                                                  | Trigger                                                                                                                                           |
| --------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| Writers move into the reader, and invalidation with them  | A second writer must remember `forgetCommitted`, or a writer is added that forgets it; RD3's rule is then paid twice and becomes a defect waiting |
| The workflow that resolves records across commands        | A second command needs a record's value transformed between reads, which is domain work and not a read                                            |
| The case corpus as one judged value                       | The validation that today re-reads cases per rule needs the judgments over the whole corpus, and building them per call starts to cost            |
| Records beyond the four (exceptions, baselines, surfaces) | A fifth document is read by two modules with a copied path constant; it then joins the reader rather than gaining a sixth loader                  |

## 6. Related

- [ADR-0004](./0004-device-axis.md) — the device vocabulary and its delta-scoped
  gate, the first of the four records to be read by two modules.
- [ADR-0006](./0006-parity-coverage-and-bulk-families.md) — the case population
  and the coverage vocabulary the corpus is counted against.
- `packages/ui-cli/src/records/committed.ts` — the reader this ADR decides.
- `packages/ui-cli/src/figma/card.ts` — the gate that reads a `null` base as
  "no diagnostics", the defect RD4 closes.
