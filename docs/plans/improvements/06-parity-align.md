# Action 06 — Parity: one `align` command, fan-in order, `verify` in the gate

| Field         | Value                                                                    |
| ------------- | ------------------------------------------------------------------------ |
| Branch        | `improve/06-parity-align`                                                |
| Worktree      | `../pagopa-ui-imp-06`                                                    |
| Ports         | Storybook 6106 · static server 6206                                      |
| Depends on    | 07 merged (it rewrites the parity-tooling reference first)               |
| Person gate   | none; `G-EVD` for part C is satisfied                                    |
| Report source | [../improvements.md](../improvements.md), the "agent-first flow" finding |

## State on 2026-10-24

- Gate `G-EVD` is satisfied: `docs/figma-parity/manifest.json` is tracked, the
  bundle is 9.0 MB, and `pnpm nx run pagopa-ui-cli:figma:parity:verify` exits 0.
  **Part C is in scope**; do not skip it.
- `figma:parity:verify` already runs in the green chain of `CONTRIBUTING.md` and
  as a step of the `coverage` job in `deep-checks.yml`. Part C only adds it to
  the `dependsOn` of `pagopa-ui:test`.
- The corpus holds 300 cases; `figma:parity:queue`, `check --save-case`,
  `capture`, `report` and `evidence` exist. There is no `align` command and no
  `--order` flag.
- `packages/ui-cli/src/parity/render.ts` exports `STORYBOOK_URL`
  (`STORYBOOK_URL ?? "http://localhost:6006"`) and `parity/cli.ts` imports
  `cases.ts`, `render.ts`, `diff.ts` and `source.ts`, as the decisions assume.
- The skill reference `parity-tooling.md` still names `source.mjs`,
  `render.mjs` and `diff.mjs`; the modules are `.ts` today. Action 07 fixes the
  names; step 4 of this action rewrites the same table, so keep them consistent.

## Goal

An agent aligning one Figma node today chains several parity commands (queue,
check per device, cases, report) and reads long outputs to decide what to
change. A cheaper model gets lost in that sequence. After this action:

- **A.** `parity align --node <id>` runs the whole read-only sequence for one
  node and prints one short work order, with a Tailwind class hint for every
  delta that maps to a token.
- **B.** `parity queue --order fan-in` lists the most reused components first,
  so a fix in a shared part lands before the components that contain it.
- **C.** `parity verify` runs in the green chain, once the evidence bundle is
  committed (gate `G-EVD`).

## Decisions (final, do not reopen)

- `align` is read-only. It never writes a case, a registry entry, a baseline or
  a source file. Saving a case stays `check --save-case`.
- `align` reuses the existing modules (`cases.ts`, `render.ts`, `diff.ts`,
  `source.ts`). It adds orchestration and formatting only; it doesn't change
  the classification or the tolerance.
- Fan-in = the number of inventory components whose `dependencies` include the
  node. Ties keep today's order.
- Part C is skipped when `docs/figma-parity/manifest.json` is not committed on
  your branch's base. Report it as `PARTIAL` with "part C waits for G-EVD".
- The evidence bundle (`docs/figma-parity/`: `source.json.gz`, `manifest.json`,
  `references/`) makes `check` and `align` work without `FIGMA_TOKEN` and
  without the `.figma/` snapshot. Storybook is still needed for the render.
- Storybook's address comes from the `STORYBOOK_URL` environment variable
  (`packages/ui-cli/src/parity/render.ts`, default `http://localhost:6006`).
  `align` uses the same variable; don't add a `--url` flag.

## Ownership

Allowed:

- `packages/ui-cli/src/parity/{cli.ts, align.ts (new), cases.ts}`
- `packages/ui-cli/tests/parity/**`, `packages/ui-cli/tests/fixtures/figma-parity/**`
- `packages/ui-cli/package.json` (one script: `figma:parity:align`)
- `packages/pagopa-ui/project.json` (part C: the `test.dependsOn` entry only)
- `.agents/skills/figma-to-code/references/{parity-tooling.md, delta.md, new-from-figma.md}`
- `docs/plans/improvements/reports/06.md`

Forbidden: components, stories, catalogue JSON files, the evidence bundle,
`.github/**`.

## Steps

### 1. Measure

1. Pick 3 nodes with an `implemented` registry status and at least one parity
   case, one of them with two devices:

   ```sh
   pnpm nx run pagopa-ui-cli:figma:parity:queue -- --json | head -c 4000
   ```

2. For one of them, write down the commands an agent runs today to get from
   "node id" to "list of deltas to fix" (read
   `.agents/skills/figma-to-code/references/parity-tooling.md`). Count the
   commands and the total output lines.

Done when: the 3 node ids, the command count and the output line count are in
the report as "before".

### 2. Part A — `parity align`

1. Create `packages/ui-cli/src/parity/align.ts` exporting
   `align(parsed: Parsed): Promise<number>` and register the subcommand in
   `cli.ts` next to `check` (update the header comment list).
