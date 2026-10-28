# Rules and comments of a node

The library keeps a `.Regole` box on every component page: card instances grouped
under "Consolidate" and "Da commentare", each holding a rule name, an Italian
explanation, a status and a placeholder deadline. The boxes are siblings of the
component set, so they are outside the published subtree, outside the inventory
and outside `designFingerprint`: a rule can change without producing any drift.
Node comments are the same kind of source: the design conversation about a node,
unreadable from the drawing alone.

This use case turns both into context the coding agent reads before
implementing, and into an English record the repository keeps.

## Read the brief first

```bash
pnpm nx run pagopa-ui-cli:figma:brief --node <nodeId>
```

It prints, offline, the registry entry, the guide, every rule that targets the
node (disposition, English title, summary, guide), the open comment threads and
the design requests that already cite the node. A variant id is resolved to its
set. Run it before any implementation or review, and again before closing: a
`pending` or `stale` rule that targets the node is unfinished work.

The live snapshots are local and git-ignored. Refresh them when the session
starts on a file that may have changed:

```bash
pnpm nx run pagopa-ui-cli:figma:rules --refresh --node <nodeId>
pnpm nx run pagopa-ui-cli:figma:comments --refresh
```

`--page <pageId>` scopes the rules refresh; the full refresh reads every rules
box of the file and takes about half a minute.

## The ledger

`catalog.rules` (`src/catalog/figma/rules.json`, committed) holds one entry per
consolidated card. It is the only record of what was already imported and when:

- `title`: the Italian title, verbatim. It is the identity used to find the card
  in Figma; it is never translated away.
- `titleEn`, `summary`: the English title and a one-sentence summary. Mandatory
  for every reviewed card, including the ones that stay out of the guide.
- `sourceHash`, `reviewedAt`, `figmaVersion`: what was read, when, from which
  file version. A changed hash is a `stale` card.
- `targets`: the component sets the rule applies to. The page is not the target:
  a page hosts several sets and cards are copied across pages.
- `disposition`: `imported`, `recorded`, `duplicate`, `out-of-scope`,
  `deferred`, `conflict`, `pending`, `removed`.

The Italian body never enters the repository: it stays in `.figma/rules.json`.

## Translate and decide

The agent decides every card; no person approves it rule by rule.

- `imported`: the rule binds the consumer. Translate the title and write the
  rule as a bullet in the component guide's rules block:

  ```markdown
  <!-- component-rules:start -->
  ## Component Rules

  - ...
  <!-- component-rules:end -->
  ```

  The block is the **first** thing in the guide, and the markers separate it
  from the rest. The bullets carry no source reference: the ledger keeps the
  card id, hash and review date. Keep the bullets short and imperative.
- `recorded`: the rule explains the design source (a state the OS draws, a
  source adaptation) and does not belong to the consumer guide. The English
  summary in the ledger is the record.
- `duplicate`: the same rule is already handled by another card. Set
  `duplicateOf` to the canonical card id. A card copied onto another page is a
  duplicate, not new work.
- `out-of-scope`: the rule does not describe this component (a rule pasted from
  another page, a product rule). Record the reason.
- `deferred`: the rule is not approved or not actionable yet. Record the reason.
- `conflict`: the rule contradicts the drawing or an accessibility contract.
  Write a design request ([design-request.md](design-request.md)) and point
  `request` at it.
- `pending`: the migration backlog. Never leave it on a node being implemented
  or reviewed.

Duplicates and copy-paste are expected: the boxes predate the library and were
maintained by hand. Compare the card with the ledger and with the other
containers before deciding; do not ask a person to arbitrate.

Record the decision from the snapshot, never by writing the ledger by hand:

```bash
pnpm nx run pagopa-ui-cli:figma:rules --mark <cardId> \
  --disposition imported \
  --title-en "<English title>" \
  --summary "<one sentence, in English>" \
  --guide <guide path from the config> \
  --targets <set nodeId>[,<set nodeId>…]
```

`--mark` stamps `sourceHash`, `reviewedAt` and `figmaVersion` from the live
snapshot, validates the targets against the inventory, and refuses an `imported`
rule whose guide has no rules block or does not open with it. `--disposition` is
the only mandatory field besides the card id.

For a changed card (`stale`) re-read `figma:rules --card <cardId>`: the card
shows the current Italian text and hash. If the meaning is unchanged, mark it
again with the same English; if it changed, update the guide bullet too.

## Verification

```bash
pnpm nx run pagopa-ui-cli:figma:rules --check
```

Hermetic: schema, mandatory fields, targets, guide files and their rules block
(present, first, referenced by at least one imported rule), duplicates pointing
at a real card. With a local snapshot it also fails on `new`, `stale` and
`removed` cards. `--strict` also fails on the
`pending` backlog; it is off until the migration waves are closed.

## Comments

`figma:comments --node <nodeId>` prints the threads anchored to the node, its
variants, its published descendants and its page (flagged `page`). Resolved
threads are history; `--open` keeps the open ones.

A comment is a question, not a decision. Read the open ones before implementing:
when the drawing answers the question, proceed and cite it in the note; when it
does not, promote the question to a design request and leave the node `pending`
until the answer is recorded. Never reply to or resolve a comment in Figma.
