# Action 10 — Public token contract

| Field         | Value                                                                 |
| ------------- | --------------------------------------------------------------------- |
| Branch        | `improve/10-public-tokens`                                            |
| Worktree      | `../pagopa-ui-imp-10`                                                 |
| Ports         | Storybook 6110 · static server 6210                                   |
| Depends on    | 03 merged (per-module build) and 08 merged (last change to `emitCss`) |
| Person gate   | none                                                                  |
| Report source | [../improvements.md](../improvements.md), the "consumer DX" finding   |

## Goal

`dist/styles.css` already ships the Figma variables as `:root` custom
properties (`--figma-color-blue-100`, `--figma-z-20`…, about 130). Nothing says
they are public, nothing types them, and nothing stops a rename from breaking a
consumer silently. A consumer who builds a page section next to the library has
no supported way to match its colours and spacing.

After this action:

- `@pagopa/ui/tokens.css` ships only the `:root` token block, for consumers
  that don't load the component stylesheet;
- `@pagopa/ui/tokens` exports the typed token list (`figmaTokens`,
  `figmaTokenSource`, `FigmaToken`);
- `packages/pagopa-ui/etc/tokens.txt` lists every public token name, and a
  check fails when the list and the build differ, so a rename is a reviewed
  diff with a changelog line;
- a guide explains how to use the tokens.

## Decisions (final, do not reopen)

- Public names are the existing `--figma-*` custom properties, unchanged. The
  Tailwind theme variables (`--color-*`, `--spacing-*`, `--text-*`…) stay
  internal.
- The tokens are a **read-only** contract: overriding them to theme the
  components is not supported and the guide says so.
- `tokens.css` is generated from the manifest by the existing generator (one
  new emitter that shares the `:root` code with `emitCss`), committed in the
  tokens package as `packages/tokens/src/tokens.generated.css` and verified by
  `tokens:check`, then copied into `dist` by the build.
- The JS entry re-exports the tokens package; its declarations must not import
  the private `pagopa-ui-tokens` package.

## Ownership

Allowed:

- `packages/ui-cli/src/figma/tokens.ts` (a new `emitRootCss`, used by
  `emitCss`; the `--check`/`--write` file list)
- `packages/tokens/src/tokens.generated.css` (new)
- `packages/ui-cli/src/checks/public-tokens.ts` (new), its test,
  `packages/ui-cli/src/cli.ts`, `packages/ui-cli/package.json` (one script)
- `packages/ui-cli/src/commands/prepare-types.ts` (only if step 3 needs it)
- `packages/ui-cli/src/checks/{library.ts, library-artifact.ts}`
- `packages/pagopa-ui/src/tokens.ts` (new)
- `packages/pagopa-ui/{vite.config.ts, tsconfig.lib.json, package.json, project.json}`
- `packages/pagopa-ui/etc/tokens.txt` (new)
- `apps/storybook/src/guides/tokens.md` (new) and the guide index, if guides
  are listed somewhere
- `packages/pagopa-ui/README.md` (one short section)
- `packages/pagopa-ui/CHANGELOG.md`, `.nx/version-plans/**`
- `docs/plans/improvements/reports/10.md`

## Steps

### 1. Measure

```sh
grep -c '^  --figma-' packages/tokens/src/figma.generated.css
grep -oE -- '--figma-[a-z0-9-]+:' packages/pagopa-ui/dist/styles.css | sort -u | wc -l
```

(Build first under the lock if `dist` is missing.) Record both counts. If they
differ, list the names that are in the generator but not in `dist`: the build
drops unused variables, and the public list must be the generator's.

Done when: both counts and the difference are in the report.

### 2. `tokens.css`

1. In `packages/ui-cli/src/figma/tokens.ts`, extract the code of `emitCss` that
   writes the header comment and the `:root { … }` block into
   `emitRootCss(manifest)`. `emitCss` calls it, so its output doesn't change.
2. Add `packages/tokens/src/tokens.generated.css` to both modes of
   `runTokens`: `--write` writes `emitRootCss(manifest)`, `--check` compares it
   like the other generated files.
3. Create the file once from the manifest: run a temporary script (never
   committed) that imports `emitRootCss` and writes it, or copy the `:root`
   block of `figma.generated.css` by hand. `tokens:check` proves it.
4. Export it from the tokens package (`"./tokens.generated.css"` in
   `packages/tokens/package.json` `exports`).
5. In `packages/pagopa-ui/vite.config.ts`, add the file to the existing
   asset-emitting plugin (the one that emits the licenses) as `tokens.css`.
6. Test: `emitCss(manifest).startsWith(emitRootCss(manifest))` or the
   equivalent containment, in the existing token tests.

Done when: `pnpm nx run pagopa-ui-tokens:test` and `pnpm nx run pagopa-ui-cli:test`
pass, and after a build `packages/pagopa-ui/dist/tokens.css` exists.

