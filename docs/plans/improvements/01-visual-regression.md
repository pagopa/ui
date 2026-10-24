# Action 01 — Gating visual regression

| Field         | Value                                                          |
| ------------- | -------------------------------------------------------------- |
| Branch        | `improve/01-visual-regression`                                 |
| Worktree      | `../pagopa-ui-imp-01`                                          |
| Ports         | Storybook 6101 · static server 6201                            |
| Depends on    | nothing                                                        |
| Person gate   | none to start; `G-VIS` (baselines) before merge                |
| Report source | [../improvements.md](../improvements.md), the "visual" finding |

## State on 2026-10-24

- `apps/storybook` already declares `playwright@1.63.0`; `@playwright/test` is
  not installed yet.
- A previous build left `apps/storybook/dist/index.json`: **467 stories** in 95
  story files, none tagged `no-visual`.
- `.gitignore` already ignores `test-results/` and `playwright-report/` at the
  repository root, so step 6 only has to set `outputDir`.
- `chromatic.yml` still runs on the `chromatic` label with
  `exitZeroOnChanges: true`, as the "Decisions" assume.
- The Storybook build is `pnpm nx run pagopa-ui-storybook:build`, which writes
  `apps/storybook/dist`; it is unchanged. The dev server takes its port from
  `PORT=6101` (the table's 6101 still applies).

## Goal

A pixel change in any story fails a required CI check, before review. Today
visual fidelity is proven only by parity sessions and by Chromatic, which is
opt-in and never fails (`exitZeroOnChanges: true`). Token-first refactors
(actions 02, 04 and 08) need this gate to prove they changed nothing.

## Decisions (final, do not reopen)

- Use **Playwright `toHaveScreenshot`** with baselines committed to the
  repository. No SaaS, no new secret.
- Baselines are produced **only on Linux, in the official Playwright
  container** `mcr.microsoft.com/playwright:v1.63.0-noble`, by the CI workflow.
  Never commit a baseline produced on macOS.
- Capture **every story** in `apps/storybook/dist/index.json` except those
  tagged `no-visual`, at widths **320, 600 and 1200** (height 900).
- Zero tolerance: `maxDiffPixels: 0`. Stability comes from a deterministic
  page, not from a threshold.
- Chromatic stays as it is. Do not edit `chromatic.yml` or the `chromatic`
  parameters in `.storybook/preview.tsx`.

## Ownership

Allowed:

- `apps/storybook/visual/**` (new)
- `apps/storybook/package.json` (devDependency and scripts)
- `apps/storybook/project.json` (new targets only)
- `apps/storybook/src/FigmaInventory.stories.tsx` and
  `apps/storybook/src/Foundations.stories.tsx` (the `no-visual` tag only)
- `.github/workflows/visual.yml` (new)
- `pnpm-lock.yaml`
- `.gitignore` (the test-results folder only)
- `CONTRIBUTING.md` (a "Visual regression" subsection, and the green chain if
  step 7 asks)
- `docs/plans/improvements/reports/01.md`

Forbidden: everything else, in particular `.github/workflows/deep-checks.yml`
(owned by action 05), `.storybook/preview.tsx` (owned by action 09) and any
component source.

## Steps

### 1. Measure

```sh
pnpm nx run pagopa-ui-storybook:build
node -e 'const j=require("./apps/storybook/dist/index.json");const s=Object.values(j.entries).filter(e=>e.type==="story");console.log("stories",s.length)'
```

Record the story count and the build time in the report as "before". The build
measured on 2026-10-24 reports 467 stories; re-measure, don't trust the number.

Done when: both numbers are in your notes.

### 2. Tag the stories that must not be captured

Add `tags: ["no-visual"]` to the default export (`meta`) of
`FigmaInventory.stories.tsx` and `Foundations.stories.tsx`. If the meta already
has `tags`, append `"no-visual"` to the array. These pages are catalogues of
other stories and of tokens: they change whenever anything changes.

Done when: `grep -n no-visual apps/storybook/src/FigmaInventory.stories.tsx apps/storybook/src/Foundations.stories.tsx`
prints two lines and `pnpm nx run pagopa-ui-storybook:typecheck` passes.

### 3. Add the dependency and the static server

1. In `apps/storybook`, add `@playwright/test` at exactly the version of the
   `playwright` devDependency already there (`1.63.0`):
   `pnpm --filter pagopa-ui-storybook add -D @playwright/test@1.63.0`.
2. Create `apps/storybook/visual/serve.mjs`: a dependency-free Node static
   server (`node:http`, `node:fs`, `node:path`) that serves
   `apps/storybook/dist` on `process.env.VISUAL_PORT ?? 6201`. It must:
   - map `/` to `index.html`;
   - set `Content-Type` for `.html`, `.js`, `.mjs`, `.css`, `.json`, `.svg`,
     `.png`, `.woff2` and `.woff`;
   - return 404 for missing files and refuse paths escaping the folder (`..`).

Done when: `node apps/storybook/visual/serve.mjs &` then
`curl -sf http://localhost:6201/index.json | head -c 100` prints JSON; stop the
server afterwards.

### 4. Write the Playwright config

Create `apps/storybook/visual/playwright.config.ts`:

- `testDir: "."`, `testMatch: "visual.spec.ts"`;
- `fullyParallel: true`; `workers: process.env.CI ? 4 : 2`; `retries: 0`;
- `reporter: process.env.CI ? [["list"], ["html", { open: "never" }]] : [["list"]]`;
- `snapshotPathTemplate: "{testDir}/__screenshots__/{arg}{ext}"`;
- `expect.toHaveScreenshot`: `{ maxDiffPixels: 0, animations: "disabled", caret: "hide", scale: "css" }`;
- `use`:
  - `baseURL: \`http://localhost:${process.env.VISUAL_PORT ?? 6201}\``;
  - `locale: "it-IT"`, `timezoneId: "Europe/Rome"`;
  - `colorScheme: "light"`, `reducedMotion: "reduce"`, `deviceScaleFactor: 1`;
- one project `chromium` (`browserName: "chromium"`);
- `webServer`: `{ command: "node serve.mjs", url: baseURL + "/index.json", reuseExistingServer: !process.env.CI }`.

Done when: `pnpm --filter pagopa-ui-storybook exec playwright test -c visual/playwright.config.ts --list`
runs without a config error (it lists zero tests until step 5).

### 5. Write the spec

Create `apps/storybook/visual/visual.spec.ts`:

1. At module load, read `../dist/index.json` with `node:fs`. Keep entries with
   `type === "story"` and without the `no-visual` tag. Sort them by `id`.
2. For each story, and for each width in `[320, 600, 1200]`, declare
   `test(\`${story.id} @${width}\`, …)` that:
   1. sets the viewport to `{ width, height: 900 }`;
   2. installs a fixed clock before navigating:
      `await page.clock.install({ time: new Date("2025-01-15T10:00:00+01:00") })`;
   3. opens `/iframe.html?id=${story.id}&viewMode=story`;
   4. waits for `document.fonts.ready` and for the story to finish rendering
      and playing:

      ```ts
      await page.waitForFunction(() => {
        const render = (window as any).__STORYBOOK_PREVIEW__?.currentRender
        return render && ["completed", "played"].includes(render.phase)
      })
      ```

      If `currentRender` is undefined in this Storybook version, wait for the
      `storyRendered` event on `window.__STORYBOOK_ADDONS_CHANNEL__` instead,
      and write which one you used in the report;

   5. waits for `page.waitForLoadState("networkidle")`;
   6. asserts
      `await expect(page).toHaveScreenshot(\`${story.id}-${width}.png\`, { fullPage: true })`.
3. A story whose render phase is `errored` fails the test with the story id in
   the message.

Done when: `--list` (step 4 command) prints three tests per story, and the
count equals 3 × (stories − `no-visual` stories).

### 6. Nx targets and scripts

1. In `apps/storybook/package.json` add the scripts:
   - `"test:visual": "playwright test -c visual/playwright.config.ts"`
   - `"test:visual:update": "playwright test -c visual/playwright.config.ts --update-snapshots=all"`
2. In `apps/storybook/project.json` add the targets `test:visual` and
   `test:visual:update`, each with `"dependsOn": ["build"]` and
   `"cache": false`.
3. Add `apps/storybook/visual/test-results/` and
   `apps/storybook/visual/playwright-report/` to `.gitignore`. The root already
   ignores `test-results/` and `playwright-report/`, so this is a no-op unless
   the patterns were narrowed; keep it as written. Set `outputDir` in the
   config to `test-results` so the results land there.

Done when: `pnpm nx show project pagopa-ui-storybook --json | grep -c test:visual`
prints at least 2.

### 7. Prove determinism locally (Chromium on the host)

Host screenshots are never committed. They only prove the page is stable.

1. Under the heavy lock, generate host baselines into a temporary folder that
   git ignores:

   ```sh
   cd apps/storybook && VISUAL_SNAPSHOT_DIR=/tmp/pagopa-ui-visual-01 \
     pnpm exec playwright test -c visual/playwright.config.ts --update-snapshots=all
   ```

   To support this, make `snapshotPathTemplate` use
   `process.env.VISUAL_SNAPSHOT_DIR ?? "{testDir}/__screenshots__"` as its
   folder.

2. Run the same command **twice more without** `--update-snapshots`. Both runs
   must pass with zero failures.
3. For each story that fails on a re-run (an unstable story), fix the cause in
   the **spec only**. Allowed fixes, in this order:
   - waiting for a selector or an image `complete` state;
   - `mask` for a region that renders live data (a clock, a random id). List
     each mask in the report.
   - If a story still flakes after two attempts, add its id to a constant
     `UNSTABLE` in the spec, skip it there with a comment naming the cause,
     and list it in the report. At most 10 stories in total; over 10 is a
     stop condition.
4. Record the folder size: `du -sh /tmp/pagopa-ui-visual-01`. Delete the folder
   afterwards.

Done when: two consecutive runs pass with zero failures, and the size is in the
report.

### 8. CI workflow

Create `.github/workflows/visual.yml`. Copy the trigger, concurrency, draft and
`nx-release/` conditions from the `coverage` job of `deep-checks.yml`
(read-only), with the same pinned action SHAs. Differences:

- Trigger: also `pull_request` type `labeled`, to support the update mode.
- One job `visual`, `name: Visual regression`, `runs-on: ubuntu-24.04`, with
  `container: { image: mcr.microsoft.com/playwright:v1.63.0-noble, options: --ipc=host }`.
- Steps: checkout (`fetch-depth: 0`), pnpm, node (`node-version-file: .node-version`,
  `cache: pnpm`), `setup-npm-registry`, `pnpm install --frozen-lockfile`. Do
  not install browsers: the image has them.
- **Check mode** (every trigger except the update mode): fail early with a
  clear message when `apps/storybook/visual/__screenshots__` has no PNG, then
  run `pnpm nx run pagopa-ui-storybook:test:visual`.
- **Update mode** (`github.event.label.name == 'visual:update'` on a pull
  request from the same repository): run `test:visual:update`, then commit the
  folder `apps/storybook/visual/__screenshots__` to the pull request head
  branch with plain `git` (user `github-actions[bot]`,
  `41898812+github-actions[bot]@users.noreply.github.com`), message
  `test(visual): update baselines`. The job needs `contents: write` in this
  mode only; use two jobs if a conditional permission is not possible.
- On failure, upload `apps/storybook/visual/test-results` and
  `playwright-report` as an artifact (`actions/upload-artifact`, pinned SHA,
  `retention-days: 7`).
- Add a header comment of at most 8 lines: what it gates, how to update the
  baselines (the label), and that a commit made by the workflow does not
  trigger a new run, so the person re-runs the check.

Done when: `pnpm exec actionlint .github/workflows/visual.yml` passes if
actionlint is installed; otherwise the YAML parses with
`node -e "require('yaml').parse(require('fs').readFileSync('.github/workflows/visual.yml','utf8'))"`
(use whatever YAML parser `node_modules` has) and `pnpm nx run pagopa-ui:docs`
passes.

### 9. Document

Add a subsection "Visual regression" to `CONTRIBUTING.md`, after "The green
chain", of at most 15 lines:

- what the check captures (stories, widths, Linux container);
- that a visual change is accepted by adding the `visual:update` label to the
  pull request and reviewing the committed images;
- that baselines are never produced on macOS;
- the local command, which needs Docker and the CI image:

  ```sh
  docker run --rm --ipc=host -v "$PWD":/work -w /work/apps/storybook \
    mcr.microsoft.com/playwright:v1.63.0-noble \
    pnpm exec playwright test -c visual/playwright.config.ts
  ```

Do not add `test:visual` to the green chain: it needs Linux, so CI is the gate.

Done when: `pnpm nx run pagopa-ui:docs` passes.

## Acceptance

Quick:

```sh
pnpm nx run-many -p pagopa-ui-storybook -c=ci -t fmt,lint,typecheck
pnpm nx run pagopa-ui:docs
cd apps/storybook && pnpm exec playwright test -c visual/playwright.config.ts --list | tail -1
```

Heavy (under the lock): the two consecutive local runs of step 7.

## Stop conditions

- More than 10 unstable stories after step 7.
- The temporary baseline folder exceeds **80 MB**. Report the size and the 10
  largest files; do not change widths or capture mode yourself.
- `__STORYBOOK_PREVIEW__` and the channel event are both unavailable.

## Commits

1. `test(storybook): tag catalogue stories as no-visual`
2. `test(storybook): add the Playwright visual regression suite`
3. `ci: gate pull requests on visual regression`
4. `docs: explain the visual regression workflow`
5. `docs(plans): report action 01`

## Report additions

- Story count, test count, local run time, temporary baseline size.
- The list of masks and `UNSTABLE` stories, each with its cause.
- Person steps, in order:
  1. Push the branch and open the pull request.
  2. Add the `visual:update` label. The workflow commits the Linux baselines.
  3. Review a sample of the images, remove the label and re-run the check.
  4. Merge. This satisfies gate `G-VIS`.
  5. Make `Visual regression` a required check.
