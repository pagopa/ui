# ADR-0011 — Numerical parity is an ephemeral diagnostic, not a committed corpus

- **Status:** Accepted — 2026-11-26.
- **Date:** 2026-11-26
- **Context:** numerical parity grew from a check an agent ran while drawing a
  component into a reviewed corpus of 302 cases under an 8.41 MB evidence bundle
  with a 10 MB cap ([ADR-0004](./0004-device-axis.md),
  [ADR-0006](./0006-parity-coverage-and-bulk-families.md),
  [ADR-0008](./0008-case-corpus-value.md)). The corpus then needed a queue, a
  proposal flow, a device-coverage ration, an exceptions file, a pinned PNG per
  case, a manifest, a reference-fidelity fixture and a delta gate — machinery
  that existed to keep the corpus correct rather than to compare a node with its
  render, and a per-case cost (~29 KB of evidence, one review per case) that made
  the honest answer to "cover the icon family" a refusal. The comparison itself
  was never the expensive part: the fixture that ships it reads the pinned export
  and the rendered DOM in one process and answers in seconds.
- **Related:** [ADR-0006](./0006-parity-coverage-and-bulk-families.md) (the case
  population and the bundle cap this ADR retires),
  [ADR-0007](./0007-committed-records-reader.md) (the reader boundary the
  diagnostic stays outside of), [ADR-0008](./0008-case-corpus-value.md)
  (superseded), [ADR-0004](./0004-device-axis.md) (the device axis, which
  survives as policy rather than as a coverage count).

## 1. Problem

The corpus answered a question nobody could keep answering. A committed case is
a claim about a node at one source pin and one render; the drawing, the code and
the pin all move, so every claim expires. Keeping 302 of them true cost a review
cycle per case and a gate that failed a delta whenever a case was missing, stale
or over the evidence cap.

Three defects followed from that shape, and none of them was about drawing:

- **The artifact outranked the answer.** A node was "verified" because a case
  existed, not because anyone had compared source and render in this session. A
  stale case read as proof; a node with no case read as debt even when its
  render had just been checked.
- **The gate measured the repository, not the component.** `check:catalogue`
  failed a delta when an `implemented` node lacked a case per declared device, so
  the cheapest way to a green chain was to write a case — and a case could be
  written from a render nobody had looked at.
- **The cap decided the roadmap.** The icon and pictogram families stayed
  uncased because 156 cases would not fit under 10 MB, and ADR-0006 had to
  govern them with a bulk rule. A proof whose shape is set by a byte budget is
  not a proof of the design.

Meanwhile the rendered regression the project actually needs — "this component
still paints what it painted" — belongs to visual regression, which compares a
render with a render and does not expire with a Figma pin.

## 2. Decision space

**A — keep the corpus, fix the review cost.** Automate the review, raise the
cap, keep the gate.

- Pros: the chain keeps a numeric gate on the delta.
- Cons: automation cannot decide whether a 2 px residue is a defect or the
  source being wrong; that is the review. The cap becomes a larger cap, and the
  gate keeps rewarding a written case over a checked render.

**B — keep the corpus as a cache, gate nothing.** Retire the gate, keep the
cases for whoever wants them.

- Pros: no gate pressure, no cap pressure.
- Cons: a cache nothing verifies decays silently, and the tree keeps carrying
  the browser, PNG and manifest machinery that only the corpus reads.

**C — make parity a stateless diagnostic and let visual regression own the
regression.** Delete the corpus, the bundle and the gate; keep the comparison as
one command an agent runs while creating or aligning a node.

- Pros: the proof is always this session's render against this session's pin,
  so it cannot go stale; no artifact to maintain, no cap to fit, no gate that a
  written file can satisfy; the numeric answer stays available where it is
  useful.
- Cons: nothing accumulates, so a regression between two sessions is caught by
  visual regression only, and a reader can no longer ask "what was verified
  when" from the repository.

## 3. Decision

**C.** `ui-cli parity` is a read-only diagnostic over one node: `source` prints
the pinned spec, `render` probes the story, `check` compares the two and prints
the residues. It writes no case, refreshes no bundle and leaves the tree as it
found it.

### RD1 — the diagnostic takes a node, not a case id

