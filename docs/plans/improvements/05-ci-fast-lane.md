# Action 05 — CI fast lane and one local verify command

| Field         | Value                                                            |
| ------------- | ---------------------------------------------------------------- |
| Branch        | `improve/05-ci-fast-lane`                                        |
| Worktree      | `../pagopa-ui-imp-05`                                            |
| Ports         | Storybook 6105 · static server 6205                              |
| Depends on    | nothing                                                          |
| Person gate   | none                                                             |
| Report source | [../improvements.md](../improvements.md), the "pipeline" finding |

## Goal

Shorten the pull request feedback loop without dropping a check:

1. The packed-artifact job runs **Chromium only** on pull requests; Firefox
   and WebKit run nightly and on dispatch, as the story suites already do.
2. The WebKit pass on pull requests stops repeating the accessibility
   conditions project, which the Chromium coverage pass already runs.
3. CI jobs stop repeating unit tasks that another job or workflow runs.
4. The four-line green chain becomes one command:
   `pnpm nx run workspace:verify`.
5. The three jobs share one composite setup action instead of 40 copied lines
   each.

## Decisions (final, do not reopen)

- Never rename a job `name:` in any workflow: branch protection requires them
  by name (`Coverage gates (Chromium)`, `Stories (WebKit, Firefox nightly)`,
  `Packed artifact (three engines)`). Update comments instead.
- The nightly schedule and `workflow_dispatch` keep the full matrix: three
  engines for the packed artifact, Firefox and WebKit for the stories.
- No remote cache and no sharding in this action.
- The verify command lives in a dedicated Nx project named `workspace` at
  `tools/workspace/project.json`, not in a root `project.json`, so the root
  folder doesn't become a project for `nx affected`.
- `library.spec.mjs` is not split in this action.

## Ownership

Allowed:

- `.github/workflows/deep-checks.yml`
- `.github/actions/setup/action.yml` (new)
- `packages/ui-cli/playwright.config.mjs`
- `packages/ui-cli/src/checks/library.ts` (only to pass the engine list through)
- `apps/storybook/vite.config.ts` (the `conditionInstances` function and the
  project names only)
- `apps/storybook/package.json` (the `test:webkit` script only)
- `apps/storybook/project.json` (`dependsOn` of `test:stories` and
  `test:webkit` only)
- `tools/workspace/project.json` (new)
- `CONTRIBUTING.md` ("The green chain" section only)
- `docs/plans/pipeline-proposal.md` (append a "Measured after action 05"
  section)
- `docs/plans/improvements/reports/05.md`

Forbidden: `.github/workflows/{validate.yaml, chromatic.yml, visual.yml}`,
any component, story or test file.

## Steps

### 1. Measure

1. CI timings of the last 10 successful `deep-checks.yml` runs on pull
   requests:

   ```sh
   gh run list --workflow deep-checks.yml --event pull_request --status success --limit 10 --json databaseId \
     | node -e 'for (const r of JSON.parse(require("fs").readFileSync(0))) console.log(r.databaseId)' \
     | while read id; do gh run view "$id" --json jobs \
       --jq '.jobs[] | [.name, ((.completedAt|fromdate) - (.startedAt|fromdate))] | @tsv'; done
   ```

   Record the median duration of each job. If `gh` is not authenticated, write
   "CI timings unavailable" and continue.

2. Local timings, each under the heavy lock, on a cold Nx cache
   (`--skip-nx-cache`):
   - `pnpm nx run pagopa-ui:library:check --skip-nx-cache`
   - `pnpm nx run pagopa-ui-storybook:test:webkit --skip-nx-cache`

Done when: the numbers are in the report as "before".

### 2. Engine selection for the packed artifact

1. In `packages/ui-cli/playwright.config.mjs`, filter `projects` by the
   environment variable `LIBRARY_ENGINES` (comma-separated, for example
   `chromium` or `chromium,firefox,webkit`). Unset means all three, so local
   runs and the green chain keep today's behaviour. An unknown engine name
   throws with the list of valid names.
2. If `packages/ui-cli/src/checks/library.ts` spawns Playwright with an
   explicit environment, make sure it forwards `LIBRARY_ENGINES`.

Done when:

- `LIBRARY_ENGINES=chromium pnpm --filter pagopa-ui-cli exec playwright test -c playwright.config.mjs --list`
  lists only chromium tests;
- the same command without the variable lists three engines.

### 3. Skip the duplicated conditions pass on the WebKit pull request run

1. Read `apps/storybook/vite.config.ts`. The stories project and the
   `storybook-conditions` project both run in every mode.
2. Give the stories project an explicit `name` if it has none (for example
   `storybook`). Change `test:webkit` in `apps/storybook/package.json` to
   `vitest --run --mode webkit --project storybook` (use the real name).
3. Leave `test:stories` (nightly Firefox and WebKit) and `test:coverage`
   (Chromium, with conditions) unchanged.

Done when:

- `pnpm --filter pagopa-ui-storybook exec vitest list --mode webkit --project storybook | wc -l`
  is lower than the same command without `--project`;
- `test:coverage` still lists the `storybook-conditions` tests
  (`vitest list --mode coverage | grep -c storybook-conditions` is above 0).

### 4. Remove duplicated task dependencies

`test:stories` and `test:webkit` depend on `pagopa-ui:figma:check`,
`pagopa-ui-artwork:test` and `pagopa-ui-tokens:test`. In CI, each deep-check
job re-runs those, although the Code Review workflow already runs the unit
checks.

