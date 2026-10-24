# Action 03 — Per-module build and React Server Components

| Field         | Value                                                               |
| ------------- | ------------------------------------------------------------------- |
| Branch        | `improve/03-packaging-rsc`                                          |
| Worktree      | `../pagopa-ui-imp-03`                                               |
| Ports         | Storybook 6103 · static server 6203                                 |
| Depends on    | 02 and 04 merged (final export list, `UIProvider` with messages)    |
| Person gate   | none                                                                |
| Report source | [../improvements.md](../improvements.md), the "consumer DX" finding |

## State on 2026-10-24

- The build still emits a single `dist/pagopa-ui.js` (389,187 bytes) plus
  `dist/styles.css` (126,165 bytes) from `src/library-entry.ts`, which is
  `./library.css` + `export * from "./pagopa-ui"`.
- Source: 143 modules (tests and stories excluded), 4 with `"use client"`
  (`primitives/table.tsx`, `checkbox.tsx`, `dropdown-menu.tsx`, `select.tsx`),
  0 with the directive in `dist`.
- The classifier in "Decisions" matches **65** modules without the directive —
  below the stop condition of 120.
- `prepare-types` already inlines the artwork declarations and rewrites the
  `@/…` specifiers; it only runs on the public entry.
- The packed-artifact spec is `packages/ui-cli/tests/e2e/library.spec.mjs` (not
  `tests/library.spec.mjs`); the Vite consumer fixture is
  `packages/ui-cli/tests/fixtures/library-consumer`.
- `next` is not a dependency of any workspace package.

## Goal

`@pagopa/ui` ships one minified 389 KB file, `dist/pagopa-ui.js`, with no
`"use client"` directive. Two consumer problems follow:

- In a Next.js App Router page (a Server Component by default), importing any
  component fails or forces the consumer to wrap the library in their own
  client module.
- A consumer bundler sees one module; the client boundary pulls the whole
  library into every page that uses one component.

After this action the package ships one ES module per source module, each
client module starts with `"use client"`, a check proves no client module lacks
the directive, and the packed-artifact check builds a real Next.js App Router
consumer.

## Decisions (final, do not reopen)

- Rolldown output with `preserveModules: true` and
  `preserveModulesRoot: "src"`. The entry stays `dist/pagopa-ui.js`; the
  `exports` map doesn't change in this action.
- The directive is per module, not on the entry. The entry (barrel) has no
  directive, so a Server Component can import from it.
- A module is a client module when its own source contains any of: a React
  hook call (`use[A-Z]\w*(`), `createContext`, an event handler prop written in
  JSX (`on[A-Z]\w*=`), a browser global (`window.`, `document.`), or an import
  from `@base-ui/react` or `react-day-picker`. Only direct triggers count:
  rendering another client component doesn't make a module client. The check
  implements this list; nothing else.
- When the build drops source directives, write a small local Rolldown
  plugin (`renderChunk`) that adds `"use client";` to a chunk whose source
  module begins with it. No new plugin dependency.
- The Next.js fixture uses the App Router, `next build` only (no server run),
  and a Server Component page that renders: a server-safe component (one with
  no client trigger, if any exists), a client component (`Button`), and
  `UIProvider`.
- `next` becomes a devDependency of `pagopa-ui-cli` so the fixture version is
  pinned by the workspace lockfile.

## Ownership

Allowed:

- `packages/pagopa-ui/vite.config.ts` (the `build` block and one local plugin)
- `packages/pagopa-ui/package.json` (`sideEffects` only, if step 3 needs it)
- `packages/pagopa-ui/src/**/*.ts{,x}` — adding or removing the
  `"use client"` first line only
- `packages/ui-cli/src/checks/{library.ts, library-artifact.ts}`
- `packages/ui-cli/src/checks/client-directives.ts` (new), its test,
  `packages/ui-cli/src/cli.ts`, `packages/ui-cli/package.json` (one script and
  the `next` devDependency), `pnpm-lock.yaml`
