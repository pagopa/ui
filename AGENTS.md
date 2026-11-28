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
6. **Routine design defaults are ratified policy, not a request.** Derived state
   colours, composite input-plus-icon spacing and the responsive layout rules
   come from [docs/design-defaults.md](./docs/design-defaults.md) (the decision
   is [ADR-0009](./docs/decisions/0009-ratified-design-defaults.md)); apply them
   before opening a design request, and open one only for what they leave open.

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
- [`modern-web-guidance`](.agents/skills/modern-web-guidance/SKILL.md) — Chrome's
  web-platform guidance, retrieved by query before the code is written: HTML
  semantics, CSS layout, animation and colour, client-side JavaScript,
  accessibility, forms, overlays and Core Web Vitals.
- [`shadcn`](.agents/skills/shadcn/SKILL.md) — the primitives behind the
  components: registry, presets, theming and the rules a composed interface
  follows.

| Work                                                       | Skills                                                                                          |
| ---------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| A component, prop, text, story, test or guide with no node | `pagopa-ui-standards`                                                                           |
| A component from a Figma node, its alignment or its review | both: done when the standards' definition of done and the `figma-to-code` source alignment hold |
| A component with no node joining the public API            | both: `figma-to-code` adds the catalogue coverage                                               |
| A Figma delta, tokens, icons, pictograms                   | `figma-to-code`; `pagopa-ui-standards` for each component it touches                            |
| A question for the design owner, opened or answered        | `figma-to-code`: the design request flow                                                        |
| HTML, CSS or client-side JavaScript behaviour              | `modern-web-guidance`, before the code is written                                               |

Skills published outside the repository are committed as a thin `SKILL.md`
entrypoint only — `shadcn` for the primitives, `modern-web-guidance` for the
platform itself — and pinned in [skills-lock.json](./skills-lock.json) by
source, commit and content hash. `pnpm skills:restore` puts the pinned copies
back under `.agents/skills/` and verifies them against that hash; neither
entrypoint needs it, because each answers from the CLI it names
(`pnpx modern-web-guidance@latest search|retrieve`, `npx shadcn@latest docs`),
so the session that uses one needs outbound network access. What stays vendored,
and why, is in
[Third-party skills](./CONTRIBUTING.md#third-party-skills).

Both Figma skills are graded by harbor-bench evals: `evals/` holds the graded
scenarios and `harbor/` the session that runs them, next to each skill. The run
commands, the tokens they need and what fails fast are in
[Skill evals](./CONTRIBUTING.md#skill-evals); an instruction an eval grades moves
with its eval. A pull request that touches a skill compiles the suites but never
grades them — a graded run needs credentials a pull request does not get, so
`skill-evals.yml` is dispatch and weekly only.

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

For a drift pull request, start with `start-figma-to-code` (the
`.github/prompts/start-figma-to-code.prompt.md` prompt names it): it resolves
the open pull request, follows the shared handoff and aligns one node at a
time, in the handoff's dependency order. The repository carries no
orchestration layer: the session is the workflow.

## Agent skills

### Issue tracker

Issues are tracked in GitHub Issues on `pagopa/ui` via the `gh` CLI. See `docs/agents/issue-tracker.md`.

### Triage labels

Default five-role triage label vocabulary (`needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`). See `docs/agents/triage-labels.md`.

### Domain docs

Multi-context layout (root `GLOSSARY-MAP.md` routing to per-context `GLOSSARY.md` files; ADRs in `docs/decisions/`). See `docs/agents/domain.md`.

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
