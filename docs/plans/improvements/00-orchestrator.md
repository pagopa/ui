# Improvement plan — orchestrator

This folder turns the review in [../improvements.md](../improvements.md) into
twelve actions. Eleven are still open; action 12 (component rules and node
comments) is **merged** and stays as a record. One implementing agent executes
each open action, on its own branch and git worktree.

Who reads what:

- The **orchestrating agent** reads sections 1–5 of this file.
- Every **implementing agent** reads section 6 of this file, then its own action
  file. Nothing else is mandatory reading.

## Kickoff prompt (paste into a new session)

```text
You are the orchestrator of docs/plans/improvements/. Read
docs/plans/improvements/00-orchestrator.md and execute its section 4
("Orchestrator procedure") from the start. Do not implement actions yourself:
delegate each one to a sub-agent as the file describes, verify their results
and stop with the status report of section 5.
```

Manual alternative, without the orchestrator: create the worktree as in
section 4.3, start a session inside it, and paste the sub-agent prompt of
section 4.3 with the placeholders filled in.

## 0. State of the plans (measured 2026-10-24, `main` at `56ee17d`)

No action 01–11 is merged: there is no
`apps/storybook/visual`, no `etc/pagopa-ui.api.md`, no `UIProvider`, no
`tools/workspace` project and no `client-directives`, `text-defaults`,
`public-tokens`, `a11y-conformance` or `api-report` check. Action 12 is merged:
`rules.json` holds 356 cards (43 imported, 36 recorded, 0 pending, 0 stale) and
`figma:rules:check` already runs `--strict`.

Some groundwork landed with action 12 and the M5 waves, and it changes the
starting point of several plans:

- the Figma evidence bundle is committed (`docs/figma-parity/manifest.json`,
  9.0 MB), so `G-EVD` is satisfied and `figma:parity:verify` passes;
- the API rename table is already `Approval: APPROVED` with every row `rename`,
  so `G-API` is satisfied;
- the command-aware `docs` check is in place (action 07, step 2) and
  `pnpm nx run pagopa-ui:docs` passes today;
- Storybook starts through `apps/storybook/scripts/storybook-dev.mjs`: the port
  comes from `PORT`, so use
  `PORT=61NN pnpm nx run pagopa-ui-storybook:storybook` instead of appending
  `-p 61NN`;
- the token theme still has no `--breakpoint-*: initial` and the components
  carry 119 Tailwind default breakpoint variants;
- the registry has 273 entries and 90 notes longer than 600 characters
  (127,682 characters in total).

Each action file carries its own "State on 2026-10-24" block with the numbers
to re-measure, and marks the steps that already landed.

---

## 1. The actions