2. Behaviour, for `--node <id>`:
   1. Load the registry entry, the inventory node, the device policy and the
      node's cases (the same loaders `check` and `queue` use).
   2. Print the header: node id, name, registry status, export, story file,
      declared devices, covered devices, missing devices.
   3. If Storybook does not answer on the configured URL, print the exact
      start command (`pnpm nx run pagopa-ui-storybook:storybook`) and exit 2.
   4. For each case of the node, run the same capture and comparison as
      `check --case <caseId>` (call the shared function; don't spawn a
      process).
   5. Print one block per case: the case id, the verdict, then one line per
      delta: `<subject> <property>: render <x> · source <y> · <token info>`.
   6. Token info: when the delta has `token.kind` `token` or `near-token`, add
      `→ use <class>` using a small mapping table in `align.ts`:
      - padding and gap → the spacing utility (`p-`, `px-`, `py-`, `pt-`,
        `pr-`, `pb-`, `pl-`, `gap-`) with the token's step;
      - radius → `rounded-<name>`;
      - type → `text-<name>`;
      - colour → `text-`, `bg-` or `border-` + `<name>` depending on the
        property.

      Derive the class names from the token names the classification already
      returns. When a property has no mapping, print the token name only.

   7. End with a "Next" list of at most 3 lines: missing device cases →
      `figma:parity:cases --sync --node <id>`; residues without a reason → the
      `--residue` flag of `check`; clean → "aligned, no action".
3. `--json` prints the same content as one object.
4. Add `"figma:parity:align": "node src/cli.ts parity align"` to
   `packages/ui-cli/package.json`.
5. Tests in `packages/ui-cli/tests/parity/align.test.mjs`, with no browser:
   - the formatter, given a fixture result with one `token`, one
     `near-token` and one `inline` delta, prints the expected lines and hints;
   - the mapping table: one case per property family;
   - a node without cases prints the missing devices and exits 0.
     Factor the browser call behind a parameter so the test can inject a fake
     result.

Done when:

- `pnpm nx run pagopa-ui-cli:test` passes;
- with Storybook running on port 6106
  (`PORT=6106 pnpm nx run pagopa-ui-storybook:storybook`, then
  `STORYBOOK_URL=http://localhost:6106 pnpm nx run pagopa-ui-cli:figma:parity:align -- --node <id>`),
  the 3 measured nodes print a work order. Its output is at most half the
  "before" lines.

### 3. Part B — fan-in order

1. In `cases.ts` (or `cli.ts` where `queue` builds rows), compute fan-in from
   `inventory.json`: for each node, count components whose `dependencies`
   contain its id (read the dependency shape in
   `packages/ui-cli/src/figma/snapshot.ts`).
2. Add `--order fan-in` to `queue` (default stays the current order). Print
   the fan-in as a column. `--json` gains a `fanIn` number per case.
3. Test with a fixture inventory of 3 components where one is used by the
   other two.

Done when: the test passes and
`pnpm nx run pagopa-ui-cli:figma:parity:queue -- --order fan-in | head -5`
lists components with the highest fan-in first.

### 4. Skill references

In `.agents/skills/figma-to-code/references/parity-tooling.md`:

1. Add `align` to the command table, first row: "start here for one node".
2. Replace the multi-command walk-through for a single node with: run
   `align`, apply the hints, re-run `align` until it says aligned, then save
   the cases with `check --save-case`.
3. Add `--order fan-in` to the `queue` row.

In `delta.md` and `new-from-figma.md`, where they list the commands for one
node, point to `align` instead. Keep the skill agnostic (no node ids, no
component names, no `docs/` paths).

Done when: `pnpm nx run pagopa-ui:docs` passes, and the word count of the three
files didn't grow.

### 5. Part C — `verify` in the gate (only with `G-EVD`)

`G-EVD` is satisfied on `main` today: `git ls-files docs/figma-parity/manifest.json`
prints the file. Run this step unless the branch's base lost it.

`figma:check` already validates the case corpus and device coverage; it doesn't
check the evidence bundle (stale fingerprints, missing or orphan PNGs, the
10 MB cap). That is what `verify` adds to the gate.

1. `pnpm nx run pagopa-ui-cli:figma:parity:verify` must exit 0. Device
   warnings (`warn: … misses device case(s)`) are expected and allowed. If it
   fails, stop: a stale bundle is refreshed by a person with `FIGMA_TOKEN`
   (`parity evidence --write`), never by you.
2. Add `"pagopa-ui-cli:figma:parity:verify"` to the `dependsOn` of the
   `pagopa-ui:test` target.
3. In `parity-tooling.md`, state that `verify` runs in the green chain.

Done when: `pnpm nx run pagopa-ui:test -c=ci` passes and runs `verify`.

## Acceptance

Quick:

```sh
pnpm nx run-many -p pagopa-ui-cli -c=ci -t fmt,lint,typecheck
pnpm nx run pagopa-ui-cli:test
pnpm nx run pagopa-ui:docs
pnpm nx run pagopa-ui-cli:figma:parity:queue -- --order fan-in | head -5
```

Heavy (Storybook running, under the lock): `figma:parity:align` on the 3
measured nodes.

## Stop conditions

- The capture and comparison of `check` cannot be called as a function
  without a refactor of more than about 80 lines in `cli.ts`. Then implement
  `align` by spawning `node src/cli.ts parity check --case <id> --json` per
  case and parsing its JSON, and say so in the report.
- `verify` fails with evidence present (part C).

## Commits

1. `feat(ui-cli): add parity align for one node`
2. `feat(ui-cli): order the parity queue by fan-in`
3. `docs(skills): start node alignment from parity align`
4. `build(pagopa-ui): run parity verify in the green chain` (part C only)
5. `docs(plans): report action 06`

## Report additions

- Before and after: commands and output lines to get a node's work order.
- The 3 nodes and their `align` output, trimmed to 20 lines each.
- Part C status.
