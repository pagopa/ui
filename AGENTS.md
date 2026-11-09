# AGENTS.md — pagopa-ui

React design system implementing a Figma library. What holds for people and
agents alike — the monorepo layout, the Nx tasks, the green chain, Figma
read-only, branches and commits — is in [CONTRIBUTING.md](./CONTRIBUTING.md).
This file adds what holds only for agents.

## Rules

1. **Never read `.env`.** Never read, source or load it; Vite and Storybook
   disable env-file loading on purpose. The CLI resolves Figma credentials
   without exposing them; its source gate and fallback are in
   [init](.agents/skills/figma-to-code/references/init.md#credentials-and-source-gate).
2. **Green before commit**: [the green chain](./CONTRIBUTING.md#the-green-chain),
   run in full, through Nx. The chain checks formatting without writing it, so
   `pnpm nx run-many -t fmt` runs first. Stories run in a browser: when they
   cannot start, say so and never count them as passed.
3. **`nx release` owns the changelog.** A change to a released project —
   `packages/pagopa-ui`, the only one in `nx.json`'s release list — carries its
   version plan, written with the change
   ([Releases](./CONTRIBUTING.md#releases)):

   ```bash
   pnpm nx release plan minor -p pagopa-ui -m "feat(autocomplete): …"
   ```

   The plan message is the changelog entry: `nx release` renders
   `packages/pagopa-ui/CHANGELOG.md` from it when the Version Packages pull
   request regenerates, so the agent writes the plan and leaves the changelog to
   the release run.

4. **The package owns the code.** The design system is `packages/pagopa-ui`, its
   generated artwork is `packages/artwork`, its design foundations are
   `packages/tokens` and its checks and Figma tooling are
   `packages/ui-cli`: agents run CLI commands as `pnpm ui-cli …`; use Nx targets
   (`pnpm nx run <project>:<target>`) for gates and CI. Never use a path that
   walks out of the project.
5. **English whatever the session language.** Documentation, code comments and
   pull request titles and descriptions are written in English even when the
   session runs in Italian. Italian stays only where the product renders it:
   component and story texts, and the UI examples quoted in a guide.
6. **Storybook runs on `:6006`.** `pnpm nx run pagopa-ui-storybook:storybook`
   starts it and prints `http://localhost:6006`. `PORT` moves it and
   `STORYBOOK_URL` points the CLI at it, so concurrent sessions keep their own.

## Figma sessions

Invoke `figma-to-code` for source work: its sequence owns status, source gates,
delta/triage, node briefs, page census, device parity and closing.
Use `pnpm ui-cli … --help` for interactive command signatures; keep Nx for
the workspace gates. Automation never replaces source/render inspection or
the person's delivery permissions.

## Skills

The standards and source-alignment skills own separate contracts; apply both
when work touches a component with a design source.

- [`pagopa-ui-standards`](.agents/skills/pagopa-ui-standards/SKILL.md) — how a
  component, its props, texts, story, test and guide are written, and the
  definition of done of a component. Every component, with or without Figma.
- [`figma-to-code`](.agents/skills/figma-to-code/SKILL.md) — the Figma workflow:
  deltas, new nodes, alignment and parity, devices, tokens, icons, pictograms,
  node reviews and questions for the design owner.
- [`start-figma-to-code`](.agents/skills/start-figma-to-code/SKILL.md) — the
  user-invoked entrypoint that scopes an open drift pull request.
- [`figma-to-ui`](packages/pagopa-ui/skills/figma-to-ui/SKILL.md) — the same
  reading of the Figma library, shipped inside the package for its consumers:
  a frame's instances to the `@pagopa/ui` exports that render them.

| Work                                                       | Skills                                                                                          |
| ---------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| A component, prop, text, story, test or guide with no node | `pagopa-ui-standards`                                                                           |
| A component from a Figma node, its alignment or its review | both: done when the standards' definition of done and the `figma-to-code` source alignment hold |
| A component with no node joining the public API            | both: `figma-to-code` adds the catalogue coverage                                               |
| A Figma delta, tokens, icons, pictograms                   | `figma-to-code`; `pagopa-ui-standards` for each component it touches                            |
| A question for the design owner, opened or answered        | `figma-to-code`: the design request flow                                                        |

Both Figma skills are graded by harbor-bench evals: `evals/` holds the graded
scenarios and `harbor/` the session that runs them, next to each skill. The run
commands, the tokens they need and what fails fast are in
[Skill evals](./CONTRIBUTING.md#skill-evals); an instruction an eval grades moves
with its eval.

## Workflows

[`figma-align`](.github/extensions/figma-align/extension.mjs) is a Copilot CLI
dynamic workflow that runs a wave of Figma alignment through both skills. It
runs the deterministic commands itself: status, delta plan and inventory triage,
fresh rules/comments snapshots, the pending queue and `implementationOrder`,
node briefs, the close-out checks
(`check:catalogue`, `check:rules`, the parity wave) and the green chain read
from [CONTRIBUTING.md](./CONTRIBUTING.md#the-green-chain). It analyses each node
in parallel and read-only, then pauses so the person can approve or edit
`packages/pagopa-ui/.figma/align/<runId>/decisions.json`. After resume, one
writer works at a time; read-only verification may run alongside it, and the
start/end/final context hash invalidates a result whenever the relevant source
or case context changed. A stale pass gets one fresh re-verification; a missing
result, failed retry or later change remains not verified. The workflow never
commits.
Start it only when the person asks:
`run_dynamic_workflow { name: "figma-align", args: { waveSize: 3 } }`, or
`{ nodes: ["<nodeId>"] }` for named nodes and `{ analyseOnly: true }` to get the
decisions without changing files. The skills stay the source of every rule;
the workflow only sequences them.

<!-- nx configuration start-->
<!-- Leave the start & end comments to automatically receive updates. -->

## General Guidelines for working with Nx

- For navigating/exploring the workspace, invoke the `nx-workspace` skill first - it has patterns for querying projects, targets, and dependencies
- Run workspace tasks and CI gates through `nx` (`nx run`, `nx run-many`, `nx affected`); interactive UI CLI operations use `pnpm ui-cli …`
- Prefix nx commands with the workspace's package manager (e.g., `pnpm nx build`, `npm exec nx test`) - avoids using globally installed CLI
- You have access to the Nx MCP server and its tools, use them to help the user
- For Nx plugin best practices, check `node_modules/@nx/<plugin>/PLUGIN.md`. Not all plugins have this file - proceed without it if unavailable.
- NEVER guess CLI flags - always check nx_docs or `--help` first when unsure

## Scaffolding & Generators

- For scaffolding tasks (creating apps, libs, project structure, setup), ALWAYS invoke the `nx-generate` skill FIRST before exploring or calling MCP tools

## When to use nx_docs

- USE for: advanced config options, unfamiliar flags, migration guides, plugin configuration, edge cases
- DON'T USE for: basic generator syntax (`nx g @nx/react:app`), standard commands, things you already know
- The `nx-generate` skill handles generator discovery internally - don't call nx_docs just to look up generator syntax

<!-- nx configuration end-->