| #   | File                                                     | Goal (one line)                                                                           | Depends on (merged) | Person gate before start |
| --- | -------------------------------------------------------- | ----------------------------------------------------------------------------------------- | ------------------- | ------------------------ |
| 01  | [01-visual-regression.md](./01-visual-regression.md)     | Gating screenshot regression of every story at 320/600/1200 (Playwright)                  | —                   | —                        |
| 02  | [02-public-api.md](./02-public-api.md)                   | Explicit exports, API report gate, approved renames, `UIProvider` with router links       | —                   | `G-API` satisfied        |
| 03  | [03-packaging-rsc.md](./03-packaging-rsc.md)             | Per-module build, `"use client"` check, Next.js App Router consumer                       | 02, 04              | —                        |
| 04  | [04-locale-provider.md](./04-locale-provider.md)         | Messages in `UIProvider`: Italian default dictionary, English one, `text-defaults` gate   | 02                  | —                        |
| 05  | [05-ci-fast-lane.md](./05-ci-fast-lane.md)               | `workspace:verify` target, Chromium-only packed check on PRs, less duplicate CI work      | —                   | —                        |
| 06  | [06-parity-align.md](./06-parity-align.md)               | `parity align <nodeId>`, fan-in queue order, `parity verify` in the gate                  | 07                  | `G-EVD` satisfied        |
| 07  | [07-agent-context.md](./07-agent-context.md)             | Fix stale references, turn known traps into checks, cap registry notes, prune skills      | —                   | —                        |
| 08  | [08-responsive-tokens.md](./08-responsive-tokens.md)     | Only Figma breakpoints in Tailwind; off-token responsive variants become foundation rules | 01, 02, 07          | `G-VIS` (baselines)      |
| 09  | [09-a11y-traceability.md](./09-a11y-traceability.md)     | Explicit WCAG axe tags, live-region contract, conformance matrix                          | 02                  | —                        |
| 10  | [10-public-tokens.md](./10-public-tokens.md)             | Public token contract: `@pagopa/ui/tokens.css` and the typed `@pagopa/ui/tokens`          | 03, 08              | —                        |
| 11  | [11-storybook-templates.md](./11-storybook-templates.md) | Figma page templates move to `apps/storybook`; the `templates` layer is retired           | 01, 02, 07, 08      | —                        |
| 12  | [12-component-rules.md](./12-component-rules.md)         | Component rules ledger, node comments and the node brief                                  | —                   | **merged** — do not run  |

Dependencies (each line lists what must already be merged into `main`):

```text
01, 02, 05, 07  nothing
04, 09          02
06              07              (part C needs G-EVD, already satisfied)
08              01, 02, 07      (and G-VIS)
03              02, 04
10              03, 08
11              01, 02, 07, 08
12              merged
```

Expected waves when nothing fails:

| Wave | Actions        |
| ---- | -------------- |
| W1   | 01, 02, 05, 07 |
| W2   | 04, 06, 08, 09 |
| W3   | 03, 11         |
| W4   | 10             |

### Person gates

The orchestrator never satisfies a gate itself. It checks each one with the
command shown, run in the main checkout on `main`; exit code 0 means satisfied.

| Gate    | Status on 2026-10-24 | What the person does                                                                                                                                                                                                            | Check command                                                             |
| ------- | -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------- |
| `G-API` | **satisfied**        | Filled the "Decision" column of the rename table in `02-public-api.md` (every row `rename`), changed its line `Approval: PENDING` to `Approval: APPROVED` and committed to `main`.                                              | `grep -q '^Approval: APPROVED' docs/plans/improvements/02-public-api.md`  |
| `G-VIS` | open                 | On the pull request of action 01, adds the `visual:update` label so the workflow commits Linux baselines, reviews a sample, re-runs the check and merges. The steps are in the "Report additions" of `01-visual-regression.md`. | `git ls-files 'apps/storybook/visual/__screenshots__/*.png' \| grep -q .` |
| `G-EVD` | **satisfied**        | Exports `FIGMA_TOKEN` (or links the `.figma/` snapshot), runs `pnpm nx run pagopa-ui-cli:figma:parity:evidence -- --write`, checks the folder is under 10 MB and commits `docs/figma-parity/`.                                  | `git ls-files docs/figma-parity/manifest.json \| grep -q .`               |

Person-only steps, which the action reports also remind about:

- **Before W1:** the plans are already committed on `main`; re-commit them if a
  session edits this folder. Worktrees start from the last commit, so
  uncommitted files never reach the agents.
- **After 01 is merged:** make the `Visual regression` check required in the
  branch protection.
- **While 02 and 08 are in flight:** pause the Figma alignment sessions — the
  remaining M5 nodes of
  [figma-fidelity-and-drift.md](../figma-fidelity-and-drift.md) and any
  `figma-align` wave. Both action 02 and action 08 edit the registry, the parity
  cases and the components, so whichever lands second must rebase.

### Deferred (no action file in this wave)