- `packages/ui-cli/tests/fixtures/library-rsc-consumer/**` (new)
- `packages/ui-cli/tests/e2e/library.spec.mjs` (only if a path it reads moves)
- `packages/pagopa-ui/project.json` (one target and one `test.dependsOn` entry)
- `packages/pagopa-ui/README.md` (a "Next.js" usage section)
- `packages/pagopa-ui/CHANGELOG.md`, `.nx/version-plans/**`
- `docs/plans/improvements/reports/03.md`

## Steps

### 1. Measure

Under the heavy lock:

```sh
pnpm nx run pagopa-ui:build
ls -la packages/pagopa-ui/dist/*.js | head
find packages/pagopa-ui/dist -name '*.js' | wc -l
grep -rl '"use client"' packages/pagopa-ui/src | wc -l
grep -rlE "^['\"]use client" packages/pagopa-ui/dist --include=*.js | wc -l
```

Record: the entry size, the JS file count, source and dist directive counts,
and the duration of `pnpm nx run pagopa-ui:library:check`.

Done when: the numbers are in the report.

### 2. The `client-directives` check (report mode first)

1. Create `packages/ui-cli/src/checks/client-directives.ts`, registered in
   `cli.ts` as `node src/cli.ts check client-directives`, following the
   pattern of the other checks.
2. It walks `packages/pagopa-ui/src/**/*.{ts,tsx}`, excluding tests, stories,
   `*.unit.test.ts` and the catalogue JSON. For each file it decides
   "client" with the rules in "Decisions". A file made only of imports and
   re-exports is never client.
3. It reports two lists: `missing` (client, no directive) and `unneeded`
   (directive, no trigger). `--report` prints both and exits 0; the default
   exits 1 when `missing` is not empty. `unneeded` is a warning.
4. Tests with fixtures: a hook, `createContext`, an `onClick=`, a Base UI
   import, a pure component, a re-export barrel, a file with the directive and
   no trigger.

Done when: `node src/cli.ts check client-directives --report` (run in
`packages/ui-cli`) prints the lists; record their sizes.

### 3. Add the directives

1. Add `"use client"` as the first line of every file in `missing`. Don't
   reorder imports; the directive goes above the first comment.
2. Leave `unneeded` files as they are and list them in the report.
3. Script `"client:check": "node src/cli.ts check client-directives"` in
   `packages/ui-cli/package.json`, target `client:check` in
   `packages/pagopa-ui/project.json` (same shape as `foundation:check`), added
   to `test.dependsOn`.

Done when: `pnpm nx run pagopa-ui:client:check` passes.

### 4. Per-module build

1. In `packages/pagopa-ui/vite.config.ts`, under `build.rollupOptions`, add:

   ```ts
   output: {
     preserveModules: true,
     preserveModulesRoot: "src",
     entryFileNames: (chunk) =>
       chunk.name === "library-entry" ? "pagopa-ui.js" : "[name].js",
   },
   ```

   Keep `lib.fileName` and `cssFileName` so `dist/styles.css` is unchanged.

