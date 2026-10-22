# Action 07 — Agent context: correct, checked, shorter

| Field         | Value                                                                    |
| ------------- | ------------------------------------------------------------------------ |
| Branch        | `improve/07-agent-context`                                               |
| Worktree      | `../pagopa-ui-imp-07`                                                    |
| Ports         | none needed                                                              |
| Depends on    | nothing                                                                  |
| Person gate   | none                                                                     |
| Report source | [../improvements.md](../improvements.md), the "agent-first flow" finding |

## Goal

Agents follow the skills literally, so a wrong path or command in a skill costs
a failed step in every session. A rule written only as prose costs tokens in
every session and is still broken when a model skips it. After this action:

1. No skill or contributor document names a file, a path or a command that
   doesn't exist, and a check keeps it that way.
2. The two traps that a regular expression can detect are foundation rules, and
   their prose shrinks to one line each.
3. Registry notes stop growing into change logs: a ratchet stops new long
   notes.
4. Skills for a service this workspace doesn't use (Nx Cloud) are gone.

## Decisions (final, do not reopen)

- The `figma-to-code` skill stays agnostic: no `docs/` path, no ADR, no node
  id, no component name. The docs check already enforces this; keep it green.
- Skills stand alone and never point at another skill (AGENTS.md). The two
  `prop-conventions.md` copies stay separate.
- New foundation rules ratchet: their baseline is today's count, and the count
  can only go down.
- The registry note ratchet counts notes **longer than 600 characters**. The
  baseline is today's count; long notes are not rewritten in this action.
- Remove the four Nx Cloud skills (`nx.json` has `neverConnectToCloud: true`).
  Keep the generic Nx skills.

## Ownership

Allowed:

- `.agents/skills/figma-to-code/**`, `.agents/skills/pagopa-ui-standards/**`
- `.github/skills/{monitor-ci,nx-cloud-api,nx-cloud-cache-investigator,nx-cloud-ci-failure-review}/**`
  (delete)
- `packages/pagopa-ui/figma-to-code.yaml` (the header comment only)
- `packages/tokens/src/foundation-baseline.json`
- `packages/ui-cli/src/checks/{foundation.ts, doc-links.ts}` and their tests
  and fixtures under `packages/ui-cli/tests/**`
- `packages/ui-cli/src/cli.ts`, `packages/ui-cli/src/schemas/catalogue.ts`,
  and the new `packages/pagopa-ui/src/catalog/figma/note-length-baseline.json`
- `AGENTS.md`, `CONTRIBUTING.md` (stale commands only)
- `docs/plans/improvements/reports/07.md`

Forbidden: any component, story, workflow or catalogue file other than the new
baseline. `.storybook/preview.tsx` is owned by action 09.

## Steps

### 1. Measure

```sh
wc -w .agents/skills/figma-to-code/SKILL.md .agents/skills/figma-to-code/references/*.md \
  .agents/skills/pagopa-ui-standards/SKILL.md .agents/skills/pagopa-ui-standards/references/*.md \
  AGENTS.md CONTRIBUTING.md | tail -1
ls .github/skills | wc -l
node -e 'const r=require("./packages/pagopa-ui/src/catalog/figma/registry.json");const n=Object.values(r.entries).map(e=>(e.note||"").length);console.log("notes>600",n.filter(x=>x>600).length,"chars",n.reduce((a,b)=>a+b,0))'
```

Record: total words, skill count, long notes (expected 41) and total note
characters (expected about 70,000).

Done when: the numbers are in the report as "before".

### 2. Command-aware docs check (write it before fixing, so it finds the list)

Extend `packages/ui-cli/src/checks/doc-links.ts`. For the Markdown files it
already scans that are **not** links-only (`AGENTS.md`, `CONTRIBUTING.md`,
`README.md`, the package README and CHANGELOG, the skills), and for
`packages/pagopa-ui/figma-to-code.yaml`, find commands in code spans and in
fenced code blocks:

1. `pnpm nx run <project>:<target>` (and `pnpm nx run-many … -p <projects> -t <targets>`):
   the project must exist and have the target. Read the real project graph
   once: `nx show projects --json`, then `nx show project <name> --json` per
   project named in the documents, using the workspace's own `nx` binary
   (`node_modules/.bin/nx`). Cache the results for the run. A target with a
   configuration (`build:ci`) is checked without it.
2. `pnpm <word>` where `<word>` is not a pnpm built-in: the root `package.json`
   must have that script. Built-ins: `install`, `add`, `remove`, `exec`, `dlx`,
   `nx`, `run`, `why`, `list`, `update`, `outdated`, `--filter`, `-r`, `-w`.
3. `pnpm --filter <name> run <script>`: the package must exist and have the
   script.
4. Skip any command containing a placeholder (`<…>`, `…`, `$`).
5. When the workspace has no `nx.json` (the regression fixtures build their
   own tree), skip the Nx part.

Add a unit test with a fixture document naming one existing and one missing
target, and one root script that doesn't exist.

Done when: `pnpm nx run pagopa-ui:docs` now **fails**, and its output lists at
least `pnpm storybook` and `pnpm docs:check`. Paste the list in the report.

### 3. Fix every stale reference

Fix all the errors the check reports, plus these known ones:

| File                                                        | Wrong                                         | Right                                                                                               |
| ----------------------------------------------------------- | --------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| `.agents/skills/figma-to-code/SKILL.md` ("Config first")    | the YAML is "at the repository root"          | find it with `git ls-files '*figma-to-code.yaml'`; paths in it are relative to its folder           |
| `.agents/skills/figma-to-code/references/init.md` (line 3)  | "exists at the repository root"               | "exists (one per repository)"                                                                       |
| `.agents/skills/figma-to-code/references/parity-tooling.md` | `source.mjs`, `render.mjs`, `diff.mjs`        | the module names without the extension: "the source reader", "the render module", "the diff module" |
| `.agents/skills/figma-to-code/references/visual-parity.md`  | `pnpm storybook`                              | `pnpm nx run pagopa-ui-storybook:storybook`                                                         |
| `.agents/skills/pagopa-ui-standards/SKILL.md`               | `pnpm storybook`                              | `pnpm nx run pagopa-ui-storybook:storybook`                                                         |
| `packages/pagopa-ui/figma-to-code.yaml` (header comment)    | `pnpm docs:check`                             | `pnpm nx run pagopa-ui:docs`                                                                        |
| `packages/tokens/src/foundation-baseline.json` (`note`)     | `node scripts/check-foundation.mjs --measure` | `pnpm nx run pagopa-ui:foundation:check -- --measure`                                               |

The skill must stay free of repository paths, so name modules by role, not by
path. Check that the `--measure` command really works before writing it; if
the flag must be passed differently, write the form that works.

Done when: `pnpm nx run pagopa-ui:docs` passes.

### 4. Traps that become foundation rules

In `packages/ui-cli/src/checks/foundation.ts`, add two rules to `RULES`:

- `shadow-scale`: `/\bshadow-(?:2xs|xs|sm|md|lg|xl|2xl)\b/g` — elevation comes
  only from the Figma shadow tokens.
- `center-overflow`: a single string literal containing both `justify-center`
  and `overflow-(x-|y-)?(auto|scroll)`, in either order. Write it as two
  alternatives in one regex, limited to one quoted string (`"[^"\n]*"`).

Then:

1. Run `pnpm nx run pagopa-ui:foundation:check -- --measure` and set the two
   new counts in `foundation-baseline.json`. Expected: `shadow-scale` 3 (all
   in the Figma templates), `center-overflow` 0. Do not touch any other count.
2. Add a unit test per rule (one hit, one miss).
3. In `visual-parity.md`, "Paint", replace the shadow bullet with: "Elevation
   comes only from the Figma shadow scale; the foundation check rejects
   Tailwind shadows (`shadow-scale`)."