- Nx remote cache for CI.
- Splitting `packages/ui-cli/tests/e2e/library.spec.mjs` into per-family specs.
- An oxlint rule ratchet.
- Publishing to the public npm registry.
- Responsive typography utilities that replace the `text-*-mobile` pairs, and
  dropping the `device` prop of `IDModule`: both need a design decision on the
  switching width (action 08 only gates them with a ratchet).

## 2. Naming and resources

| Item                | Value for action `NN`                                                |
| ------------------- | -------------------------------------------------------------------- |
| Branch              | `improve/NN-<slug>` (the slug is the action file name without `NN-`) |
| Worktree            | `<parent of the main checkout>/pagopa-ui-imp-NN` (absolute path)     |
| Storybook dev port  | `61NN` (for example 6101 for action 01), passed as `PORT`            |
| Static preview port | `62NN`                                                               |
| Commit trailer      | `Improvement-Action: NN` on every commit, plus the Copilot trailer   |
| Report file         | `docs/plans/improvements/reports/NN.md`, committed last              |

An action is **merged** when this command exits 0 in the main checkout:

```sh
git log main --format=%B | grep -qx 'Improvement-Action: NN'
```

The trailer survives both a merge and a squash.

## 3. Heavy lock

Browser suites and builds saturate the machine. Run only one at a time across
all worktrees, behind this lock:

- `test:stories`, `test:webkit`, `test:coverage`;
- `library:check`, `test:visual`;
- Storybook builds.

```sh
until mkdir /tmp/pagopa-ui-heavy.lock 2>/dev/null; do sleep 30; done
trap 'rmdir /tmp/pagopa-ui-heavy.lock' EXIT
# … the heavy command …
```

Take the lock and run the command in **the same** shell invocation. A lock can
be stale: older than 60 minutes, with no browser suite running in any worktree.
The orchestrator then removes it (`rmdir /tmp/pagopa-ui-heavy.lock`).

---

## 4. Orchestrator procedure

You coordinate; you do not implement. Repeat steps 4.2–4.5 until nothing is
ready or running, then report (section 5).

### 4.1 Preflight (once)

1. In the main checkout, `git branch --show-current` must print `main`.
2. `git log -1 --format=%h -- docs/plans/improvements/00-orchestrator.md` must
   print a commit. If it prints nothing, stop: the person must commit the plans
   first.
3. Run `git worktree list` and note the existing `pagopa-ui-imp-NN` worktrees.
   - An existing worktree means the action is **in progress**.
   - Read its `docs/plans/improvements/reports/NN.md` if one exists.
   - Never create a second worktree for that action.
4. `node_modules` exists in the main checkout. If it doesn't, run
   `pnpm install --frozen-lockfile`.

### 4.2 Compute the ready set

An action is **ready** when all of these hold:

- it is not merged (section 2) and has no worktree;
- every dependency in section 1 is merged;
- its person gate (if any) passes its check command.

Action 06 runs part C now: `G-EVD` is satisfied and
`docs/figma-parity/manifest.json` is committed.

### 4.3 Launch (at most 3 agents at the same time)

For each ready action, lowest number first, while fewer than 3 agents run:

```sh
cd <main checkout>
git worktree add ../pagopa-ui-imp-NN -b improve/NN-<slug> main
cd ../pagopa-ui-imp-NN && pnpm install --frozen-lockfile
```

For actions 06 and 08 only, and only when
`<main checkout>/packages/pagopa-ui/.figma` exists, also run this inside the
worktree (the folder is git-ignored and holds the live Figma snapshot):

```sh
ln -s <main checkout>/packages/pagopa-ui/.figma packages/pagopa-ui/.figma
```

Then start one **background** sub-agent of type `general-purpose` with this
prompt, filling in the placeholders:

```text
You are the implementing agent for action NN of the pagopa-ui improvement plan.
Worktree: <ABSOLUTE WORKTREE PATH>, on branch improve/NN-<slug>.
Start every shell command with `cd <ABSOLUTE WORKTREE PATH> && `. Create and
edit files only under <ABSOLUTE WORKTREE PATH>, never under
<ABSOLUTE MAIN CHECKOUT PATH>.
First read docs/plans/improvements/00-orchestrator.md section 6, then
docs/plans/improvements/NN-<slug>.md, both inside the worktree. Execute the
steps in order and stop at any stop condition. Finish by committing the report
file that section 6 describes, then reply with its content.
```

### 4.4 When an agent finishes

1. Read its reply and `docs/plans/improvements/reports/NN.md` in the worktree.
2. Check the worktree:
   - `git status --short` prints nothing.
   - `git log --format='%h %s' main..HEAD` lists the commits.
   - `git log --format=%B main..HEAD | grep -c 'Improvement-Action: NN'` equals
     the commit count.
3. Check ownership: compare `git diff --name-only main...HEAD` with the
   "Ownership" section of the action file. Any file outside it makes the action
   `NEEDS_REVIEW`; name the files.
4. Re-run the action's **Acceptance → quick** commands yourself, in the
   worktree. Run the heavy ones only when the report says they were skipped,
   and then under the heavy lock.
5. Classify the action:

   | Status            | Meaning                                                    |
   | ----------------- | ---------------------------------------------------------- |
   | `READY_FOR_MERGE` | Every check passed.                                        |
   | `BLOCKED`         | The agent hit a stop condition; quote the reason.          |
   | `NEEDS_REVIEW`    | An ownership breach, or acceptance failing on your re-run. |
   | `NEEDS_PERSON`    | Done, but a person step is pending before it can merge.    |

### 4.5 Follow-ups and limits

- An agent may be `BLOCKED` on something the plans answer (a command, a path).
  Send it **one** follow-up message with the answer, then re-check it. Never
  send more than one follow-up per action.
- Never merge, push, rebase `main`, delete a worktree or delete a branch. The
  person does that.
- Merges happen only when the person acts. Within one session, a new action
  becomes ready only when its dependencies were already merged at the start.
  When nothing more can start and no agent runs, go to section 5.

## 5. Status report (your final reply)

Reply in the person's language with:

1. A table with one row per action:
   - the action and its branch;
   - the status: `MERGED`, `READY_FOR_MERGE`, `BLOCKED`, `NEEDS_REVIEW`,
     `NEEDS_PERSON`, `WAITING_DEPENDENCY` or `WAITING_GATE`;
   - a one-line reason.
2. For each `READY_FOR_MERGE`, the merge commands, in dependency order:

   ```sh
   git -C <main checkout> merge --no-ff improve/NN-<slug>
   git worktree remove ../pagopa-ui-imp-NN
   git branch -d improve/NN-<slug>
   ```

3. The person gates that now block new work, with their steps from section 1.
4. The actions that become ready after these merges: the person starts the
   next orchestrator session after merging them.

---

## 6. Rules for implementing agents

Read these before your action file. They win over anything that seems to
contradict them, including the common rules in
[../README.md](../README.md): an action may edit `AGENTS.md`, `CONTRIBUTING.md`,
a `README.md` or a skill when its **Ownership** section lists that file.

### Scope

1. Change only the files listed in your action's **Ownership** section. If a
   change elsewhere seems necessary, don't make it: write it in the report
   under "Outside scope".
2. Execute the steps **in order**. Do not add features, refactors or cleanups
   that the steps don't ask for.
3. The **Decisions** section of your action file is final. Do not reopen those
   decisions or ask about them.

### Never weaken a gate

4. Never do any of these to make something pass, unless a step explicitly says
   to and within the limits it states:
   - lower a coverage threshold or raise a baseline count;
   - add an exception entry, a `.skip`, a `test.fixme` or a lint disable;
   - hide content from assistive technology (`aria-hidden`, `role="presentation"`).
5. Never run snapshot or baseline updates (`--update-snapshots`, `--write` on a
   check, a baseline regeneration) unless a step says so.
