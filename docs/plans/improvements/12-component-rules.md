# Action 12 — Component rules and node comments

| Field         | Value                                                                 |
| ------------- | --------------------------------------------------------------------- |
| Branches      | `improve/12-rules-tooling`, then one `improve/12-rules-w<n>` per wave |
| Worktrees     | `../pagopa-ui-imp-12` (tooling), `../pagopa-ui-imp-12-w1`…`w4`        |
| Ports         | Storybook on `:6006`                                                 |
| Depends on    | nothing                                                               |
| Person gate   | merge of each wave only; the agent makes every rule decision          |
| Report source | the Figma audit run on 2026-10-23 (numbers in "Baseline")             |

## Goal

Every published component page in the Figma library carries a `.Regole` box:
instances of a card component grouped under "Consolidate" and "Da commentare",
each card holding a rule name, an Italian explanation, a status and a deadline.
Those boxes are the design intent for the component. Today the tooling never
reads them: they are siblings of the `COMPONENT_SET` on the page, so they are
outside the published node subtree, outside `inventory.json` and outside
`designFingerprint`. Editing a rule produces no drift, and no guide records it.

The same is true of node comments: 580 comments live on the file, 315 of them
are root threads and 48 are open, and nothing in the repository can answer "what
did the designers say about this node?".

After this action:

- a committed rules ledger records every consolidated rule with its English
  title, an English one-line summary, the verbatim Italian title, the hash of
  the source text, the component nodes it applies to, the disposition and the
  date and file version of the review;
- a change in Figma produces a `stale` entry and a non-zero `rules --plan`,
  even though the design fingerprint cannot see it;
- the guide of a component opens with the consumer-facing rules in English, in
  a delimited block (`<!-- component-rules:start -->` …
  `<!-- component-rules:end -->`) under `## Component Rules`, with no source
  reference in the text;
- `figma:brief --node <id>` prints, in one read-only command, the registry
  entry, the applicable rules, the open comment threads and the open design
  requests: the brief a coding agent reads before implementing or reviewing a
  node;
- the `figma-to-code` skill makes that brief mandatory and makes the guide
  update part of implementing a node.

## Baseline (measured 2026-10-23, file version `2412426961662147678`)

- 82 pages, 85 `.Regole` containers on 61 pages, 1,191 cards.
- 352 consolidated real rules (`Ok!`), 835 placeholders, 425 cards under
  "Da commentare" (all placeholders, no written rule).
- 308 of the 352 rules sit on pages that hold at least one `implemented` node;
  44 sit on foundation pages, `Popper`, `Componenti file` and the 14
  `◆ KEY TEMPLATE` containers.
- Registry: 273 entries — 242 `implemented`, 19 `mocked`, 7 `pending`,
  5 `excluded`.
- Copy-paste is real: Chip, List Item, Text Field and Card share "Creazione di
  una nuova icona"; List Item carries an Alert rule; one of the two Pagination
  containers repeats 6 Button rules verbatim. Duplicate and irrelevant cards
  are expected, not exceptional.
- Comments: 580 total, 315 root threads, 48 open roots, 38 anchored to a page,
  118 to an inventory node or variant, 159 to a node outside the inventory.
- Reading every container costs about four minutes over REST (~85 requests at
  depth 9); page discovery is one request per page at depth 2.

## Decisions (final, do not reopen)

- **One ledger, committed.** `packages/pagopa-ui/src/catalog/figma/rules.json`,
  new `catalog.rules` key in `figma-to-code.yaml`. It is never regenerated from
  scratch: `--init` seeds it, `--mark` records decisions, `--sync` rewrites it
  canonically and preserves every decision.
- **Two levels of English.** Every consolidated card gets `titleEn` and a
  one-sentence `summary` in the ledger. Only rules that bind a consumer get
  prose in the guide. Italian stays in `title` (verbatim, identity and Figma
  search) and nowhere else; the Italian body is never copied into the
  repository.
- **The agent decides; no human gate per rule.** Dispositions are chosen by the
  agent and recorded with a reason. `--check` validates structure and guide
  files, never taste.
