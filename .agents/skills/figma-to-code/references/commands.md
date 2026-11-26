# Two commands: `align` and `record`

A node's bookkeeping is two invocations, not a queue of reads. `align` reads and
measures and writes nothing; `record` writes the decision the measurement
justifies. Neither has a step to resume: a run either produced its answer or said
why it could not, and the next run re-reads the tree in front of it.

Signatures come from `pnpm ui-cli align --help` and `pnpm ui-cli record --help`.

## `align <nodeId>` — preflight, capture, diagnose

One run does every read the comparison needs, in the order that fails fastest:

1. The node in the inventory. A node the inventory does not hold has no page, no
   variants and no story, so the run stops and names the refresh
   (`pnpm ui-cli update inventory --triage`).
2. The registry's targets for it — module, export, story — and the story and
   export the case captures.
3. The declared devices, from the inventory's set and the device policy.
4. The Storybook probe, when a URL is given (`STORYBOOK_URL`). A silent storybook
   stops the run before a browser is opened, so a missing story costs a message.
5. The comparison itself (`parity check`), under the case arguments:
   `--state`, `--variant`, `--device`, `--width`, `--strict`, `--residue`,
   `--ignore`, `--screenshot`, `--compare-text`. Signatures and result fields are
   [parity tooling](parity-tooling.md).

It prints the plan — node, page, status, story, export, declared devices, probe —
then the comparison. `--json` prints `{plan, diagnostic}` for a machine read.

Nothing is written: no case, no bundle, no baseline, no file anywhere in the tree.
The verdict belongs to the run that asked for it, so **a second run says the same
thing** and a run you did not make leaves no trace to trust.

Exit codes are the comparison's: `0` pass, `1` violation, `2` cannot run (usage,
missing input, refused capture, silent Storybook), `3` reconciliation required. A
`2` is a fix to the run, not a delta.

Until the set's every declared device has a closing run, the node owes a device
loop; `align --device <name>` per device is that loop
([devices](devices/loop.md)).

## `record <nodeId> --status implemented` — one atomic write

`--status` decides; the target flags (`--module`, `--export`, `--story`,
`--story-exports`, `--note`, `--reason`) travel with it
([statuses](catalogue/statuses.md)). One run writes every document the decision
entails — the registry, the page surface, the note-length baseline, the story
titles and the consumer map — then regenerates the catalogue and reports what the
written documents still say: `warn:` lines for a target that reads oddly,
`stale:` for a residue the write left behind, and the catalogue verdict.

Run precedence:

1. **Preflight.** The registry update is computed first with nothing written, so a
   rejected entry (a status that requires a module, export and story it was not
   given, an unknown status) exits `2` before any document changes.
2. **Dry run.** `--dry-run` stops after the preflight and prints
   `dry run: <node> <before> → <after>`: the decision is reviewable without a
   write.
3. **Write.** The five documents are snapshotted byte for byte, then the registry,
   the page surface, the stories and the map are written in order. A step that
   throws puts every snapshotted byte back, so a failed `record` leaves the tree
   exactly as it found it — nothing half-written to clean up and nothing to
   resume. Fix the cause it named and run it again.
4. **Report.** The catalogue sync and the residual checks run against what was
   written; the exit code is the catalogue's verdict, `1` when it or a residue
   failed, else `0`.

Two runs are idempotent: the generators are deterministic, so a second run on an
unchanged tree prints `unchanged:` and writes the same bytes. Repeating a `record`
is the safe way to confirm the tree already says what you meant.

**What "resumable" means here.** `align` writes nothing, so there is nothing to
resume — a re-run is a fresh read. `record` is all-or-nothing, so there is no
partial state to resume either: after a failure the tree is the pre-run tree, and
the re-run starts from it. What a session must carry between the two commands is
the *decision* — which stories, which devices, which residues and their reasons —
because that is what the documents store and the commands cannot infer it.
