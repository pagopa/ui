# F1 — Figma transport: from MCP to REST (future, conditional)

Common rules: [README.md](./README.md). Origin: read-only analysis session of
2026-10-18 on how the `figma-to-code` skill reads Figma (conclusions and numbers
in "Evidence"; there is no separate document). **Outside the A–E wave**: it
starts only on a decision by the person; the variables phase depends on a Figma
Enterprise plan.

## Goal

Reduce the dependence on calls to the Figma MCP server in the "live" steps of the
skill flow, replacing them where a REST equivalent exists — scriptable, pinnable
by version, runnable in CI too — and keeping MCP **only** where there is no
alternative today. The transport changes; numeric parity, gate and tokens do not.

## How the skill reads Figma today

- **Blocking steps (MCP only).** `list_file_components_for_code_connect`
  (delta step 1 → `figma.mcpInventory` → `pnpm figma:export --input`) and
  `get_variable_defs` (Tokens section → `figma.variables` →
  `figma-tokens.mjs --write`); the `ids` map of the tokens comes from the MCP
  asset search (in practice `search_design_system`, documented in
  [scripts/README.md](../../packages/ui-cli/README.md)).
- **Auxiliary steps.** `get_screenshot`, `get_design_context` (anatomical
  confirmation and render disambiguation) and `get_metadata` (only in the
  read-only rule: no step uses it).
- **Verification does not depend on MCP.** The numbers come from the pinned
  export via `source.mjs`; the checks (`figma:check`, `tokens:check`, parity) are
  hermetic.

## Decisions already made (plan constraints)

- **Figma stays read-only.** Even in an all-REST flow only GETs are used; the
  tools that write (`use_figma`, Code Connect) stay forbidden.
- **The pinned snapshot stays the truth.** Every REST substitute pins with
  `version=` to the snapshot version; the MCP tools have no version parameter
  and read the current state.
- **The MCP step is not retired while the root gap remains.** With `--rest`,
  `figma-sync.mjs` keeps the already committed roots with `sources: ["mcp"]` but
  does not discover new ones (see [scripts/figma-sync.mjs](../../packages/ui-cli/src/figma/sync.ts)
  and the limitation in
  [references/catalogue.md](../../.agents/skills/figma-to-code/references/catalogue.md)).
- **The export consumes only the identities** from the MCP dump (`nodeId`,
  `name`, `type`, `assetKey`, `pageId`, `pageName`); properties, dependencies
  and fingerprints come from the REST documents. A substitute must produce the
  same identities, not the tool's rich graph.
- **Variables over REST require Enterprise.** `/v1/files/:key/variables/local`
  is Tier 2, scope `file_variables:read`, full Enterprise seat only; the current
  token has `file_content:read` + `library_content:read`. Without the plan,
  phase 3 does not open and the MCP step stays.
- **Skill texts.** Common rules 4 and 8 apply: the flows add one reference file
  and one row in the use-case index; the rows of `SKILL.md` (read-only rule,
  list of MCP tools) are decided by the person.

## Evidence (measured on 2026-10-18 on this repository)

| Source                                                                   | Date        | Root | Detail                             |
| ------------------------------------------------------------------------ | ----------- | ---- | ---------------------------------- |
| `.figma/live-mcp.json` (dump of `list_file_components_for_code_connect`) | 11 Oct 2026 | 409  | 165 COMPONENT + 244 COMPONENT_SET  |
| `.figma/live-rest.json` (REST export)                                    | 14 Oct 2026 | 353  | 151 + 202, all `sources: ["rest"]` |
| `src/catalog/figma/inventory.json` (committed)                           | —           | 353  | all `sources: ["rest"]`            |

- **Measured gap: 58 MCP-only identities** (56 names starting with `.` — for
  example `.UnstyledButton`, `.TabItem`, `.TimelineItem/Success` — plus
  `Popper` and `ProductCard`), **all with a library `assetKey`**; for the 351
  shared ones the MCP and REST keys match (0 mismatches). Plus 2 REST-only
  identities (`license`, `mail_pec`, page `• Icon`), consistent with an MCP dump
  three days older.
- The 58 roots **are not in the committed inventory**: only the MCP step
  discovers them; the weekly REST job does not see them.
- **Today's substitutability, per call:**

| MCP call                                | REST alternative                                                       | Outcome                |
| --------------------------------------- | ---------------------------------------------------------------------- | ---------------------- |
| `list_file_components_for_code_connect` | `/v1/files/:key/components` + `/component_sets` (already used; gap 58) | not 1:1                |
| `get_variable_defs`                     | `/v1/files/:key/variables/local` (Enterprise, adapter needed)          | conditional            |
| `search_design_system` (`ids` map)      | components/component_sets/styles endpoints (+ variables on Enterprise) | partial                |
| `get_screenshot`                        | `/v1/images/:file_key?ids=…&format=png&version=…`                      | yes (with pinning)     |
| `get_design_context`                    | `/v1/files/:key/nodes?ids=&version=&geometry=paths` (already used)     | yes                    |
| `get_metadata`                          | the same nodes endpoint with `depth`                                   | yes (it is not a step) |

## Phases and status