- **Rules are keyed to component nodes, not inferred from the page.** A page
  hosts several sets and rules are copied across pages, so `targets` is an
  explicit list of component-set (or single-component) node ids, validated
  against `inventory.json` and `registry.json`. `--init` seeds provisional page
  targets only so the backlog is queryable; the first `--mark` must confirm or
  replace them.
- **Comments are context, not a committed artifact.** They live in
  `.figma/comments.json` (git-ignored, like `variables.json`); the repository
  keeps only the design requests a comment is promoted to.
- **Read-only Figma.** No node, card, page or comment is ever written back.
  Needed token scopes: `file_content:read`, `library_content:read`,
  `file_comments:read`. Never read `.env`.
- **The guide is the consumer contract, the ledger is the design index.** A
  design-process note ("the focused state is not specified because the OS draws
  it") is `recorded` in the ledger and does not enter the guide.

## Data model

`rules.json`:

```json
{
  "schemaVersion": 1,
  "fileKey": "pvhsJpPGQbEwNLiyP7BOIw",
  "cards": {
    "123:3570": {
      "pageId": "1:22",
      "page": "• Button 🟢",
      "container": "123:3565",
      "section": "Consolidate",
      "status": "Ok!",
      "title": "Spazio tra più button",
      "titleEn": "Spacing between buttons",
      "summary": "Buttons in a group are spaced 8px apart, vertically and horizontally.",
      "sourceHash": "5f2c1a9d7e3b4c60",
      "targets": ["108:1402"],
      "scope": "component",
      "disposition": "imported",
      "guide": "apps/storybook/src/guides/actions.md",
      "reviewedAt": "2026-10-24",
      "figmaVersion": "2412426961662147678"
    }
  }
}
```

Rules of the model:

- `sourceHash` = first 16 hex characters of
  `sha256(title.trim() + "\n" + body.replace(/\s+/g, " ").trim())`, computed
  from the live card at `--mark` time, never typed by hand. A changed hash is a
  `stale` card: re-read, re-translate if the meaning changed.
- `disposition` ∈ `imported`, `recorded`, `duplicate`, `out-of-scope`,
  `deferred`, `conflict`, `pending`.
  - `imported`: `titleEn`, `summary` and `guide` mandatory. The rule goes in the
    guide's first block, delimited by `<!-- component-rules:start -->` and
    `<!-- component-rules:end -->`, under `## Component Rules`; it carries no
    source reference: the ledger keeps the card id, hash and review date.
  - `recorded`: `titleEn` and `summary` mandatory; not in the guide.
  - `duplicate`: `duplicateOf` (a canonical card id) and `summary`.
  - `out-of-scope` and `deferred`: `reason` mandatory.
  - `conflict`: `request` (a path under `docs/design-requests`).
  - `pending`: the migration backlog seeded by `--init`; no English yet. The
    global check accepts it, the skill does not: a node being implemented or
    reviewed must leave no `pending` or `stale` rule that targets it.
- `targets`: node ids from `inventory.json`; a variant id is accepted and
  normalised to its set. Empty only with `scope` ∈ `foundation`, `template`,
  `product` and a `reason`.
- Entries are never deleted. A card that disappears from Figma becomes
  `removed` (with `removedAt`) so its guide text is retired deliberately.
- Duplicates are the agent's call, not a person's: before `--mark`, the agent
  compares the card with the ledger and the other containers of the same and
  neighbouring pages; an identical rule already handled elsewhere becomes
  `duplicate` with `duplicateOf`, and a rule pasted onto a component it does
  not describe becomes `out-of-scope` with a reason ("copied from Alert").
- Canonical form: keys sorted by `pageId`, then `container`, then card id; two
  spaces of indentation; trailing newline. `--sync` writes exactly that, so a
  merge conflict in this file is resolved by taking either side and re-running
  `figma:rules -- --sync`.

Local snapshots (git-ignored under `.figma/`):

- `rules.json` — the extraction: `{ fileKey, version, fetchedAt, pages: [{ pageId, pageName, containers: [{ nodeId, cards: [...] }] }] }`.
- `comments.json` — `{ fileKey, version, fetchedAt, comments: [{ id, parentId, nodeId, pageId, message, author, createdAt, resolvedAt }] }`.

## Commands

New CLI surface in `packages/ui-cli`. Four npm scripts in
`packages/ui-cli/package.json`, so Nx exposes them as targets exactly like
`figma:parity:*`:

| Target                            | Script                                    | Behaviour                    |
| --------------------------------- | ----------------------------------------- | ---------------------------- |
| `pagopa-ui-cli:figma:rules`       | `node src/cli.ts figma rules`             | default `--plan`             |
| `pagopa-ui-cli:figma:rules:check` | `node src/cli.ts figma rules --check`     | hermetic, in the green chain |
| `pagopa-ui-cli:figma:comments`    | `node src/cli.ts figma comments`          | default `--refresh`          |
| `pagopa-ui-cli:figma:brief`       | `node src/cli.ts figma brief --node <id>` | read-only, offline           |

`figma:rules` flags:

- `--refresh [--page <id> | --node <id>]` — REST: pages at depth 2 to find
  `.Regole` containers, containers at depth 9 to read cards. Writes
  `.figma/rules.json`. Full refresh prints the elapsed time; a scoped refresh
  is the session default.
- `--plan` — diff live snapshot ↔ ledger: `new`, `stale`, `removed`,
  `orphaned`, plus `placeholders` and `toComment` counts. JSON on `--json`,
  human list otherwise, exit 1 when `new | stale | orphaned | removed > 0`.
- `--init` — seed every consolidated card not in the ledger as `pending`, with
  hash, page, container, Italian title and a provisional `targets` (the page's
  `implemented` sets), flagged `provisionalTargets: true` until the first
  `--mark` replaces it. Idempotent; never touches existing entries. No English
  is written by `--init`.
- `--mark <cardId> --disposition <d> [--title-en <text>] [--summary <text>] [--guide <path>] [--targets <ids>] [--reason <text>] [--duplicate-of <id>] [--request <path>]` —
  stamps `reviewedAt`, `figmaVersion` and `sourceHash` from the snapshot,
  clears `provisionalTargets`, refuses a disposition whose mandatory fields are
  missing and refuses an imported rule whose guide file does not exist.
  `--mark` is how the agent records its decision; it is the only command that
  writes English.
- `--sync` — canonical rewrite (see above), adds `removed`, adds consolidated
  cards the ledger does not know as `new`, keeps `pending`.
- `--check` — no network: schema, unique ids, enum fields, mandatory fields,
  `targets` exist in inventory, every `imported` card's guide has a rules block
  that opens the file and at least one imported rule points at it, and no card is
  `new`, `stale`, `removed` or `orphaned`. `pending` is
  the migration backlog and passes; `--strict` makes it fail too, and is
  enabled once the last wave has merged. Non-zero on any violation.
- `--node <id>` — the rules that target the node (variant ids normalised),
  `--json` for machine use, human list otherwise. Default hides `pending`,
  shows `stale` flagged; `--all` shows everything.

`figma:comments` flags: `--refresh`, `--node <id>`, `--open`, `--json`.
`--node` matches threads anchored to the node, to any of its published
variants, to a descendant when the pinned snapshot holds the subtree, and to the
node's page (flagged `page`); replies are nested under their root.

`figma:brief --node <id>` prints: registry status, target and note; the guide
path; rules (disposition, English title, summary, guide); open comments with
author and date; open design requests that cite the node. A variant id is
normalised to its set. `--json` for tools.

`figma:status` gains two lines: `rules: <n> consolidated · <n> imported ·
<n> recorded · <n> pending · <n> stale` and `comments: <n> open threads ·
<n> on implemented nodes`. `figma:plan` adds the pages whose rules are `new` or
`stale`, with the card ids.

## Ownership

Allowed:

- `packages/ui-cli/src/figma/rules.ts` (new), `comments.ts` (new), `brief.ts`
  (new), `rest.ts` (comments fetch only), `status.ts` (two lines), `sync.ts`
  (rules in the plan), `cli.ts`, `src/schemas/rules.ts` (new),
  `src/schemas/comments.ts` (new)
- `packages/ui-cli/tests/figma/{rules,comments,brief}.test.mjs` (new),
  `packages/ui-cli/tests/figma/status.test.mjs`, fixtures under
  `packages/ui-cli/tests/fixtures/rules/` (new)
- `packages/pagopa-ui/src/catalog/figma/rules.json` (new)
- `packages/pagopa-ui/figma-to-code.yaml` (`catalog.rules` key)
- `packages/ui-cli/package.json` (four scripts), `CONTRIBUTING.md` (green
  chain), `AGENTS.md` (Figma sessions and skills table)
- `.agents/skills/figma-to-code/SKILL.md` and `references/rules.md` (new),
  `references/{new-from-figma,node-review,delta,definition-of-done,init}.md`
- `apps/storybook/src/guides/*.md` (`## Component Rules` sections only)
- `docs/design-requests/*.md` (promotions only)
- `.github/workflows/figma-drift.yml` (rules in the drift report)

Do not touch: component sources, stories, tests, tokens, artwork, the registry
shape beyond `note` updates, or any Figma node.

## Steps

1. **Schema and extraction.** Implement `src/schemas/rules.ts` and
   `rules.ts`: page discovery at depth 2 (container name `.Regole` or `Regole`),
   section detection from the first text child of the section frame
   (`Consolidate` / `Da commentare`), card detection (instance with a `Frame 5`
   child), title/body/status extraction, placeholder detection
   (`Nome della regola`, `Spiegazione della regola a beneficio dei colleghi.`),
   hash. **Done when** a fixture with two pages, three containers, placeholders,
   a duplicate and a missing section reproduces the expected extraction.
2. **Ledger and diff.** `--init`, `--mark`, `--sync`, `--plan`, canonical
   serialisation, `removed` handling. **Done when** init on the baseline yields
   352 `pending` entries, a second init changes nothing, a body edit makes one
   card `stale`, a removed card becomes `removed`, and `--sync` is byte-stable
   on an unchanged snapshot.
3. **Check.** Hermetic validation and the guide file reader. **Done when** a
   missing guide, an unknown target, a `new` rule on an `implemented` node and a
   duplicated card each fail with a readable message,
   the `pending` backlog passes, `--strict` refuses it, and a clean ledger
   passes without network.
4. **Comments and brief.** `comments.ts` (REST refresh, thread assembly,
   node/page/variant/descendant resolution), `brief.ts`, the `figma:status`
   lines, the `figma:plan` additions. **Done when** `figma:brief` on a node with
   rules and open comments prints both offline, and the JSON shape is asserted
   by a test.
5. **Scripts, config and green chain.** Four npm scripts, `catalog.rules`,
   `pagopa-ui-cli:figma:rules:check` in the green chain, drift workflow. **Done
   when** the full green chain passes.
6. **Skill.** Write `references/rules.md`; add the brief to
   `new-from-figma.md` step 1 and step 4, to `node-review.md`, to `delta.md`
   (rules are invisible to the fingerprint, so the brief is mandatory for every
   touched node), to `definition-of-done.md` and to `init.md`; update the
   `SKILL.md` use-case table and `AGENTS.md`. The instruction must say: read the
   brief before implementing; translate the rules that bind the consumer into
   the guide's first block, `## Component Rules`, with no source reference;
   record every other card with a disposition;
   never leave a `pending` rule on a node you touch; promote an unanswered
   comment to a design request. **Done when** `pnpm nx run pagopa-ui:docs`
   passes and a dry read of the skill shows no dangling reference.

## Waves

Each wave is one worktree, one branch, one pull request. A wave is done when
every consolidated rule of its pages has a disposition, the touched guides
carry the imported rules, `figma:rules:check` is green and `figma:brief` shows
no `pending` rule for the wave's nodes.

| Wave | Branch                | Pages (consolidated rules)                                                                                                                                                                                                                                                                                                                     | Rules |
| ---- | --------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----- |
| 1    | `improve/12-rules-w1` | Button 7 · Button Group 7 · Checkbox and Radio Button 7 · Text Field 8 · Switch 4 · Select 4 · Autocomplete 4 · Drop Down 4 · Date picker 4 · Icon Button 4                                                                                                                                                                                    | 53    |
| 2    | `improve/12-rules-w2` | Alert 9 · Snackbar 5 · Banner 4 · Tooltip 4 · Dialog 4 · Drawer 5 · Progress loader 7 · Spinner 7 · Scroll-to-Bottom 7 · Stepper 4 · OK, KO, Waiting state 5 · Missing Element 4                                                                                                                                                               | 65    |
| 3    | `improve/12-rules-w3` | Table 8 · Timeline 8 · Pagination 14 · Tag 4 · Badge 4 · Chip 8 · Avatar 4 · Accordion 4 · Breadcrumb 4 · Tab 4 · Section Header 4 · List Item 8 · Card 8 · Feature List 4 · Boxed Module 4 · Pin point 5 · Image 4 · Camera view 4 · Loghi PSP 4 · Identity Provider 4 · Authentication Code 4 · Side nav 4 · Header/Preheader 16 · Footer 10 | 145   |
| 4    | `improve/12-rules-w4` | Color 7 · Spacing 4 · Shadow 3 · Border Radius 3 · Paper 3 · Pictograms 3 · Safe Area 3 · Divider 4 · Overlay 3 · Icon 4 · Popper 4 · Popover 4 · Drag & Drop 4 · Componenti file 1 · ◆ KEY TEMPLATE 42                                                                                                                                        | 89    |

Wave 1 also proves the model on the pages with the most copy-paste, so the
dispositions for duplicates and irrelevance are exercised before the big wave.

Wave 4's 42 `◆ KEY TEMPLATE` cards are 14 copies of 6 generic titles and one
Pagination handoff note: expect most of them to be `duplicate`, and the handoff
note to become the Pagination design request if it is still open.

## Merge

All waves start from the same pinned snapshot version, recorded in every
ledger entry (`figmaVersion`), so `--sync` needs no network at merge time. If
Figma changed while the waves were open, refresh and plan first: a wave does not
review cards that landed after its baseline.

Waves merge in order 1 → 4. The only shared file is `rules.json`: resolve the
conflicting hunks normally, run `figma:rules -- --sync` (canonical rewrite) and
then `figma:rules:check`, which reports any card the merge lost as `new`. Guide
files are page-disjoint by construction. A wave that changes a shared component
(a rule that forces a code change) stops and reports instead of editing code:
this action imports rules, it does not align components.

After wave 4 merges, add `--strict` to `figma:rules:check` in the green chain:
from then on a `pending` rule fails the build.

## Out of scope

- Writing anything back to Figma, including comment replies and resolution.
- Importing placeholders, "Da commentare" cards and the deadline/author card
  metadata (status is recorded, the rest is not).
- Machine translation: every `titleEn` and `summary` is written by the agent.
- Changing component behaviour because a rule says so: that is a separate
  alignment task with its own parity cases.
- A UI for the ledger: `figma:brief`, `figma:status` and the JSON are the
  interface.

## Acceptance

- `pnpm nx run pagopa-ui-cli:figma:rules -- --refresh` reports 85 containers,
  1,191 cards, 352 consolidated, 835 placeholders, 425 to comment on the
  baseline version.
- `--init` on that snapshot leaves `figma:rules:check` green with 352 `pending`
  entries; `figma:status` reports the backlog, and `--strict` fails until the
  last wave has merged.
- Editing one card body in Figma makes exactly that card `stale` on the next
  refresh, and `--plan` exits 1.
- `figma:brief --node 123:7768` prints the Breadcrumb rules, the open threads
  and the existing design request offline.
- A ledger entry pointing at a missing guide fails `figma:rules:check`.
- The green chain passes; stories run in a browser or the report says they did
  not.

## Report

Per step: the command and its result. Per wave: pages, rule counts by
disposition, duplicates found, design requests opened, files touched, green
chain result. State explicitly which rules were `recorded` rather than
`imported` and why, and list the comments read but left open.