### 3. `@pagopa/ui/tokens`

1. `packages/pagopa-ui/src/tokens.ts`:

   ```ts
   export {
     figmaTokens,
     figmaTokenSource,
     type FigmaToken,
     type FigmaTokenType,
   } from "pagopa-ui-tokens"
   ```

2. Make it a second library entry in `vite.config.ts` (`lib.entry` becomes an
   object with the existing entry and `tokens`), and adapt the
   `entryFileNames` written by action 03 so the outputs are `pagopa-ui.js` and
   `tokens.js`.
3. Add `src/tokens.ts` to `include` in `tsconfig.lib.json`.
4. Build, then check `dist/types/tokens.d.ts`. If it imports
   `pagopa-ui-tokens`, extend `prepare-types` to copy the referenced generated
   declaration next to it and rewrite the specifier to the relative path.
5. `package.json` `exports`:

   ```json
   "./tokens": { "types": "./dist/types/tokens.d.ts", "import": "./dist/tokens.js" },
   "./tokens.css": "./dist/tokens.css"
   ```

Done when: after a build,
`grep -rl pagopa-ui-tokens packages/pagopa-ui/dist` prints nothing, and
`node --input-type=module -e "import('./packages/pagopa-ui/dist/tokens.js').then(m => console.log(m.figmaTokens.length))"`
prints a number above 100.

### 4. The contract check

1. `packages/ui-cli/src/checks/public-tokens.ts`, registered as
   `node src/cli.ts check public-tokens [--write]`, following the other
   checks. It builds the sorted list:
   - every `--figma-*` name declared in `packages/tokens/src/tokens.generated.css`;
   - every `cssName` of `figmaTokens`, prefixed `js:`.

   It compares the list with `packages/pagopa-ui/etc/tokens.txt`. `--write`
   rewrites the file. A difference prints the added and removed names and
   says: "a removed or renamed token is a breaking change: add a CHANGELOG line
   and a `minor` version plan, then run with `--write`".

2. Script `"tokens:public:check"` in the ui-cli `package.json`, target
   `tokens:public:check` in `packages/pagopa-ui/project.json` (same shape as
   `foundation:check`), added to `test.dependsOn`.
3. Run `--write` once to create `etc/tokens.txt` (this step allows it).
4. Tests: added name, removed name, identical lists.
5. In `library-artifact.ts`, assert `dist/tokens.css`, `dist/tokens.js` and
   `dist/types/tokens.d.ts` exist. In `library.ts`, extend the consumer import
   check to import `@pagopa/ui/tokens` and assert `figmaTokens.length > 0`.

Done when: `pnpm nx run pagopa-ui:tokens:public:check` passes, and removing one
line from `etc/tokens.txt` makes it fail (restore it).

### 5. Guide and README

1. `apps/storybook/src/guides/tokens.md`, following the shape of the other
   guides (read two of them first):
   - what is public: the `--figma-*` properties and `@pagopa/ui/tokens`;
   - how to load them: with `styles.css` they are already there; without it,
     import `@pagopa/ui/tokens.css`;
   - one CSS example and one TS example (filter `figmaTokens` by `category`);
   - the tokens are read-only: overriding them is unsupported;
   - a rename or removal is a breaking change listed in the changelog.
     If guides are registered in a Storybook docs page or index, add it there.
2. `README.md`: three lines and a link to the guide.

Done when: `pnpm nx run pagopa-ui:docs` passes.

### 6. Release

- `CHANGELOG.md`, `### Added`: "`@pagopa/ui/tokens.css` and
  `@pagopa/ui/tokens`: the public, read-only token contract."
- Version plan `minor` (new public entries).

## Acceptance

Quick:

```sh
pnpm nx run-many -p pagopa-ui pagopa-ui-cli pagopa-ui-tokens -c=ci -t fmt,lint,typecheck
pnpm nx run pagopa-ui-tokens:test
pnpm nx run pagopa-ui:tokens:public:check
pnpm nx run pagopa-ui-cli:test
pnpm nx run pagopa-ui:docs
pnpm nx release plan:check
```

Heavy (under the lock): `pagopa-ui:build`, `pagopa-ui:library:check`.

## Stop conditions

- `emitCss` output changes after the extraction (`tokens:check` fails on
  `figma.generated.css`) and two attempts don't restore it.
- The second entry makes the build emit a duplicate of the component modules
  (more than 10% growth of the `dist` JS size).
- `prepare-types` needs more than about 60 changed lines.

## Commits

1. `feat(tokens): generate the standalone token stylesheet`
2. `feat(pagopa-ui): publish the token entries`
3. `feat(ui-cli): check the public token list`
4. `docs(storybook): add the tokens guide`
5. `chore(release): plan the public token contract`
6. `docs(plans): report action 10`

## Report additions

- The public token count (CSS and JS) and the size of `dist/tokens.css`.
- Whether `prepare-types` changed.