1. Find out whether the stories need any **output** of those tasks:

   ```sh
   pnpm nx show project pagopa-ui-artwork --json | node -e 'const p=JSON.parse(require("fs").readFileSync(0));console.log(JSON.stringify(p.targets.test,null,1))'
   ```

   Do the same for `pagopa-ui-tokens:test` and `pagopa-ui:figma:check`. A task
   with `outputs` that a story imports must be replaced by the task that
   produces the output (for example `pagopa-ui-artwork:build`), not removed.

2. Replace the three entries with only the build tasks the stories need
   (possibly none; `typecheck` already depends on the artwork and tokens
   builds).
3. Prove it on a clean state, under the heavy lock:

   ```sh
   git status --short   # commit your work first: this must print nothing
   rm -rf packages/artwork/dist packages/tokens/dist
   pnpm nx reset
   pnpm nx run pagopa-ui-storybook:test:webkit
   ```

   It must pass.

Done when: the clean run passes and
`pnpm nx run pagopa-ui-storybook:test:webkit --graph=stdout` (or `nx graph`)
no longer lists the three unit tasks.

### 5. Composite setup action

1. Create `.github/actions/setup/action.yml` (`runs: using: composite`) with
   the inputs:
   - `token` (required): the `GITHUB_TOKEN` for the npm registry;
   - `browsers` (optional, default empty): the Playwright browsers to install.
     Empty means none.
2. The steps are the ones each job repeats today, copied verbatim with the same
   pinned SHAs: pnpm setup, Node setup, `nx-set-shas`, `setup-npm-registry`,
   `pnpm install --frozen-lockfile`, resolving the Playwright version, the
   browser cache (key including `inputs.browsers`), and
   `playwright install --with-deps ${{ inputs.browsers }}` — the last three only
   when `browsers` is not empty. Each `run` step needs `shell: bash`.
3. In `deep-checks.yml`, each job keeps its `actions/checkout` step (the action
   lives in the repository) and replaces the rest of its setup with
   `uses: ./.github/actions/setup`.

Done when: `deep-checks.yml` is shorter by at least 60 lines, and
`actionlint` passes on it if installed (otherwise the YAML parses).

### 6. Use the fast lane in `deep-checks.yml`

In the `library` job:

- Pull request and push: `browsers: chromium` and
  `LIBRARY_ENGINES=chromium` in the env of the `nx affected -t library:check`
  step.
- Schedule and dispatch: `browsers: chromium firefox webkit` and no
  `LIBRARY_ENGINES`.

Since the browsers differ by event, compute the list in a first step
(`echo "browsers=…" >> "$GITHUB_OUTPUT"`) and pass it to the setup action.
Update the header comment so it says which engines run on which event. Keep it
at most as long as it is today.

Done when: the YAML parses and the job names are byte-identical to before
(`git diff main -- .github/workflows/deep-checks.yml | grep '^[-+] *name:'`
shows no job-level `name:` change).

### 7. `workspace:verify`

1. Create `tools/workspace/project.json`:

   ```json
   {
     "$schema": "../../node_modules/nx/schemas/project-schema.json",
     "name": "workspace",
     "projectType": "application",
     "tags": ["type:tooling"],
     "targets": {
       "verify": {
         "executor": "nx:run-commands",
         "options": {
           "cwd": "{workspaceRoot}",
           "parallel": false,
           "commands": ["<line 1>", "<line 2>", "<line 3>", "<line 4>"]
         },
         "configurations": {
           "fast": {
             "commands": ["<line 1>", "<line 2>", "<line 3 without the stories and library:check>"]
           }
         },
         "cache": false
       }
     }
   }
   ```

   The commands are the green chain of `CONTRIBUTING.md`, split at each `&&`,
   one Nx command per array item, verbatim. `fast` drops the
   browser suites (`test:coverage`, `test:stories`, `library:check`) and the
   Storybook build.

2. Check that the new project doesn't change `nx affected` for existing work:
   `pnpm nx show projects` lists `workspace`, and
   `pnpm nx show projects --affected --base=main~1` doesn't list it unless
   `tools/workspace` changed.

Done when: `pnpm nx run workspace:verify -c fast` passes, and
`pnpm nx run workspace:verify` passes under the heavy lock.

### 8. Document

1. In `CONTRIBUTING.md`, "The green chain": start with
   `pnpm nx run workspace:verify` (and `-c fast` for the quick subset, which is
   never enough before a commit). Keep the expanded chain as "what it runs",
   unchanged.
2. Append to `docs/plans/pipeline-proposal.md` a section "Measured after
   action 05" with the before and after table. If CI timings were unavailable,
   leave a TODO line for the person with the step 1 command.

Done when: `pnpm nx run pagopa-ui:docs` passes.

## Acceptance

Quick:

```sh
pnpm nx run-many -p pagopa-ui-cli,pagopa-ui-storybook -c=ci -t fmt,lint,typecheck
pnpm nx run pagopa-ui:docs
pnpm nx run workspace:verify -c fast
```

Heavy (under the lock): `pnpm nx run workspace:verify` (this is also the
full green chain of rule 22).

## Stop conditions

- The clean run of step 4 fails for a reason other than a missing build
  output, after two attempts.
- A job `name:` would have to change.

## Commits

1. `test(ui-cli): choose packed-artifact engines with LIBRARY_ENGINES`
2. `test(storybook): run the conditions project once per pull request`
3. `build: drop duplicated unit dependencies of the story suites`
4. `ci: share the setup steps in a composite action`
5. `ci: run the packed artifact on Chromium for pull requests`
6. `build: add workspace:verify`
7. `docs: point the green chain at workspace:verify`
8. `docs(plans): report action 05`

## Report additions

- Before and after: CI job medians (or "unavailable"), local `library:check`
  and `test:webkit` times.
- Person steps:
  - after merge, compare the pull request durations of the next 5 runs;
  - confirm the nightly run still covers three engines (first scheduled run
    after the merge).
