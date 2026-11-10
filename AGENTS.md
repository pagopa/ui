# AGENTS.md — pagopa-ui

React design system implementing a Figma library. What holds for people and
agents alike — the monorepo layout, the Nx tasks, the green chain, Figma
read-only, branches and commits — is in [CONTRIBUTING.md](./CONTRIBUTING.md).
This file adds what holds only for agents.

## Rules

1. **Figma credentials come from the process environment.** `FIGMA_TOKEN`
   resolves from the shell, then the macOS `figma-pat` keychain entry; Vite and
   Storybook disable env-file loading on purpose. The source gate and fallback
   are in
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

   The plan message is the changelog entry, so write the plan and leave
   `CHANGELOG.md` alone: `nx release` renders it when the Version Packages pull
   request regenerates.

4. **Stay inside the workspace.** Read and write only under the repository root;
   the package layout is in [Composition](./CONTRIBUTING.md#composition).
5. **English whatever the session language.** Documentation, code comments and
   pull request titles and descriptions are written in English even when the
   session runs in Italian. Italian stays only where the product renders it:
   component and story texts, and the UI examples quoted in a guide.

## Skills

The standards and source-alignment skills own separate contracts; apply both
when work touches a component with a design source.

- [`pagopa-ui-standards`](.agents/skills/pagopa-ui-standards/SKILL.md) — how a
  component, its props, texts, story, test and guide are written, and the
  definition of done of a component. Every component, with or without Figma.
- [`figma-to-code`](.agents/skills/figma-to-code/SKILL.md) — the Figma workflow:
  deltas, new nodes, alignment, parity and devices.
- [`start-figma-to-code`](.agents/skills/start-figma-to-code/SKILL.md) — the
  user-invoked entrypoint that scopes an open drift pull request.
- [`figma-to-ui`](packages/pagopa-ui/skills/figma-to-ui/SKILL.md) — the same
  reading of the Figma library, shipped in the package for its consumers: a
  frame's instances to the `@pagopa/ui` exports that render them.

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

The reverse holds too: editing a skill, or a retrospective over agentic sessions
(the `retro` skill), proposes the eval that pins the change or the finding. A
proposal names the session it came from, the expectation that would have failed,
and whether it is a guardrail or an end-to-end pass.

## Figma sessions

Invoke `figma-to-code` for source work: its sequence owns status, source gates,
delta/triage, node briefs, page census, device parity and closing.
`pnpm ui-cli … --help` carries the interactive command signatures; Nx carries
the workspace gates. Automation never replaces source/render inspection or the
person's delivery permissions.

[`figma-align`](.github/extensions/figma-align/extension.mjs) runs a wave of that
alignment as a Copilot CLI dynamic workflow: it analyses each node in parallel
and read-only, pauses so the person can approve or edit
`packages/pagopa-ui/.figma/align/<runId>/decisions.json`, then writes one node at
a time and never commits. Start it only when the person asks:
`run_dynamic_workflow { name: "figma-align", args: { waveSize: 3 } }`, or
`{ nodes: ["<nodeId>"] }` for named nodes and `{ analyseOnly: true }` for the
decisions alone. The skills stay the source of every rule; the extension's
header documents the phases and the close-out checks it runs.

A stopped run says where it stands in
`packages/pagopa-ui/.figma/align/<runId>/status.json`: outcome, phase, route,
reason and next step, written after the source gate answers and never a replay
authority. An edited checkpoint is validated against the wave before any writer
runs and every problem is reported at once; fix the file and resume the same run
rather than restarting it. A node's outcome is one closed tag from `NODE_OUTCOMES`
(the header lists them), so `completed` never stands for a green verdict.

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
