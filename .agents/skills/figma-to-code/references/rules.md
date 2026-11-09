# Rules and comments of a node

The library keeps a `.Regole` box on every component page: cards under
"Consolidate" and "Da commentare", each with a rule name, an Italian explanation,
a status and a deadline. The boxes are siblings of the component set,
so they sit outside the published subtree, the inventory and
`designFingerprint`: a rule can change without producing drift. Node comments are
the same kind of source, unreadable from the drawing alone. This use case turns
both into context to read before implementing and into an English record.

## Read the brief first

`pnpm ui-cli figma brief --node <nodeId>` batches registry and guide, targeting
rules, comments and requests; a variant resolves to its set. Run it again before
closing. Snapshots are local and gitignored: `--refresh` re-reads rules and
comments when their versions differ from the pin, and `figma rules refresh` or
`figma comments --refresh` do it explicitly.

## The ledger

`catalog.rules` (`src/catalog/figma/rules.json`) holds one entry per
consolidated card: `title` (the Italian title verbatim — the identity that finds
the card, never translated away), `titleEn` and `summary` (mandatory for every
reviewed card), `sourceHash`/`reviewedAt`/`figmaVersion` (a changed hash is
`stale`), `targets` (the sets it applies to — the page is not the target, cards
are copied across pages) and `disposition`. The Italian body stays in
`.figma/rules.json`.

## Translate and decide

The agent decides every card; no person approves it rule by rule.

- `imported` — binds the consumer: translate the title and write it as a bullet
  in the guide's rules block, the **first** thing in the guide, under
  `## Component Rules`, between `<!-- component-rules:start -->` and
  `<!-- component-rules:end -->`. No source reference in the bullets, which stay
  short and imperative.
- `recorded` — explains the design source, not the consumer guide; the English
  summary is the record.
- `duplicate` — handled elsewhere: set `duplicateOf` to the canonical id. A card
  copied onto another page is a duplicate, not new work.
- `out-of-scope` — does not describe this component (a rule pasted from another
  page, a product rule). Record the reason.
- `deferred` — not approved or not actionable yet. Record the reason.
- `conflict` — contradicts the drawing or an accessibility contract: write a
  design request (`design-request.md`) and point `request` at
  it.
- `pending` — the migration backlog, never left on a node being implemented.

Duplicates are expected: compare the card with the ledger and the other
containers before deciding, and never ask a person to arbitrate.

Record the decision from the snapshot, never by writing the ledger by hand:
`pnpm ui-cli figma rules mark <cardId> --disposition <disposition> --title-en
"<English title>" --summary "<one sentence>" --guide <guide path> --targets
<set nodeId>[,<set nodeId>…]`. `mark` stamps hash, date and version from the snapshot,
validates the targets, and refuses an `imported` rule whose guide has no rules
block or does not open with it. For a `stale` card, `figma rules show <cardId>`
prints the current text: re-mark it with the same English when the meaning holds,
and update the guide bullet when it does not.

`pnpm nx run pagopa-ui-cli:check:rules` is the gate: schema, mandatory fields,
targets, guide blocks, duplicates and — with a local snapshot — `new`, `stale` and
`removed` cards, rejecting the pending backlog by default. `--no-strict` inspects
that backlog during migration; it is not the closing gate.

## Comments

`pnpm ui-cli figma comments --node <nodeId>` prints the threads anchored to the
node, its variants, its published descendants and its page (`page`).
Resolved threads are history; `--open` keeps the open ones.

A comment is a question, not a decision. When the drawing answers it, proceed and
cite the source in the note; when it does not, promote it to a design request and
leave the node `pending` until the answer is recorded. Never reply to or resolve
a comment in Figma.