6. Never delete, rename or loosen a test to make it pass.

### Safety

7. Never read, source, print or commit `.env`. Figma is read-only: GET requests
   and read-only tools only. When a step needs `FIGMA_TOKEN` and it is not
   exported, skip that step and say so in the report.
8. Never push, merge, rebase `main` or open a pull request.

### How to run things

9. Run every task through Nx: `pnpm nx run <project>:<target>`, extra arguments
   after `--`. The design-system projects are `pagopa-ui`,
   `pagopa-ui-storybook`, `pagopa-ui-cli`, `pagopa-ui-tokens` and
   `pagopa-ui-artwork`; the workspace also carries the `infra` projects
   (`bootstrapper-dev`, `resources-dev`, `repository`), out of scope here, and
   `workspace` once action 05 merges.
10. Wrap every browser suite in the heavy lock (section 3).
11. Start Storybook with
    `PORT=61NN pnpm nx run pagopa-ui-storybook:storybook` and stop it before you
    finish. The current script reads `PORT` and passes `-p` itself; appending
    `-p 61NN` would pass the port twice.
12. **Measure before you change.** Every action starts with a "Measure" step:
    record the numbers in the report as "before", then measure again as
    "after".

### When something fails

13. When a result differs from the step's "Done when", make at most **two** fix
    attempts. If it still fails, stop and report `BLOCKED` with the command,
    the last 30 lines of its output and what you tried.
14. A failure that also happens on `main` is not yours. Prove it by running the
    same command in the main checkout (read-only), write it in the report and
    continue.

### Writing

15. Code, comments, docs and commit messages are in English. Italian appears
    only in texts the product renders: component defaults, stories and the UI
    examples quoted in guides.
16. Add comments only where the code needs clarification.
17. Docs describe how to operate, never the history of a decision.

### Release bookkeeping

18. A change to the public API or to rendering gets both:
    - a line under `## Unreleased` in `packages/pagopa-ui/CHANGELOG.md`, in the
      matching `### Added`, `### Changed` or `### Removed` subsection;
    - a version plan:
      `pnpm nx release plan <bump> -p pagopa-ui -m "<conventional message>"`.
      The bump is `minor` for a breaking change (the package is 0.x) and
      `patch` otherwise. Check it with `pnpm nx release plan:check`.

### Commits

19. Use conventional commits (`feat:`, `fix:`, `refactor:`, `test:`, `docs:`,
    `chore:`, `ci:`), one per step or as the action's commit plan says. Every
    message ends with these two lines:

    ```text
    Improvement-Action: NN
    Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>
    ```

### Definition of done for every action

20. The action's **Acceptance** commands pass: the quick ones always, the heavy
    ones under the lock.
21. Format, lint and types pass on every project you touched:
    `pnpm nx run-many -p <touched projects> -c=ci -t fmt,lint,typecheck`, plus
    `pnpm nx run pagopa-ui:docs`.
22. The **full green chain** passes once at the end, under the heavy lock. Use
    `pnpm nx run workspace:verify` if action 05 is merged; otherwise use the
    chain in `CONTRIBUTING.md` ("The green chain"). If browsers cannot start,
    say so and do not count those suites as passed.

### Report

23. The last commit adds `docs/plans/improvements/reports/NN.md`:

    ```markdown
    # Action NN — <title>: report

    Status: DONE | PARTIAL | BLOCKED
    Branch: improve/NN-<slug> · Commits: <count>

    ## Before → after

    | Metric | Before | After |
    | ------ | ------ | ----- |

    ## What changed

    - <file or area>: <one line>

    ## Commands run

    | Command | Result |
    | ------- | ------ |

    ## Outside scope

    - <a change needed elsewhere, or "none">

    ## Person steps

    - <a gate, secret, required check or review, or "none">

    ## Open risks

    - <or "none">
    ```