4. In `devices.md`, replace the section "`justify-center` with overflow hides
   the first item" with one line under the nearest list: "A centred scrollable
   list uses `justify-center-safe`; the foundation check rejects the unsafe
   form (`center-overflow`)."
5. `font-medium` is already caught by `font-weight`: shorten the first
   Typography bullet in `visual-parity.md` to the face mapping and "the
   foundation check rejects `font-medium`".

Done when: `pnpm nx run pagopa-ui:foundation:check` and
`pnpm nx run pagopa-ui-cli:test` pass, and adding `shadow-md` to any component
makes `foundation:check` fail. Revert the probe.

### 5. Registry note ratchet

1. Find where `figma:check` validates the registry (`packages/ui-cli/src/cli.ts`,
   the `figmaCheck` function, and the note schema in
   `packages/ui-cli/src/schemas/catalogue.ts`).
2. Add a ratchet: count the registry notes longer than 600 characters and fail
   when the count is **above** the value stored in
   `packages/pagopa-ui/src/catalog/figma/note-length-baseline.json`
   (`{ "maxLength": 600, "overLimit": <today's count>, "note": "…" }`). The
   note says: lower `overLimit` when you shorten notes; never raise it; a note
   records the current state and its residues, not history.
3. Fail **also** when the count is below the baseline, with the message "lower
   overLimit to <n>", so the ratchet tightens.
4. Unit test: a fixture registry over and under the baseline.
5. Add one sentence to `.agents/skills/figma-to-code/references/catalogue.md`
   where it describes the `note` field: "A note stays under 600 characters: it
   states the current residues and their reasons, not the history."

Done when: `pnpm nx run pagopa-ui:figma:check` passes, and a probe that pads
one short note past 600 characters makes it fail. Revert the probe.

### 6. Remove the Nx Cloud skills

```sh
git rm -r .github/skills/monitor-ci .github/skills/nx-cloud-api \
  .github/skills/nx-cloud-cache-investigator .github/skills/nx-cloud-ci-failure-review
```

Search for references (`git grep -n 'monitor-ci\|nx-cloud-api\|nx-cloud-cache\|nx-cloud-ci-failure'`)
outside `.github/skills`. If any non-generated file names them, remove the
reference. If `AGENTS.md` names them inside the `nx configuration` block, leave
that block alone: Nx regenerates it. Write it in the report.

Done when: the grep prints nothing outside the Nx-managed block.

### 7. Measure again and trim

1. Re-run the step 1 commands.
2. If the skill and reference word total did not drop, look for paragraphs in
   `figma-to-code/references/{devices,parity-tooling,visual-parity}.md` that
   restate a rule a check now enforces (the checks' error messages say the
   rule). Replace each with one line naming the check. Never remove a rule
   that no check enforces.

Done when: the docs check passes and the after-numbers are in the report.

## Acceptance

Quick:

```sh
pnpm nx run-many -p pagopa-ui-cli,pagopa-ui-tokens -c=ci -t fmt,lint,typecheck
pnpm nx run-many -p pagopa-ui -t docs,foundation:check,figma:check
pnpm nx run pagopa-ui-cli:test
```

Heavy: none beyond the full green chain (rule 22).

## Stop conditions

- The command check needs more than 2 seconds per project, so `docs` gets
  noticeably slower. Report the timing and continue with the cached graph only
  if you can read it without spawning Nx; otherwise keep the slower version
  and report.
- `shadow-scale` or `center-overflow` matches outside the templates in a way
  that needs a component change: record the count in the baseline and list
  the files, but don't change components.

## Commits

1. `feat(ui-cli): check commands named in docs and skills`
2. `docs: fix stale paths and commands in skills and contributor docs`
3. `feat(ui-cli): enforce the shadow scale and safe centring`
4. `feat(ui-cli): ratchet long registry notes`
5. `chore: remove the Nx Cloud skills`
6. `docs(skills): replace enforced prose with check names`
7. `docs(plans): report action 07`

## Report additions

- Before and after: words in skills and docs, skill count, long notes.
- The full list of stale references the new check found.
- Person step: none.