| Phase | What                                                                             | Precondition                            | Status                                 |
| ----- | -------------------------------------------------------------------------------- | --------------------------------------- | -------------------------------------- |
| 1     | Visual aids over REST (`get_screenshot`, `get_design_context`, `get_metadata`)   | none                                    | can start right away                   |
| 2     | Root discovery over REST (`list_file_components_for_code_connect`)               | feasibility check                       | possible outcome: "not feasible today" |
| 3     | Variables and `ids` keys over REST (`get_variable_defs`, `search_design_system`) | Enterprise + `file_variables:read`      | blocked without them                   |
| 4     | Retiring the MCP step and updating the documents                                 | phases 1–3 done or an explicit decision | final                                  |

## Procedure

### Phase 1 — Visual aids over REST (no loss)

1. A new read-only command (for example
   `node scripts/figma-shot.mjs <nodeId> --version <snapshot.version>`): it uses
   `/v1/images/:file_key?ids=…&format=png&version=…` and downloads the URL as
   `fetchFigmaImages` already does in
   [scripts/figma-rest.mjs](../../packages/ui-cli/src/figma/rest.ts); the output stays
   outside git (`.figma/`). The command replaces the references to
   `get_screenshot` in the references (delta step 4, devices step 2 and trap,
   visual-parity step 1 and trap, new-from-figma step 1): it is preferable
   because it is pinned. `get_design_context` and `get_metadata` need no new
   code: the anatomical confirmation is already covered by `source.mjs` and by
   the REST node reader on the pinned export.
2. **Phase acceptance:** the trial capture of a node or a variant reproduces the
   anatomy seen with `get_screenshot`; `pnpm docs:check` green;
   `figma:parity:check` unchanged.

### Phase 2 — Root discovery over REST (experimental)

3. Check whether REST can enumerate the same roots as the MCP tool:
   `/v1/files/:key/components` + `/component_sets` (already used, known gap);
   reading the whole document `GET /v1/files/:key` (the `components`/`componentSets`
   maps include local and subscribed ones) to measure cost and completeness (the
   snapshot of the 353 nodes alone weighs 160 MB); team endpoints or page walks
   (`ids=<pageId>&depth=2`) if they identify the 58 missing ones.
4. **Closing rule:** if a REST path enumerates the same identities within
   practical limits (requests, MB, tier), replace the step in delta step 1 and
   update the counts; otherwise close the phase with "not feasible today" and
   the dated evidence (what REST returns and what is missing), keeping the MCP
   step. The current mechanism — known roots kept by the REST job — stays valid
   as a bridge.

### Phase 3 — Variables and keys over REST (conditional)

5. REST adapter → the shape consumed by `figma-tokens.mjs`: from
   `{meta: {variables, variableCollections}}` to
   `{fileKey, variables: {name: value}, unresolved, ids}`. It is necessary to
   resolve the aliases (`VariableAlias` → value in the modes), decide the mode
   read (the same one the current export reflects) and map `unresolved`. Careful:
   REST returns **all** the local variables, including those never exposed
   today; every new name goes through the exclusion policy with a reason and
   through the person's review.
6. `ids` keys for the manifest: from the `key` fields of the REST variables and
   from `/v1/files/:key/styles` for the text and effect styles; it replaces the
   collection via MCP asset search (`variable-ids.json`).
7. **Phase acceptance:** `node scripts/figma-tokens.mjs --write --input
   <REST export>` produces a manifest identical (same ids, names, values) to the
   one obtained today with the MCP dump, or a small diff, listed and approved;
   `pnpm tokens:check` green.

### Phase 4 — Retirement and documents

8. Only downstream: delta step 1 and the Tokens section without MCP,
   [scripts/README.md](../../packages/ui-cli/README.md) updated (the "When to run which
   Figma command" table, a note on the `ids`), possible removal of the
   `mcpInventory` key from `figma-to-code.yaml` and from init, a row of
   `SKILL.md` decided by the person. The read-only rule and the list of forbidden
   tools stay in any case.
9. **Phase acceptance:** an end-to-end export without MCP that reproduces the
   same inventory (or the measured and reasoned residue), an equivalent token
   refresh, the full chain green.

## Acceptance (global)

- Commands: `pnpm test:tooling`, `pnpm figma:check`, `pnpm tokens:check`,
  `pnpm docs:check` and the full chain of `AGENTS.md`.
- Proofs: a pinned capture of a node (phase 1); a written report on what REST
  does not see (phase 2); an identical manifest (phase 3); inventory
  before/after (phase 4).
- Before/after numbers to report: roots per source, requests and MB per phase,
  refresh time.

## To ask the person

- Figma plan and seat (Enterprise?) and the possibility of adding
  `file_variables:read` to the token: phase 3 depends on this.
- Whether to invest in phase 2 or accept the documented limitation (the current
  flow works in the local session).
- Who updates the rows of `SKILL.md` and when (common rule 4).

## Out of scope

- Writing to Figma, even just publishing Code Connect.
- Changing the logic of parity, diff, tokens or gate: only the transport changes.
- Workarounds that expire or get around plan limits (borrowed seat, third-party
  tokens).