A run names a registry target (or a node id and a story root) and derives the
case from the registry, the story and the options
(`specFromOptions(registryCase(nodeId), options)`). Nothing is looked up in a
committed list, so there is no id to keep stable, no proposal to sync and no
draft to promote.

### RD2 — nothing about a run is committed

The command writes no file. There is no `parity-cases.json`, no
`docs/figma-parity/` bundle, no manifest, no pinned PNG per case, no
`device-exceptions.json` and no cap constant, because there is no artifact to
carry them. The `registry.json` note that records what a review found stays —
that is the provenance the record reader owns ([ADR-0007](./0007-committed-records-reader.md)),
not parity state.

### RD3 — the verification chain runs no parity gate

`check:catalogue` validates the catalogue — provenance, exports, ids, schema —
and no longer counts devices against cases; `workspace:verify` runs no parity
target. A merged gate needs an artifact to gate, and the artifact is gone. What
replaces it is the instruction and the diagnostic: the skill tells the agent to
run `parity check` while drawing a node, and the delta it reports is the
review's evidence for that session.

### RD4 — rendered regression is visual regression's

A question that asks "did this change what the component paints" is answered by
comparing renders, not by comparing a render with a pin. Parity stays the
source-vs-render question, run on demand, and does not accumulate state that a
later session could mistake for regression coverage.

### RD5 — the bulk families keep their proof

The retirement removes the case denominator, not the proof a family carries: an
icon family is still admitted by its bulk rule, and `check:artwork` and
`check:catalogue` still verify its generated assets against the pinned geometry.
ADR-0006's RD2 stands; its RD1 metric, its bundle cap and its 12-glyph sample do
not, since a sample existed to spend headroom a corpus no longer needs.

## 4. Consequences

- A node is "verified" only for the session that compared it, and every session
  pays for its own comparison. That is the trade: the claim is always current
  and never free.
- The tree loses the corpus, the bundle, the queue, capture, evidence, mapping,
  proposals and the device-coverage code — roughly a quarter of `ui-cli`'s
  parity surface — and the repository loses a 10 MB artifact from its history
  going forward.
- The device axis survives as policy: widths, breakpoints and the inventory's
  frames still drive stories and the diagnostic, and ADR-0004's vocabulary
  survives everywhere except as a coverage denominator.
- `check:catalogue` can no longer fail a local delta for a missing case, so a
  component can be merged with no numeric comparison on record. The review
  instruction carries that duty, and a person reading a delta asks for the
  residues rather than assuming they exist.
- The `Foundations/Figma inventory` story loses the case card and keeps the
  device frames, so the inventory reads the drawing and the code, not the
  corpus.
- The `figma handoff media` helper goes with the corpus: it planned its
  before/after pairs from the changed cases and took the capture's story,
  width and root from a saved case, so nothing of it survives that a case did
  not supply. Before/after pairs are now captured by the session that made the
  change, which is also the session that ran the diagnostic.
- A regression that only a numeric comparison would catch — a 1 px inset that
  vanished, a shadow that changed anchor — is caught by whoever runs the
  diagnostic next, or by visual regression, not by the chain.

## 5. Deferred decisions with triggers

| Deferred                                                | Trigger                                                                                                                  |
| ------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| Recording a diagnostic's residue in the review artifact | A review needs the numbers after the session ends; the PR body or the journal then carries them, never the repository    |
| A per-node visual-regression baseline                   | Rendered regression must fail the chain for a node, which is a render-to-render question and belongs to the visual suite |
| Re-introducing a numeric gate for a narrow surface      | A class of defect proves invisible to review and to visual regression, and a stateless command cannot reach it           |

## 6. Related

- [ADR-0006](./0006-parity-coverage-and-bulk-families.md) — the case population,
  the bundle cap and the bulk rule; its retirement is recorded there.
- [ADR-0007](./0007-committed-records-reader.md) — the reader that owns the
  records a run now reads (`inventory`, `registry`, `device-policy`).
- [ADR-0008](./0008-case-corpus-value.md) — superseded: the corpus it made one
  value no longer exists.
- `packages/ui-cli/src/parity/check.ts` — the diagnostic this ADR decides.
- `packages/ui-cli/tests/parity/diagnostic.test.mjs` — the suite that pins the
  ephemeral contract: the three verbs, and that a run commits nothing.