2. Build and verify:
   - `dist/pagopa-ui.js` exists and re-exports from `./components/...`;
   - `grep -rlE "^['\"]use client" packages/pagopa-ui/dist --include=*.js | wc -l`
     equals the source count of step 3 (± files that don't emit JS).
3. If the directive count in `dist` is 0, add the local plugin from
   "Decisions" to `plugins`, with a one-line comment; rebuild and re-check.
4. Third-party code bundled into `dist/node_modules/**` (if any) must not
   lose a directive it had: list those files in the report.
5. `dist/types` doesn't change: `prepare-types` still runs on the public entry.

Done when: `pnpm nx run pagopa-ui:build` passes and both checks above hold.

### 5. Adapt the packed-artifact check

1. In `library-artifact.ts`, update every assertion that assumes a single JS
   file (sizes, file lists, the "no demo export" scan) so it walks
   `dist/**/*.js`. Don't remove an assertion: rewrite its file selection.
2. Add an assertion: every `dist` JS file whose source module is in the
   `client-directives` client set starts with `"use client"`. Reuse the check's
   classifier instead of duplicating it.
3. `pnpm nx run pagopa-ui:library:check` under the lock.

Done when: the library check passes on all engines it runs.

### 6. Next.js App Router consumer

1. `pnpm --filter pagopa-ui-cli add -D next@latest`. Record the version.
2. Create `packages/ui-cli/tests/fixtures/library-rsc-consumer/`:
   - `app/layout.tsx` (Server Component): imports `__PAGOPA_UI_PACKAGE__/styles.css`,
     renders `<html lang="it"><body>{children}</body></html>`;
   - `app/page.tsx` (Server Component, no directive): imports from
     `__PAGOPA_UI_PACKAGE__` and renders `UIProvider` around a `Button` and,
     if step 2 found one, a server-safe component;
   - `next.config.mjs`: `export default {}`;
   - `tsconfig.json`: the Next.js defaults (`"jsx": "preserve"`,
     `"moduleResolution": "bundler"`, the `next` plugin).
3. In `library.ts`, after the Vite consumer, copy this fixture into a second
   temporary folder, apply the same `__PAGOPA_UI_PACKAGE__` replacement, write
   its `package.json` (`file:` tarball, `react`, `react-dom`, `next` with the
   versions the existing `installedVersion` helper resolves; read `next` from
   the ui-cli package), install as the Vite consumer does, and run
   `pnpm exec next build`. A non-zero exit fails the check with the last 40
   lines of output.
4. Prove the check: temporarily remove `"use client"` from `button.tsx`, run
   the library check, see `next build` fail, restore it. Don't commit the
   temporary change.

Done when: `pnpm nx run pagopa-ui:library:check` passes with the Next build,
and the negative test in 6.4 failed.

### 7. Docs and release

1. `packages/pagopa-ui/README.md`: a "Next.js (App Router)" section: import the
   stylesheet in the root layout, use components from Server Components,
   `UIProvider` works in a layout. Five lines plus one code block.
2. `CHANGELOG.md`, `### Changed`: "The package ships one ES module per
   component with `"use client"` where needed; Server Components can import it."
3. Version plan `patch` (no API change).

Done when: `pnpm nx run pagopa-ui:docs` and `pnpm nx release plan:check` pass.

## Acceptance

Quick:

```sh
pnpm nx run-many -p pagopa-ui pagopa-ui-cli -c=ci -t fmt,lint,typecheck
pnpm nx run pagopa-ui:client:check
pnpm nx run pagopa-ui-cli:test
pnpm nx run pagopa-ui:docs
pnpm nx release plan:check
```

Heavy (under the lock): `pagopa-ui:build`, `pagopa-ui:library:check`.

## Stop conditions

- Step 2 reports more than 120 `missing` files, which means the heuristics are
  too broad: report the top triggers instead of adding directives.
- `preserveModules` breaks `dist/styles.css` (missing or different size by
  more than 2%).
- `next build` fails for a reason unrelated to the library (network, Next
  telemetry): set `NEXT_TELEMETRY_DISABLED=1` in the spawned env first; if it
  still fails, report the output.
- The library check takes more than twice its "before" duration.

## Commits

1. `feat(ui-cli): check the client directive of every module`
2. `fix(pagopa-ui): mark client modules with use client`
3. `build(pagopa-ui): emit one module per source file`
4. `test(ui-cli): assert directives in the packed artifact`
5. `test(ui-cli): build a Next.js App Router consumer`
6. `docs(pagopa-ui): document Next.js usage`
7. `docs(plans): report action 03`

## Report additions

- Before/after: entry size, JS file count, dist directive count, library
  check duration.
- The `unneeded` list, and the `next` version.
